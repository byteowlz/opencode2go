import { describe, expect, test } from "bun:test"
import { buildPermissionUpdate, normalizeModes, normalizeProviders } from "./opencode-normalizers"

describe("normalizeProviders", () => {
  test("maps provider models from object and defaults", () => {
    const input = {
      providers: [
        {
          id: "anthropic",
          name: "Anthropic",
          models: {
            "claude-3": {
              id: "claude-3",
              name: "Claude 3",
            },
          },
        },
      ],
      default: {
        anthropic: "claude-3",
      },
    }

    const result = normalizeProviders(input)

    expect(result.defaults.anthropic).toBe("claude-3")
    expect(result.providers.length).toBe(1)
    expect(result.providers[0].id).toBe("anthropic")
    expect(result.providers[0].models[0].id).toBe("claude-3")
  })

  test("maps provider models from array and defaults fallback", () => {
    const input = {
      providers: [
        {
          id: "openai",
          name: "OpenAI",
          models: [
            {
              id: "gpt-4",
              name: "GPT-4",
            },
          ],
        },
      ],
      defaults: {
        openai: "gpt-4",
      },
    }

    const result = normalizeProviders(input)

    expect(result.defaults.openai).toBe("gpt-4")
    expect(result.providers[0].models[0].name).toBe("GPT-4")
  })
})

describe("normalizeModes", () => {
  test("maps agents to modes", () => {
    const input = [
      {
        name: "build",
        model: {
          providerID: "anthropic",
          modelID: "claude-3",
        },
        prompt: "Build mode prompt",
        tools: {
          edit: true,
          bash: false,
        },
      },
    ]

    const result = normalizeModes(input)

    expect(result.length).toBe(1)
    expect(result[0].name).toBe("build")
    expect(result[0].model?.providerID).toBe("anthropic")
    expect(result[0].tools.edit).toBe(true)
  })

  test("ignores invalid entries", () => {
    const input = [{ name: 123 }, "bad", null]
    const result = normalizeModes(input)

    expect(result.length).toBe(1)
    expect(result[0].name).toBe("unknown")
  })
})

describe("buildPermissionUpdate", () => {
  test("builds agent and mode permission update payload", () => {
    const result = buildPermissionUpdate({ edit: "allow", bash: "deny" })

    const data = result as {
      agent?: { build?: { permission?: Record<string, string> } }
      mode?: { plan?: { permission?: Record<string, string> } }
    }
    const agentBuild = data.agent?.build?.permission ?? {}
    const modePlan = data.mode?.plan?.permission ?? {}

    expect(agentBuild.edit).toBe("allow")
    expect(agentBuild.bash).toBe("deny")
    expect(modePlan.edit).toBe("allow")
  })
})
