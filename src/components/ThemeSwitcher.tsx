import React, { useState, useEffect } from "react"
import { getTheme, getThemeNames, applyTheme, themes } from "../themes"

interface ThemeSwitcherProps {
  onThemeChange?: (themeName: string) => void
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ onThemeChange }) => {
  const [currentTheme, setCurrentTheme] = useState("dracula")
  const [isOpen, setIsOpen] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("opencode-theme") || "dracula"
    setCurrentTheme(savedTheme)
    const theme = getTheme(savedTheme)
    applyTheme(theme)
    onThemeChange?.(savedTheme)
  }, [onThemeChange])

  const handleThemeChange = (themeName: string) => {
    setCurrentTheme(themeName)
    localStorage.setItem("opencode-theme", themeName)

    const theme = getTheme(themeName)
    applyTheme(theme)
    onThemeChange?.(themeName)
    setIsOpen(false)
  }

  const themeNames = getThemeNames()
  const currentThemeDisplay = themes[currentTheme]?.displayName || "Dracula"

  return (
    <div className="theme-switcher">
      <button className="theme-switcher-button" onClick={() => setIsOpen(!isOpen)} aria-label="Switch theme">
        <span className="theme-name">{currentThemeDisplay}</span>
        <span className={`theme-arrow ${isOpen ? "open" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className="theme-dropdown">
          <div className="theme-dropdown-header">
            <span>Choose Theme</span>
          </div>
          <div className="theme-list">
            {themeNames.map((themeName) => {
              const theme = themes[themeName]
              const resolvedTheme = getTheme(themeName)

              return (
                <button
                  key={themeName}
                  className={`theme-option ${currentTheme === themeName ? "active" : ""}`}
                  onClick={() => handleThemeChange(themeName)}
                >
                  <div className="theme-preview">
                    <div
                      className="theme-color-bar"
                      style={{
                        background: `linear-gradient(90deg, 
                          ${resolvedTheme.colors.background} 0%, 
                          ${resolvedTheme.colors.primary} 25%, 
                          ${resolvedTheme.colors.secondary} 50%, 
                          ${resolvedTheme.colors.accent} 75%, 
                          ${resolvedTheme.colors.success} 100%)`,
                      }}
                    />
                  </div>
                  <div className="theme-info">
                    <span className="theme-display-name">{theme.displayName}</span>
                    <span className="theme-colors">
                      <span className="color-dot" style={{ backgroundColor: resolvedTheme.colors.primary }} />
                      <span className="color-dot" style={{ backgroundColor: resolvedTheme.colors.secondary }} />
                      <span className="color-dot" style={{ backgroundColor: resolvedTheme.colors.accent }} />
                    </span>
                  </div>
                  {currentTheme === themeName && <span className="theme-check">✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {isOpen && <div className="theme-overlay" onClick={() => setIsOpen(false)} />}
    </div>
  )
}
