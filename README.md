# opencode2go

A GUI client for [opencode](https://opencode.ai) built with Tauri, React, and TypeScript. This app provides a terminal-style interface for interacting with AI coding assistants through the opencode server.

## Features

- **Terminal-style Interface**: Clean, terminal-inspired UI with customizable themes
- **Multi-Provider Support**: Connect to various AI providers (Anthropic, OpenAI, etc.)
- **Session Management**: Create, switch between, and manage multiple chat sessions
- **Real-time Updates**: Live session updates via Server-Sent Events
- **Customizable Appearance**: Multiple themes, fonts, and font sizes
- **Server Configuration**: Configurable opencode server connection settings
- **Cross-platform**: Built with Tauri for native desktop performance

## Current Status

**Version**: 0.1.0 (Early Development)

### Implemented Features

- Basic chat interface with message history
- Connection to opencode server via HTTP API
- Provider and model selection
- Session creation and switching
- Settings panel with server and appearance configuration
- Theme switching (multiple built-in themes)
- Font customization
- Real-time session updates
- Tauri-based HTTP client for CORS-free server communication

### In Progress

- Enhanced message formatting and rendering
- Better error handling and user feedback
- Performance optimizations

## Prerequisites

- [Bun](https://bun.sh/) for package management
- [Rust](https://rustlang.org/) for Tauri backend
- Running [opencode server](https://opencode.ai) (default: <http://localhost:3000>)

## Development Setup

1. **Install dependencies**:

   ```bash
   bun install
   ```

2. **Start development server**:

   ```bash
   bun dev
   ```

3. **Build for production**:

   ```bash
   bun run build
   ```

## Configuration

The app connects to an opencode server running on `http://localhost:4096` by default. You can configure the server connection in the Settings panel.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Tauri 2.0 (Rust)
- **HTTP Client**: Custom Tauri HTTP client for server communication
- **State Management**: React hooks and context
- **Styling**: CSS with terminal-inspired themes

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
