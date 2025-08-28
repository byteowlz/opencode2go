import React, { useState, useEffect } from "react"
import { OpenCodeServer } from "../types/servers"
import { X, Plus, Trash2, Edit, Search, Wifi, WifiOff, Palette } from "lucide-react"
import { BrailleSpinner } from "./BrailleSpinner"
import { Dropdown } from "./Dropdown"
import { AppSettings, AVAILABLE_FONTS, FONT_SIZES, Permission } from "../types/settings"
import { settingsService } from "../services/settings"
import { openCodeService } from "../services/opencode"
import { getThemeNames, themes, getTheme, applyTheme } from "../themes"
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

  // Settings state
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings())
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings)
  const [activeTab, setActiveTab] = useState<'servers' | 'settings'>('servers')

  useEffect(() => {
    if (isOpen) {
      const currentSettings = settingsService.getSettings()
      setSettings(currentSettings)
      setTempSettings(currentSettings)
    }
  }, [isOpen])

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

  const handleSaveSettings = async () => {
    settingsService.saveSettings(tempSettings)
    setSettings(tempSettings)
    
    // Send permission updates to the opencode server
    try {
      await openCodeService.updatePermissions({
        edit: tempSettings.permissions.edit,
        bash: tempSettings.permissions.bash,
      })
    } catch (error) {
      console.error("Failed to update server permissions:", error)
    }
  }

  const handleCancelSettings = () => {
    setTempSettings(settings)
    // Revert any preview changes
    settingsService.saveSettings(settings)
  }

  const handleResetSettings = () => {
    // Reset appearance and permissions settings, keep server settings unchanged
    const currentSettings = settingsService.getSettings()
    const resetSettings = {
      ...currentSettings,
      appearance: {
        theme: "dracula",
        font: "JetBrains Mono",
        fontSize: 14,
      },
      permissions: {
        edit: "ask" as Permission,
        bash: "ask" as Permission,
      }
    }
    settingsService.saveSettings(resetSettings)
    setSettings(resetSettings)
    setTempSettings(resetSettings)
  }

  const updatePermissionSettings = (field: keyof AppSettings["permissions"], value: Permission) => {
    const newTempSettings = {
      ...tempSettings,
      permissions: {
        ...tempSettings.permissions,
        [field]: value,
      },
    }
    setTempSettings(newTempSettings)
  }

  const updateAppearanceSettings = (field: keyof AppSettings["appearance"], value: string | number) => {
    const newTempSettings = {
      ...tempSettings,
      appearance: {
        ...tempSettings.appearance,
        [field]: value,
      },
    }
    setTempSettings(newTempSettings)

    // Apply settings immediately for preview (without saving to localStorage)
    if (field === "theme") {
      const theme = getTheme(value as string, 'dark')
      applyTheme(theme)
      // Also sync with theme switcher storage for consistency
      localStorage.setItem("opencode-theme", value as string)
    } else if (field === "font" || field === "fontSize") {
      // Apply font changes immediately
      const root = document.documentElement
      if (field === "font") {
        const fontStack = getFontStack(value as string)
        root.style.setProperty("--font-mono", fontStack)
        root.offsetHeight
      } else if (field === "fontSize") {
        const fontSize = value as number
        root.style.setProperty("--font-size-base", `${fontSize}px`)
        root.style.setProperty("--font-size-xs", `${fontSize * 0.75}px`)
        root.style.setProperty("--font-size-sm", `${fontSize * 0.875}px`)
        root.style.setProperty("--font-size-lg", `${fontSize * 1.125}px`)
        root.style.setProperty("--font-size-xl", `${fontSize * 1.25}px`)
        root.offsetHeight
      }
    }
  }

  const getFontStack = (primaryFont: string): string => {
    const fallbacks = [
      "JetBrains Mono",
      "Fira Code",
      "SF Mono",
      "Monaco",
      "Menlo",
      "Inconsolata",
      "Roboto Mono",
      "Consolas",
      "Courier New",
      "monospace",
    ]
    const filteredFallbacks = fallbacks.filter((font) => font !== primaryFont)
    const fontStack = [primaryFont, ...filteredFallbacks]
      .map((font) => (font === "monospace" ? font : `"${font}"`))
      .join(", ")
    return fontStack
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
          <h2>Settings & Servers</h2>
          <div className="server-manager-tabs">
            <button 
              className={`tab-button ${activeTab === 'servers' ? 'active' : ''}`}
              onClick={() => setActiveTab('servers')}
            >
              Servers
            </button>
            <button 
              className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Palette size={14} />
              Settings
            </button>
          </div>
          <button className="server-manager-close" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        <div className="server-manager-content">
          {activeTab === 'servers' ? (
            <>
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
            </>
          ) : (
            /* Settings Tab */
            <>
              {/* Appearance Settings */}
              <div className="settings-section">
                <h3>Appearance</h3>
                <div className="settings-group">
                  <label>Theme</label>
                  <Dropdown
                    options={getThemeNames().map((name) => ({
                      value: name,
                      label: themes[name]?.displayName || name,
                    }))}
                    value={tempSettings.appearance.theme}
                    onChange={(value) => updateAppearanceSettings("theme", value)}
                    maxWidth="400px"
                  />
                </div>
                <div className="settings-group">
                  <label>Font Family</label>
                  <Dropdown
                    options={AVAILABLE_FONTS.map((font) => ({
                      value: font,
                      label: font,
                    }))}
                    value={tempSettings.appearance.font}
                    onChange={(value) => updateAppearanceSettings("font", value)}
                    maxWidth="150px"
                  />
                </div>
                <div className="settings-group">
                  <label>Font Size</label>
                  <Dropdown
                    options={FONT_SIZES.map((size) => ({
                      value: size.value.toString(),
                      label: size.label,
                    }))}
                    value={tempSettings.appearance.fontSize.toString()}
                    onChange={(value) => updateAppearanceSettings("fontSize", parseInt(value))}
                    maxWidth="150px"
                  />
                </div>
              </div>

              {/* Permissions Settings */}
              <div className="settings-section">
                <h3>Tool Permissions</h3>
                <div className="settings-group">
                  <label>File Editing</label>
                  <Dropdown
                    options={[
                      { value: "ask", label: "Ask" },
                      { value: "allow", label: "Allow" },
                      { value: "deny", label: "Deny" },
                    ]}
                    value={tempSettings.permissions.edit}
                    onChange={(value) => updatePermissionSettings("edit", value as Permission)}
                    maxWidth="150px"
                  />
                </div>
                <div className="settings-group">
                  <label>Bash Commands</label>
                  <Dropdown
                    options={[
                      { value: "ask", label: "Ask" },
                      { value: "allow", label: "Allow" },
                      { value: "deny", label: "Deny" },
                    ]}
                    value={tempSettings.permissions.bash}
                    onChange={(value) => updatePermissionSettings("bash", value as Permission)}
                    maxWidth="150px"
                  />
                </div>
              </div>

              {/* Settings Actions */}
              <div className="settings-footer">
                <div className="settings-actions-left">
                  <button className="settings-button settings-button-secondary" onClick={handleResetSettings}>
                    Reset to Defaults
                  </button>
                  <button className="settings-button settings-button-danger" onClick={() => {
                    if (confirm("🧹 Clear all app state?\\n\\nThis will clear all saved servers, settings, and reload the app.\\n\\nThis action cannot be undone.")) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}>
                    Clear App State
                  </button>
                </div>
                <div className="settings-actions-right">
                  <button className="settings-button settings-button-secondary" onClick={handleCancelSettings}>
                    Cancel
                  </button>
                  <button className="settings-button settings-button-primary" onClick={handleSaveSettings}>
                    Save
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}