# Email Integration Deployment Checklist

## Pre-Deployment Checklist

### ✅ GCP Configuration
- [ ] Created Google Cloud Project
- [ ] Enabled Gmail API
- [ ] Created OAuth 2.0 credentials
- [ ] Configured OAuth consent screen
- [ ] Added required scopes:
  - [ ] `https://www.googleapis.com/auth/gmail.readonly`
  - [ ] `https://www.googleapis.com/auth/gmail.modify`
  - [ ] `https://www.googleapis.com/auth/userinfo.email`
  - [ ] `https://www.googleapis.com/auth/userinfo.profile`
- [ ] Set authorized JavaScript origins:
  - [ ] `https://your-app.vercel.app`
  - [ ] `http://localhost:3000` (for development)
- [ ] Set authorized redirect URIs:
  - [ ] `https://your-backend.onrender.com/api/email/gmail/callback`
  - [ ] `http://localhost:5000/api/email/gmail/callback` (for development)

### ✅ Backend (Render) Configuration
- [ ] Created Render service
- [ ] Set environment variables:
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `GOOGLE_REDIRECT_URI`
  - [ ] `EMAIL_USER`
  - [ ] `EMAIL_PASS`
  - [ ] `EMAIL_FROM`
  - [ ] `EMAIL_HOST`
  - [ ] `EMAIL_PORT`
  - [ ] `FRONTEND_URL`
  - [ ] `MONGODB_URI`
  - [ ] `NODE_ENV=production`
- [ ] Updated CORS configuration
- [ ] Deployed backend to Render

### ✅ Frontend (Vercel) Configuration
- [ ] Created Vercel project
- [ ] Set environment variables:
  - [ ] `NEXT_PUBLIC_HOST_URL`
  - [ ] `NEXT_PUBLIC_API_URL`
- [ ] Deployed frontend to Vercel

### ✅ Database Configuration
- [ ] MongoDB Atlas cluster created
- [ ] Database connection string configured
- [ ] Network access rules set
- [ ] Database user created with proper permissions

## Post-Deployment Testing

### ✅ OAuth Flow Testing
- [ ] Test OAuth URL generation: `GET /api/email/test-oauth`
- [ ] Test Gmail connection flow
- [ ] Verify redirect URI works correctly
- [ ] Test token exchange

### ✅ Email Features Testing
- [ ] Test email syncing
- [ ] Test email viewing
- [ ] Test forwarding rules creation
- [ ] Test forwarding rules execution
- [ ] Test email filtering and search

### ✅ User Role Testing
- [ ] Test with super_admin role
- [ ] Test with admin role
- [ ] Test with manager role
- [ ] Test with team_member role
- [ ] Test with client role

### ✅ Security Testing
- [ ] Verify CORS configuration
- [ ] Test with invalid credentials
- [ ] Verify environment variables are not exposed
- [ ] Test rate limiting (if implemented)

## Production Monitoring

### ✅ Error Monitoring
- [ ] Set up error logging
- [ ] Monitor API errors
- [ ] Monitor database errors
- [ ] Monitor Gmail API quota usage

### ✅ Performance Monitoring
- [ ] Monitor response times
- [ ] Monitor database performance
- [ ] Monitor memory usage
- [ ] Monitor CPU usage

### ✅ User Experience Monitoring
- [ ] Monitor user login success rates
- [ ] Monitor email sync success rates
- [ ] Monitor forwarding rule execution
- [ ] Monitor user feedback

## Maintenance Tasks

### ✅ Regular Maintenance
- [ ] Monitor Gmail API quota usage
- [ ] Check for expired tokens
- [ ] Monitor error logs
- [ ] Update dependencies regularly
- [ ] Backup database regularly

### ✅ Security Maintenance
- [ ] Rotate credentials regularly
- [ ] Monitor for security vulnerabilities
- [ ] Review access logs
- [ ] Update OAuth scopes if needed

## Troubleshooting Common Issues

### ❌ OAuth Issues
- **redirect_uri_mismatch**: Check GCP OAuth configuration
- **access_denied**: Check OAuth consent screen
- **invalid_client**: Check client ID and secret

### ❌ CORS Issues
- **CORS blocked**: Check allowed origins in backend
- **Preflight failed**: Check CORS options configuration

### ❌ Email Issues
- **Sync failed**: Check Gmail API permissions
- **Forwarding failed**: Check SMTP configuration
- **Token expired**: Check token refresh logic

### ❌ Database Issues
- **Connection failed**: Check MongoDB URI
- **Query failed**: Check database permissions
- **Timeout**: Check network configuration

## Success Criteria

### ✅ Functional Requirements
- [ ] All user roles can access email features
- [ ] Gmail OAuth flow works correctly
- [ ] Email syncing works reliably
- [ ] Forwarding rules execute correctly
- [ ] Email filtering and search work

### ✅ Performance Requirements
- [ ] Email sync completes within 30 seconds
- [ ] Email list loads within 5 seconds
- [ ] OAuth flow completes within 10 seconds
- [ ] System handles 100+ concurrent users

### ✅ Security Requirements
- [ ] OAuth tokens are stored securely
- [ ] CORS is properly configured
- [ ] Environment variables are not exposed
- [ ] User data is properly isolated

## Go-Live Checklist

### ✅ Final Verification
- [ ] All tests pass
- [ ] Performance meets requirements
- [ ] Security review completed
- [ ] User documentation updated
- [ ] Support team trained
- [ ] Monitoring alerts configured

### ✅ Rollback Plan
- [ ] Previous version backed up
- [ ] Database backup created
- [ ] Rollback procedure documented
- [ ] Emergency contacts identified

## Post-Go-Live

### ✅ Immediate Tasks (First 24 hours)
- [ ] Monitor error logs closely
- [ ] Monitor user feedback
- [ ] Check system performance
- [ ] Verify all features working

### ✅ Short-term Tasks (First week)
- [ ] Analyze usage patterns
- [ ] Optimize performance if needed
- [ ] Address any user issues
- [ ] Update documentation

### ✅ Long-term Tasks (First month)
- [ ] Plan for scaling
- [ ] Implement improvements
- [ ] Gather user feedback
- [ ] Plan next features
