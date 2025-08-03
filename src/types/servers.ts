export interface OpenCodeServer {
  id: string
  name: string
  protocol: "http" | "https"
  host: string
  port: number
  isDefault?: boolean
  lastConnected?: Date
  isDiscovered?: boolean
  discoveredAt?: Date
}

export interface ServerConnectionStatus {
  serverId: string
  isConnected: boolean
  lastChecked: Date
  error?: string
}