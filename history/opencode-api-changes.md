# OpenCode API Change Monitor


## 2025-08-03

### 2025-08-03 08:51:07 CEST

**Commit:** [`908048baefdd454308d5a58d3d3ea464aa6b10d1`](https://github.com/sst/opencode/commit/908048baefdd454308d5a58d3d3ea464aa6b10d1)
**Message:** sync

**Analysis:**

Based on the git diff analysis, here are the findings:

## API Impact Analysis

**1. Breaking API Changes:** None

**2. New API Endpoints/Features:** None

**3. Changes to Existing API Behavior:** None

**4. Impact on External Integrations:** No impact

**5. Summary for API Consumers:** No changes affecting external integrations

## Analysis Details

This commit contains only documentation updates to the providers.mdx file:

- **Line 17**: Removed an empty line (formatting)
- **Line 25-26**: Fixed JSON syntax highlighting (escaped quotes)
- **Line 34-35**: Updated Zhipu AI console URL and simplified instructions

All changes are purely cosmetic documentation improvements with no functional code modifications. External tools and integrations depending on OpenCode's API will not be affected by this commit.

---

### 2025-08-03 15:56:17 CEST

**Commit:** [`b0f2cc0c22c3a977b47888df3b2ba6d103a50973`](https://github.com/sst/opencode/commit/b0f2cc0c22c3a977b47888df3b2ba6d103a50973)
**Message:** ignore: update download stats 2025-08-03

**Analysis:**

Based on the git diff analysis, this OpenCode commit (b0f2cc0c22c3a977b47888df3b2ba6d103a50973) has **no API impact** on the opencode2go project.

**Analysis:**

1. **No breaking API changes** - The diff only updates download statistics in STATS.md
2. **No new API endpoints** - This is purely a documentation update
3. **No API behavior changes** - No code changes affecting API functionality
4. **Zero impact on opencode2go** - Statistics updates don't affect the companion app
5. **No action items required** - No updates needed for opencode2go

The commit message "ignore: update download stats" confirms this is a routine statistics update with no functional changes.

---

## 2025-08-04

### 2025-08-04 08:00:38 CEST

**Commit:** [`e8c03f13dd621d40cac4cfabaa683d4fe9b0be8d`](https://github.com/sst/opencode/commit/e8c03f13dd621d40cac4cfabaa683d4fe9b0be8d)
**Message:** fix docs

**Analysis:**

Error: opencode command not found. Please install opencode CLI.

---

### 2025-08-04 22:43:44 CEST

**Commit:** [`38819e89b8db410bdcb1757bca2979f62a2bac45`](https://github.com/sst/opencode/commit/38819e89b8db410bdcb1757bca2979f62a2bac45)
**Message:** release: v0.3.128

**Analysis:**

Based on the git diff analysis, this is a **version bump release** (v0.3.128) with no API changes that would affect opencode2go.

**Analysis:**

1. **No breaking API changes** - This diff only contains version number updates across all packages
2. **No new API endpoints or features** - No functional code changes are present
3. **No changes to existing API behavior** - Only version increments from 0.3.127 to 0.3.128
4. **Zero impact on opencode2go integration** - No code changes that would affect the companion app
5. **No action items required** - This is a standard release version bump

**Recommendation:** No updates needed for opencode2go. This OpenCode release contains only version bumps with no functional changes.

---

## 2025-08-05

### 2025-08-05 07:28:46 CEST

**Commit:** [`8168626cd3c6d6eaea30e0c07d67ec6e785b0eac`](https://github.com/sst/opencode/commit/8168626cd3c6d6eaea30e0c07d67ec6e785b0eac)
**Message:** release: v0.3.130

**Analysis:**

This git diff shows a version bump from 0.3.129 to 0.3.130 across all OpenCode packages. This is purely a version increment with no functional changes.

**Analysis for opencode2go:**

1. **No breaking API changes** - This is only a version bump
2. **No new API endpoints or features** - No functional code changes
3. **No changes to existing API behavior** - Only version numbers updated
4. **No impact on opencode2go integration** - Version bumps don't affect API compatibility
5. **No action items required** - opencode2go can continue using the same API endpoints

This release appears to be a standard version increment without any code changes that would affect the opencode2go project.

---

## 2025-08-06

### 2025-08-06 08:01:01 CEST

**Commit:** [`a48274f82b95eb5a2f68d94a1cfa8518cf80c2a7`](https://github.com/sst/opencode/commit/a48274f82b95eb5a2f68d94a1cfa8518cf80c2a7)
**Message:** permissions disallow support (#1627)

**Analysis:**

Based on the provided git diff from the OpenCode repository, here is an analysis of the impact on the opencode2go project:

### 1. Are there any breaking API changes that would affect opencode2go?

Yes, there are breaking changes:

*   **`Permission` Type Change:** The `Permission` type in `packages/opencode/src/config/config.ts` has been changed from `z.union([z.literal("ask"), z.literal("allow")])` to `z.union([z.literal("ask"), z.literal("allow"), z.literal("deny")])`. If `opencode2go` uses this type for its settings UI or for validating configuration, it will need to be updated to include the new `"deny"` value.
*   **Asynchronous Tool Registry:** The `ToolRegistry.enabled` function is now `async`. This is a significant change. If `opencode2go` was calling this function, it must now be awaited.

### 2. Are there new API endpoints or features that opencode2go could leverage?

Yes. The main new feature is the ability for a user to explicitly **deny** the use of certain tools or commands. This provides more granular control over the agent's capabilities. `opencode2go` can and should expose this functionality in its settings interface.

### 3. Are there changes to existing API behavior that opencode2go currently uses?

Yes.

*   **Permission Enforcement:** The permission checking logic in the `BashTool` now actively throws an error if a command is denied, preventing its execution. Previously, the options were just to "ask" for permission or "allow" execution.
*   **Tool Disabling:** The `ToolRegistry.enabled` function can now disable entire categories of tools (like `edit`, `patch`, `write`) if the `permission.edit` setting is `"deny"`.

### 4. What specific impact might this have on the opencode2go integration?

*   **Settings UI:** The settings page in `opencode2go` where users configure tool permissions is now outdated. It needs to be updated to include the "Deny" option.
*   **Configuration Management:** Any logic in `opencode2go` that reads, writes, or validates the OpenCode configuration will need to be updated to handle the new `"deny"` permission state.
*   **Error Handling:** `opencode2go` may need to handle new errors that can be thrown when a command is denied execution.

### 5. Are there any action items for updating opencode2go?

Yes. Here are the recommended action items:

1.  **Update Type Definitions:** In `opencode2go`, likely in files such as `src/types/settings.ts`, update the `Permission` type to include `"deny"`.
2.  **Update Settings UI:** Modify the settings component (likely related to `src/services/settings.ts`) to present "Deny" as a third option for permissions, alongside "Ask" and "Allow".
3.  **Review API Calls:** Audit the `opencode2go` codebase, especially files like `src/services/opencode.ts` and `src/services/servers.ts`, for any calls to `ToolRegistry.enabled` and update them to be asynchronous (using `await`).
4.  **Inform Users:** After updating, inform users about the new, stricter permission model and how they can use it to enhance security.

---
