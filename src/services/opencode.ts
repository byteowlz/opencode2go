import { createOpencodeClient, OpencodeClient } from "@opencode-ai/sdk"
import { settingsService } from "./settings"
import { tauriHttpClient, tauriFetch } from "./http"

export interface OpenCodePart {
  id: string
  type: "text" | "tool" | "tool-invocation" | "step-start" | "step-finish" | "file" | "snapshot"
  text?: string
  tool?: string
  filename?: string
  snapshot?: {
    id: string
    title?: string
    url?: string
    data?: any
  }
  invocation?: {
    tool: string
    input: any
  }
  state?: {
    status: "pending" | "running" | "completed" | "error"
    error?: string
    time?: {
      start: number
      end: number
    }
    input?: any
    output?: any
  }
}

export interface OpenCodeMessage {
  id: string
  role: "user" | "assistant"
  content: string
  parts: OpenCodePart[]
  timestamp: Date
  providerID?: string
  modelID?: string
}

export interface OpenCodeSession {
  id: string
  title: string
  created: Date
  updated: Date
}

export interface OpenCodeProvider {
  id: string
  name: string
  models: OpenCodeModel[]
}

export interface OpenCodeModel {
  id: string
  name: string
}

export interface OpenCodeMode {
  name: string
  model?: {
    modelID: string
    providerID: string
  }
  prompt?: string
  tools: Record<string, boolean>
}

class OpenCodeService {
  private client: OpencodeClient
  private baseUrl: string
  private eventSource: EventSource | null = null

  constructor(baseUrl?: string) {
    // Use settings service to get the server URL if no baseUrl provided
    this.baseUrl = baseUrl || settingsService.getServerUrl()

    // Convert relative URL to absolute URL for the SDK
    const absoluteBaseUrl = this.baseUrl.startsWith("http") ? this.baseUrl : `${window.location.origin}${this.baseUrl}`

    console.log("Initializing OpenCode client with absolute baseURL:", absoluteBaseUrl)
    this.client = createOpencodeClient({
      baseUrl: absoluteBaseUrl,
      fetch: tauriFetch,
    })
  }

  updateServerUrl(newUrl?: string): void {
    this.baseUrl = newUrl || settingsService.getServerUrl()
    const absoluteBaseUrl = this.baseUrl.startsWith("http") ? this.baseUrl : `${window.location.origin}${this.baseUrl}`

    console.log("Updating OpenCode client with new baseURL:", absoluteBaseUrl)
    this.client = createOpencodeClient({
      baseUrl: absoluteBaseUrl,
      fetch: tauriFetch,
    })

    // Close existing event source and reconnect
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log("=== TESTING CONNECTION ===")
      console.log("Base URL:", this.baseUrl)
      console.log("Full URL:", `${this.baseUrl}/config`)
      console.log("Current location:", window.location.href)

      // First try a direct fetch using Tauri HTTP client to avoid CORS
      // Use /config as it's a GET request that should return 200
      const directResponse = await tauriHttpClient.get(`${this.baseUrl}/config`)
      console.log("Tauri HTTP response:", directResponse.status, directResponse.statusText)

      if (!directResponse.ok) {
        console.error("Tauri HTTP request failed:", directResponse.status)
        return false
      }

      const directData = await directResponse.json()
      console.log("Tauri HTTP data:", directData)

      // Now try the SDK
      console.log("Testing SDK...")
      const { data, error } = await this.client.config.get()
      if (error) {
        console.error("SDK connection failed with error:", error)
        return false
      }
      console.log("SDK connection successful:", data)
      console.log("=== CONNECTION SUCCESS ===")
      return true
    } catch (error: unknown) {
      console.error("=== CONNECTION FAILED ===")
      console.error("Connection test failed:", error)
      const errorObj = error as any
      console.error("Error details:", {
        message: errorObj?.message,
        status: errorObj?.status,
        baseUrl: this.baseUrl,
        stack: errorObj?.stack,
      })
      return false
    }
  }

  async getProviders(): Promise<{ providers: OpenCodeProvider[]; defaults: Record<string, string> }> {
    try {
      const { data, error } = await this.client.config.providers()
      if (error || !data) {
        throw error || new Error("Failed to fetch providers")
      }

      return {
        providers: data.providers.map((provider: any) => ({
          id: provider.id,
          name: provider.name,
          models: Object.values(provider.models).map((model: any) => ({
            id: model.id,
            name: model.name,
          })),
        })),
        defaults: data.default || {},
      }
    } catch (error: unknown) {
      console.error("Failed to get providers:", error)
      return { providers: [], defaults: {} }
    }
  }

  async getModes(): Promise<OpenCodeMode[]> {
    try {
      console.log("=== FETCHING MODES ===")
      console.log("Using SDK app.agents()")
      
      const { data: agents, error } = await this.client.app.agents()
      
      if (error || !agents) {
        console.error("Modes request failed:", error)
        throw error || new Error("Failed to fetch modes")
      }
      
      console.log("Raw agents response:", agents)
      
      const processedModes = agents.map((agent: any) => ({
        name: agent.name,
        model: agent.model,
        prompt: agent.prompt,
        tools: agent.tools || {},
      }))
      
      console.log("Processed modes:", processedModes)
      console.log("=== MODES FETCH SUCCESS ===")
      
      return processedModes
    } catch (error: unknown) {
      console.error("=== MODES FETCH FAILED ===")
      console.error("Failed to get modes:", error)
      const errorObj = error as any
      console.error("Error details:", {
        message: errorObj?.message,
        status: errorObj?.status,
        baseUrl: this.baseUrl,
        stack: errorObj?.stack,
      })
      
      // Return default modes if API call fails
      console.log("Returning default modes")
      return [
        {
          name: "build",
          tools: {},
        },
        {
          name: "plan",
          tools: {
            write: false,
            edit: false,
            patch: false,
          },
        },
      ]
    }
  }

  async getSessions(): Promise<OpenCodeSession[]> {
    try {
      console.log("=== FETCHING SESSIONS ===")
      console.log("Base URL:", this.baseUrl)
      
      const { data: sessions, error } = await this.client.session.list()

      if (error || !sessions) {
        throw error || new Error("Failed to fetch sessions")
      }

      console.log("Raw sessions response:", sessions)
      console.log("Number of sessions found:", sessions.length)
      
      const processedSessions = sessions.map((session: any) => ({
        id: session.id,
        title: session.title,
        created: new Date(session.time.created * 1000),
        updated: new Date(session.time.updated * 1000),
      }))
      
      console.log("Processed sessions:", processedSessions)
      console.log("=== SESSIONS FETCH SUCCESS ===")
      
      return processedSessions
    } catch (error: unknown) {
      console.error("=== SESSIONS FETCH FAILED ===")
      console.error("Failed to get sessions:", error)
      const errorObj = error as any
      console.error("Error details:", {
        message: errorObj?.message,
        status: errorObj?.status,
        baseUrl: this.baseUrl,
        stack: errorObj?.stack,
      })
      return []
    }
  }

  async createSession(): Promise<OpenCodeSession | null> {
    try {
      const { data: session, error } = await this.client.session.create()

      if (error || !session) {
        throw error || new Error("Failed to create session")
      }

      return {
        id: session.id,
        title: session.title,
        created: new Date(session.time.created * 1000),
        updated: new Date(session.time.updated * 1000),
      }
    } catch (error: unknown) {
      console.error("Failed to create session:", error)
      return null
    }
  }

  async getMessages(sessionId: string): Promise<OpenCodeMessage[]> {
    try {
      // New SDK expects options object with path
      const { data: messages, error } = await this.client.session.messages({ path: { id: sessionId } })

      if (error || !messages) {
        throw error || new Error("Failed to get messages")
      }

      const result: OpenCodeMessage[] = []

      for (const message of messages) {
        const messageInfo = (message as any).info
        
        // Convert all parts to our format
        const parts: OpenCodePart[] = message.parts.map((part: any) => ({
          id: part.id,
          type: part.type,
          text: part.text,
          tool: part.tool,
          filename: part.filename,
          // Handle snapshot which might be object or string
          snapshot: typeof part.snapshot === 'string'
            ? { id: part.id, data: part.snapshot }
            : part.snapshot,
          invocation: part.invocation,
          state: part.state
        }))

        // Create content from text parts for backward compatibility
        const textParts = message.parts.filter((part: any) => part.type === "text")
        const content = textParts.map((part: any) => part.text).join("\n")

        // Handle providerID and modelID location which might differ for User vs Assistant messages
        const providerID = messageInfo.providerID || messageInfo.model?.providerID
        const modelID = messageInfo.modelID || messageInfo.model?.modelID

        result.push({
          id: messageInfo.id,
          role: messageInfo.role,
          content,
          parts,
          timestamp: new Date(messageInfo.time.created * 1000),
          providerID,
          modelID,
        })
      }

      return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    } catch (error: unknown) {
      console.error("Failed to get messages:", error)
      return []
    }
  }

  async sendMessage(
    sessionId: string,
    content: string,
    providerID: string,
    modelID: string,
    mode: string = "build"
  ): Promise<OpenCodeMessage | null> {
    try {
      console.log("=== SENDING MESSAGE ===")
      console.log("Base URL:", this.baseUrl)
      console.log("Session ID:", sessionId)
      console.log("Provider ID:", providerID)
      console.log("Model ID:", modelID)
      console.log("Mode/Agent:", mode)
      console.log("Content:", content)

      const messageID = `msg_${Date.now()}`
      const partID = `part_${Date.now()}`

      // Updated request body structure for new SDK API
      const requestBody = {
        messageID,
        model: {
          providerID,
          modelID,
        },
        agent: mode,
        parts: [
          {
            id: partID,
            // sessionID and messageID might be optional or inferred
            type: "text",
            text: content,
          },
        ],
      }

      const fullUrl = `${this.baseUrl}/session/${sessionId}/message`
      console.log("Full URL:", fullUrl)
      console.log("Request body:", JSON.stringify(requestBody, null, 2))

      // Use Tauri HTTP client to avoid CORS issues
      const response = await tauriHttpClient.post(fullUrl, {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log("Response status:", response.status, response.statusText)
      console.log("Response headers:", response.headers)

      if (!response.ok) {
        let errorText = "Unknown error"
        try {
          errorText = await response.text()
        } catch (e) {
          console.error("Failed to read error response:", e)
        }
        console.error("HTTP Error:", response.status, response.statusText, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("Chat response received:", data)

      // Extract the actual response content from the data
      let responseContent = "Response received"

      // data structure is { info: AssistantMessage, parts: Part[] }
      if (data && data.parts && Array.isArray(data.parts)) {
        const textParts = data.parts.filter((part: any) => part.type === "text")
        if (textParts.length > 0) {
          responseContent = textParts.map((part: any) => part.text).join("\n")
        }
      } else if (typeof data === 'string') {
        responseContent = data
      } else if (data && data.content) {
        responseContent = data.content
      }

      // Extract ID and timestamp from data.info if available
      const responseId = data.info?.id || data.id || messageID
      const responseTimestamp = data.info?.time?.created
        ? new Date(data.info.time.created * 1000)
        : new Date()

      return {
        id: responseId,
        role: "assistant",
        content: responseContent,
        parts: data.parts ? data.parts.map((part: any) => ({
          id: part.id,
          type: part.type,
          text: part.text,
          tool: part.tool,
          filename: part.filename,
          snapshot: typeof part.snapshot === 'string'
            ? { id: part.id, data: part.snapshot }
            : part.snapshot,
          invocation: part.invocation,
          state: part.state
        })) : [{
          id: `part_${Date.now()}`,
          type: "text",
          text: responseContent
        }],
        timestamp: responseTimestamp,
      }
    } catch (error: unknown) {
      console.error("Failed to send message:", error)
      const errorObj = error as any
      console.error("Error details:", errorObj)

      // Return an error message
      return {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: `Error: ${errorObj?.message || "Unknown error occurred"}`,
        parts: [{
          id: `part_${Date.now() + 1}`,
          type: "text",
          text: `Error: ${errorObj?.message || "Unknown error occurred"}`
        }],
        timestamp: new Date(),
      }
    }
  }

  subscribeToEvents(onEvent: (event: any) => void): () => void {
    if (this.eventSource) {
      this.eventSource.close()
    }

    this.eventSource = new EventSource(`${this.baseUrl}/event`)

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log("Received event:", data)
        onEvent(data)
      } catch (error: unknown) {
        console.error("Failed to parse event:", error)
      }
    }

    this.eventSource.onerror = (error) => {
      console.error("EventSource error:", error)
    }

    return () => {
      if (this.eventSource) {
        this.eventSource.close()
        this.eventSource = null
      }
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // New SDK expects options object with path
      const { error } = await this.client.session.delete({ path: { id: sessionId } })
      if (error) throw error
      return true
    } catch (error: unknown) {
      console.error("Failed to delete session:", error)
      return false
    }
  }
}

export const openCodeService = new OpenCodeService()
