import React, { useState } from "react"
import { OpenCodeServer } from "../types/servers"
import { X, Plus, Trash2, Edit, Search, Wifi, WifiOff } from "lucide-react"
import { BrailleSpinner } from "./BrailleSpinner"
import "./ServerManager.css"

interface ServerManagerProps {
  isOpen: boolean
  onClose: () => void
  servers: OpenCodeServer[]
  currentServer: OpenCodeServer | null
  onAddServer: (server: Omit<OpenCodeServer, "id">) => void
  onUpdateServer: (serverId: string, updates: Partial<Omit<OpenCodeServer, "id">>) => void
  onDeleteServer: (serverId: string) => void
  onRefreshDiscovery?: () => void
  isDiscoveryInProgress?: boolean
}

export const ServerManager: React.FC<ServerManagerProps> = ({
  isOpen,
  onClose,
  servers,
  currentServer,
  onAddServer,
  onUpdateServer,
  onDeleteServer,
  onRefreshDiscovery,
  isDiscoveryInProgress = false
}) => {
  const [editingServer, setEditingServer] = useState<OpenCodeServer | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    protocol: "http" as "http" | "https",
    host: "localhost",
    port: 3000
  })

  const resetForm = () => {
    setFormData({
      name: "",
      protocol: "http",
      host: "localhost",
      port: 3000
    })
    setEditingServer(null)
    setIsAddingNew(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleEdit = (server: OpenCodeServer) => {
    setFormData({
      name: server.name,
      protocol: server.protocol,
      host: server.host,
      port: server.port
    })
    setEditingServer(server)
    setIsAddingNew(false)
  }

  const handleAddNew = () => {
    resetForm()
    setIsAddingNew(true)
  }

  const handleSave = () => {
    if (!formData.name.trim() || !formData.host.trim() || formData.port <= 0) {
      return
    }

    if (isAddingNew) {
      onAddServer(formData)
    } else if (editingServer) {
      onUpdateServer(editingServer.id, formData)
    }

    resetForm()
  }

  const handleDelete = (serverId: string) => {
    if (window.confirm("Are you sure you want to delete this server?")) {
      onDeleteServer(serverId)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="server-manager-overlay" onClick={handleClose} />
      <div className="server-manager-modal">
        <div className="server-manager-header">
          <h2>Manage Servers</h2>
          <button className="server-manager-close" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        <div className="server-manager-content">
          {/* Manual Servers */}
          <div className="server-list-section">
            <div className="server-list-header">
              <h3>Manual Servers</h3>
              <button className="add-server-button" onClick={handleAddNew}>
                <Plus size={16} />
                Add Server
              </button>
            </div>

            <div className="server-list">
              {servers.filter(s => !s.isDiscovered).map((server) => (
                <div
                  key={server.id}
                  className={`server-item ${currentServer?.id === server.id ? "current" : ""}`}
                >
                  <div className="server-info">
                    <div className="server-name">{server.name}</div>
                    <div className="server-url">
                      {server.protocol}://{server.host}:{server.port}
                    </div>
                    {server.lastConnected && (
                      <div className="server-last-connected">
                        Last connected: {server.lastConnected.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="server-actions">
                    <button
                      className="edit-server-button"
                      onClick={() => handleEdit(server)}
                      title="Edit Server"
                    >
                      <Edit size={14} />
                    </button>
                    {!server.isDefault && (
                      <button
                        className="delete-server-button"
                        onClick={() => handleDelete(server.id)}
                        title="Delete Server"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discovered Servers */}
          <div className="server-list-section">
            <div className="server-list-header">
              <h3>
                <Wifi size={16} />
                Discovered Servers
              </h3>
              <button 
                className="refresh-discovery-button" 
                onClick={onRefreshDiscovery}
                disabled={isDiscoveryInProgress}
                title="Refresh Discovery"
              >
                <Search size={16} />
                {isDiscoveryInProgress ? "Scanning..." : "Scan"}
              </button>
            </div>

            <div className="server-list">
              {servers.filter(s => s.isDiscovered).length === 0 ? (
                <div className="no-servers-message">
                  {isDiscoveryInProgress ? (
                    <div className="discovery-progress">
                      <BrailleSpinner />
                      Scanning local network for opencode servers...
                    </div>
                  ) : (
                    <div className="discovery-empty">
                      <WifiOff size={24} />
                      <p>No servers discovered on local network</p>
                      <p className="discovery-hint">Click "Scan" to search for servers</p>
                    </div>
                  )}
                </div>
              ) : (
                servers.filter(s => s.isDiscovered).map((server) => (
                  <div
                    key={server.id}
                    className={`server-item discovered ${currentServer?.id === server.id ? "current" : ""}`}
                  >
                    <div className="server-info">
                      <div className="server-name">
                        <Wifi size={14} className="discovery-icon" />
                        {server.name}
                      </div>
                      <div className="server-url">
                        {server.protocol}://{server.host}:{server.port}
                      </div>
                      {server.discoveredAt && (
                        <div className="server-discovered-at">
                          Discovered: {server.discoveredAt.toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                    <div className="server-actions">
                      <button
                        className="add-discovered-button"
                        onClick={() => {
                          onAddServer({
                            name: server.name.replace(/ \(.*\)$/, ''), // Remove host:port suffix
                            protocol: server.protocol,
                            host: server.host,
                            port: server.port
                          })
                        }}
                        title="Add to Manual Servers"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add/Edit Form */}
          {(isAddingNew || editingServer) && (
            <div className="server-form-section">
              <h3>{isAddingNew ? "Add New Server" : "Edit Server"}</h3>
              
              <div className="server-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Project Server"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Protocol</label>
                  <select
                    value={formData.protocol}
                    onChange={(e) => setFormData({ ...formData, protocol: e.target.value as "http" | "https" })}
                    className="form-select"
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Host</label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="localhost"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Port</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 3000 })}
                    min="1"
                    max="65535"
                    className="form-input"
                  />
                </div>

                <div className="form-actions">
                  <button className="cancel-button" onClick={resetForm}>
                    Cancel
                  </button>
                  <button className="save-button" onClick={handleSave}>
                    {isAddingNew ? "Add Server" : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}