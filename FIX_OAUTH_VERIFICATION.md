# Fix GCP OAuth Verification Issue

## Problem
Your app is showing: "The app is requesting access to sensitive info in your Google Account. Until the developer (abhishek@thecodingstudio.in) verifies this app with Google, you shouldn't use it."

## Solution Options

### Option 1: Publish Your App (Recommended)

#### Step 1: Complete OAuth Consent Screen
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **OAuth consent screen**
3. Fill in all required fields:

```
App Name: CA Portal Email Integration
User Support Email: abhishek@thecodingstudio.in
App Logo: [Optional - upload your logo]
App Domain: your-app.vercel.app
Developer Contact Information: abhishek@thecodingstudio.in
```

#### Step 2: Add Required URLs
Add these URLs to your OAuth consent screen:

```
Privacy Policy URL: https://your-app.vercel.app/privacy-policy
Terms of Service URL: https://your-app.vercel.app/terms-of-service
```

#### Step 3: Publish Your App
1. Scroll to the bottom of the OAuth consent screen
2. Click **"PUBLISH APP"** button
3. Confirm the action

**Result:** Your app will be available to all users without the warning message.

### Option 2: Add Test Users (Quick Fix)

If you want to keep the app in testing mode:

1. Go to **OAuth consent screen**
2. Scroll down to **"Test users"** section
3. Click **"ADD USERS"**
4. Add email addresses of users who should access the app:
   - `abhishek@thecodingstudio.in`
   - Any other test users' emails
5. Click **"SAVE"**

**Result:** Only added users will see the app without warnings.

### Option 3: Domain Verification (Best for Production)

#### Step 1: Verify Your Domain
1. Go to **OAuth consent screen**
2. Click **"Domain verification"**
3. Follow Google's domain verification process:
   - Add a TXT record to your domain's DNS
   - Wait for verification (can take a few minutes to hours)
4. Complete verification in GCP Console

#### Step 2: Update App Information
```
App Domain: your-verified-domain.com
Privacy Policy: https://your-verified-domain.com/privacy-policy
Terms of Service: https://your-verified-domain.com/terms-of-service
```

## Quick Fix Steps (Do This Now)

### 1. Add Test Users (Immediate Fix)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **OAuth consent screen**
3. Scroll to **"Test users"**
4. Click **"ADD USERS"**
5. Add: `abhishek@thecodingstudio.in`
6. Click **"SAVE"**

### 2. Deploy Privacy Policy Pages
The privacy policy and terms of service pages have been created. Deploy them to Vercel:

1. Commit the new files:
   ```bash
   git add app/privacy-policy/page.tsx
   git add app/terms-of-service/page.tsx
   git commit -m "Add privacy policy and terms of service pages"
   git push
   ```

2. Deploy to Vercel (if auto-deploy is enabled, this will happen automatically)

### 3. Update OAuth Consent Screen
1. Go to **OAuth consent screen**
2. Add these URLs:
   ```
   Privacy Policy URL: https://your-app.vercel.app/privacy-policy
   Terms of Service URL: https://your-app.vercel.app/terms-of-service
   ```
3. Click **"SAVE"**

### 4. Publish Your App
1. Scroll to the bottom of the OAuth consent screen
2. Click **"PUBLISH APP"**
3. Confirm the action

## Verification Steps

### Test the Fix
1. Open your deployed app in an incognito window
2. Try to connect Gmail
3. You should no longer see the warning message
4. The OAuth flow should work smoothly

### Check OAuth Configuration
Test your OAuth configuration:
```
GET https://your-backend.onrender.com/api/email/test-oauth
```

Expected response:
```json
{
  "message": "OAuth configuration working",
  "authUrl": "https://accounts.google.com/oauth/authorize?...",
  "clientId": "Set",
  "redirectUri": "https://your-backend.onrender.com/api/email/gmail/callback",
  "environment": "production"
}
```

## Troubleshooting

### If You Still See the Warning
1. **Clear browser cache** - The warning might be cached
2. **Check OAuth consent screen status** - Make sure it's published
3. **Verify URLs** - Ensure privacy policy and terms URLs are accessible
4. **Check user email** - Make sure the user's email is added to test users (if in testing mode)

### If OAuth Flow Fails
1. **Check redirect URI** - Must exactly match your GCP configuration
2. **Check CORS** - Ensure your frontend domain is allowed
3. **Check environment variables** - Verify all OAuth credentials are set correctly

### If App Won't Publish
1. **Complete all required fields** - Make sure all mandatory fields are filled
2. **Verify domain** - If using custom domain, ensure it's verified
3. **Check scopes** - Ensure all required scopes are added
4. **Wait for processing** - Publishing can take a few minutes

## Next Steps

After fixing the OAuth verification:

1. **Test thoroughly** - Test with different user roles
2. **Monitor usage** - Check GCP Console for API usage
3. **Gather feedback** - Ask users about their experience
4. **Plan improvements** - Based on user feedback and usage patterns

## Support

If you encounter any issues:
1. Check the GCP Console error logs
2. Check your Render backend logs
3. Check your Vercel deployment logs
4. Contact Google Cloud Support if needed
