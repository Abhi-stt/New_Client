# Gmail OAuth 404 Error Fix

## Problem
The Gmail OAuth callback is returning a 404 error because the redirect URI is incorrect.

## Solution

### 1. Update Backend Environment Variables

In your Render.com backend environment variables, set:

```bash
GOOGLE_REDIRECT_URI=https://new-client-6na0.onrender.com/api/email/gmail/callback
BACKEND_URL=https://new-client-6na0.onrender.com
FRONTEND_URL=https://your-frontend-url.vercel.app
```

### 2. Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Select your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://new-client-6na0.onrender.com/api/email/gmail/callback
   ```
5. Also add for local development:
   ```
   http://localhost:5000/api/email/gmail/callback
   ```
6. Click **Save**

### 3. Code Changes Made

I've updated the following files:

1. **`backend/services/gmailService.js`**:
   - Updated `getAuthUrl()` to dynamically construct the redirect URI
   - Ensures the OAuth2 client uses the correct redirect URI
   - Added logging for debugging

2. **`backend/routes/email.js`**:
   - Improved error handling in the callback route
   - Added better logging
   - Improved error messages for users

### 4. Verify the Fix

After updating the environment variables and Google Cloud Console:

1. Restart your backend server on Render.com
2. Try connecting Gmail again
3. Check the backend logs to see the redirect URI being used

### 5. Testing

The callback should now:
- Receive the OAuth code from Google
- Exchange it for tokens
- Save the email account
- Redirect to your frontend with `?connected=true`

## Important Notes

- The redirect URI in Google Cloud Console **must exactly match** the one in your backend
- Make sure there are no trailing slashes
- The redirect URI must use `https` in production (not `http`)
- After updating Google Cloud Console, changes may take a few minutes to propagate

## Troubleshooting

If you still get a 404:
1. Check backend logs to see what redirect URI is being used
2. Verify the route `/api/email/gmail/callback` exists in your backend
3. Ensure the route is registered before the catch-all routes
4. Check that CORS is properly configured for your frontend domain

