# Fix Gmail OAuth Redirect Issue

## Problem
After connecting Gmail, you're seeing the success page from `/api/auth/google/callback` instead of being redirected to the email page. This happens because Google Cloud Console has the wrong redirect URI configured.

## Solution

### Step 1: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Find your **OAuth 2.0 Client ID** (the one you're using for Gmail)
4. Click on it to edit
5. Under **Authorized redirect URIs**, you need to:
   - **ADD** this URI (if not present):
     ```
     http://localhost:5000/api/email/gmail/callback
     ```
   - **REMOVE** or **DO NOT USE** this URI for Gmail:
     ```
     http://localhost:5000/api/auth/google/callback
     ```
     (This one is for Google Sheets, not Gmail)

6. Click **Save**

### Step 2: Check Your Environment Variables

In your backend `.env` file, make sure you have:

```bash
# For Gmail (optional - will auto-construct if not set)
GMAIL_REDIRECT_URI=http://localhost:5000/api/email/gmail/callback

# OR remove GOOGLE_REDIRECT_URI if it's set to the wrong value
# The code will now automatically use the correct URI for Gmail
```

**Important:** If you have `GOOGLE_REDIRECT_URI` set to `/api/auth/google/callback`, either:
- Remove it, OR
- Set `GMAIL_REDIRECT_URI` specifically for Gmail

### Step 3: Restart Your Backend Server

After making changes:
1. Stop your backend server
2. Restart it
3. Try connecting Gmail again

### Step 4: Verify the Fix

1. Click "Connect Gmail" in your app
2. Authorize the permissions
3. You should now be redirected to: `http://localhost:3000/email?connected=true`
4. The email page should show your connected Gmail account

## Code Changes Made

I've updated the code to:
1. **Force Gmail to use `/api/email/gmail/callback`** regardless of `GOOGLE_REDIRECT_URI`
2. **Use `GMAIL_REDIRECT_URI`** environment variable if set, otherwise auto-construct it
3. **Immediately redirect** to the frontend email page after successful connection

## Why This Happened

- `GOOGLE_REDIRECT_URI` was set to `/api/auth/google/callback` (for Google Sheets)
- Gmail needs its own redirect URI: `/api/email/gmail/callback`
- Google Cloud Console had the wrong redirect URI configured
- The code now forces the correct URI for Gmail specifically

## For Production

When deploying to production, make sure to:
1. Add the production redirect URI to Google Cloud Console:
   ```
   https://your-backend-url.onrender.com/api/email/gmail/callback
   ```
2. Set environment variables:
   ```bash
   GMAIL_REDIRECT_URI=https://your-backend-url.onrender.com/api/email/gmail/callback
   BACKEND_URL=https://your-backend-url.onrender.com
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```

