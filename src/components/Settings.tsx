import React, { useState, useEffect } from "react"
import { AppSettings, AVAILABLE_FONTS, FONT_SIZES } from "../types/settings"
import { settingsService } from "../services/settings"
import { getThemeNames, themes, getTheme, applyTheme } from "../themes"
import { Dropdown } from "./Dropdown"

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
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
    // No need to call onSettingsChange for appearance-only changes
    // since they're applied immediately and don't require server reconnection
    onClose()
  }

  const handleCancel = () => {
    setTempSettings(settings)
    // Revert any preview changes
    settingsService.saveSettings(settings)
    onClose()
  }

  const handleReset = () => {
    // Only reset appearance settings, keep server settings unchanged
    const currentSettings = settingsService.getSettings()
    const resetSettings = {
      ...currentSettings,
      appearance: {
        theme: "dracula",
        font: "JetBrains Mono",
        fontSize: 14,
      }
    }
    settingsService.saveSettings(resetSettings)
    setSettings(resetSettings)
    setTempSettings(resetSettings)
    // No need to call onSettingsChange for appearance-only changes
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
        console.log('Settings preview - applying font:', value, 'with stack:', fontStack)
        root.style.setProperty("--font-mono", fontStack)
        // Force repaint
        root.offsetHeight
      } else if (field === "fontSize") {
        const fontSize = value as number
        console.log('Settings preview - applying font size:', fontSize)
        root.style.setProperty("--font-size-base", `${fontSize}px`)
        root.style.setProperty("--font-size-xs", `${fontSize * 0.75}px`)
        root.style.setProperty("--font-size-sm", `${fontSize * 0.875}px`)
        root.style.setProperty("--font-size-lg", `${fontSize * 1.125}px`)
        root.style.setProperty("--font-size-xl", `${fontSize * 1.25}px`)
        // Force repaint
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
    console.log('Settings preview font stack:', fontStack)
    return fontStack
  }

  if (!isOpen) return null

  const themeNames = getThemeNames()

  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Style Settings</h2>
          <button className="settings-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-content">
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
        </div>

        <div className="settings-footer">
          <div className="settings-actions-left">
            <button className="settings-button settings-button-secondary" onClick={handleReset}>
              Reset Style to Defaults
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
