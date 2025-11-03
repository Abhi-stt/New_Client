# OAuth Setup Guide - Step by Step

This guide will walk you through getting all the OAuth credentials needed for Google Sheets and SharePoint sync.

## Part 1: Google OAuth Setup (Google Sheets)

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Sign in with your Google account (use the account that should have access to Google Sheets)

### Step 2: Create or Select a Project
1. Click the project dropdown at the top (next to "Google Cloud")
2. Click **"New Project"** OR select an existing project
3. If creating new:
   - Project name: `Client Portal Integration` (or any name)
   - Click **"Create"**
   - Wait a few seconds for project creation

### Step 3: Enable Required APIs
1. Go to **"APIs & Services"** → **"Library"** (from left menu)
2. Search for **"Google Sheets API"** and click it
3. Click **"Enable"** button
4. Go back to Library
5. Search for **"Google Drive API"** and click it
6. Click **"Enable"** button

### Step 4: Configure OAuth Consent Screen
1. Go to **"APIs & Services"** → **"OAuth consent screen"** (left menu)
2. Select **"External"** (unless you have Google Workspace)
3. Click **"Create"**
4. Fill in the form:
   - **App name:** `Client Portal`
   - **User support email:** Your email
   - **Developer contact email:** Your email
   - Click **"Save and Continue"**
5. **Scopes** (Step 2):
   - Click **"Add or Remove Scopes"**
   - Select these scopes manually:
     - `https://www.googleapis.com/auth/spreadsheets`
     - `https://www.googleapis.com/auth/drive.file`
   - Click **"Update"**
   - Click **"Save and Continue"**
6. **Test users** (Step 3):
   - If your app is in "Testing" mode, add your email as a test user
   - Click **"Save and Continue"**
7. **Summary** (Step 4):
   - Review and click **"Back to Dashboard"**

### Step 5: Create OAuth Credentials
1. Go to **"APIs & Services"** → **"Credentials"** (left menu)
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. If prompted, select **"Web application"**
5. Fill in:
   - **Name:** `Client Portal Backend`
   - **Authorized JavaScript origins:** (add these one by one)
     - `http://localhost:5000` (for local development)
     - `http://localhost:3000` (for local frontend)
     - Your production backend URL: `https://your-backend.onrender.com` (or your backend domain)
   - **Authorized redirect URIs:** (add these one by one)
     - `http://localhost:5000/api/auth/google/callback` (for local)
     - `https://your-backend.onrender.com/api/auth/google/callback` (for production)
     - Replace `your-backend.onrender.com` with your actual backend URL
6. Click **"Create"**
7. **IMPORTANT:** A popup will show:
   - **Your Client ID** (copy this - looks like: `123456789-abc.apps.googleusercontent.com`)
   - **Your Client Secret** (copy this - looks like: `GOCSPX-xxxxxxxxxxxxx`)
   - **⚠️ Copy these NOW - you won't see the secret again!**
8. Save both values somewhere safe

### Step 6: Note Your Credentials
You should now have:
- ✅ `GOOGLE_CLIENT_ID` = The Client ID you copied
- ✅ `GOOGLE_CLIENT_SECRET` = The Client Secret you copied

---

## Part 2: Microsoft OAuth Setup (SharePoint)

### Step 1: Go to Azure Portal
1. Visit: https://portal.azure.com/
2. Sign in with your Microsoft account (work/school account recommended for SharePoint)

### Step 2: Register a New Application
1. Search for **"Azure Active Directory"** in the top search bar
2. Click on **"Azure Active Directory"**
3. Click **"App registrations"** from the left menu
4. Click **"+ New registration"** button

### Step 3: Register the Application
1. Fill in:
   - **Name:** `Client Portal SharePoint Integration`
   - **Supported account types:**
     - Choose **"Accounts in any organizational directory and personal Microsoft accounts"** (if you want personal accounts)
     - OR **"Accounts in this organizational directory only"** (for your organization only)
   - **Redirect URI:**
     - Platform: **"Web"**
     - URI: `http://localhost:5000/api/auth/sharepoint/callback` (we'll add production later)
2. Click **"Register"**

### Step 4: Note Your Application (Client) ID
1. After registration, you'll see the **"Overview"** page
2. **Copy the "Application (client) ID"** - this is your `MS_CLIENT_ID`
3. Save it somewhere safe

### Step 5: Create a Client Secret
1. Go to **"Certificates & secrets"** from the left menu
2. Click **"+ New client secret"**
3. Fill in:
   - **Description:** `Client Portal Secret`
   - **Expires:** Choose expiration (24 months recommended)
4. Click **"Add"**
5. **⚠️ IMPORTANT:** Copy the **"Value"** (not the Secret ID) - this is your `MS_CLIENT_SECRET`
   - **You won't see it again!**

### Step 6: Configure Redirect URIs
1. Go to **"Authentication"** from the left menu
2. Under **"Platform configurations"**, click on your **"Web"** platform
3. Add redirect URIs:
   - `http://localhost:5000/api/auth/sharepoint/callback`
   - `https://your-backend.onrender.com/api/auth/sharepoint/callback` (replace with your backend URL)
4. Click **"Save"**

### Step 7: Add API Permissions
1. Go to **"API permissions"** from the left menu
2. Click **"+ Add a permission"**
3. Select **"Microsoft Graph"**
4. Select **"Delegated permissions"**
5. Search and add these permissions:
   - `Files.ReadWrite.All` - Read and write files in all site collections
   - `Sites.ReadWrite.All` - Read and write items in all site collections
   - `User.Read` - Sign in and read user profile
6. Click **"Add permissions"**
7. **Important:** Click **"Grant admin consent"** button (if you have admin rights)
   - If you don't have admin rights, an admin needs to approve these permissions

### Step 8: Note Your Tenant ID
1. Go back to **"Overview"**
2. Copy the **"Directory (tenant) ID"** - this is your `MS_TENANT_ID`
   - Or use `common` for multi-tenant scenarios

### Step 9: Note Your Credentials
You should now have:
- ✅ `MS_CLIENT_ID` = The Application (client) ID
- ✅ `MS_CLIENT_SECRET` = The Client Secret Value
- ✅ `MS_TENANT_ID` = The Directory (tenant) ID (or use `common`)

---

## Part 3: Add Credentials to Your Project

### Step 1: Update Backend `.env` File
Open `backend/.env` and add:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
# For production, use: https://your-backend.onrender.com/api/auth/google/callback

# Microsoft OAuth Configuration
MS_CLIENT_ID=your_microsoft_client_id_here
MS_CLIENT_SECRET=your_microsoft_client_secret_here
MS_REDIRECT_URI=http://localhost:5000/api/auth/sharepoint/callback
# For production, use: https://your-backend.onrender.com/api/auth/sharepoint/callback
MS_TENANT_ID=common
# Or use your specific tenant ID from Azure

# Frontend URL (for generating document view links)
FRONTEND_URL=http://localhost:3000
# For production, use: https://your-frontend.vercel.app
```

### Step 2: Update for Production
When deploying to production:

1. **Backend Environment Variables** (Render/Vercel/Your hosting):
   - Set `GOOGLE_REDIRECT_URI` to your production backend URL
   - Set `MS_REDIRECT_URI` to your production backend URL
   - Set `FRONTEND_URL` to your production frontend URL

2. **Google Cloud Console:**
   - Go back to Credentials → Edit your OAuth client
   - Add production URLs to:
     - Authorized JavaScript origins
     - Authorized redirect URIs

3. **Azure Portal:**
   - Go to Authentication → Add production redirect URI
   - Ensure admin consent is granted for permissions

---

## Part 4: Testing Your Setup

### Test Google OAuth:
1. Start your backend: `cd backend && npm start`
2. In browser, visit: `http://localhost:5000/api/auth/google?userId=YOUR_USER_ID`
3. Should redirect to Google login
4. After login, should redirect back to callback with success message

### Test Microsoft OAuth:
1. In browser, visit: `http://localhost:5000/api/auth/sharepoint?userId=YOUR_USER_ID`
2. Should redirect to Microsoft login
3. After login, should redirect back to callback with success message

### Common Issues:

**"Redirect URI mismatch":**
- Check that redirect URIs in `.env` match exactly with what's in Google Cloud Console/Azure Portal
- Include `http://` or `https://` correctly
- No trailing slashes

**"Invalid client":**
- Double-check you copied the Client ID correctly (no extra spaces)
- Verify the Client Secret is correct

**"Permissions not granted":**
- For Microsoft: Ensure admin consent is granted for API permissions
- For Google: If app is in "Testing", add your email as a test user

**"Access denied":**
- Check that required APIs are enabled in Google Cloud Console
- Verify API permissions are granted in Azure Portal

---

## Quick Reference

### Google OAuth Values Location:
- **Client ID & Secret:** Google Cloud Console → APIs & Services → Credentials
- **Redirect URI:** Must match exactly in `.env` and Google Cloud Console

### Microsoft OAuth Values Location:
- **Client ID:** Azure Portal → App registrations → Your app → Overview
- **Client Secret:** Azure Portal → App registrations → Your app → Certificates & secrets
- **Tenant ID:** Azure Portal → App registrations → Your app → Overview (or use `common`)
- **Redirect URI:** Must match exactly in `.env` and Azure Portal → Authentication

### Need Help?
- Google: https://developers.google.com/identity/protocols/oauth2
- Microsoft: https://docs.microsoft.com/en-us/azure/active-directory/develop/

