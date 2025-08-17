#!/usr/bin/env node

// Clear all OpenCode2Go app state utility
console.log('🧹 Clearing OpenCode2Go app state...');

// List localStorage keys that should be cleared
const LOCALSTORAGE_KEYS = [
  'opencode-settings',
  'opencode-servers', 
  'opencode-theme',
  'opencode-sessions',
  'opencode-current-session'
];

console.log('📝 Keys to clear from localStorage:');
LOCALSTORAGE_KEYS.forEach(key => {
  console.log(`  - ${key}`);
});

// Create browser console script
const browserScript = `
// Clear OpenCode2Go localStorage
console.log('🧹 Clearing OpenCode2Go localStorage...');
const keys = ${JSON.stringify(LOCALSTORAGE_KEYS)};
keys.forEach(key => {
  if (localStorage.getItem(key)) {
    console.log('🗑️ Removing:', key);
    localStorage.removeItem(key);
  }
});
console.log('✅ localStorage cleared! Refresh the page.');
`;

require('fs').writeFileSync('clear-browser-state.js', browserScript);

console.log('');
console.log('✅ Created clear-browser-state.js');
console.log('');
console.log('🔧 To clear app state:');
console.log('1. Open browser DevTools (F12)');
console.log('2. Paste this in Console: localStorage.clear()');
console.log('3. Refresh the page');
console.log('');
console.log('💡 Quick clear: localStorage.clear()');