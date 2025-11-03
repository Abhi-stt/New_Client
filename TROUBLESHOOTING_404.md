# Troubleshooting 404 Errors in Production

## Issue: `(index):1 Failed to load resource: the server responded with a status of 404`

This error typically occurs when the frontend cannot reach the backend API or when environment variables are not properly configured.

## ✅ **Quick Fixes**

### 1. **Verify Environment Variables in Production**

#### For Vercel (Frontend):
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Make sure you have:
   ```
   NEXT_PUBLIC_HOST_URL=https://your-backend-url.com
   ```
   - ⚠️ **IMPORTANT**: Must start with `NEXT_PUBLIC_` to be accessible in the browser
   - ⚠️ **IMPORTANT**: No trailing slash at the end
   - Example: `https://backend.onrender.com` (NOT `https://backend.onrender.com/`)

4. **Redeploy** after adding/changing environment variables (Vercel doesn't always auto-rebuild)

#### For Backend (Render/Railway/etc.):
1. Go to your backend hosting dashboard
2. Navigate to **Environment Variables**
3. Make sure you have:
   ```
   FRONTEND_URL=https://your-frontend-url.vercel.app
   NODE_ENV=production
   PORT=10000
   ```
   - Adjust PORT based on your hosting provider

### 2. **Check Backend Accessibility**

Test if your backend is accessible:
```bash
# Replace with your actual backend URL
curl https://your-backend-url.com/api/users/login
```

You should get a response (even if it's an error, that means the server is reachable).

### 3. **Verify Backend CORS Configuration**

Check `backend/server.js` - make sure your frontend URL is in the `allowedOrigins` array:
```javascript
const allowedOrigins = [
  'https://your-frontend.vercel.app',  // Add your actual frontend URL
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  // ...
];
```

### 4. **Clear Build Cache and Redeploy**

**Vercel:**
1. Go to **Settings** → **General**
2. Click **Clear Build Cache**
3. Trigger a new deployment

**Backend:**
- Restart your backend service
- Clear any build caches

### 5. **Check Browser Console for Actual Error**

Open browser DevTools (F12) and check:
1. **Console tab** - Look for the actual failing request URL
2. **Network tab** - See which request is returning 404
3. Check if the URL is correct or if it's trying to hit localhost

## 🔍 **Common Issues**

### Issue 1: Environment Variable Not Available at Build Time
**Symptom**: Works locally but fails in production
**Solution**: 
- Make sure `NEXT_PUBLIC_HOST_URL` is set in Vercel BEFORE building
- Redeploy after adding environment variables

### Issue 2: Wrong URL Format
**Symptom**: CORS errors or 404s
**Solution**:
- ✅ Correct: `https://backend.onrender.com`
- ❌ Wrong: `https://backend.onrender.com/` (trailing slash)
- ❌ Wrong: `http://backend.onrender.com` (wrong protocol)
- ❌ Wrong: `backend.onrender.com` (missing protocol)

### Issue 3: Backend Not Running
**Symptom**: All API calls fail with 404
**Solution**:
- Check if backend service is running
- Verify backend URL is correct
- Test backend health endpoint manually

### Issue 4: API Route Not Found
**Symptom**: Specific endpoints return 404
**Solution**:
- Check `backend/server.js` - ensure route is registered
- Check route file exists in `backend/routes/`
- Verify the route path matches what frontend is calling

## 🧪 **Debug Steps**

1. **Add Logging to Check Environment Variable:**
   Add this temporarily to `lib/api.ts`:
   ```typescript
   export const HOST_URL = process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:5000';
   console.log('🔍 HOST_URL:', HOST_URL); // Remove after debugging
   ```

2. **Test API Endpoint Directly:**
   In browser console, run:
   ```javascript
   fetch('https://your-backend-url.com/api/users/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email: 'test', password: 'test' })
   }).then(r => console.log('Status:', r.status))
   ```

3. **Check Network Tab:**
   - Open DevTools → Network tab
   - Reload page
   - Find the failed request
   - Check the Request URL - is it using the correct backend URL?

## 📝 **Checklist**

- [ ] `NEXT_PUBLIC_HOST_URL` is set in Vercel (frontend)
- [ ] Environment variable has NO trailing slash
- [ ] Backend is accessible (test with curl/browser)
- [ ] Frontend URL is in backend CORS allowed origins
- [ ] Redeployed frontend after adding environment variable
- [ ] Backend routes are properly registered
- [ ] Backend server is running
- [ ] No hardcoded localhost URLs in code

## 🚀 **Quick Test Script**

Create a test file `test-production-api.js`:
```javascript
const backendUrl = process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:5000';

async function testAPI() {
  console.log('Testing:', backendUrl);
  
  try {
    const response = await fetch(`${backendUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test', password: 'test' })
    });
    
    console.log('Status:', response.status);
    console.log('OK:', response.ok);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
```

Run: `node test-production-api.js NEXT_PUBLIC_HOST_URL=https://your-backend-url.com`

