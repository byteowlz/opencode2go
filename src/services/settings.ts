import { AppSettings, DEFAULT_SETTINGS } from "../types/settings"
import { getTheme, applyTheme } from "../themes"

const SETTINGS_KEY = "opencode-settings"

class SettingsService {
  private settings: AppSettings = DEFAULT_SETTINGS

  constructor() {
    this.loadSettings()
  }

  loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.settings = { ...DEFAULT_SETTINGS, ...parsed }

        // Ensure nested objects are properly merged
        this.settings.server = { ...DEFAULT_SETTINGS.server, ...parsed.server }
        this.settings.appearance = { ...DEFAULT_SETTINGS.appearance, ...parsed.appearance }
        this.settings.permissions = { ...DEFAULT_SETTINGS.permissions, ...parsed.permissions }
      }

      // Sync with theme switcher's storage if it exists
      const themeSwitcherTheme = localStorage.getItem("opencode-theme")
      if (themeSwitcherTheme && themeSwitcherTheme !== this.settings.appearance.theme) {
        this.settings.appearance.theme = themeSwitcherTheme
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
      this.settings = DEFAULT_SETTINGS
    }

    this.applySettings()
    return this.settings
  }

  saveSettings(newSettings: Partial<AppSettings>): void {
    this.settings = {
      ...this.settings,
      ...newSettings,
      server: { ...this.settings.server, ...newSettings.server },
      appearance: { ...this.settings.appearance, ...newSettings.appearance },
      permissions: { ...this.settings.permissions, ...newSettings.permissions },
    }

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings))
      
      // Sync theme with theme switcher's storage
      if (newSettings.appearance?.theme) {
        localStorage.setItem("opencode-theme", newSettings.appearance.theme)
      }
      
      this.applySettings()
    } catch (error) {
      console.error("Failed to save settings:", error)
    }
  }

  getSettings(): AppSettings {
    return { ...this.settings }
  }

  getServerUrl(): string {
    const { protocol, host, port } = this.settings.server
    return `${protocol}://${host}:${port}`
  }

  private applySettings(): void {
    // Apply theme settings
    const { theme } = this.settings.appearance
    const resolvedTheme = getTheme(theme, 'dark') // Always use dark mode for now
    applyTheme(resolvedTheme)

    // Apply font settings
    const root = document.documentElement
    const { font, fontSize } = this.settings.appearance

    // Update font family
    const fontStack = this.getFontStack(font)
    console.log('Applying font:', font, 'with stack:', fontStack)
    root.style.setProperty("--font-mono", fontStack)

    // Update font size
    console.log('Applying font size:', fontSize)
    root.style.setProperty("--font-size-base", `${fontSize}px`)
    
    // Force a repaint to ensure changes take effect
    root.offsetHeight

    // Scale other font sizes proportionally
    root.style.setProperty("--font-size-xs", `${fontSize * 0.75}px`)
    root.style.setProperty("--font-size-sm", `${fontSize * 0.875}px`)
    root.style.setProperty("--font-size-lg", `${fontSize * 1.125}px`)
    root.style.setProperty("--font-size-xl", `${fontSize * 1.25}px`)
  }

  private getFontStack(primaryFont: string): string {
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

    // Remove the primary font from fallbacks to avoid duplication
    const filteredFallbacks = fallbacks.filter((font) => font !== primaryFont)

    // Always start with the primary font, then add fallbacks
    const fontStack = [primaryFont, ...filteredFallbacks]
      .map((font) => (font === "monospace" ? font : `"${font}"`))
      .join(", ")

    console.log('Generated font stack:', fontStack)
    return fontStack
  }

  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS }
    try {
      localStorage.removeItem(SETTINGS_KEY)
      this.applySettings()
    } catch (error) {
      console.error("Failed to reset settings:", error)
    }
  }
}

export const settingsService = new SettingsService()
