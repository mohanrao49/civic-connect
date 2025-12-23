# Deployment Checklist - New Registration Endpoint

## Issue
Getting 404 error for `/api/auth/send-otp-for-registration` endpoint on Render.

## Solution
The backend on Render needs to be redeployed with the new code.

## Steps to Deploy

### 1. Verify Local Changes
Make sure all changes are committed:
```bash
git status
git add .
git commit -m "Add send-otp-for-registration endpoint and SMS service"
```

### 2. Push to Repository
```bash
git push origin main
# or
git push origin master
```

### 3. Render Auto-Deployment
- If Render is connected to your Git repository, it should automatically detect the push and start a new deployment
- Check Render dashboard for deployment status

### 4. Manual Deployment (if needed)
- Go to Render dashboard
- Find your backend service
- Click "Manual Deploy" → "Deploy latest commit"

### 5. Verify Deployment
After deployment completes, verify the endpoint:
```bash
curl -X POST ${REACT_APP_API_BASE}/auth/send-otp-for-registration \
  -H "Content-Type: application/json" \
  -d '{"mobile":"1234567890"}'
```

## Files Changed
- ✅ `backend/src/routes/auth.js` - Added new route
- ✅ `backend/src/controllers/authController.js` - Added `sendOTPForRegistration` method
- ✅ `backend/src/services/smsService.js` - New SMS service
- ✅ `backend/src/app.js` - Added rate limiter for new endpoint
- ✅ `frontend/src/services/api.js` - Added API method
- ✅ `frontend/src/components/Register.js` - Updated registration flow

## Route Details
- **Endpoint**: `POST /api/auth/send-otp-for-registration`
- **Route File**: `backend/src/routes/auth.js` (line 16)
- **Controller**: `backend/src/controllers/authController.js` (line 49)
- **Rate Limited**: Yes (10 requests per 10 minutes)

## Troubleshooting

### If still getting 404 after deployment:
1. Check Render logs for any startup errors
2. Verify the route is registered in `app.js`:
   ```javascript
   app.use('/api/auth', authRoutes);
   ```
3. Check if there are any syntax errors preventing the server from starting
4. Verify the method name matches: `sendOTPForRegistration`

### If deployment fails:
1. Check Render build logs
2. Verify all dependencies are in `package.json`
3. Check for any missing environment variables
4. Verify Node.js version compatibility

## Quick Test (Local)
Before deploying, test locally:
```bash
cd backend
npm start
# In another terminal:
curl -X POST http://localhost:5001/api/auth/send-otp-for-registration \
  -H "Content-Type: application/json" \
  -d '{"mobile":"1234567890","password":"test123","name":"Test"}'
```

If this works locally, the issue is definitely the deployment on Render.

