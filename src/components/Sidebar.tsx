import React from "react"
import { NestedDropdown } from "./NestedDropdown"
import { Dropdown } from "./Dropdown"
import { OpenCodeSession, OpenCodeProvider } from "../services/opencode"
import { OpenCodeServer } from "../types/servers"
import { Plus, MessageSquare, X, RefreshCw, Server, Settings } from "lucide-react"
import "./Sidebar.css"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  sessions: OpenCodeSession[]
  currentSession: OpenCodeSession | null
  onSessionChange: (sessionId: string, serverId?: string) => void
  onNewSession: () => void
  onRefreshSessions?: () => void
  providers: OpenCodeProvider[]
  selectedProvider: string
  selectedModel: string
  onProviderChange: (providerId: string) => void
  onModelChange: (modelId: string) => void
  servers: OpenCodeServer[]
  currentServer: OpenCodeServer | null
  onServerChange: (serverId: string) => void
  onManageServers?: () => void
  showAllSessions?: boolean
  onToggleAllSessions?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSession,
  onSessionChange,
  onNewSession,
  onRefreshSessions,
  providers,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  servers,
  currentServer,
  onServerChange,
  onManageServers,
  showAllSessions = false,
  onToggleAllSessions
}) => {
  // Create provider/model options for nested dropdown
  const getProviderModelOptions = () => {
    return providers.map(provider => ({
      value: provider.id,
      label: provider.name,
      children: provider.models.map(model => ({
        value: model.id,
        label: model.name.length > 25 ? model.name.substring(0, 25) + "..." : model.name
      }))
    }))
  }

  const handleProviderModelChange = (value: { provider: string; model: string }) => {
    onProviderChange(value.provider)
    onModelChange(value.model)
  }

  const getCurrentProviderModelValue = () => {
    return {
      provider: selectedProvider,
      model: selectedModel
    }
  }

  // Organize sessions into parent-child hierarchy
  const organizeSessionsHierarchy = (sessions: OpenCodeSession[]) => {
    const sessionMap = new Map<string, OpenCodeSession>()
    const parentSessions: OpenCodeSession[] = []
    const childSessions = new Map<string, OpenCodeSession[]>()

    // First pass: create map and identify parents
    sessions.forEach(session => {
      sessionMap.set(session.id, session)
      if (!session.parentID) {
        parentSessions.push(session)
      }
    })

    // Second pass: organize children under parents
    sessions.forEach(session => {
      if (session.parentID) {
        if (!childSessions.has(session.parentID)) {
          childSessions.set(session.parentID, [])
        }
        childSessions.get(session.parentID)!.push(session)
      }
    })

    // Sort children by creation date
    childSessions.forEach(children => {
      children.sort((a, b) => b.created.getTime() - a.created.getTime())
    })

    return { parentSessions, childSessions }
  }

  const { parentSessions, childSessions } = organizeSessionsHierarchy(sessions)

  // Create server options including "All"
  const getServerOptions = () => {
    const options = [
      { value: "all", label: "All Servers" },
      ...servers.map(server => ({
        value: server.id,
        label: server.name
      }))
    ]
    return options
  }

  const getCurrentServerValue = () => {
    return showAllSessions ? "all" : (currentServer?.id || "")
  }

  const handleServerDropdownChange = (value: string) => {
    if (value === "all") {
      onToggleAllSessions?.()
    } else {
      onServerChange(value)
    }
  }

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h3>Chat & Settings</h3>
          <button className="sidebar-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="sidebar-content">
          {/* Server Selection */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <h4>Server</h4>
              {onManageServers && (
                <button className="manage-servers-button" onClick={onManageServers} title="Manage Servers">
                  <Settings size={14} />
                </button>
              )}
            </div>
            <div className="sidebar-group">
              <label>Current Server</label>
              <Dropdown
                options={getServerOptions()}
                value={getCurrentServerValue()}
                onChange={handleServerDropdownChange}
                maxWidth="100%"
                placeholder="Select server"
              />
            </div>
            {currentServer && (
              <div className="sidebar-info">
                <Server size={12} />
                <span>{currentServer.protocol}://{currentServer.host}:{currentServer.port}</span>
              </div>
            )}
          </div>

          {/* Provider/Model Selection */}
          <div className="sidebar-section">
            <h4>AI Configuration</h4>
            <div className="sidebar-group">
              <label>Provider & Model</label>
              <NestedDropdown
                options={getProviderModelOptions()}
                value={getCurrentProviderModelValue()}
                onChange={handleProviderModelChange}
                maxWidth="100%"
                placeholder="Select provider and model"
              />
            </div>
          </div>

          {/* Chat History */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <h4>Chat History</h4>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {onRefreshSessions && (
                  <button className="refresh-sessions-button" onClick={onRefreshSessions} title="Refresh Sessions">
                    <RefreshCw size={14} />
                  </button>
                )}
                <button className="new-session-button" onClick={onNewSession} title="New Chat">
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="sidebar-info">
              <span>{showAllSessions ? "Showing sessions from all servers" : "Showing sessions from current server"}</span>
            </div>
            
            <div className="sessions-list">
              {sessions.length === 0 ? (
                <div className="no-sessions">
                  <MessageSquare size={24} />
                  <span>No chat sessions yet</span>
                  <button className="create-first-session" onClick={onNewSession}>
                    Start New Chat
                  </button>
                </div>
              ) : (
                <>
                  {parentSessions.map((session) => (
                    <div key={session.id}>
                      {/* Parent Session */}
                      <button
                        className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
                        onClick={() => onSessionChange(session.id, session.serverId)}
                      >
                        <div className="session-title">
                          {session.title.length > 30 ? session.title.substring(0, 30) + "..." : session.title}
                        </div>
                        <div className="session-meta">
                          <span className="session-id">#{session.id.slice(-6)}</span>
                          {showAllSessions && session.serverName && (
                            <span className="session-server">{session.serverName}</span>
                          )}
                          <span className="session-time">
                            {session.updated.toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                      
                      {/* Child Sessions */}
                      {childSessions.get(session.id)?.map((childSession) => (
                        <button
                          key={childSession.id}
                          className={`session-item session-child ${currentSession?.id === childSession.id ? 'active' : ''}`}
                          onClick={() => onSessionChange(childSession.id, childSession.serverId)}
                        >
                          <div className="session-title">
                            {childSession.title.length > 25 ? childSession.title.substring(0, 25) + "..." : childSession.title}
                          </div>
                          <div className="session-meta">
                            <span className="session-id">#{childSession.id.slice(-6)}</span>
                            {showAllSessions && childSession.serverName && (
                              <span className="session-server">{childSession.serverName}</span>
                            )}
                            <span className="session-time">
                              {childSession.updated.toLocaleDateString()}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}