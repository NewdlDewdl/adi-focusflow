/**
 * Simple HTTP server to serve the standalone HTML frontend on port 3002
 * Run with: node server-3002.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const HTML_FILE = path.join(__dirname, 'public', 'focus-flow.html');

const server = http.createServer((req, res) => {
  // Serve the HTML file for all requests
  fs.readFile(HTML_FILE, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading page');
      console.error('Error reading file:', err);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('\x1b[36m%s\x1b[0m', '╔════════════════════════════════════════════════════════╗');
  console.log('\x1b[36m%s\x1b[0m', '║                                                        ║');
  console.log('\x1b[36m%s\x1b[0m', '║          Focus Flow - Frontend (Standalone)           ║');
  console.log('\x1b[36m%s\x1b[0m', '║                                                        ║');
  console.log('\x1b[36m%s\x1b[0m', '╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('\x1b[32m%s\x1b[0m', '✓ Server running on port 3002');
  console.log('\x1b[32m%s\x1b[0m', '✓ Open: http://localhost:3002');
  console.log('');
  console.log('\x1b[33m%s\x1b[0m', '⚠️  This is the UI-only version (no face detection)');
  console.log('\x1b[33m%s\x1b[0m', '⚠️  For face detection, use port 3000');
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});
