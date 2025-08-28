import { Opencode } from "@opencode-ai/sdk"
import { settingsService } from "./settings"
import { tauriHttpClient, tauriFetch } from "./http"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"

export interface OpenCodePart {
  id: string
  type: "text" | "reasoning" | "file" | "tool" | "step-start" | "step-finish" | "snapshot" | "patch" | "agent"
  text?: string // Only available on text/reasoning parts
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
  // Additional fields from OpenCode SDK
  synthetic?: boolean
  time?: {
    start: number
    end?: number
  }
  cost?: number
  tokens?: {
    input: number
    output: number
    reasoning: number
    cache: {
      read: number
      write: number
    }
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

export interface ToastNotification {
  title?: string
  message: string
  variant: "info" | "success" | "warning" | "error"
}

export interface OpenCodeAgent {
  id: string
  name: string
  description?: string
  type: string
  tools?: string[]
}

class OpenCodeService {
  private client: Opencode
  private baseUrl: string
  private eventSource: EventSource | null = null

  constructor(baseUrl?: string) {
    // Use settings service to get the server URL if no baseUrl provided
    this.baseUrl = baseUrl || settingsService.getServerUrl()

    // Ensure we have a complete URL with protocol
    const absoluteBaseUrl = this.baseUrl.startsWith("http") ? this.baseUrl : `http://${this.baseUrl}`

    console.log("Initializing OpenCode client with baseURL:", absoluteBaseUrl)
    this.client = new Opencode({
      baseURL: absoluteBaseUrl,
      fetch: tauriFetch,
    })
  }

  updateServerUrl(newUrl?: string): void {
    this.baseUrl = newUrl || settingsService.getServerUrl()
    const absoluteBaseUrl = this.baseUrl.startsWith("http") ? this.baseUrl : `http://${this.baseUrl}`

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

      // First try a direct fetch using Tauri HTTP client to avoid CORS
      console.log("Testing direct HTTP connection...")
      const directResponse = await tauriHttpClient.get(`${this.baseUrl}/app`)
      console.log("Tauri HTTP response:", directResponse.status, directResponse.statusText)

      if (!directResponse.ok) {
        console.error("❌ Tauri HTTP request failed:", {
          status: directResponse.status,
          statusText: directResponse.statusText,
          url: `${this.baseUrl}/app`
        })
        return false
      }

      const directData = await directResponse.json()
      console.log("✅ Tauri HTTP data received:", directData)

      // Now try the SDK
      console.log("Testing SDK connection...")
      const response = await this.client.app.get()
      console.log("✅ SDK connection successful:", response)
      console.log("=== CONNECTION SUCCESS ===")
      return true
    } catch (error: unknown) {
      console.error("=== CONNECTION FAILED ===")
      console.error("Connection test failed:", error)
      const errorObj = error as any
      console.error("Error details:", {
        message: errorObj?.message,
        status: errorObj?.status,
        response: errorObj?.response,
        baseUrl: this.baseUrl,
        stack: errorObj?.stack,
      })

      // Try to provide helpful troubleshooting info
      if (errorObj?.message?.includes("ECONNREFUSED")) {
        console.error("💡 Troubleshooting: Server may not be running or port may be incorrect")
      } else if (errorObj?.message?.includes("ENOTFOUND")) {
        console.error("💡 Troubleshooting: Hostname may be incorrect or unreachable")
      } else if (errorObj?.status === 404) {
        console.error("💡 Troubleshooting: Server is running but /app endpoint not found")
      }

      return false
    }
  }

  async getProviders(): Promise<{ providers: OpenCodeProvider[]; defaults: Record<string, string> }> {
    try {
      const response = await this.client.app.providers()
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
      
      const modes = await this.client.app.modes()
      console.log("Raw modes response:", modes)
      
      const processedModes = modes.map((mode) => ({
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

  async getSessionChildren(sessionId: string): Promise<OpenCodeSession[]> {
    try {
      console.log("=== FETCHING SESSION CHILDREN ===")
      console.log("Base URL:", this.baseUrl)
      console.log("Session ID:", sessionId)
      
      // Use HTTP client to call the new /session/:id/children endpoint
      const response = await tauriHttpClient.get(`${this.baseUrl}/session/${sessionId}/children`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const children = await response.json()
      
      console.log("Raw session children response:", children)
      console.log("Number of children found:", children.length)
      
      const processedChildren = children.map((session: any) => ({
        id: session.id,
        title: session.title,
        created: new Date(session.time.created * 1000),
        updated: new Date(session.time.updated * 1000),
        parentID: session.parentID || sessionId,
      }))
      
      console.log("Processed session children:", processedChildren)
      console.log("=== SESSION CHILDREN FETCH SUCCESS ===")
      
      return processedChildren
    } catch (error: unknown) {
      console.error("=== SESSION CHILDREN FETCH FAILED ===")
      console.error("Failed to get session children:", error)
      const errorObj = error as any
      console.error("Error details:", {
        message: errorObj?.message,
        status: errorObj?.status,
        baseUrl: this.baseUrl,
        sessionId,
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
          text: typeof part.text === 'string' ? part.text : (part.text ? String(part.text) : undefined),
          tool: part.tool,
          filename: part.filename,
          snapshot: part.snapshot,
          invocation: part.invocation,
          state: part.state
        }))

        // Create content from text parts for backward compatibility
        const textParts = message.parts.filter((part: any) => part.type === "text")
        const content = textParts.map((part: any) => {
          const text = part.text
          return typeof text === 'string' ? text : (text ? String(text) : "")
        }).join("\n")

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
    mode: string = "build",
    messageID?: string
  ): Promise<string | null> {
    try {
      console.log("=== SENDING MESSAGE ===")
      console.log("Base URL:", this.baseUrl)
      console.log("Session ID:", sessionId)
      console.log("Provider ID:", providerID)
      console.log("Model ID:", modelID)
      console.log("Mode:", mode)
      console.log("Content length:", content.length)
      console.log("Provided messageID:", messageID)

      const finalMessageID = messageID || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

      // Use the new SDK chat method
      const chatParams = {
        messageID: finalMessageID,
        providerID,
        modelID,
        mode,
        parts: [
          {
            type: "text" as const,
            text: content,
            id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          },
        ],
      }

      console.log("Chat params:", JSON.stringify(chatParams, null, 2))

      // Use the SDK's chat method
      const response = await this.client.session.chat(sessionId, chatParams)
      console.log("Chat response received:", response)

      // The response will come through Server-Sent Events
      console.log("✅ Message sent successfully, response will come via Server-Sent Events")

      // Return the messageID so caller can track it
      return finalMessageID
    } catch (error: unknown) {
      console.error("❌ Failed to send message:", error)
      const errorObj = error as any
      console.error("Error details:", {
        message: errorObj?.message,
        status: errorObj?.status,
        response: errorObj?.response,
        stack: errorObj?.stack,
        baseUrl: this.baseUrl,
        sessionId,
        providerID,
        modelID,
      })

      // Return null for errors - let the UI handle error display
      return null
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
        console.error("SSE setup failed - messages may not be received in real-time")
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

  async showToast(notification: ToastNotification): Promise<boolean> {
    try {
      console.log("=== SHOWING TOAST NOTIFICATION ===")
      console.log("Base URL:", this.baseUrl)
      console.log("Notification:", notification)
      
      // Use HTTP client to call the new /tui/show-toast endpoint
      const response = await tauriHttpClient.post(`${this.baseUrl}/tui/show-toast`, {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: notification.title,
          message: notification.message,
          variant: notification.variant,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      const success = result === true
      
      console.log("Toast notification result:", success)
      console.log("=== TOAST NOTIFICATION SUCCESS ===")
      
      return success
    } catch (error: unknown) {
      console.error("=== TOAST NOTIFICATION FAILED ===")
      console.error("Failed to show toast notification:", error)
      const errorObj = error as any
      console.error("Error details:", {
        message: errorObj?.message,
        status: errorObj?.status,
        baseUrl: this.baseUrl,
        notification,
        stack: errorObj?.stack,
      })
      return false
    }
  }

  async getAgents(): Promise<OpenCodeAgent[]> {
    try {
      console.log("=== FETCHING AGENTS ===")
      console.log("Base URL:", this.baseUrl)
      
      // Use the new /agent endpoint instead of environment variables
      const response = await tauriHttpClient.get(`${this.baseUrl}/agent`)
      console.log("Agents response status:", response.status, response.statusText)
      
      if (!response.ok) {
        console.error("Agents request failed with status:", response.status)
        return []
      }
      
      const agents = await response.json()
      console.log("Raw agents response:", agents)
      
      // Handle different response formats
      let agentList: any[] = []
      if (Array.isArray(agents)) {
        agentList = agents
      } else if (agents.agents && Array.isArray(agents.agents)) {
        agentList = agents.agents
      } else if (typeof agents === 'object') {
        // Convert object to array if needed
        agentList = Object.values(agents)
      }
      
      const processedAgents = agentList.map((agent: any) => ({
        id: agent.id || agent.name || `agent_${Date.now()}`,
        name: agent.name || agent.id || 'Unknown Agent',
        description: agent.description,
        type: agent.type || 'general',
        tools: agent.tools || [],
      }))
      
      console.log("Processed agents:", processedAgents)
      console.log("=== AGENTS FETCH SUCCESS ===")
      
      return processedAgents
    } catch (error: unknown) {
      console.error("=== AGENTS FETCH FAILED ===")
      console.error("Failed to get agents:", error)
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
