#!/bin/bash

# CivicConnect Simple Startup Script
echo "🚀 Starting CivicConnect Application..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
lsof -ti:3000,5001 | xargs kill -9 2>/dev/null || true
sleep 2

# Start Backend
echo "🔧 Starting Backend Server..."
cd backend
npm start &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -f http://localhost:5001/health > /dev/null 2>&1; then
    echo "✅ Backend started successfully!"
else
    echo "❌ Backend failed to start. Check the logs above."
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start Frontend
echo "🎨 Starting Frontend Server..."
cd ../frontend
npm start &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 10

echo ""
echo "🎉 CivicConnect is now running!"
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5001"
echo "❤️  Health Check: http://localhost:5001/health"
echo ""
echo "🛑 To stop the servers, press Ctrl+C"
echo ""

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo "✅ Servers stopped successfully!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep script running
wait
