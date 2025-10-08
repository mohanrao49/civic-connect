#!/bin/bash

# CivicConnect Production Startup Script
echo "🚀 Starting CivicConnect Production Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

# Kill any existing processes on ports 3000 and 5001
echo "🧹 Cleaning up existing processes..."
lsof -ti:3000,5001 | xargs kill -9 2>/dev/null || true

# Start Backend
echo "🔧 Starting Backend Server..."
cd backend
if [ ! -f "package.json" ]; then
    echo "❌ Backend package.json not found. Please run from project root."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Start backend in production mode
echo "🚀 Starting backend server on port 5001..."
NODE_ENV=production npm start &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if ! curl -f http://localhost:5001/health > /dev/null 2>&1; then
    echo "❌ Backend failed to start. Check logs above."
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Backend started successfully!"

# Start Frontend
echo "🎨 Starting Frontend Server..."
cd ../frontend
if [ ! -f "package.json" ]; then
    echo "❌ Frontend package.json not found. Please run from project root."
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend
echo "🚀 Starting frontend server on port 3000..."
npm start &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 10

# Check if frontend is running
if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ Frontend failed to start. Check logs above."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Frontend started successfully!"

# Display success message
echo ""
echo "🎉 CivicConnect is now running in production mode!"
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5001"
echo "❤️  Health Check: http://localhost:5001/health"
echo ""
echo "📊 Features enabled:"
echo "   ✅ Rate limiting (1000 requests/15min)"
echo "   ✅ CORS protection"
echo "   ✅ Security headers"
echo "   ✅ Database connection pooling"
echo "   ✅ Error handling"
echo "   ✅ Real-time analytics"
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
