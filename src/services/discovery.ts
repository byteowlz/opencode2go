import { invoke } from "@tauri-apps/api/core"
import { OpenCodeServer } from "../types/servers"

export interface DiscoveredServer {
  host: string
  port: number
  name: string
  version?: string
  response_time_ms: number
}

class DiscoveryService {
  private isDiscovering = false
  private discoveredServers: DiscoveredServer[] = []
  private listeners: Array<(servers: DiscoveredServer[]) => void> = []

  async discoverServers(): Promise<DiscoveredServer[]> {
    if (this.isDiscovering) {
      return this.discoveredServers
    }

    this.isDiscovering = true
    
    try {
      console.log("🔍 Starting server discovery...")
      const discovered = await invoke<DiscoveredServer[]>("discover_servers")
      
      this.discoveredServers = discovered
      console.log(`✅ Found ${discovered.length} opencode servers:`, discovered)
      
      // Notify listeners
      this.listeners.forEach(listener => listener(discovered))
      
      return discovered
    } catch (error) {
      console.error("❌ Server discovery failed:", error)
      return []
    } finally {
      this.isDiscovering = false
    }
  }

  convertToOpenCodeServers(discovered: DiscoveredServer[]): OpenCodeServer[] {
    return discovered.map(server => ({
      id: `discovered_${server.host}_${server.port}`,
      name: `${server.name} (${server.host}:${server.port})`,
      protocol: "http" as const,
      host: server.host,
      port: server.port,
      isDiscovered: true,
      discoveredAt: new Date(),
    }))
  }

  onDiscoveryUpdate(listener: (servers: DiscoveredServer[]) => void): () => void {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  getDiscoveredServers(): DiscoveredServer[] {
    return [...this.discoveredServers]
  }

  isDiscoveryInProgress(): boolean {
    return this.isDiscovering
  }

  async startPeriodicDiscovery(intervalMs: number = 30000): Promise<() => void> {
    // Initial discovery
    await this.discoverServers()
    
    // Set up periodic discovery
    const interval = setInterval(() => {
      this.discoverServers()
    }, intervalMs)
    
    // Return stop function
    return () => {
      clearInterval(interval)
    }
  }
}

export const discoveryService = new DiscoveryService()