import { AppSettings, DEFAULT_SETTINGS } from "../types/settings"

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
    }

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings))
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
    // Apply font settings
    const root = document.documentElement
    const { font, fontSize } = this.settings.appearance

    // Update font family
    const fontStack = this.getFontStack(font)
    root.style.setProperty("--font-mono", fontStack)

    // Update font size
    root.style.setProperty("--font-size-base", `${fontSize}px`)

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
      "Inconsolata",
      "Roboto Mono",
      "Consolas",
      "monospace",
    ]

    // Remove the primary font from fallbacks to avoid duplication
    const filteredFallbacks = fallbacks.filter((font) => font !== primaryFont)

    return `"${primaryFont}", ${filteredFallbacks
      .map((font) => (font === "monospace" ? font : `"${font}"`))
      .join(", ")}`
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
