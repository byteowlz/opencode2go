import { useState, useEffect, useRef } from "react"
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
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const atBottom = isAtBottom()
      setShowScrollButton(!atBottom && messages.length > 0)
    }
  }

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
  }, [])

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

        // Subscribe to events for automatic session updates
        const unsubscribe = openCodeService.subscribeToEvents((event) => {
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
    const session = sessions.find((s) => s.id === sessionId)
    if (session) {
      // If session is from a different server, switch to that server first
      if (serverId && serverId !== currentServer?.id) {
        const targetServer = servers.find(s => s.id === serverId)
        if (targetServer) {
          await handleServerChange(serverId)
        }
      }
      
      setCurrentSession(session)
      // Load messages for the selected session
      const sessionMessages = await openCodeService.getMessages(sessionId)
      setMessages(sessionMessages)
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
    if (!input.trim() || isLoading || !currentSession || !selectedProvider || !selectedModel) return

    const userMessage: OpenCodeMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      parts: [{
        id: `part_${Date.now()}`,
        type: "text",
        text: input.trim()
      }],
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await openCodeService.sendMessage(
        currentSession.id,
        userMessage.content,
        selectedProvider,
        selectedModel,
        selectedMode,
      )

      if (response) {
        setMessages((prev) => [...prev, response])
      }
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
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
