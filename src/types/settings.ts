export interface AppSettings {
  server: {
    host: string
    port: number
    protocol: "http" | "https"
  }
  appearance: {
    theme: string
    font: string
    fontSize: number
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  server: {
    host: "localhost",
    port: 4096,
    protocol: "http",
  },
  appearance: {
    theme: "dracula",
    font: "JetBrains Mono",
    fontSize: 14,
  },
}

export const AVAILABLE_FONTS = [
  "JetBrains Mono",
  "Fira Code",
  "SF Mono",
  "Monaco",
  "Inconsolata",
  "Roboto Mono",
  "Consolas",
  "Courier New",
  "Menlo",
  "Source Code Pro",
  "Ubuntu Mono",
  "Cascadia Code",
  "monospace",
]

export const FONT_SIZES = [
  { label: "Small (12px)", value: 12 },
  { label: "Medium (14px)", value: 14 },
  { label: "Large (16px)", value: 16 },
  { label: "Extra Large (18px)", value: 18 },
]
