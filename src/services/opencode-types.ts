export interface OpenCodePart {
  id: string
  type: "text" | "reasoning" | "file" | "tool" | "step-start" | "step-finish" | "snapshot" | "patch" | "agent"
  text?: string // Only available on text/reasoning parts
  tool?: string
  filename?: string
  snapshot?: {
    id: string
    title?: string
    url?: string
    data?: unknown
  }
  invocation?: {
    tool: string
    input: unknown
  }
  state?: {
    status: "pending" | "running" | "completed" | "error"
    error?: string
    time?: {
      start: number
      end: number
    }
    input?: unknown
    output?: unknown
  }
  // Additional fields from OpenCode SDK
  synthetic?: boolean
  time?: {
    start: number
    end?: number
  }
  cost?: number
  tokens?: {
    input: number
    output: number
    reasoning: number
    cache: {
      read: number
      write: number
    }
  }
}

export interface OpenCodeMessage {
  id: string
  role: "user" | "assistant"
  content: string
  parts: OpenCodePart[]
  timestamp: Date
  providerID?: string
  modelID?: string
}

export interface OpenCodeSession {
  id: string
  title: string
  created: Date
  updated: Date
  parentID?: string
  serverId?: string
  serverName?: string
}

export interface OpenCodeProvider {
  id: string
  name: string
  models: OpenCodeModel[]
}

export interface OpenCodeModel {
  id: string
  name: string
}

export interface OpenCodeMode {
  name: string
  model?: {
    modelID: string
    providerID: string
  }
  prompt?: string
  tools: Record<string, boolean>
}

export interface ToastNotification {
  title?: string
  message: string
  variant: "info" | "success" | "warning" | "error"
}

export interface OpenCodeAgent {
  id: string
  name: string
  description?: string
  type: string
  tools?: string[]
}
