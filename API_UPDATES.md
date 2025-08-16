# OpenCode2Go API Updates

This document outlines the recent updates made to opencode2go to support the latest opencode API changes.

## New API Features Added

### 1. Session Children Support
- **Endpoint**: `GET /session/:id/children`
- **Method**: `openCodeService.getSessionChildren(sessionId: string)`
- **Description**: Retrieve child sessions for a given session ID
- **Usage**:
  ```typescript
  const children = await openCodeService.getSessionChildren('session-id');
  console.log('Child sessions:', children);
  ```

### 2. Toast Notifications
- **Endpoint**: `POST /tui/show-toast`
- **Method**: `openCodeService.showToast(notification: ToastNotification)`
- **Description**: Display toast notifications in the TUI
- **Usage**:
  ```typescript
  await openCodeService.showToast({
    title: 'Success',
    message: 'Operation completed successfully',
    variant: 'success'
  });
  ```
- **Variants**: `info`, `success`, `warning`, `error`

### 3. Agent API Support
- **Endpoint**: `GET /agent`
- **Method**: `openCodeService.getAgents()`
- **Description**: Fetch available agents from the API instead of environment variables
- **Usage**:
  ```typescript
  const agents = await openCodeService.getAgents();
  console.log('Available agents:', agents);
  ```

## Technical Improvements

### Enhanced HTTP Client
- Added support for `PATCH` and `DELETE` HTTP methods
- Both Rust backend and TypeScript frontend updated
- Full HTTP method support for future API expansions

### API Methods Implementation
- All new methods use direct HTTP client calls for maximum compatibility
- Fallback implementation ensures compatibility with older opencode servers
- Comprehensive error handling and logging

## Breaking Changes
None. All changes are backward compatible.

## Dependencies
- Updated `@opencode-ai/sdk` to latest version
- No new dependencies added

## Testing
- All TypeScript code compiles successfully
- Rust backend compiles without errors
- Build process completed successfully

## Usage Examples

### Hierarchical Session Management
```typescript
// Get all sessions
const sessions = await openCodeService.getSessions();

// For each session, get its children
for (const session of sessions) {
  const children = await openCodeService.getSessionChildren(session.id);
  console.log(`Session ${session.title} has ${children.length} children`);
}
```

### User Notifications
```typescript
// Show different types of notifications
await openCodeService.showToast({
  message: 'Connection established',
  variant: 'info'
});

await openCodeService.showToast({
  title: 'Error',
  message: 'Failed to save file',
  variant: 'error'
});
```

### Agent Management
```typescript
// Get available agents
const agents = await openCodeService.getAgents();

// Display agent information
agents.forEach(agent => {
  console.log(`Agent: ${agent.name} (${agent.type})`);
  if (agent.description) {
    console.log(`Description: ${agent.description}`);
  }
});
```

## Future Considerations
- Monitor for SDK updates that may include these methods natively
- Consider adding UI components that leverage the new toast notification system
- Implement hierarchical session display using the children API