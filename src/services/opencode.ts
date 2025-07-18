import { Opencode } from "@opencode-ai/sdk"
import { settingsService } from "./settings"
import { tauriHttpClient, tauriFetch } from "./http"

export interface OpenCodeMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
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
      const response = await tauriHttpClient.get(`${this.baseUrl}/config/modes`)
      if (!response.ok) {
        throw new Error(`Failed to fetch modes: ${response.status}`)
      }
      const modes = await response.json()
      return modes.map((mode: any) => ({
        name: mode.name,
        model: mode.model,
        prompt: mode.prompt,
        tools: mode.tools || {},
      }))
    } catch (error: unknown) {
      console.error("Failed to get modes:", error)
      // Return default modes if API call fails
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
      const sessions = await this.client.session.list()
      return sessions.map((session) => ({
        id: session.id,
        title: session.title,
        created: new Date(session.time.created * 1000),
        updated: new Date(session.time.updated * 1000),
      }))
    } catch (error: unknown) {
      console.error("Failed to get sessions:", error)
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
        if (messageInfo.role === "user") {
          // User message
          const textParts = message.parts.filter((part) => part.type === "text")
          if (textParts.length > 0) {
            result.push({
              id: messageInfo.id,
              role: "user",
              content: textParts.map((part) => (part as any).text).join("\n"),
              timestamp: new Date(messageInfo.time.created * 1000),
            })
          }
        } else if (messageInfo.role === "assistant") {
          // Assistant message
          const textParts = message.parts.filter((part) => part.type === "text")
          if (textParts.length > 0) {
            result.push({
              id: messageInfo.id,
              role: "assistant",
              content: textParts.map((part) => (part as any).text).join("\n"),
              timestamp: new Date(messageInfo.time.created * 1000),
            })
          }
        }
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
    mode: string = "build",
  ): Promise<OpenCodeMessage | null> {
    try {
      console.log("Sending message with params:", { sessionId, content, providerID, modelID })

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

      console.log("Sending request to /session/:id/message:", requestBody)

      const response = await tauriHttpClient.post(`${this.baseUrl}/session/${sessionId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error(`${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log("Chat response received:", data)

      // Extract the actual response content from the data
      let responseContent = "Response received"

      if (data && data.parts && Array.isArray(data.parts)) {
        const textParts = data.parts.filter((part: any) => part.type === "text")
        if (textParts.length > 0) {
          responseContent = textParts.map((part: any) => part.text).join("\n")
        }
      }

      return {
        id: data.id || messageID,
        role: "assistant",
        content: responseContent,
        timestamp: new Date(data.time?.created ? data.time.created * 1000 : Date.now()),
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
      await this.client.session.delete(sessionId)
      return true
    } catch (error: unknown) {
      console.error("Failed to delete session:", error)
      return false
    }
  }
}

export const openCodeService = new OpenCodeService()
