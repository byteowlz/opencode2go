#!/bin/bash

# Install iOS app permanently on device
# Requires Apple Developer membership and connected iPhone

echo "🚀 Building iOS app for permanent installation..."

# Build the release version
echo "📦 Building release version..."
bun run tauri ios build

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📱 To install on your iPhone:"
    echo "   1. Open Xcode: open src-tauri/gen/apple/opencode2go.xcodeproj"
    echo "   2. Select your iPhone from device dropdown"
    echo "   3. Click the Play button (▶️) to install"
    echo ""
    echo "🎉 The app will be permanently installed with your developer certificate!"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi