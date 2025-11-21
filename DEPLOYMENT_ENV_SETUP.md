# Deployment Environment Variables Setup

## For Render.com Deployment

To ensure Gmail OAuth works correctly in production, you need to set the following environment variables in your Render dashboard:

### Required Environment Variables:

1. **BACKEND_URL** (Recommended)
   - Value: `https://ca-client-portal.onrender.com`
   - This is your production backend URL

2. **GMAIL_REDIRECT_URI** (Alternative - More Specific)
   - Value: `https://ca-client-portal.onrender.com/api/email/gmail/callback`
   - This directly sets the Gmail callback URL

3. **GOOGLE_CLIENT_ID**
   - Your Google OAuth Client ID

4. **GOOGLE_CLIENT_SECRET**
   - Your Google OAuth Client Secret

5. **FRONTEND_URL** (For redirects after OAuth)
   - Value: Your frontend URL (e.g., `https://your-frontend.onrender.com`)

### How to Set Environment Variables in Render:

1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Click "Add Environment Variable"
5. Add each variable with its value
6. Save and redeploy

### Automatic Detection:

The code now automatically detects Render's `RENDER_EXTERNAL_URL` environment variable if `BACKEND_URL` or `GMAIL_REDIRECT_URI` are not set. However, it's recommended to explicitly set `BACKEND_URL` or `GMAIL_REDIRECT_URI` for better control.

### Google Cloud Console Configuration:

Make sure your Google Cloud Console OAuth 2.0 Client has the following authorized redirect URI:
- `https://ca-client-portal.onrender.com/api/email/gmail/callback`

### Verification:

After setting the environment variables and redeploying, check the logs. You should see:
```
Gmail OAuth Redirect URI: https://ca-client-portal.onrender.com/api/email/gmail/callback
```

Instead of:
```
Gmail OAuth Redirect URI: http://localhost:5000/api/email/gmail/callback
```

