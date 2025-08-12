# Analysis of OpenCode API Changes and Impact on opencode2go

## Summary

The OpenCode commit `b223a29603f489063acced737b3004c32c1cf606` introduces a **breaking change** in the way tool names are sanitized. This change directly impacts the `opencode2go` project by altering the naming convention for all tools that contain hyphens or spaces.

## Key Change

-   **Before:** Tool names with hyphens or spaces were not sanitized (e.g., `my-tool`).
-   **After:** Hyphens and spaces in tool names are replaced with underscores (e.g., `my_tool`).

## Impact on opencode2go

This change will cause any API calls from `opencode2go` to tools with hyphens or spaces in their names to fail. The integration will be broken until `opencode2go` is updated to follow the new naming convention.

## Affected Files

Based on the file list provided, the following files in `opencode2go` are the most likely to be affected and should be investigated:

-   `./src/services/opencode.ts`
-   `./src-tauri/target/debug/build/opencode2go-08b4583e1cf0a842/out/__global-api-script.js`
-   `./src/services/http.ts`

## Actionable Recommendations for opencode2go

1.  **Audit Codebase:** Conduct a thorough search across the entire `opencode2go` codebase to identify all instances where OpenCode tool names are constructed or used.
2.  **Update Tool Naming:** Modify the code to replace all occurrences of hyphens (`-`) and spaces (` `) in tool names with underscores (`_`).
3.  **Test Integration:** Perform comprehensive end-to-end testing to verify that all tool calls to OpenCode are successful after the changes.

## 2025-08-11

### 2025-08-11 08:01:29 CEST

**Commit:** [`b223a29603f489063acced737b3004c32c1cf606`](https://github.com/sst/opencode/commit/b223a29603f489063acced737b3004c32c1cf606)
**Message:** Fix: Sanitize MCP Tool Names for Consistency in User Expectations (#1769)

**Analysis:**

I have analyzed the git diff and created the `opencode-api-changes.md` file, which details the breaking API change and the necessary actions for the `opencode2go` project. The analysis is complete.

### 2025-08-12 10:51:28 CEST

**Commit:** [`80b25c79bb931fd8514d4ce0ee0aa487c128adda`](https://github.com/sst/opencode/commit/80b25c79bb931fd8514d4ce0ee0aa487c128adda)
**Message:** fix: preserve process.env when spawning formatter commands (#1850)

**Analysis:**

Preamble: I’m going to assess the diff for API implications on opencode2go and outline concrete actions.

## Breaking Changes
- None identified

## New Features/APIs
- None identified

## Behavioral Changes
- Change: When spawning formatter commands, the environment now merges the current process.env with the formatter-specific environment:
  - Before: env: item.environment
  - After: env: { ...process.env, ...item.environment }
- Effect: Formatter commands will now inherit all existing process environment variables, with formatter-specific overrides taking precedence. This can affect path resolution, locale, and other env-dependent behavior during formatting.

## Impact Assessment
- opencode2go integration risk:
  - Potentially improved reliability if formatters rely on environment variables that were previously missing (e.g., PATH, HOME, etc.).
  - If opencode2go relies on a tightly controlled environment for the formatter, the merged env could introduce unexpected variables or overrides. However, since the formatter-specific env is merged on top of process.env, the explicit item.environment values still take precedence, preserving intended overrides.
- Compatibility considerations:
  - No API surface changes for callers, as this is an internal environment merge for Bun.spawn.
  - Any downstream tooling within opencode2go that depends on a minimal or sanitized environment might see additional variables present; this is generally benign but worth verifying that formatter behavior remains stable.

## Action Items
- Verify formatter behavior in opencode2go when environment variables are present in process.env but not in item.environment. Ensure no unintended side effects.
- Run the existing test suite (especially any tests around code formatting or build steps) to confirm no regressions introduced by env merging.
- If opencode2go relies on a sanitized environment for reproducibility, consider adding a targeted test that asserts required variables exist and that item.environment overrides still take precedence.

Suggested quick checks to run:
- Build and test (CI or locally) to confirm no breakages:
  - Ensure Bun.spawn formatting path is exercised in the tests.
  - Validate that common env vars (PATH, HOME) behave as expected during formatter invocation.

Deliverable summary: There is a minor API behavioral change in how formatter commands receive environment variables (env merged with process.env). No breaking API changes. Action is to validate formatter behavior and add a small test if necessary to lock in the expected env precedence.

---
