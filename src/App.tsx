import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import "./styles/terminal.css"
import { openCodeService, OpenCodeMessage, OpenCodeSession, OpenCodeProvider, OpenCodeMode } from "./services/opencode"
import { Dropdown } from "./components/Dropdown"
import { Settings } from "./components/Settings"
import { AppSettings } from "./types/settings"
import { Wrench } from "lucide-react"
import { settingsService } from "./services/settings"
import { getTheme } from "./themes"
function App() {
  const [messages, setMessages] = useState<OpenCodeMessage[]>([])
  const [input, setInput] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentSession, setCurrentSession] = useState<OpenCodeSession | null>(null)
  const [sessions, setSessions] = useState<OpenCodeSession[]>([])
  const [providers, setProviders] = useState<OpenCodeProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [selectedMode, setSelectedMode] = useState<string>("build")
  const [modes, setModes] = useState<OpenCodeMode[]>([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [logoSrc, setLogoSrc] = useState("/logo_white.svg")
  const [isNarrowScreen, setIsNarrowScreen] = useState(false)

  // Update logo when theme changes and handle screen size
  useEffect(() => {
    const updateLogo = () => {
      const settings = settingsService.getSettings()
      const theme = getTheme(settings.appearance.theme)
      
      // Simple heuristic: if background is lighter than text, it's a light theme
      const bgBrightness = parseInt(theme.colors.background.slice(1), 16)
      const textBrightness = parseInt(theme.colors.text.slice(1), 16)
      const isLightTheme = bgBrightness > textBrightness
      
      setLogoSrc(isLightTheme ? "/logo_black.svg" : "/logo_white.svg")
    }
    
    const handleResize = () => {
      setIsNarrowScreen(window.innerWidth < 768)
    }
    
    updateLogo()
    handleResize()
    
    // Listen for theme changes and window resize
    const handleStorageChange = () => {
      updateLogo()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Logo component that switches based on theme
  const Logo = () => {
    return (
      <img 
        src={logoSrc} 
        alt="opencode2go" 
        style={{ height: "20px", width: "auto" }}
      />
    )
  }

  // Initialize connection and load data
  useEffect(() => {
    const initializeApp = async () => {
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
  }, [])

  const handleSessionChange = async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId)
    if (session) {
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

  const handleSettingsChange = (_newSettings: AppSettings) => {
    // Update the opencode service with new server URL
    openCodeService.updateServerUrl()

    // Reconnect if the server settings changed
    const initializeApp = async () => {
      const connected = await openCodeService.testConnection()
      setIsConnected(connected)

      if (connected) {
        // Reload providers, modes, and sessions with new server
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

    initializeApp()
  }

  const selectedProviderObj = providers.find((p) => p.id === selectedProvider)

  // Create combined dropdown options for narrow screens
  const getCombinedOptions = () => {
    const options: { value: string; label: string }[] = []
    
    modes.forEach(mode => {
      providers.forEach(provider => {
        provider.models.forEach(model => {
          const value = `${mode.name}|${provider.id}|${model.id}`
          const label = `${mode.name.charAt(0).toUpperCase() + mode.name.slice(1)} • ${provider.name} • ${model.name.length > 10 ? model.name.substring(0, 10) + "..." : model.name}`
          options.push({ value, label })
        })
      })
    })
    
    return options
  }

  const handleCombinedChange = (value: string) => {
    const [mode, providerId, modelId] = value.split('|')
    setSelectedMode(mode)
    setSelectedProvider(providerId)
    setSelectedModel(modelId)
  }

  const getCurrentCombinedValue = () => {
    return `${selectedMode}|${selectedProvider}|${selectedModel}`
  }

  return (
    <div className="terminal-window">
      <div className="terminal-header">
        <div className="terminal-title"><Logo /></div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="settings-button-header" onClick={() => setIsSettingsOpen(true)} title="Settings">
            <Wrench size={16} />
          </button>
        </div>
      </div>

      <div className="terminal-content">
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="message">
              <div className="message-header">
                <span className="message-role">system</span>
                <span className="text-muted">welcome</span>
              </div>
              <div className="message-content">
                <ReactMarkdown>
                  Hi. What are we building today?
                </ReactMarkdown>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="message-header">
                <span className={`message-role ${message.role}`}>{message.role}</span>
                <span className="text-muted">{message.timestamp.toLocaleTimeString()}</span>
              </div>
              <div className="message-content">
                <ReactMarkdown>{message.content}</ReactMarkdown>
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
                <div className="loading"></div>
              </div>
            </div>
          )}
        </div>

        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              className="input-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
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
          <div className="status-item">
            <span>Session:</span>
            <Dropdown
              options={sessions.map((session) => ({
                value: session.id,
                label: `${session.title.length > 20 ? session.title.substring(0, 20) + "..." : session.title} (${session.id.slice(-6)})`,
              }))}
              value={currentSession?.id || ""}
              onChange={handleSessionChange}
              maxWidth="180px"
            />
            <button className="new-session-btn" onClick={createNewSession}>
              +
            </button>
          </div>
        </div>
        <div className="status-right">
          {isNarrowScreen ? (
            <div className="status-item">
              <span>Config:</span>
              <Dropdown
                options={getCombinedOptions()}
                value={getCurrentCombinedValue()}
                onChange={handleCombinedChange}
                maxWidth="200px"
              />
            </div>
          ) : (
            <>
              <div className="status-item">
                <span>Mode:</span>
                <Dropdown
                  options={modes.map((mode) => ({
                    value: mode.name,
                    label: mode.name.charAt(0).toUpperCase() + mode.name.slice(1),
                  }))}
                  value={selectedMode}
                  onChange={setSelectedMode}
                  maxWidth="80px"
                />
              </div>
              <div className="status-item">
                <span>Provider:</span>
                <Dropdown
                  options={providers.map((provider) => ({
                    value: provider.id,
                    label: provider.name,
                  }))}
                  value={selectedProvider}
                  onChange={handleProviderChange}
                  maxWidth="100px"
                />
              </div>
              <div className="status-item">
                <span>Model:</span>
                <Dropdown
                  options={
                    selectedProviderObj?.models.map((model) => ({
                      value: model.id,
                      label: model.name.length > 15 ? model.name.substring(0, 15) + "..." : model.name,
                    })) || []
                  }
                  value={selectedModel}
                  onChange={setSelectedModel}
                  maxWidth="120px"
                />
              </div>
            </>
          )}
          <div className="status-item">
            <span>v0.1.0</span>
          </div>
        </div>
      </div>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  )
}

export default App
