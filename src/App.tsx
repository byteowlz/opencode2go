import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import "./styles/terminal.css"
import { openCodeService, OpenCodeMessage, OpenCodeSession, OpenCodeProvider } from "./services/opencode"
import { ThemeSwitcher } from "./components/ThemeSwitcher"
import { Dropdown } from "./components/Dropdown"
import { Settings } from "./components/Settings"
import { AppSettings } from "./types/settings"

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Initialize connection and load data
  useEffect(() => {
    const initializeApp = async () => {
      const connected = await openCodeService.testConnection()
      setIsConnected(connected)

      if (connected) {
        const { providers: providersData, defaults } = await openCodeService.getProviders()
        setProviders(providersData)

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
        // Reload providers and sessions with new server
        const { providers: providersData, defaults } = await openCodeService.getProviders()
        setProviders(providersData)

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

  return (
    <div className="terminal-window">
      <div className="terminal-header">
        <div className="terminal-title">opencode2go</div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="settings-button-header" onClick={() => setIsSettingsOpen(true)} title="Settings">
            ⚙️
          </button>
          <ThemeSwitcher />
          <div className="terminal-controls">
            <button className="terminal-button close" />
            <button className="terminal-button minimize" />
            <button className="terminal-button maximize" />
          </div>
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
                  Welcome to opencode2go! Start a conversation with your AI coding assistant.
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
