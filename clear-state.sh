#!/bin/bash

echo "🧹 Clearing opencode2go state..."

# Clear Tauri app data directory
echo "📁 Removing Tauri app data..."
rm -rf ~/Library/Application\ Support/com.opencode2go.app

# Clear localStorage by creating a temporary HTML file and opening it
echo "💾 Clearing localStorage..."
cat > /tmp/clear-opencode-storage.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Clearing OpenCode Storage</title>
    <style>
        body { font-family: monospace; background: #1e1e1e; color: #fff; padding: 20px; }
        .success { color: #4caf50; }
    </style>
</head>
<body>
    <h2>🧹 Clearing OpenCode Storage...</h2>
    <div id="status">Working...</div>
    
    <script>
        // Clear all opencode related localStorage items
        const keys = [
            'opencode-settings',
            'opencode-servers', 
            'opencode-current-server',
            'opencode-theme'
        ];
        
        let cleared = [];
        keys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                cleared.push(key);
            }
        });
        
        const status = document.getElementById('status');
        if (cleared.length > 0) {
            status.innerHTML = '<div class="success">✅ Cleared: ' + cleared.join(', ') + '</div><p>You can close this window now.</p>';
        } else {
            status.innerHTML = '<div class="success">✅ No localStorage data found to clear.</div><p>You can close this window now.</p>';
        }
        
        // Auto-close after 3 seconds
        setTimeout(() => window.close(), 3000);
    </script>
</body>
</html>
EOF

# Open the file in default browser
open /tmp/clear-opencode-storage.html

echo "✅ State clearing complete!"
echo "   - Tauri app data directory removed"
echo "   - localStorage clear script opened in browser"
echo ""
echo "🚀 You can now run 'bun tauri dev' for a clean start!"