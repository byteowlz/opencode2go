import { OpenCodeServer } from "../types/servers"
import { discoveryService, DiscoveredServer } from "./discovery"

const SERVERS_STORAGE_KEY = "opencode-servers"
const CURRENT_SERVER_STORAGE_KEY = "opencode-current-server"

class ServersService {
  private servers: OpenCodeServer[] = []
  private discoveredServers: OpenCodeServer[] = []
  private currentServerId: string | null = null
  private discoveryStopFn: (() => void) | null = null

  constructor() {
    this.loadServers()
    this.loadCurrentServer()
    this.initializeDiscovery()
  }

  private loadServers(): void {
    try {
      const stored = localStorage.getItem(SERVERS_STORAGE_KEY)
      if (stored) {
        this.servers = JSON.parse(stored).map((server: any) => ({
          ...server,
          lastConnected: server.lastConnected ? new Date(server.lastConnected) : undefined
        }))
      } else {
        // Initialize with default server
        this.servers = [this.getDefaultServer()]
        this.saveServers()
      }
    } catch (error) {
      console.error("Failed to load servers:", error)
      this.servers = [this.getDefaultServer()]
    }
  }

  private loadCurrentServer(): void {
    try {
      const stored = localStorage.getItem(CURRENT_SERVER_STORAGE_KEY)
      if (stored) {
        this.currentServerId = stored
      } else {
        // Set first server as current
        if (this.servers.length > 0) {
          this.currentServerId = this.servers[0].id
          this.saveCurrentServer()
        }
      }
    } catch (error) {
      console.error("Failed to load current server:", error)
    }
  }

  private saveServers(): void {
    try {
      localStorage.setItem(SERVERS_STORAGE_KEY, JSON.stringify(this.servers))
    } catch (error) {
      console.error("Failed to save servers:", error)
    }
  }

  private saveCurrentServer(): void {
    try {
      if (this.currentServerId) {
        localStorage.setItem(CURRENT_SERVER_STORAGE_KEY, this.currentServerId)
      }
    } catch (error) {
      console.error("Failed to save current server:", error)
    }
  }

  private getDefaultServer(): OpenCodeServer {
    return {
      id: "default",
      name: "Local Server",
      protocol: "http",
      host: "localhost",
      port: 3000,
      isDefault: true
    }
  }

  getServers(): OpenCodeServer[] {
    return this.getAllServers()
  }

  getCurrentServer(): OpenCodeServer | null {
    if (!this.currentServerId) return null
    const allServers = this.getAllServers()
    return allServers.find(server => server.id === this.currentServerId) || null
  }

  getCurrentServerId(): string | null {
    return this.currentServerId
  }

  setCurrentServer(serverId: string): boolean {
    const allServers = this.getAllServers()
    const server = allServers.find(s => s.id === serverId)
    if (server) {
      this.currentServerId = serverId
      this.saveCurrentServer()
      return true
    }
    return false
  }

  addServer(server: Omit<OpenCodeServer, "id">): OpenCodeServer {
    const newServer: OpenCodeServer = {
      ...server,
      id: `server_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    }
    
    this.servers.push(newServer)
    this.saveServers()
    return newServer
  }

  updateServer(serverId: string, updates: Partial<Omit<OpenCodeServer, "id">>): boolean {
    const index = this.servers.findIndex(s => s.id === serverId)
    if (index !== -1) {
      this.servers[index] = { ...this.servers[index], ...updates }
      this.saveServers()
      return true
    }
    return false
  }

  deleteServer(serverId: string): boolean {
    const index = this.servers.findIndex(s => s.id === serverId)
    if (index !== -1 && !this.servers[index].isDefault) {
      this.servers.splice(index, 1)
      
      // If we deleted the current server, switch to first available
      if (this.currentServerId === serverId) {
        this.currentServerId = this.servers.length > 0 ? this.servers[0].id : null
        this.saveCurrentServer()
      }
      
      this.saveServers()
      return true
    }
    return false
  }

  getServerUrl(server?: OpenCodeServer): string {
    const targetServer = server || this.getCurrentServer()
    if (!targetServer) return "http://localhost:3000"
    
    return `${targetServer.protocol}://${targetServer.host}:${targetServer.port}`
  }

  updateLastConnected(serverId: string): void {
    const server = this.servers.find(s => s.id === serverId)
    if (server) {
      server.lastConnected = new Date()
      this.saveServers()
    }
  }

  private async initializeDiscovery(): Promise<void> {
    try {
      // Set up discovery listener
      discoveryService.onDiscoveryUpdate((discovered: DiscoveredServer[]) => {
        this.updateDiscoveredServers(discovered)
      })

      // Start periodic discovery (every 30 seconds)
      this.discoveryStopFn = await discoveryService.startPeriodicDiscovery(30000)
    } catch (error) {
      console.error("Failed to initialize server discovery:", error)
    }
  }

  private updateDiscoveredServers(discovered: DiscoveredServer[]): void {
    const newDiscoveredServers = discoveryService.convertToOpenCodeServers(discovered)
    
    // Filter out discovered servers that are already manually added
    const manualServerKeys = this.servers
      .filter(s => !s.isDiscovered)
      .map(s => `${s.host}:${s.port}`)
    
    this.discoveredServers = newDiscoveredServers.filter(server => 
      !manualServerKeys.includes(`${server.host}:${server.port}`)
    )
    
    console.log(`📡 Updated discovered servers: ${this.discoveredServers.length} found`)
  }

  getAllServers(): OpenCodeServer[] {
    // Return manual servers first, then discovered servers
    return [...this.servers, ...this.discoveredServers]
  }

  getManualServers(): OpenCodeServer[] {
    return [...this.servers]
  }

  getDiscoveredServers(): OpenCodeServer[] {
    return [...this.discoveredServers]
  }

  async refreshDiscovery(): Promise<void> {
    await discoveryService.discoverServers()
  }

  isDiscoveryInProgress(): boolean {
    return discoveryService.isDiscoveryInProgress()
  }

  stopDiscovery(): void {
    if (this.discoveryStopFn) {
      this.discoveryStopFn()
      this.discoveryStopFn = null
    }
  }
}

export const serversService = new ServersService()