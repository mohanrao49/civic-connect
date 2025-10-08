# 🚀 Quick Start Guide - CivicConnect

## How to Run Frontend and Backend

### ✅ Method 1: Automatic Startup (Easiest)
```bash
# Navigate to project directory
cd "/Users/mohanraoboddu/Downloads/SIH 2"

# Run the startup script
./start-app.sh
```

This will automatically:
- Kill any existing processes on ports 3000 and 5001
- Start the backend server
- Wait for backend to be ready
- Start the frontend server
- Show you the URLs to access the application

### ✅ Method 2: Manual Startup (Two Terminals)

**Step 1: Start Backend**
```bash
# Open Terminal 1
cd "/Users/mohanraoboddu/Downloads/SIH 2/backend"
npm start
```

**Step 2: Start Frontend**
```bash
# Open Terminal 2 (new terminal window)
cd "/Users/mohanraoboddu/Downloads/SIH 2/frontend"
npm start
```

### ✅ Method 3: Production Mode
```bash
# Navigate to project directory
cd "/Users/mohanraoboddu/Downloads/SIH 2"

# Run production startup
./start-production.sh
```

## 🌐 Access Your Application

Once both servers are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **Health Check**: http://localhost:5001/health

## 🔧 Troubleshooting

### If you get "port already in use" errors:
```bash
# Kill processes on ports 3000 and 5001
lsof -ti:3000,5001 | xargs kill -9
```

### If backend fails to start:
1. Check if MongoDB is accessible
2. Verify your .env file has correct database URL
3. Check the backend logs for specific errors

### If frontend fails to start:
1. Make sure backend is running first
2. Check if port 3000 is available
3. Try clearing npm cache: `npm cache clean --force`

## 📱 Features Available

Once running, you can:
- ✅ Register new users
- ✅ Report civic issues
- ✅ View issues on map
- ✅ Admin dashboard with real-time analytics
- ✅ Employee dashboard for issue resolution
- ✅ Real-time notifications
- ✅ Image uploads
- ✅ Issue tracking and resolution

## 🛑 Stopping the Application

- **If using startup script**: Press `Ctrl+C` in the terminal
- **If using manual method**: Press `Ctrl+C` in both terminal windows

## 🎯 Next Steps

1. Open http://localhost:3000 in your browser
2. Register as a new user
3. Report a test issue
4. Login as admin to see the dashboard
5. Check the analytics with real-time data

Your CivicConnect application is now ready to use! 🎉
