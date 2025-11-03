# Google Sheets & SharePoint Sync Integration - Implementation Summary

## Overview
This document describes the implementation of real Google Sheets and SharePoint sync functionality for the Documents feature.

## What Has Been Implemented

### 1. Database Schema Updates
- **User Schema** (`backend/schemas/User.js`):
  - Added `googleOAuth` object with:
    - `accessToken`, `refreshToken`, `tokenExpiry`, `connectedEmail`, `connectedAt`
  - Added `microsoftOAuth` object with same structure
  - Tokens are stored per-user in the database (not global)

### 2. Backend Services

#### Google Sheets Service (`backend/services/googleSheetsService.js`)
- **Features:**
  - OAuth token management (refresh when expired)
  - Parse Google Sheets URLs to extract spreadsheet ID
  - Auto-create sheet with headers if needed
  - Append document rows with: Name, Client, Type, Upload Date, Status, View Link
  - Connection/disconnection management

#### SharePoint Service (`backend/services/sharePointService.js`)
- **Features:**
  - OAuth token management via Microsoft Graph API
  - Parse SharePoint URLs to extract site and folder paths
  - Auto-create folders if they don't exist
  - Upload document files to SharePoint
  - Create metadata JSON files
  - Connection/disconnection management

### 3. OAuth Flow Updates (`backend/server.js`)

#### Google OAuth
- **Endpoint:** `GET /api/auth/google?userId={userId}`
  - Returns OAuth URL for user
- **Callback:** `GET /api/auth/google/callback`
  - Exchanges code for tokens
  - Saves tokens to user's record
  - Shows success page

#### Microsoft OAuth
- **Endpoint:** `GET /api/auth/sharepoint?userId={userId}`
  - Returns OAuth URL for user
- **Callback:** `GET /api/auth/sharepoint/callback`
  - Exchanges code for tokens
  - Saves tokens to user's record
  - Shows success page

### 4. Document Routes (`backend/routes/document.js`)

#### New Endpoints:
- `GET /api/documents/sync-status?userId={userId}` - Get OAuth connection status
- `POST /api/documents/disconnect-google` - Disconnect Google account
- `POST /api/documents/disconnect-sharepoint` - Disconnect Microsoft account

#### Updated Endpoints:
- `PATCH /api/documents/:id/link-sync` - Save sync settings (unchanged functionality)
- `POST /api/documents/:id/sync` - **Now performs real sync:**
  - Syncs to Google Sheets (appends row)
  - Syncs to SharePoint (uploads file + metadata)
  - Updates sync status and timestamps
  - Returns detailed results with errors

#### Auto-Sync on Upload:
- Modified `POST /api/documents/upload` to auto-sync if:
  - Sync is enabled AND
  - Account is connected AND
  - URL is provided
- Non-blocking (upload succeeds even if sync fails)

### 5. Frontend Updates (`app/documents/page.tsx`)

#### Sync Dialog Enhancements:
- Shows connection status for both Google and Microsoft
- "Connect" buttons for each service
- Displays connected email address
- "Disconnect" buttons
- Validates connection before allowing sync
- Better error messages and status indicators

#### New Features:
- Connection status polling after OAuth flow
- Real-time sync status updates
- Improved error handling and user feedback

## Required Environment Variables

Add these to your `.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-backend.com/api/auth/google/callback

# Microsoft OAuth
MS_CLIENT_ID=your_microsoft_client_id
MS_CLIENT_SECRET=your_microsoft_client_secret
MS_REDIRECT_URI=https://your-backend.com/api/auth/sharepoint/callback
MS_TENANT_ID=common  # or your tenant ID

# Frontend URL (for generating view links)
FRONTEND_URL=https://your-frontend.com
```

## Setup Instructions

### 1. Google Cloud Platform Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/Select a project
3. Enable **Google Sheets API** and **Google Drive API**
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://your-backend.com/api/auth/google/callback`
5. Add authorized JavaScript origins: `https://your-frontend.com`

### 2. Microsoft Azure Setup
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application in Azure AD
3. Configure redirect URI: `https://your-backend.com/api/auth/sharepoint/callback`
4. Add API permissions:
   - `Files.ReadWrite.All`
   - `Sites.ReadWrite.All`
5. Create a client secret
6. Copy Client ID, Client Secret, and Tenant ID

### 3. Update Redirect URIs in Backend
- Ensure `GOOGLE_REDIRECT_URI` and `MS_REDIRECT_URI` match your deployment URLs
- Update both in environment variables and in Google Cloud Console/Azure Portal

## How It Works

### User Flow:
1. **First Time Setup:**
   - User clicks "Sync" on a document
   - Sees "Connect Google Account" button
   - Clicks button → Opens OAuth popup
   - User grants permissions → Account connected
   - Same process for Microsoft/SharePoint

2. **Configuring Sync:**
   - Check "Sync with Google Sheets"
   - Paste Google Sheets URL
   - Check "Sync with SharePoint" (optional)
   - Paste SharePoint folder URL
   - Click "Save Sync Settings"

3. **Syncing:**
   - Manual: Click "Sync Now" button
   - Automatic: Happens on upload if sync is enabled

### What Gets Synced:

#### Google Sheets:
- Creates a row with columns:
  1. Document Name
  2. Client Name
  3. Document Type
  4. Upload Date
  5. Status
  6. View Link (to portal)

#### SharePoint:
- Uploads the actual document file
- Creates a metadata JSON file with:
  - Document ID, name, type, client, status, dates, view link

## Error Handling

- **Token Expiry:** Automatically refreshed before sync
- **Invalid URLs:** Validated and shows clear error messages
- **Permission Errors:** Shows specific error about sharing/permissions
- **Network Errors:** Retries (future enhancement)
- **Partial Failures:** If one service fails, the other still syncs (if enabled)

## Security Considerations

- Tokens stored in database (encrypted at rest recommended)
- User-specific tokens (not shared across users)
- Token refresh handled automatically
- OAuth scopes limited to necessary permissions
- HTTPS required for production

## Limitations & Future Enhancements

### Current Limitations:
- File uploads to SharePoint limited to <4MB (for larger files, chunked upload needed)
- No bulk sync operations
- No scheduled/automatic syncs (only on upload or manual trigger)
- No sync history/audit log

### Potential Enhancements:
- Bulk sync for multiple documents
- Scheduled syncs (daily, weekly, etc.)
- Two-way sync (update portal from Sheets/SharePoint)
- Sync conflict resolution
- Better error recovery (retry logic)
- Sync queue for offline scenarios

## Testing Checklist

- [ ] Connect Google account
- [ ] Connect Microsoft account
- [ ] Save sync settings
- [ ] Manual sync triggers
- [ ] Auto-sync on upload (if enabled)
- [ ] Error handling (invalid URLs, disconnected accounts)
- [ ] Token refresh
- [ ] Disconnect accounts
- [ ] Multiple documents syncing to same sheet/folder
- [ ] Verify data appears correctly in Google Sheets
- [ ] Verify files appear in SharePoint

## Troubleshooting

### "Google account not connected"
- Click "Connect Google Account" button
- Ensure popup blockers are disabled
- Check OAuth redirect URI matches configuration

### "Invalid Google Sheets URL"
- URL must be: `https://docs.google.com/spreadsheets/d/{ID}/edit`
- Ensure sheet is shared with connected Google account

### "SharePoint sync failed"
- Verify SharePoint URL format
- Ensure site/folder path is correct
- Check Microsoft account has permissions to the site

### "Token expired"
- Tokens auto-refresh, but if refresh token is invalid:
  - Disconnect and reconnect the account

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify environment variables are set correctly
3. Test OAuth flow independently
4. Verify API permissions in Google Cloud Console/Azure Portal

