#!/bin/bash

# Script to run both servers simultaneously
# Port 3000: Next.js app with face detection
# Port 3002: Standalone HTML frontend

echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║          Focus Flow - Dual Server Launcher            ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Starting both servers..."
echo ""

# Check if Next.js dev server is already running on port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3000 is already in use"
    echo "   Assuming Next.js is already running"
else
    echo "🚀 Starting Next.js (port 3000)..."
    npm run dev &
    NEXTJS_PID=$!
    echo "   PID: $NEXTJS_PID"
fi

# Wait a moment for Next.js to start
sleep 2

# Start the standalone HTML server on port 3002
echo ""
echo "🚀 Starting HTML Server (port 3002)..."
node server-3002.js &
HTML_PID=$!
echo "   PID: $HTML_PID"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                   SERVERS RUNNING                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "✓ Port 3000: Next.js + Face Detection"
echo "  → http://localhost:3000/session"
echo ""
echo "✓ Port 3002: Standalone HTML Frontend"
echo "  → http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for Ctrl+C and clean up
trap "echo ''; echo 'Stopping servers...'; kill $HTML_PID 2>/dev/null; kill $NEXTJS_PID 2>/dev/null; exit" INT

# Keep script running
wait
