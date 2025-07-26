#!/bin/bash

# /// script
# requires-bash = ">=5"
# ///

# Load environment variables from .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ .env file not found. Please create one with DEVICE_ID."
  exit 1
fi

echo "Building iOS app for permanent installation..."

# Build the release version
echo "Building release version..."
bun tauri ios build --config src-tauri/tauri.ios.conf.json

# Check if build succeeded
if [ $? -eq 0 ]; then
  echo "✅ Build completed successfully!"
  xcrun devicectl device install app --device "$DEVICE_ID" src-tauri/gen/apple/build/arm64/opencode2go.ipa
else
  echo "❌ Build failed. Please check the errors above."
  exit 1
fi
