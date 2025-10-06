# Email Integration & Auto Mail Forwarding

This document describes the Email Integration feature added to the CA Portal, which allows users to connect their Gmail accounts and set up automatic email forwarding rules.

## Features

### 1. Gmail OAuth2 Integration
- Secure OAuth2 authentication with Gmail
- Token management with automatic refresh
- Read-only access by default with optional send permissions

### 2. Email Syncing
- Real-time email synchronization from Gmail
- Email metadata storage (sender, subject, date, read status)
- Attachment detection and counting
- Background sync with configurable intervals

### 3. Auto Mail Forwarding
- Rule-based email forwarding system
- Multiple condition types:
  - Sender email/domain matching
  - Subject keyword matching
  - Body content keyword matching
  - Attachment presence
- Flexible recipient selection (roles or specific emails)
- Forward type options (full email or summary)
- Rule execution statistics and logging

### 4. User Interface
- Clean, responsive email inbox
- Advanced filtering and search
- Rule creation and management interface
- Settings and account management
- Real-time status indicators

## Database Schema

### EmailAccount
Stores OAuth tokens and account information:
```javascript
{
  userId: ObjectId,
  provider: 'gmail' | 'outlook',
  email: String,
  accessToken: String,
  refreshToken: String,
  tokenExpiry: Date,
  scope: String,
  isActive: Boolean,
  lastSyncAt: Date,
  syncStatus: 'active' | 'error' | 'expired',
  errorMessage: String
}
```

### EmailForwardingRule
Stores user-defined forwarding rules:
```javascript
{
  userId: ObjectId,
  ruleName: String,
  isActive: Boolean,
  conditions: {
    senderEmail: String,
    senderDomain: String,
    subjectKeywords: [String],
    bodyKeywords: [String],
    hasAttachments: Boolean
  },
  actions: {
    forwardType: 'full' | 'summary',
    recipients: [{ type: 'role' | 'email', value: String }],
    addNote: String
  },
  executionCount: Number,
  lastExecutedAt: Date
}
```

### SyncedEmail
Stores synced email data:
```javascript
{
  emailAccountId: ObjectId,
  userId: ObjectId,
  gmailId: String,
  threadId: String,
  sender: String,
  recipient: String,
  subject: String,
  body: String,
  bodyPreview: String,
  receivedAt: Date,
  isRead: Boolean,
  hasAttachments: Boolean,
  attachmentCount: Number,
  labels: [String],
  isForwarded: Boolean,
  forwardedAt: Date,
  forwardingRuleId: ObjectId
}
```

### EmailAuditLog
Tracks all email-related actions:
```javascript
{
  userId: ObjectId,
  action: String,
  emailAccountId: ObjectId,
  emailId: ObjectId,
  ruleId: ObjectId,
  details: Object,
  ipAddress: String,
  userAgent: String
}
```

## API Endpoints

### Authentication
- `GET /api/email/gmail/auth/:userId` - Get Gmail OAuth URL
- `GET /api/email/gmail/callback` - Handle OAuth callback
- `GET /api/email/account/:userId` - Get account status
- `DELETE /api/email/account/:userId` - Disconnect account

### Email Management
- `POST /api/email/sync/:userId` - Sync emails from Gmail
- `GET /api/email/emails/:userId` - Get user's emails with filters
- `PATCH /api/email/emails/:emailId/read` - Mark email as read

### Forwarding Rules
- `POST /api/email/forwarding-rules` - Create forwarding rule
- `GET /api/email/forwarding-rules/:userId` - Get user's rules
- `PUT /api/email/forwarding-rules/:ruleId` - Update rule
- `DELETE /api/email/forwarding-rules/:ruleId` - Delete rule

### Audit & Logs
- `GET /api/email/audit-logs/:userId` - Get audit logs

## Setup Instructions

### 1. Environment Variables
Add these to your `.env` file:
```env
# Gmail OAuth2 Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/email/gmail/callback

# Email Configuration (for forwarding)
EMAIL_USER=your_smtp_email
EMAIL_PASS=your_smtp_password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 2. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth2 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5000/api/email/gmail/callback` (development)
   - `https://yourdomain.com/api/email/gmail/callback` (production)

### 3. Install Dependencies
```bash
cd backend
npm install googleapis
```

### 4. Database Migration
The schemas will be created automatically when the application starts. No manual migration is required.

## Usage Examples

### Creating a GST Notification Rule
```javascript
const rule = {
  ruleName: "GST Notifications",
  conditions: {
    senderDomain: "@gst.gov.in",
    subjectKeywords: ["GST", "Return", "Filing"]
  },
  actions: {
    forwardType: "summary",
    recipients: [
      { type: "role", value: "manager" },
      { type: "role", value: "admin" }
    ],
    addNote: "Important GST notification - please review"
  }
};
```

### Creating a Client Communication Rule
```javascript
const rule = {
  ruleName: "Client Urgent Emails",
  conditions: {
    subjectKeywords: ["urgent", "asap", "immediate"],
    hasAttachments: true
  },
  actions: {
    forwardType: "full",
    recipients: [
      { type: "email", value: "manager@yourfirm.com" }
    ]
  }
};
```

## Security Considerations

1. **OAuth2 Security**: All tokens are stored securely and refreshed automatically
2. **Data Encryption**: Email content is stored in plain text (consider encryption for production)
3. **Access Control**: Users can only access their own emails and rules
4. **Audit Logging**: All actions are logged for compliance
5. **Token Management**: Automatic token refresh prevents service interruption

## Performance Optimization

1. **Pagination**: Email lists are paginated to handle large volumes
2. **Indexing**: Database indexes on frequently queried fields
3. **Background Sync**: Email syncing runs in background to avoid blocking UI
4. **Caching**: Consider implementing Redis for frequently accessed data

## Monitoring & Maintenance

1. **Sync Status**: Monitor email account sync status
2. **Rule Execution**: Track rule execution counts and success rates
3. **Error Handling**: Comprehensive error logging and user feedback
4. **Token Health**: Monitor token expiration and refresh success

## Testing

Run the test script to verify the integration:
```bash
node test-email-integration.js
```

This will test:
- OAuth URL generation
- Account status checking
- Rule CRUD operations
- Email sync (will fail without OAuth, but handles gracefully)
- Audit logging

## Troubleshooting

### Common Issues

1. **OAuth Errors**: Check Google Cloud Console configuration
2. **Sync Failures**: Verify Gmail API permissions and token validity
3. **Forwarding Issues**: Check SMTP configuration and recipient emails
4. **Database Errors**: Ensure MongoDB connection and schema validation

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` and check console output for detailed error messages.

## Future Enhancements

1. **Microsoft Outlook Integration**: Add support for Office 365
2. **AI Email Categorization**: Automatic email labeling and routing
3. **Advanced Rules**: More complex condition logic
4. **Email Templates**: Predefined rule templates for common scenarios
5. **Bulk Operations**: Mass email management features
6. **Analytics Dashboard**: Email usage and forwarding statistics

## Support

For issues or questions regarding the email integration feature, please check:
1. This documentation
2. Test script output
3. Server logs for error details
4. Google Gmail API documentation
