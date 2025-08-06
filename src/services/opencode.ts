import { Opencode } from "@opencode-ai/sdk"
import { settingsService } from "./settings"
import { tauriHttpClient, tauriFetch } from "./http"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"

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
  parentID?: string
  serverId?: string
  serverName?: string
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
  private client: Opencode
  private baseUrl: string
  private eventSource: EventSource | null = null

  constructor(baseUrl?: string) {
    // Use settings service to get the server URL if no baseUrl provided
    this.baseUrl = baseUrl || settingsService.getServerUrl()

    // Convert relative URL to absolute URL for the SDK
    const absoluteBaseUrl = this.baseUrl.startsWith("http") ? this.baseUrl : `${window.location.origin}${this.baseUrl}`

    console.log("Initializing OpenCode client with absolute baseURL:", absoluteBaseUrl)
    this.client = new Opencode({
      baseURL: absoluteBaseUrl,
      fetch: tauriFetch,
    })
  }

  updateServerUrl(newUrl?: string): void {
    this.baseUrl = newUrl || settingsService.getServerUrl()
    const absoluteBaseUrl = this.baseUrl.startsWith("http") ? this.baseUrl : `${window.location.origin}${this.baseUrl}`

    console.log("Updating OpenCode client with new baseURL:", absoluteBaseUrl)
    this.client = new Opencode({
      baseURL: absoluteBaseUrl,
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
      console.log("Full URL:", `${this.baseUrl}/app`)
      console.log("Current location:", window.location.href)

      // First try a direct fetch using Tauri HTTP client to avoid CORS
      const directResponse = await tauriHttpClient.get(`${this.baseUrl}/app`)
      console.log("Tauri HTTP response:", directResponse.status, directResponse.statusText)

      if (!directResponse.ok) {
        console.error("Tauri HTTP request failed:", directResponse.status)
        return false
      }

      const directData = await directResponse.json()
      console.log("Tauri HTTP data:", directData)

      // Now try the SDK
      console.log("Testing SDK...")
      const response = await this.client.app.get()
      console.log("SDK connection successful:", response)
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
      const response = await this.client.config.providers()
      return {
        providers: response.providers.map((provider) => ({
          id: provider.id,
          name: provider.name,
          models: Object.values(provider.models).map((model) => ({
            id: model.id,
            name: model.name,
          })),
        })),
        defaults: response.default || {},
      }
    } catch (error: unknown) {
      console.error("Failed to get providers:", error)
      return { providers: [], defaults: {} }
    }
  }

  async getModes(): Promise<OpenCodeMode[]> {
    try {
      console.log("=== FETCHING MODES ===")
      console.log("Base URL:", this.baseUrl)
      console.log("Full modes URL:", `${this.baseUrl}/config/modes`)
      
      const response = await tauriHttpClient.get(`${this.baseUrl}/config/modes`)
      console.log("Modes response status:", response.status, response.statusText)
      
      if (!response.ok) {
        console.error("Modes request failed with status:", response.status)
        const errorText = await response.text()
        console.error("Error response body:", errorText)
        throw new Error(`Failed to fetch modes: ${response.status} - ${errorText}`)
      }
      
      const modes = await response.json()
      console.log("Raw modes response:", modes)
      
      const processedModes = modes.map((mode: any) => ({
        name: mode.name,
        model: mode.model,
        prompt: mode.prompt,
        tools: mode.tools || {},
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
      
      const sessions = await this.client.session.list()
      console.log("Raw sessions response:", sessions)
      console.log("Number of sessions found:", sessions.length)
      
      const processedSessions = sessions.map((session) => ({
        id: session.id,
        title: session.title,
        created: new Date(session.time.created * 1000),
        updated: new Date(session.time.updated * 1000),
        parentID: (session as any).parentID,
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
      const session = await this.client.session.create()
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
      const messages = await this.client.session.messages(sessionId)
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
          snapshot: part.snapshot,
          invocation: part.invocation,
          state: part.state
        }))

        // Create content from text parts for backward compatibility
        const textParts = message.parts.filter((part: any) => part.type === "text")
        const content = textParts.map((part: any) => part.text || "").join("\n")

        result.push({
          id: messageInfo.id,
          role: messageInfo.role,
          content,
          parts,
          timestamp: new Date(messageInfo.time.created * 1000),
          providerID: messageInfo.providerID,
          modelID: messageInfo.modelID,
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
      console.log("Mode:", mode)
      console.log("Content:", content)

      const messageID = `msg_${Date.now()}`
      const partID = `part_${Date.now()}`

      const requestBody = {
        messageID,
        providerID,
        modelID,
        mode,
        parts: [
          {
            id: partID,
            sessionID: sessionId,
            messageID,
            type: "text",
            text: content,
          },
        ],
      }

      const fullUrl = `${this.baseUrl}/session/${sessionId}/message`
      console.log("Full URL:", fullUrl)
      console.log("Request body:", JSON.stringify(requestBody, null, 2))

      // Use Tauri HTTP client to avoid CORS issues
      const response = await tauriHttpClient.post(`${this.baseUrl}/session/${sessionId}/message`, {
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

      // OpenCode always streams responses through Server-Sent Events
      // The POST request just initiates the conversation, real response comes via events
      console.log("Message sent successfully, response will come via Server-Sent Events")
      
      // Return null to indicate that the response will come through events
      return null
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

    // Use Tauri's custom SSE implementation to avoid CORS issues
    let unlistenMessage: (() => void) | null = null
    let unlistenError: (() => void) | null = null

    const setupTauriSSE = async () => {
      try {
        // Start the SSE stream in Rust
        await invoke('start_sse_stream', { url: `${this.baseUrl}/event` })
        console.log("✅ Tauri SSE stream started for:", `${this.baseUrl}/event`)

        // Listen for SSE messages
        unlistenMessage = await listen('sse-message', (event) => {
          try {
            const data = JSON.parse(event.payload as string)
            console.log("📡 Tauri SSE Event:", data.type, data)
            onEvent(data)
          } catch (error: unknown) {
            console.error("❌ Failed to parse Tauri SSE event:", error, "Raw data:", event.payload)
          }
        })

        // Listen for SSE errors
        unlistenError = await listen('sse-error', (event) => {
          console.error("❌ Tauri SSE error:", event.payload)
        })

      } catch (error) {
        console.error("❌ Failed to start Tauri SSE stream:", error)
        // Fallback to browser EventSource
        this.eventSource = new EventSource(`${this.baseUrl}/event`)

        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log("📡 SSE Event:", data.type, data)
            onEvent(data)
          } catch (error: unknown) {
            console.error("❌ Failed to parse SSE event:", error, "Raw data:", event.data)
          }
        }

        this.eventSource.onerror = (error) => {
          console.error("❌ EventSource error:", error)
          console.log("EventSource readyState:", this.eventSource?.readyState)
        }

        this.eventSource.onopen = () => {
          console.log("✅ EventSource connected to:", `${this.baseUrl}/event`)
        }
      }
    }

    setupTauriSSE()

    return () => {
      if (unlistenMessage) {
        unlistenMessage()
      }
      if (unlistenError) {
        unlistenError()
      }
      if (this.eventSource) {
        this.eventSource.close()
        this.eventSource = null
      }
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await this.client.session.delete(sessionId)
      return true
    } catch (error: unknown) {
      console.error("Failed to delete session:", error)
      return false
    }
  }

  async updatePermissions(permissions: { edit?: string; bash?: string }): Promise<boolean> {
    try {
      console.log("=== UPDATING PERMISSIONS ===")
      console.log("Permissions:", permissions)
      
      const response = await tauriHttpClient.post(`${this.baseUrl}/config/permission`, {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permission: permissions }),
      })

      console.log("Permission update response:", response.status, response.statusText)
      
      if (!response.ok) {
        console.error("Permission update failed:", response.status)
        return false
      }

      console.log("=== PERMISSIONS UPDATED ===")
      return true
    } catch (error: unknown) {
      console.error("Failed to update permissions:", error)
      return false
    }
  }

  async getSessionsFromServer(serverUrl: string, serverId: string, serverName: string): Promise<OpenCodeSession[]> {
    try {
      console.log("=== FETCHING SESSIONS FROM SERVER ===")
      console.log("Server URL:", serverUrl)
      
      const response = await tauriHttpClient.get(`${serverUrl}/session`)
      console.log("Sessions response status:", response.status, response.statusText)
      
      if (!response.ok) {
        console.error("Sessions request failed with status:", response.status)
        return []
      }
      
      const sessions = await response.json()
      console.log("Raw sessions response:", sessions)
      
      const processedSessions = sessions.map((session: any) => ({
        id: session.id,
        title: session.title,
        created: new Date(session.time.created * 1000),
        updated: new Date(session.time.updated * 1000),
        parentID: session.parentID,
        serverId,
        serverName,
      }))
      
      console.log("Processed sessions:", processedSessions)
      console.log("=== SESSIONS FETCH SUCCESS ===")
      
      return processedSessions
    } catch (error: unknown) {
      console.error("=== SESSIONS FETCH FAILED ===")
      console.error("Failed to get sessions from server:", error)
      return []
    }
  }
}

export const openCodeService = new OpenCodeService()
