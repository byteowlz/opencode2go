# opencode agent guidelines

## Themes/styling

- Terminal inspired styling (Mono fonts, popular terminal color schemes)
- No rounded corners

## Build/Test Commands

- **Install**: `bun install`
- **Dev**: `bun dev` (runs packages/opencode/src/index.ts)
- **Typecheck**: `bun run typecheck` (runs across all workspaces)
- **Test**: `bun test` (runs all tests)
- **Single test**: `bun test packages/opencode/test/tool/tool.test.ts` (specific test file)
- **Go tests**: `go test ./...` (in packages/tui/sdk/)

## Code Style

- **Runtime**: Bun with TypeScript ESM modules, Go for TUI
- **Imports**: Use relative imports for local modules (`./`, `../`), named imports preferred
- **Types**: Zod schemas for validation, TypeScript interfaces for structure
- **Naming**: camelCase for variables/functions, PascalCase for classes/namespaces
- **Error handling**: Use Result patterns, avoid throwing exceptions in tools
- **File structure**: Namespace-based organization (e.g., `Tool.define()`, `App.provide()`)
- **Formatting**: Prettier with semi: false, printWidth: 120

## IMPORTANT Rules

- Keep functions focused - avoid unnecessary composition unless reusable
- AVOID destructuring unless it improves readability
- AVOID `else` statements where possible
- AVOID `try`/`catch` - prefer letting exceptions bubble up
- AVOID `any` type and `let` statements
- PREFER single word variable names
- Use Bun APIs like `Bun.file()` over Node.js equivalents
- Always run cd src-tauri && cargo check after changing something on the rust side
- Always run bun run build after changing soemthing on the typscript side

## Building for iOS

- bun tauri ios init --config src-tauri/tauri.ios.conf.json
- bun tauri ios build --config src-tauri/tauri.ios.conf.json
- xcrun devicectl device install app --device "$DEVICE_ID" src-tauri/gen/apple/build/arm64/opencode2go.ipa
(DEVICE_ID is stored in .env file)
