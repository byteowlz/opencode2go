import { createOpencodeClient } from "@opencode-ai/sdk/client"
import type { Config as OpencodeConfig } from "@opencode-ai/sdk/client"
import { settingsService } from "./settings"
import { tauriHttpClient, tauriFetch } from "./http"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { Permission } from "../types/settings"
import {
  OpenCodeAgent,
  OpenCodeMessage,
  OpenCodeMode,
  OpenCodePart,
  OpenCodeProvider,
  OpenCodeSession,
  ToastNotification,
} from "./opencode-types"
import { buildPermissionUpdate, normalizeAgents, normalizeModes, normalizeProviders } from "./opencode-normalizers"

class OpenCodeService {
  private client: ReturnType<typeof createOpencodeClient>
  private baseUrl: string
  private eventSource: EventSource | null = null

  constructor(baseUrl?: string) {
    // Use settings service to get the server URL if no baseUrl provided
    this.baseUrl = baseUrl || settingsService.getServerUrl()
    this.client = this.createClient(this.baseUrl)
  }

  updateServerUrl(newUrl?: string): void {
    this.baseUrl = newUrl || settingsService.getServerUrl()
    this.client = this.createClient(this.baseUrl)

    // Close existing event source and reconnect
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  private createClient(url: string) {
    const baseUrl = url.startsWith("http") ? url : `http://${url}`

    console.log("Initializing OpenCode client with baseUrl:", baseUrl)
    return createOpencodeClient({
      baseUrl,
      fetch: tauriFetch,
    })
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log("=== TESTING CONNECTION ===")
      console.log("Base URL:", this.baseUrl)
      console.log("Full URL:", `${this.baseUrl}/config`)

      // First try a direct fetch using Tauri HTTP client to avoid CORS
      console.log("Testing direct HTTP connection...")
      const directResponse = await tauriHttpClient.get(`${this.baseUrl}/config`)
      console.log("Tauri HTTP response:", directResponse.status, directResponse.statusText)

      if (!directResponse.ok) {
        console.error("❌ Tauri HTTP request failed:", {
          status: directResponse.status,
          statusText: directResponse.statusText,
          url: `${this.baseUrl}/config`
        })
        return false
      }

      const directData = await directResponse.json()
      console.log("✅ Tauri HTTP data received:", directData)

      // Now try the SDK
      console.log("Testing SDK connection...")
      const response = await this.client.config.get()
      if (response.error) {
        console.error("SDK connection failed:", response.error)
        return false
      }
      if (!response.data) {
        console.error("SDK connection returned empty response")
        return false
      }
      console.log("✅ SDK connection successful:", response.data)
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
        console.error("💡 Troubleshooting: Server is running but /config endpoint not found")
      }

      return false
    }
  }

  async getProviders(): Promise<{ providers: OpenCodeProvider[]; defaults: Record<string, string> }> {
    try {
      const response = await this.client.config.providers()
      if (response.data) {
        return normalizeProviders(response.data)
      }

      const fallbackResponse = await tauriHttpClient.get(`${this.baseUrl}/app/providers`)
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        return normalizeProviders(fallbackData)
      }

      return { providers: [], defaults: {} }
    } catch (error: unknown) {
      console.error("Failed to get providers:", error)
      return { providers: [], defaults: {} }
    }
  }

  async getModes(): Promise<OpenCodeMode[]> {
    try {
      console.log("=== FETCHING MODES ===")
      console.log("Base URL:", this.baseUrl)
      
      const response = await this.client.app.agents()
      if (response.data) {
        console.log("Raw agents response:", response.data)
        const processedModes = normalizeModes(response.data)
        if (processedModes.length > 0) {
          console.log("Processed modes:", processedModes)
          console.log("=== MODES FETCH SUCCESS ===")
          return processedModes
        }
      }

      const fallbackResponse = await tauriHttpClient.get(`${this.baseUrl}/app/modes`)
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        const processedModes = normalizeModes(fallbackData)
        if (processedModes.length > 0) {
          console.log("Processed fallback modes:", processedModes)
          console.log("=== MODES FETCH SUCCESS ===")
          return processedModes
        }
      }
      
      return []
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
      
      const response = await this.client.session.list()
      if (response.error) return []
      const sessions = response.data ?? []
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
      
      const response = await this.client.session.children({ path: { id: sessionId } })
      if (response.error) return []
      const children = response.data ?? []
      
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
      const response = await this.client.session.create()
      if (response.error) return null
      const session = response.data
      if (!session) return null
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
      const response = await this.client.session.messages({ path: { id: sessionId } })
      if (response.error) return []
      const messages = response.data ?? []
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
        model: {
          providerID,
          modelID,
        },
        agent: mode,
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
      // Simple retry with backoff for transient failures
      const maxSendAttempts = 3
      let lastErr: unknown = null
      for (let i = 0; i < maxSendAttempts; i++) {
        try {
          const resp = await this.client.session.prompt({
            path: { id: sessionId },
            body: chatParams,
          })
          if (resp.error) {
            throw resp.error
          }
          console.log("Chat response received:", resp.data)
          console.log("✅ Message sent successfully, response will come via Server-Sent Events")
          return finalMessageID
        } catch (e) {
          lastErr = e
          const delay = 300 * 2 ** i + Math.floor(Math.random() * 150)
          console.warn(`Send attempt ${i + 1} failed; retrying in ${delay}ms`)
          await new Promise((r) => setTimeout(r, delay))
        }
      }
      throw lastErr
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
    let reconnectAttempts = 0
    const maxAttempts = 10
    const baseDelay = 500
    const jitter = () => Math.floor(Math.random() * 200)
    const scheduleReconnect = () => {
      if (reconnectAttempts >= maxAttempts) {
        console.error("SSE reconnect: reached max attempts, giving up")
        return
      }
      const delay = Math.min(8000, baseDelay * 2 ** reconnectAttempts) + jitter()
      reconnectAttempts++
      console.warn(`SSE reconnect scheduled in ${delay}ms (attempt ${reconnectAttempts})`)
      setTimeout(() => {
        setupTauriSSE()
      }, delay)
    }
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
            // Reset attempts on successful traffic
            reconnectAttempts = 0
            console.log("📡 Tauri SSE Event:", data.type, data)
            onEvent(data)
          } catch (error: unknown) {
            console.error("❌ Failed to parse Tauri SSE event:", error, "Raw data:", event.payload)
          }
        })

        // Listen for SSE errors
        unlistenError = await listen('sse-error', (event) => {
          console.error("❌ Tauri SSE error:", event.payload)
          scheduleReconnect()
        })

      } catch (error) {
        console.error("❌ Failed to start Tauri SSE stream:", error)
        console.error("SSE setup failed - messages may not be received in real-time")
        scheduleReconnect()
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
      // prevent further reconnects on cleanup
      reconnectAttempts = maxAttempts
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await this.client.session.delete({ path: { id: sessionId } })
      if (response.error) return false
      return true
    } catch (error: unknown) {
      console.error("Failed to delete session:", error)
      return false
    }
  }

  async updatePermissions(permissions: { edit?: Permission; bash?: Permission }): Promise<boolean> {
    try {
      console.log("=== UPDATING PERMISSIONS ===")
      console.log("Permissions:", permissions)

      const update = buildPermissionUpdate(permissions)
      if (Object.keys(update).length === 0) {
        console.log("No permission changes requested")
        return true
      }
      
      const response = await this.client.config.update({ body: update as OpencodeConfig })
      if (response.error) {
        console.error("Permission update failed:", response.error)
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
      
      const response = await this.client.app.agents()
      if (response.error) return []
      const agents = response.data
      if (!agents) return []
      console.log("Agents response status: ok")
      console.log("Raw agents response:", agents)
      
      const processedAgents = normalizeAgents(agents)

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

export type {
  OpenCodeAgent,
  OpenCodeMessage,
  OpenCodeMode,
  OpenCodePart,
  OpenCodeProvider,
  OpenCodeSession,
  ToastNotification,
} from "./opencode-types"
