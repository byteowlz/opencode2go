import { describe, it, expect, mock, beforeEach, beforeAll } from "bun:test"

// 0. Setup Globals to prevent crashes in imported modules
// These are applied immediately when test file is loaded
const mockStorage = {
  getItem: mock(() => null),
  setItem: mock(),
  removeItem: mock(),
  clear: mock(),
  length: 0,
  key: mock(),
}

global.localStorage = mockStorage as any
global.document = {
  documentElement: {
    style: {
      setProperty: mock(),
    },
    offsetHeight: 0,
  },
  body: {
    classList: {
      add: mock(),
      remove: mock(),
    }
  }
} as any
global.window = {
  location: {
    origin: "http://localhost:3000",
    href: "http://localhost:3000/"
  },
  matchMedia: mock(() => ({ matches: false, addListener: mock(), removeListener: mock() })),
  addEventListener: mock(),
  removeEventListener: mock(),
} as any


// 1. Define mock implementations for SDK
const mockSdkMethods = {
  configGet: mock(),
  configProviders: mock(),
  appAgents: mock(),
  sessionList: mock(),
  sessionCreate: mock(),
  sessionMessages: mock(),
  sessionDelete: mock(),
}

// Mock object returned by createOpencodeClient
const mockClientInstance = {
  config: {
    get: mockSdkMethods.configGet,
    providers: mockSdkMethods.configProviders,
  },
  app: {
    agents: mockSdkMethods.appAgents,
  },
  session: {
    list: mockSdkMethods.sessionList,
    create: mockSdkMethods.sessionCreate,
    messages: mockSdkMethods.sessionMessages,
    delete: mockSdkMethods.sessionDelete,
  },
}

// 2. Mock @opencode-ai/sdk
mock.module("@opencode-ai/sdk", () => {
  return {
    createOpencodeClient: () => mockClientInstance,
    OpencodeClient: class {},
  }
})

// 3. Mock http service
const mockHttpClient = {
  get: mock(),
  post: mock(),
}

// Try mocking both specifier variants
mock.module("./http", () => {
  return {
    tauriHttpClient: mockHttpClient,
    tauriFetch: mock(() => Promise.resolve(new Response())),
  }
})
mock.module("./http.ts", () => {
  return {
    tauriHttpClient: mockHttpClient,
    tauriFetch: mock(() => Promise.resolve(new Response())),
  }
})

// 4. Mock settings service
const mockSettingsService = {
  getServerUrl: () => "http://localhost:3000",
}

mock.module("./settings", () => ({
  settingsService: mockSettingsService
}))
mock.module("./settings.ts", () => ({
  settingsService: mockSettingsService
}))

// 5. We DO NOT statically import the service here.
// We import it dynamically in beforeAll to ensure mocks are applied first.

describe("OpenCodeService", () => {
  let openCodeService: any

  beforeAll(async () => {
    const module = await import("./opencode")
    openCodeService = module.openCodeService
  })

  beforeEach(() => {
    // Reset all mocks
    Object.values(mockSdkMethods).forEach(m => m.mockClear())
    mockHttpClient.get.mockClear()
    mockHttpClient.post.mockClear()

    // Default success responses
    mockSdkMethods.configGet.mockResolvedValue({ data: { version: "1.0" } })
    mockHttpClient.get.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ status: "ok" })
    })
  })

  describe("testConnection", () => {
    it("should return true when both HTTP and SDK checks pass", async () => {
      const result = await openCodeService.testConnection()
      expect(result).toBe(true)
      expect(mockHttpClient.get).toHaveBeenCalledWith("http://localhost:3000/config")
      expect(mockSdkMethods.configGet).toHaveBeenCalled()
    })

    it("should return false when HTTP check fails", async () => {
      mockHttpClient.get.mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" })
      const result = await openCodeService.testConnection()
      expect(result).toBe(false)
      expect(mockSdkMethods.configGet).not.toHaveBeenCalled()
    })

    it("should return false when SDK check fails", async () => {
      mockSdkMethods.configGet.mockResolvedValue({ error: "Some error" })
      const result = await openCodeService.testConnection()
      expect(result).toBe(false)
    })
  })

  describe("getModes", () => {
    it("should fetch agents and map them to modes", async () => {
      const mockAgents = [
        {
          name: "build",
          model: { modelID: "gpt-4", providerID: "openai" },
          prompt: "Build stuff",
          tools: { tool1: true }
        }
      ]
      mockSdkMethods.appAgents.mockResolvedValue({ data: mockAgents })

      const modes = await openCodeService.getModes()

      expect(modes).toHaveLength(1)
      expect(modes[0].name).toBe("build")
      expect(modes[0].tools).toEqual({ tool1: true })
    })

    it("should return default modes on error", async () => {
      mockSdkMethods.appAgents.mockResolvedValue({ error: "Failed" })

      const modes = await openCodeService.getModes()

      expect(modes.length).toBeGreaterThan(0)
      expect(modes.some((m: any) => m.name === "build")).toBe(true)
    })
  })

  describe("getSessions", () => {
    it("should list sessions", async () => {
      const mockSessions = [
        { id: "1", title: "S1", time: { created: 100, updated: 200 } }
      ]
      mockSdkMethods.sessionList.mockResolvedValue({ data: mockSessions })

      const sessions = await openCodeService.getSessions()

      expect(sessions).toHaveLength(1)
      expect(sessions[0].id).toBe("1")
      expect(sessions[0].created).toEqual(new Date(100000))
    })
  })

  describe("getMessages", () => {
    it("should fetch and map messages", async () => {
      const mockMessages = [
        {
          info: {
            id: "m1",
            role: "user",
            time: { created: 1000 },
            model: { providerID: "p1", modelID: "mod1" } // UserMessage model structure
          },
          parts: [
            { id: "p1", type: "text", text: "Hello" }
          ]
        },
        {
          info: {
            id: "m2",
            role: "assistant",
            time: { created: 2000 },
            providerID: "p1",
            modelID: "mod1" // AssistantMessage model structure
          },
          parts: [
            { id: "p2", type: "text", text: "Hi" }
          ]
        }
      ]
      mockSdkMethods.sessionMessages.mockResolvedValue({ data: mockMessages })

      const messages = await openCodeService.getMessages("sess1")

      expect(mockSdkMethods.sessionMessages).toHaveBeenCalledWith({ path: { id: "sess1" } })
      expect(messages).toHaveLength(2)

      // Check User message mapping
      expect(messages[0].role).toBe("user")
      expect(messages[0].providerID).toBe("p1")
      expect(messages[0].modelID).toBe("mod1")

      // Check Assistant message mapping
      expect(messages[1].role).toBe("assistant")
      expect(messages[1].providerID).toBe("p1")
      expect(messages[1].modelID).toBe("mod1")
    })
  })

  describe("sendMessage", () => {
    it("should send message and return response", async () => {
      const responseData = {
        info: {
          id: "resp1",
          role: "assistant",
          time: { created: 3000 }
        },
        parts: [
          { id: "rp1", type: "text", text: "Response text" }
        ]
      }

      mockHttpClient.post.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => responseData
      })

      const result = await openCodeService.sendMessage("sess1", "Hello", "prov1", "mod1", "agent1")

      expect(mockHttpClient.post).toHaveBeenCalled()
      const [url, options] = mockHttpClient.post.mock.calls[0]
      expect(url).toBe("http://localhost:3000/session/sess1/message")

      const body = JSON.parse(options.body)
      expect(body.agent).toBe("agent1")
      expect(body.model).toEqual({ providerID: "prov1", modelID: "mod1" })
      expect(body.parts[0].text).toBe("Hello")

      expect(result).not.toBeNull()
      expect(result?.content).toBe("Response text")
    })

    it("should handle error response", async () => {
      mockHttpClient.post.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
        text: async () => "Internal Error"
      })

      const result = await openCodeService.sendMessage("sess1", "Hello", "p", "m")

      expect(result).not.toBeNull()
      expect(result?.content).toContain("Error")
    })
  })
})
