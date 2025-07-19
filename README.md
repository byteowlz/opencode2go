# opencode2go

![opencode2go_Logo](logo.svg)

A GUI client for the awesome [opencode](https://opencode.ai) terminal agent, built with Tauri. This app provides a terminal-style gui client for interacting with opencode running as a server. Runs on Mac, Linux, Windows, iOS and Android (currently only tested on Mac and iOS)

## Disclaimer

**This application does not include any authentication or security features.** When using opencode2go:

- **Don't expose your opencode server ports publicly** to the internet without some auth layer in between
- Use secure networking solutions like **VPN** or **Tailscale/Headscael** to access your opencode server remotely
- Only connect to opencode servers on trusted networks (localhost, private networks, or secure tunnels)
- Be aware that all communication with the opencode server is unencrypted HTTP by default

**For remote access, I can recommend using Tailscale or Wireguard.**

## Features

- **Terminal-style Interface**: Clean, terminal-inspired UI with customizable themes
- **Multi-Provider Support**: Connect to various AI providers (Anthropic, OpenAI, etc.)
- **Session Management**: Create, switch between, and manage multiple chat sessions
- **Real-time Updates**: Live session updates via Server-Sent Events
- **Customizable Appearance**: Multiple themes, fonts, and font sizes
- **Server Management**: Multiple server configurations with easy switching
- **Message Filtering**: Filter message types (text, tools, files, etc.)
- **Cross-platform**: Desktop (Windows, macOS, Linux) and iOS support
- **iOS Optimized**: Native iOS app with safe area support for modern devices

## Current Status

**Version**: 0.1.0 (Early Development)

### Features

- Chat interface with message history and filtering
- Connection to opencode server via HTTP API
- Provider and model selection with nested dropdowns
- Session creation, switching, and management
- Multiple server configurations with easy switching (one server exposes one specific folder/repo)
- Theme switching using the same themes as opencode (Dracula, GitHub, VS Code, etc.)
- Font customization with multiple monospace fonts
- Real-time session updates via Server-Sent Events
- Tauri-based HTTP client for CORS-free server communication
- iOS app support
- Message part filtering (text, tools, files, snapshots, etc.)
- Responsive design for mobile and desktop

## Prerequisites

- [Bun](https://bun.sh/) for package management
- [Rust](https://rustlang.org/) for Tauri backend
- Running [opencode server](https://opencode.ai) (default: `http://localhost:4096`)
- For iOS development: Xcode and iOS development setup

## Development Setup

1. **Install dependencies**:

   ```bash
   bun install
   ```

2. **Start development server**:

   ```bash
   bun tauri dev
   ```

3. **Build for production**:

   ```bash
   bun tauri build
   ```

## Platform-Specific Builds

### Desktop (Windows, macOS, Linux)

```bash
# Development
bun tauri dev

# Production build
bun tauri build
```

### iOS

1. **Setup iOS development environment**:
   - Install Xcode from the App Store
   - Install iOS development tools:

     ```bash
     cargo install tauri-cli --version "^2.0.0"
     ```

2. **Initialize iOS project** (first time only):

   ```bash
   bun tauri ios init
   ```

3. **Build and run on iOS**:

   ```bash
   # Development on iOS simulator
   bun tauri ios dev
   
   # Development on physical iOS device
   bun tauri ios dev --host
   
   # Production build for iOS
   bun tauri ios build
   ```

4. **Deploy to device**:
   - Open the generated Xcode project in `src-tauri/gen/apple/`
   - Configure your development team and signing
   - Build and deploy to your iOS device

### iOS Configuration Notes

- The iOS build uses a separate config file (`tauri.ios.conf.json`) that:
  - Uses built static files instead of the dev server
  - Includes iOS-specific icons and settings
  - Optimizes for mobile performance
- The app includes safe area support for modern iOS devices (Dynamic Island, home indicator)
- Zoom is disabled for a more native app experience

## Configuration

### Server Setup

The app connects to an opencode server running on `http://localhost:4096` by default. You can:

1. **Add multiple servers** via the sidebar → Server section → Manage Servers
2. **Switch between servers** using the dropdown in the sidebar
3. **Configure connection settings** including protocol, host, and port

### Remote Access (Recommended)

For secure remote access to your opencode server:

1. **Tailscale** (Recommended):
   - Install Tailscale on both your server and mobile device
   - Access your server via Tailscale IP (e.g., `http://100.x.x.x:4096`)

2. **VPN**:
   - Connect both devices to the same VPN
   - Use the server's VPN IP address

3. **Local Network**:
   - Ensure both devices are on the same WiFi network
   - Use the server's local IP (e.g., `http://192.168.1.100:4096`)

## Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Tauri 2.0 (Rust)
- **HTTP Client**: Custom Tauri HTTP client for CORS-free server communication
- **State Management**: React hooks with local storage persistence
- **Styling**: CSS with CSS custom properties for theming
- **Build System**: Vite for frontend, Cargo for Tauri backend

## Project Structure

```
opencode2go/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── services/          # API and service layers
│   ├── styles/            # CSS styles and themes
│   ├── themes/            # Theme definitions
│   └── types/             # TypeScript type definitions
├── src-tauri/             # Tauri backend
│   ├── src/               # Rust source code
│   ├── icons/             # App icons for all platforms
│   ├── tauri.conf.json    # Desktop Tauri config
│   └── tauri.ios.conf.json # iOS-specific Tauri config
└── public/                # Static assets
```

## Contributing

This is an early-stage project. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both desktop and iOS (if applicable)
5. Submit a pull request

## License

MIT License
