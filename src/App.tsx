import { useState, useEffect, useRef, useCallback } from "react"
import "./styles/terminal.css"
import { openCodeService, OpenCodeMessage, OpenCodeSession, OpenCodeProvider, OpenCodeMode } from "./services/opencode"
import { Settings } from "./components/Settings"
import { Sidebar } from "./components/Sidebar"
import { ServerManager } from "./components/ServerManager"
import { MessagePart } from "./components/MessagePart"
import { MessageFilter } from "./components/MessageFilter"
import { CyclingButton } from "./components/CyclingButton"
import { BrailleSpinner } from "./components/BrailleSpinner"

import { OpenCodeServer } from "./types/servers"
import { Wrench, Menu, ChevronDown } from "lucide-react"
import { settingsService } from "./services/settings"
import { serversService } from "./services/servers"
import { getTheme } from "./themes"
function App() {
  const [messages, setMessages] = useState<OpenCodeMessage[]>([])
  const [input, setInput] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Ref for auto-scrolling to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const currentSessionRef = useRef<OpenCodeSession | null>(null)
  const sentMessageIdsRef = useRef<Set<string>>(new Set())
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [currentSession, setCurrentSession] = useState<OpenCodeSession | null>(null)
  
  const [sessions, setSessions] = useState<OpenCodeSession[]>([])
  const [providers, setProviders] = useState<OpenCodeProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [selectedMode, setSelectedMode] = useState<string>("build")
  const [modes, setModes] = useState<OpenCodeMode[]>([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [logoSrc, setLogoSrc] = useState("/logo_new_transparent.svg")

  // New state for sidebar and server management
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isServerManagerOpen, setIsServerManagerOpen] = useState(false)
  const [servers, setServers] = useState<OpenCodeServer[]>([])
  const [currentServer, setCurrentServer] = useState<OpenCodeServer | null>(null)
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [sentMessageIds, setSentMessageIds] = useState<Set<string>>(new Set())

  // Update refs whenever state changes
  useEffect(() => {
    currentSessionRef.current = currentSession
  }, [currentSession])
  
  useEffect(() => {
    sentMessageIdsRef.current = sentMessageIds
  }, [sentMessageIds])

  // Message filter state
  const [messageFilters, setMessageFilters] = useState<{
    text: boolean
    tool: boolean
    "tool-invocation": boolean
    "step-start": boolean
    "step-finish": boolean
    file: boolean
    snapshot: boolean
  }>({
    text: true,
    tool: true,
    "tool-invocation": true,
    "step-start": true,
    "step-finish": true,
    file: true,
    snapshot: true
  })

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Check if user is at bottom
  const isAtBottom = () => {
    if (!messagesContainerRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    return scrollHeight - scrollTop <= clientHeight + 50 // 50px threshold
  }

  // Check if user has scrolled up from bottom
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const atBottom = isAtBottom()
      setShowScrollButton(!atBottom && messages.length > 0)
    }
  }, [messages.length])

  // Smart auto-scroll: only scroll if user is already at bottom
  useEffect(() => {
    // Small delay to ensure DOM has updated
    const timer = setTimeout(() => {
      if (isAtBottom()) {
        scrollToBottom()
      }
    }, 10)
    return () => clearTimeout(timer)
  }, [messages])

  // Always scroll when loading starts/stops
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(scrollToBottom, 10)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  // Add scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // Update logo when theme changes
  useEffect(() => {
    const updateLogo = () => {
      const settings = settingsService.getSettings()
      const theme = getTheme(settings.appearance.theme)

      // Simple heuristic: if background is lighter than text, it's a light theme
      const bgBrightness = parseInt(theme.colors.background.slice(1), 16)
      const textBrightness = parseInt(theme.colors.text.slice(1), 16)
      const isLightTheme = bgBrightness > textBrightness

      setLogoSrc(isLightTheme ? "/logo_new_transparent.svg" : "/logo_new_transparent.svg")
    }

    updateLogo()

    // Listen for theme changes
    const handleStorageChange = () => {
      updateLogo()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Logo component that switches based on theme
  const Logo = () => {
    return (
      <img
        src={logoSrc}
        alt="opencode2go"
        style={{ height: "30px", width: "auto" }}
      />
    )
  }

  // Initialize servers
  useEffect(() => {
    const loadedServers = serversService.getServers()
    const currentServerData = serversService.getCurrentServer()
    setServers(loadedServers)
    setCurrentServer(currentServerData)

    // Update opencode service with current server URL
    if (currentServerData) {
      const serverUrl = serversService.getServerUrl(currentServerData)
      openCodeService.updateServerUrl(serverUrl)
    }
  }, [])

  // Initialize connection and load data
  useEffect(() => {
    const initializeApp = async () => {
      if (!currentServer) return

      const connected = await openCodeService.testConnection()
      setIsConnected(connected)

      if (connected) {
        const { providers: providersData, defaults } = await openCodeService.getProviders()
        setProviders(providersData)

        // Load available modes
        const modesData = await openCodeService.getModes()
        setModes(modesData)
        if (modesData.length > 0) {
          setSelectedMode(modesData[0].name)
        }

        // Set default provider and model using TUI logic
        if (providersData.length > 0) {
          // Prefer Anthropic if available (like TUI)
          let defaultProvider = providersData.find((p) => p.id === "anthropic") || providersData[0]
          let defaultModel = defaultProvider.models[0]

          // Use configured default model if available
          if (defaults[defaultProvider.id]) {
            const configuredModel = defaultProvider.models.find((m) => m.id === defaults[defaultProvider.id])
            if (configuredModel) {
              defaultModel = configuredModel
            }
          }

          setSelectedProvider(defaultProvider.id)
          setSelectedModel(defaultModel.id)
        }

        // Load existing sessions
        const sessionsData = await openCodeService.getSessions()
        setSessions(sessionsData)

        // Use existing session or create new one
        if (sessionsData.length > 0) {
          setCurrentSession(sessionsData[0])
          // Load messages for the selected session
          const sessionMessages = await openCodeService.getMessages(sessionsData[0].id)
          setMessages(sessionMessages)
        } else {
          // Create a new session if none exist
          const session = await openCodeService.createSession()
          if (session) {
            setCurrentSession(session)
            setSessions([session])
          }
        }

        // Subscribe to events for automatic session updates and message streaming  
        console.log("🔗 Setting up SSE subscription...")
        const unsubscribe = openCodeService.subscribeToEvents((event) => {
          console.log("🔔 Event received:", event.type, event)
          console.log("🔍 Loading state:", isLoading, "Current session:", currentSessionRef.current?.id)
          
          // Add specific debugging for completion events
          if (event.type === "message.updated" || event.type === "session.idle") {
            console.log("🏁 Completion event received, should stop loading")
          }
          
          if (event.type === "session.updated") {
            // Update the session in our list when it gets updated (e.g., title change)
            const updatedSession = event.properties?.info
            if (updatedSession) {
              setSessions((prevSessions) =>
                prevSessions.map((session) =>
                  session.id === updatedSession.id
                    ? {
                      ...session,
                      title: updatedSession.title,
                      updated: new Date(updatedSession.time.updated * 1000),
                    }
                    : session,
                ),
              )

              // Also update current session if it's the one that was updated
              setCurrentSession((prevSession) =>
                prevSession && prevSession.id === updatedSession.id
                  ? {
                    ...prevSession,
                    title: updatedSession.title,
                    updated: new Date(updatedSession.time.updated * 1000),
                  }
                  : prevSession,
              )
            }
          } else if (event.type === "message.part.updated") {
            // Handle streaming message parts
            const part = event.properties?.part
            if (part && currentSessionRef.current && part.sessionID === currentSessionRef.current.id) {
              console.log("✅ Processing message part:", part.type, part.messageID, "Content:", part.text?.substring(0, 50))
              console.log("📊 Part details:", { 
                type: part.type, 
                hasText: !!part.text, 
                textLength: part.text?.length || 0, 
                tool: part.tool,
                // Note: step-start and step-finish parts never have text according to OpenCode SDK
                expectsText: part.type === "text" || part.type === "reasoning"
              })
              
              // Failsafe: If we receive a step-finish part, that means processing is likely complete
              if (part.type === "step-finish") {
                console.log("🏁 Received step-finish part - processing may be complete")
                // Set a short delay to stop loading if no completion event comes
                setTimeout(() => {
                  if (isLoading) {
                    console.log("⚠️ No completion event received after step-finish, stopping loading")
                    setIsLoading(false)
                    if (loadingTimeoutRef.current) {
                      clearTimeout(loadingTimeoutRef.current)
                      loadingTimeoutRef.current = null
                    }
                  }
                }, 2000) // Wait 2 seconds for completion event
              }
              
              setMessages((prevMessages) => {
                const messageIndex = prevMessages.findIndex(msg => msg.id === part.messageID)
                
                if (messageIndex >= 0) {
                  // Update existing message
                  const updatedMessages = [...prevMessages]
                  const existingMessage = updatedMessages[messageIndex]
                  
                  // Check if this part already exists
                  const partIndex = existingMessage.parts.findIndex(p => p.id === part.id)
                  
                  if (partIndex >= 0) {
                    // Update existing part
                    updatedMessages[messageIndex].parts[partIndex] = {
                      id: part.id,
                      type: part.type,
                      text: part.text,
                      tool: part.tool,
                      filename: part.filename,
                      snapshot: part.snapshot,
                      invocation: part.invocation,
                      state: part.state
                    }
                  } else {
                    // Add new part
                    updatedMessages[messageIndex].parts.push({
                      id: part.id,
                      type: part.type,
                      text: part.text,
                      tool: part.tool,
                      filename: part.filename,
                      snapshot: part.snapshot,
                      invocation: part.invocation,
                      state: part.state
                    })
                  }
                  
                  // Update content from content-bearing parts (text and reasoning)
                  const allContentParts = updatedMessages[messageIndex].parts.filter(p => 
                    p.type === "text" || p.type === "reasoning"
                  )
                  if (allContentParts.length > 0) {
                    // Use all content parts to build the complete content
                    const textContent = allContentParts.map(p => p.text || "").filter(t => t.trim()).join("\n")
                    if (textContent) {
                      updatedMessages[messageIndex].content = textContent
                    }
                  }
                  
                  return updatedMessages
                } else {
                  // Create new message if it doesn't exist
                  // Check if this is a user message by looking at sent message IDs
                  const isUserMessage = sentMessageIdsRef.current.has(part.messageID)
                  console.log("🔍 Role check:", {
                    messageID: part.messageID,
                    sentIds: Array.from(sentMessageIdsRef.current),
                    isUserMessage,
                    role: isUserMessage ? "user" : "assistant"
                  })
                  
                  // Generate appropriate content based on part type
                  // According to OpenCode SDK: only "text" and "reasoning" parts have text content
                  let content = ""
                  if (part.type === "text" || part.type === "reasoning") {
                    content = part.text || ""
                  } else if (part.type === "step-start") {
                    // step-start parts have no text field in SDK - use placeholder
                    content = "Processing your request..."
                  } else if (part.type === "step-finish") {
                    // step-finish parts have no text field in SDK - indicates completion
                    content = "" // Will be replaced by fallback if no text parts follow
                  } else if (part.type === "tool") {
                    content = `Running tool: ${part.tool || "Unknown tool"}`
                  } else if (part.type === "file") {
                    content = `File: ${part.filename || "Unknown file"}`
                  } else if (part.type === "snapshot") {
                    content = "Snapshot created"
                  } else if (part.type === "patch") {
                    content = "Code patch applied"
                  } else if (part.type === "agent") {
                    content = `Agent: ${part.tool || "Unknown agent"}`
                  } else {
                    // For any other part types, use fallback
                    content = part.text || `Received ${part.type} part`
                  }
                  
                  const newMessage: OpenCodeMessage = {
                    id: part.messageID,
                    role: isUserMessage ? "user" : "assistant",
                    content,
                    parts: [{
                      id: part.id,
                      type: part.type,
                      text: part.text,
                      tool: part.tool,
                      filename: part.filename,
                      snapshot: part.snapshot,
                      invocation: part.invocation,
                      state: part.state
                    }],
                    timestamp: new Date(),
                  }
                  
                  console.log("➕ Added message to UI:", newMessage.role, newMessage.id, "Content:", newMessage.content.substring(0, 50))
                  return [...prevMessages, newMessage]
                }
              })
            }
                  } else if (event.type === "message.updated") {
            // Message is complete, stop loading
            const messageInfo = event.properties?.info
            console.log("📝 message.updated event details:", {
              hasInfo: !!messageInfo,
              sessionID: messageInfo?.sessionID,
              currentSession: currentSessionRef.current?.id,
              matches: messageInfo && currentSessionRef.current && messageInfo.sessionID === currentSessionRef.current.id
            })
            if (messageInfo && currentSessionRef.current && messageInfo.sessionID === currentSessionRef.current.id) {
              console.log("✅ Message updated/completed - stopping loading:", messageInfo)
              setIsLoading(false)
              // Clear any pending timeout
              if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current)
                loadingTimeoutRef.current = null
              }
              
              // Check if the completed message only has step parts and no text content
              // This is a known issue where follow-up messages don't get proper text responses
              setMessages((prevMessages) => {
                const messageIndex = prevMessages.findIndex(msg => msg.id === messageInfo.id)
                if (messageIndex >= 0) {
                  const message = prevMessages[messageIndex]
                  // According to OpenCode SDK: only "text" and "reasoning" parts contain actual response content
                  const hasContentParts = message.parts.some(p => 
                    (p.type === "text" || p.type === "reasoning") && p.text?.trim()
                  )
                  const hasStepParts = message.parts.some(p => p.type === "step-start" || p.type === "step-finish")
                  const hasToolParts = message.parts.some(p => p.type === "tool")
                  
                  // If assistant message only has step/tool parts without actual content parts,
                  // the server failed to send the response content - add helpful message
                  if ((hasStepParts || hasToolParts) && !hasContentParts && message.role === "assistant") {
                    const updatedMessages = [...prevMessages]
                    const fallbackContent = "I'm processing your request, but there seems to be a communication issue. The response content wasn't received properly. Please try your message again, or check if the OpenCode server is running correctly."
                    
                    updatedMessages[messageIndex] = {
                      ...message,
                      content: fallbackContent,
                      parts: [...message.parts, {
                        id: `fallback_${Date.now()}`,
                        type: "text",
                        text: fallbackContent
                      }]
                    }
                    console.log("🔧 Added fallback content for incomplete message (only step/tool parts):", message.id, "Parts:", message.parts.map(p => p.type))
                    return updatedMessages
                  }
                }
                return prevMessages
              })
            }
          } else if (event.type === "session.idle") {
            // Session is idle, stop loading
            const sessionInfo = event.properties
            console.log("💤 session.idle event details:", {
              hasProperties: !!sessionInfo,
              sessionID: sessionInfo?.sessionID,
              currentSession: currentSessionRef.current?.id,
              matches: sessionInfo && currentSessionRef.current && sessionInfo.sessionID === currentSessionRef.current.id
            })
            if (sessionInfo && currentSessionRef.current && sessionInfo.sessionID === currentSessionRef.current.id) {
              console.log("✅ Session idle - stopping loading:", sessionInfo)
              setIsLoading(false)
              // Clear any pending timeout
              if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current)
                loadingTimeoutRef.current = null
              }
            }
          }
        })

        // Cleanup function
        return unsubscribe
      }
    }

    const cleanup = initializeApp()
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then((unsubscribe) => unsubscribe?.())
      }
    }
  }, [currentServer])

  const handleSessionChange = async (sessionId: string, serverId?: string) => {
    const targetSession = sessions.find((s) => s.id === sessionId)
    console.log("🔄 Session change requested:", {
      sessionId,
      serverId,
      currentServerId: currentServer?.id,
      needsServerSwitch: serverId && serverId !== currentServer?.id,
      sessionTitle: targetSession?.title,
      sessionCreated: targetSession?.created,
      sessionUpdated: targetSession?.updated
    })
    
    const session = targetSession
    if (session) {
      // If session is from a different server, switch to that server first
      if (serverId && serverId !== currentServer?.id) {
        console.log("🔀 Switching to server:", serverId)
        const targetServer = servers.find(s => s.id === serverId)
        if (targetServer) {
          await handleServerChange(serverId)
        }
      }
      
      setCurrentSession(session)
      // Load messages for the selected session
      const sessionMessages = await openCodeService.getMessages(sessionId)
      setMessages(sessionMessages)
      
      // Auto-scroll to bottom when selecting a session
      setTimeout(scrollToBottom, 100)
      
      // Hide sidebar when selecting a session
      setIsSidebarOpen(false)
    }
  }

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId)
    const provider = providers.find((p) => p.id === providerId)
    if (provider && provider.models.length > 0) {
      setSelectedModel(provider.models[0].id)
    }
  }

  const handleServerChange = async (serverId: string) => {
    const server = servers.find(s => s.id === serverId)
    if (server) {
      setCurrentServer(server)
      serversService.setCurrentServer(serverId)

      // Update opencode service with new server URL
      const serverUrl = serversService.getServerUrl(server)
      openCodeService.updateServerUrl(serverUrl)

      // Reconnect and reload data
      const connected = await openCodeService.testConnection()
      setIsConnected(connected)

      if (connected) {
        // Reload all data for new server
        const { providers: providersData, defaults } = await openCodeService.getProviders()
        setProviders(providersData)

        const modesData = await openCodeService.getModes()
        setModes(modesData)
        if (modesData.length > 0) {
          setSelectedMode(modesData[0].name)
        }

        if (providersData.length > 0) {
          let defaultProvider = providersData.find((p) => p.id === "anthropic") || providersData[0]
          let defaultModel = defaultProvider.models[0]

          if (defaults[defaultProvider.id]) {
            const configuredModel = defaultProvider.models.find((m) => m.id === defaults[defaultProvider.id])
            if (configuredModel) {
              defaultModel = configuredModel
            }
          }

          setSelectedProvider(defaultProvider.id)
          setSelectedModel(defaultModel.id)
        }

        const sessionsData = await openCodeService.getSessions()
        setSessions(sessionsData)

        if (sessionsData.length > 0) {
          setCurrentSession(sessionsData[0])
          const sessionMessages = await openCodeService.getMessages(sessionsData[0].id)
          setMessages(sessionMessages)
        } else {
          const session = await openCodeService.createSession()
          if (session) {
            setCurrentSession(session)
            setSessions([session])
            setMessages([])
          }
        }
      }
    }
  }

  const handleManageServers = () => {
    setIsServerManagerOpen(true)
  }

  const handleServerManagerClose = () => {
    setIsServerManagerOpen(false)
    // Reload servers in case they were modified
    const loadedServers = serversService.getServers()
    const currentServerData = serversService.getCurrentServer()
    setServers(loadedServers)
    setCurrentServer(currentServerData)
  }

  const handleRefreshSessions = async () => {
    if (showAllSessions) {
      await loadAllSessions()
    } else if (isConnected) {
      const sessionsData = await openCodeService.getSessions()
      setSessions(sessionsData)
    }
  }

  const handleToggleAllSessions = async () => {
    const newShowAll = !showAllSessions
    setShowAllSessions(newShowAll)
    
    if (newShowAll) {
      await loadAllSessions()
    } else if (currentServer && isConnected) {
      // Switch back to current server sessions
      const sessionsData = await openCodeService.getSessions()
      setSessions(sessionsData)
    }
  }

  const loadAllSessions = async () => {
    const allSessions: OpenCodeSession[] = []
    
    for (const server of servers) {
      try {
        const serverUrl = serversService.getServerUrl(server)
        const serverSessions = await openCodeService.getSessionsFromServer(serverUrl, server.id, server.name)
        allSessions.push(...serverSessions)
      } catch (error) {
        console.error(`Failed to load sessions from server ${server.name}:`, error)
      }
    }
    
    // Sort by updated date, most recent first
    allSessions.sort((a, b) => b.updated.getTime() - a.updated.getTime())
    setSessions(allSessions)
  }

  const handleAddServer = (serverData: Omit<OpenCodeServer, "id">) => {
    const newServer = serversService.addServer(serverData)
    setServers(serversService.getServers())
    return newServer
  }

  const handleUpdateServer = (serverId: string, updates: Partial<Omit<OpenCodeServer, "id">>) => {
    serversService.updateServer(serverId, updates)
    setServers(serversService.getServers())
    setCurrentServer(serversService.getCurrentServer())
  }

  const handleDeleteServer = (serverId: string) => {
    serversService.deleteServer(serverId)
    setServers(serversService.getServers())
    setCurrentServer(serversService.getCurrentServer())
  }

  const handleRefreshDiscovery = async () => {
    await serversService.refreshDiscovery()
    setServers(serversService.getServers())
  }

  const handleSend = async () => {
    console.log("🚀 handleSend called with:", {
      inputTrim: input.trim(),
      isLoading,
      currentSession: currentSession?.id,
      selectedProvider,
      selectedModel,
      canSend: !(!input.trim() || isLoading || !currentSession || !selectedProvider || !selectedModel)
    })
    
    if (!input.trim() || isLoading || !currentSession || !selectedProvider || !selectedModel) {
      console.log("❌ Cannot send message - missing requirements")
      return
    }

    console.log("📤 Sending message:", {
      sessionId: currentSession.id,
      sessionServerId: currentSession.serverId,
      currentServerId: currentServer?.id,
      serverMatch: currentSession.serverId === currentServer?.id
    })

    const messageContent = input.trim()
    setInput("")
    setIsLoading(true)

    // Add safety timeout to prevent infinite loading state
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn("⚠️ Message response timeout - stopping loading state")
      setIsLoading(false)
      loadingTimeoutRef.current = null
    }, 30000) // 30 second timeout

    try {
      // Generate message ID before sending (same logic as in opencode service)
      const messageId = `msg_${Date.now()}`
      
      // Track this message ID as a user message BEFORE sending
      console.log("📤 Pre-tracking sent message ID:", messageId)
      setSentMessageIds(prev => new Set([...prev, messageId]))
      
      // Send the message - the response will come through the event stream
      await openCodeService.sendMessage(
        currentSession.id,
        messageContent,
        selectedProvider,
        selectedModel,
        selectedMode,
        messageId // Pass the messageId to ensure consistency
      )
      
      // The loading state will be managed by the streaming events
    } catch (error) {
      console.error("Failed to send message:", error)
      const errorMessage: OpenCodeMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an error while processing your message. Please make sure the opencode server is running.",
        parts: [{
          id: `part_${Date.now() + 1}`,
          type: "text",
          text: "Sorry, I encountered an error while processing your message. Please make sure the opencode server is running."
        }],
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setIsLoading(false)
      // Clear any pending timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      console.log("⌨️ Enter key pressed, calling handleSend")
      e.preventDefault()
      handleSend()
    }
  }

  const createNewSession = async () => {
    const session = await openCodeService.createSession()
    if (session) {
      setCurrentSession(session)
      setSessions((prev) => [session, ...prev])
      setMessages([])
    }
  }





  return (
    <div className="terminal-window">
      <div className="terminal-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(true)} title="Open Sidebar">
            <Menu size={16} />
          </button>
          <div className="terminal-title"><Logo /></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <MessageFilter
            filters={messageFilters}
            onFiltersChange={setMessageFilters}
          />
          <button className="settings-button-header" onClick={() => setIsSettingsOpen(true)} title="Settings">
            <Wrench size={16} />
          </button>
        </div>
      </div>

      <div className="terminal-content">
        <div className="messages-container" ref={messagesContainerRef}>
          {messages.length === 0 && (
            <div className="message">
              <div className="message-header">
                <span className="message-role">system</span>
                <span className="text-muted">welcome</span>
              </div>
              <div className="message-content">
                <MessagePart
                  part={{
                    id: "welcome",
                    type: "text",
                    text: "Hi. What are we building today?"
                  }}
                />
              </div>
            </div>
          )}

          {messages
            .filter(message => {
              const activeFilters = Object.entries(messageFilters).filter(([_, active]) => active).map(([type, _]) => type)
              if (activeFilters.length === 0) return true // Show all if no filters active
              return message.parts.some(part => activeFilters.includes(part.type))
            })
            .map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                <div className="message-header">
                  <span className={`message-role ${message.role}`}>{message.role}</span>
                  <span className="text-muted">{message.timestamp.toLocaleTimeString()}</span>
                </div>
                <div className="message-content">
                  {message.parts
                    .filter(part => messageFilters[part.type as keyof typeof messageFilters])
                    .map((part) => (
                      <MessagePart key={part.id} part={part} />
                    ))}
                </div>
              </div>
            ))}

          {isLoading && (
            <div className="message assistant">
              <div className="message-header">
                <span className="message-role assistant">assistant</span>
                <span className="text-muted">thinking...</span>
              </div>
              <div className="message-content">
                <BrailleSpinner />
              </div>
            </div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            className="scroll-to-bottom-button"
            onClick={scrollToBottom}
            title="Scroll to bottom"
          >
            <ChevronDown size={16} />
          </button>
        )}

        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              className="input-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
            />
            <button className="send-button" onClick={handleSend} disabled={!input.trim() || isLoading}>
              SEND
            </button>
          </div>
        </div>
      </div>

      <div className="status-bar">
        <div className="status-left">
          <div className="status-item">
            <div className={`status-indicator ${isConnected ? "connected" : "disconnected"}`}></div>
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
        </div>
        <div className="status-right">
          <div className="status-item">
            <CyclingButton
              options={modes.map((mode) => ({
                value: mode.name,
                label: mode.name.charAt(0).toUpperCase() + mode.name.slice(1),
              }))}
              value={selectedMode}
              onChange={setSelectedMode}
            />
          </div>
          <div className="status-item">
            <span>v0.1.0</span>
          </div>
        </div>
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSession={currentSession}
        onSessionChange={handleSessionChange}
        onNewSession={createNewSession}
        onRefreshSessions={handleRefreshSessions}
        providers={providers}
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        onProviderChange={handleProviderChange}
        onModelChange={setSelectedModel}
        servers={servers}
        currentServer={currentServer}
        onServerChange={handleServerChange}
        onManageServers={handleManageServers}
        showAllSessions={showAllSessions}
        onToggleAllSessions={handleToggleAllSessions}
      />

      <ServerManager
        isOpen={isServerManagerOpen}
        onClose={handleServerManagerClose}
        servers={servers}
        currentServer={currentServer}
        onAddServer={handleAddServer}
        onUpdateServer={handleUpdateServer}
        onDeleteServer={handleDeleteServer}
        onRefreshDiscovery={handleRefreshDiscovery}
        isDiscoveryInProgress={serversService.isDiscoveryInProgress()}
      />

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}

export default App
