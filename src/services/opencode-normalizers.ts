import { Permission } from "../types/settings"
import { OpenCodeAgent, OpenCodeMode, OpenCodeProvider } from "./opencode-types"

type ProviderDefaults = Record<string, string>

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const readString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value
  return undefined
}

const normalizeDefaults = (value: unknown): ProviderDefaults => {
  if (!isRecord(value)) return {}

  const result: ProviderDefaults = {}
  const entries = Object.entries(value)
  entries.forEach((entry) => {
    const key = entry[0]
    const item = entry[1]
    if (typeof item !== "string") return
    result[key] = item
  })

  return result
}

const normalizeTools = (value: unknown): Record<string, boolean> => {
  if (!isRecord(value)) return {}

  const result: Record<string, boolean> = {}
  const entries = Object.entries(value)
  entries.forEach((entry) => {
    const key = entry[0]
    const item = entry[1]
    if (typeof item !== "boolean") return
    result[key] = item
  })

  return result
}

const normalizeModel = (value: unknown): OpenCodeMode["model"] | undefined => {
  if (!isRecord(value)) return undefined

  const modelID = readString(value.modelID)
  const providerID = readString(value.providerID)
  if (!modelID || !providerID) return undefined

  return {
    modelID,
    providerID,
  }
}

export const normalizeProviders = (value: unknown): { providers: OpenCodeProvider[]; defaults: ProviderDefaults } => {
  if (!isRecord(value)) {
    return { providers: [], defaults: {} }
  }

  const providersValue = value.providers
  const defaultsValue = normalizeDefaults(value.default ?? value.defaults)
  if (!Array.isArray(providersValue)) {
    return { providers: [], defaults: defaultsValue }
  }

  const providers = providersValue.map((entry) => {
    if (!isRecord(entry)) {
      return {
        id: "unknown",
        name: "Unknown",
        models: [],
      }
    }

    const id = readString(entry.id) ?? "unknown"
    const name = readString(entry.name) ?? id
    const modelsValue = entry.models
    const modelsArray = Array.isArray(modelsValue)
      ? modelsValue
      : isRecord(modelsValue)
        ? Object.values(modelsValue)
        : []
    const models = modelsArray
      .filter((item) => isRecord(item))
      .map((item) => {
        const model = item as Record<string, unknown>
        const modelID = readString(model.id) ?? "unknown"
        const modelName = readString(model.name) ?? modelID
        return {
          id: modelID,
          name: modelName,
        }
      })

    return {
      id,
      name,
      models,
    }
  })

  return { providers, defaults: defaultsValue }
}

export const normalizeModes = (value: unknown): OpenCodeMode[] => {
  if (!Array.isArray(value)) return []

  return value
    .filter((entry) => isRecord(entry))
    .map((entry) => {
      const item = entry as Record<string, unknown>
      const name = readString(item.name) ?? "unknown"
      const tools = normalizeTools(item.tools)
      const model = normalizeModel(item.model)
      const prompt = readString(item.prompt)

      return {
        name,
        model,
        prompt,
        tools,
      }
    })
}

export const normalizeAgents = (value: unknown): OpenCodeAgent[] => {
  if (!Array.isArray(value)) return []

  return value
    .filter((entry) => isRecord(entry))
    .map((entry) => {
      const item = entry as Record<string, unknown>
      const name = readString(item.name) ?? "Unknown Agent"
      const id = readString(item.id) ?? name
      const description = readString(item.description)
      const type = readString(item.type) ?? readString(item.mode) ?? "general"
      const toolsValue = item.tools
      const tools = Array.isArray(toolsValue)
        ? toolsValue.filter((tool) => typeof tool === "string")
        : undefined

      return {
        id,
        name,
        description,
        type,
        tools,
      }
    })
}

export const buildPermissionUpdate = (permissions: { edit?: Permission; bash?: Permission }) => {
  const edit = permissions.edit
  const bash = permissions.bash
  const permission = {
    ...(edit ? { edit } : {}),
    ...(bash ? { bash } : {}),
  }

  if (Object.keys(permission).length === 0) return {}

  return {
    agent: {
      build: {
        permission,
      },
      plan: {
        permission,
      },
    },
    mode: {
      build: {
        permission,
      },
      plan: {
        permission,
      },
    },
  }
}
