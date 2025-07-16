import React, { useState, useEffect } from "react"
import { AppSettings, AVAILABLE_FONTS, FONT_SIZES } from "../types/settings"
import { settingsService } from "../services/settings"
import { getThemeNames, themes } from "../themes"
import { Dropdown } from "./Dropdown"

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
  onSettingsChange?: (settings: AppSettings) => void
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, onSettingsChange }) => {
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings())
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings)

  useEffect(() => {
    if (isOpen) {
      const currentSettings = settingsService.getSettings()
      setSettings(currentSettings)
      setTempSettings(currentSettings)
    }
  }, [isOpen])

  const handleSave = () => {
    settingsService.saveSettings(tempSettings)
    setSettings(tempSettings)
    onSettingsChange?.(tempSettings)
    onClose()
  }

  const handleCancel = () => {
    setTempSettings(settings)
    onClose()
  }

  const handleReset = () => {
    settingsService.resetSettings()
    const resetSettings = settingsService.getSettings()
    setSettings(resetSettings)
    setTempSettings(resetSettings)
    onSettingsChange?.(resetSettings)
  }

  const updateServerSettings = (field: keyof AppSettings["server"], value: string | number) => {
    setTempSettings((prev) => ({
      ...prev,
      server: {
        ...prev.server,
        [field]: value,
      },
    }))
  }

  const updateAppearanceSettings = (field: keyof AppSettings["appearance"], value: string | number) => {
    setTempSettings((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [field]: value,
      },
    }))
  }

  if (!isOpen) return null

  const themeNames = getThemeNames()

  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-content">
          {/* Server Configuration */}
          <div className="settings-section">
            <h3>Server Configuration</h3>
            <div className="settings-group">
              <label>Protocol</label>
              <Dropdown
                options={[
                  { value: "http", label: "HTTP" },
                  { value: "https", label: "HTTPS" },
                ]}
                value={tempSettings.server.protocol}
                onChange={(value) => updateServerSettings("protocol", value as "http" | "https")}
                maxWidth="100px"
              />
            </div>
            <div className="settings-group">
              <label>Host</label>
              <input
                type="text"
                value={tempSettings.server.host}
                onChange={(e) => updateServerSettings("host", e.target.value)}
                placeholder="localhost"
                className="settings-input"
              />
            </div>
            <div className="settings-group">
              <label>Port</label>
              <input
                type="number"
                value={tempSettings.server.port}
                onChange={(e) => updateServerSettings("port", parseInt(e.target.value) || 3000)}
                placeholder="3000"
                className="settings-input"
                min="1"
                max="65535"
              />
            </div>
            <div className="settings-info">
              <span>
                Server URL: {tempSettings.server.protocol}://{tempSettings.server.host}:{tempSettings.server.port}
              </span>
            </div>
          </div>

          {/* Appearance */}
          <div className="settings-section">
            <h3>Appearance</h3>
            <div className="settings-group">
              <label>Theme</label>
              <Dropdown
                options={themeNames.map((name) => ({
                  value: name,
                  label: themes[name]?.displayName || name,
                }))}
                value={tempSettings.appearance.theme}
                onChange={(value) => updateAppearanceSettings("theme", value)}
                maxWidth="150px"
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
        </div>

        <div className="settings-footer">
          <div className="settings-actions-left">
            <button className="settings-button settings-button-secondary" onClick={handleReset}>
              Reset to Defaults
            </button>
          </div>
          <div className="settings-actions-right">
            <button className="settings-button settings-button-secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button className="settings-button settings-button-primary" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
