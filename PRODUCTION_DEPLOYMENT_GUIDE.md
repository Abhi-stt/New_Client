# Production Deployment Guide for Email Integration

## Overview
This guide provides step-by-step instructions for deploying your CA Portal with email integration to Render (backend) and Vercel (frontend).

## Prerequisites
- Google Cloud Platform account
- Render account
- Vercel account
- MongoDB Atlas account (if using cloud database)

## Step 1: GCP Configuration

### 1.1 Create/Update OAuth 2.0 Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Create or edit your OAuth 2.0 Client ID
4. Configure the following:

**Authorized JavaScript origins:**
```
https://your-app.vercel.app
https://your-custom-domain.com (if using custom domain)
http://localhost:3000 (for development)
```

**Authorized redirect URIs:**
```
https://your-backend.onrender.com/api/email/gmail/callback
https://your-custom-domain.com/api/email/gmail/callback (if using custom domain)
http://localhost:5000/api/email/gmail/callback (for development)
```

### 1.2 OAuth Consent Screen
1. Go to APIs & Services → OAuth consent screen
2. Configure:
```
App Name: CA Portal Email Integration
User Support Email: your-email@yourdomain.com
App Domain: your-app.vercel.app (or your custom domain)
Developer Contact Information: your-email@yourdomain.com
```

3. Add these scopes:
```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

## Step 2: Render Backend Deployment

### 2.1 Environment Variables
In your Render dashboard → Your Service → Environment, add:

```env
# Gmail OAuth2 Configuration
GOOGLE_CLIENT_ID=your_client_id_from_gcp
GOOGLE_CLIENT_SECRET=your_client_secret_from_gcp
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/api/email/gmail/callback

# Email Configuration
EMAIL_USER=your_smtp_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Frontend URL
FRONTEND_URL=https://your-app.vercel.app

# Database
MONGODB_URI=your_mongodb_atlas_connection_string

# Other existing variables
NODE_ENV=production
PORT=10000
```

### 2.2 Render Configuration
- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Environment:** Node

## Step 3: Vercel Frontend Deployment

### 3.1 Environment Variables
In your Vercel dashboard → Project → Settings → Environment Variables:

```env
# API Configuration
NEXT_PUBLIC_HOST_URL=https://your-backend.onrender.com
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api

# Other frontend variables
NEXT_PUBLIC_APP_NAME=CA Portal
```

### 3.2 Vercel Configuration
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

## Step 4: Testing the Deployment

### 4.1 Test OAuth Flow
1. Visit your Vercel app
2. Navigate to the email page
3. Try to connect Gmail
4. Verify the OAuth flow works

### 4.2 Test with Different Users
1. Create test accounts with different roles
2. Test Gmail connection for each user
3. Verify email syncing works
4. Test forwarding rules

## Step 5: Troubleshooting

### Common Issues:

#### CORS Errors
**Solution:** Check that your Vercel domain is in the allowed origins in your backend CORS configuration.

#### OAuth redirect_uri_mismatch
**Solution:** Ensure the redirect URI in GCP exactly matches your Render backend URL.

#### Environment Variables Not Loading
**Solution:** Verify environment variables are set correctly in both Render and Vercel dashboards.

#### Gmail API Quota Exceeded
**Solution:** Monitor usage in GCP Console and consider requesting quota increases.

## Step 6: Monitoring

### 6.1 Backend Monitoring
- Monitor Render logs for errors
- Check Gmail API usage in GCP Console
- Monitor database performance

### 6.2 Frontend Monitoring
- Monitor Vercel analytics
- Check for JavaScript errors
- Monitor API response times

## Step 7: Security Considerations

### 7.1 Environment Variables
- Never commit `.env` files
- Use Render and Vercel's secure environment variable features
- Rotate credentials regularly

### 7.2 CORS Configuration
- Only allow necessary origins
- Use HTTPS in production
- Monitor for unauthorized access attempts

### 7.3 Gmail API Security
- Use minimal required scopes
- Monitor API usage patterns
- Implement rate limiting if needed

## Step 8: Maintenance

### 8.1 Regular Updates
- Keep dependencies updated
- Monitor for security vulnerabilities
- Update OAuth scopes if needed

### 8.2 Backup Strategy
- Regular database backups
- Environment variable backups
- Code repository backups

## Step 9: Scaling Considerations

### 9.1 Database Scaling
- Consider MongoDB Atlas scaling options
- Implement connection pooling
- Monitor query performance

### 9.2 API Scaling
- Monitor Gmail API quotas
- Implement caching strategies
- Consider rate limiting

## Step 10: User Management

### 10.1 Role-Based Access
The email system supports all user roles:
- `super_admin` - Full access
- `admin` - Domain-specific access
- `manager` - Team management access
- `team_member` - Limited team access
- `client` - Client-specific access

### 10.2 Navigation Configuration
Ensure all user roles can access the email feature by adding it to your navigation component.

## Support

For issues or questions:
1. Check Render logs for backend errors
2. Check Vercel logs for frontend errors
3. Monitor GCP Console for API issues
4. Check database logs for connection issues

## Next Steps

After successful deployment:
1. Test all email features thoroughly
2. Train users on the new email integration
3. Monitor usage and performance
4. Plan for future enhancements
