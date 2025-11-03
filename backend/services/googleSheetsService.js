const { google } = require('googleapis');
const axios = require('axios');
require('dotenv').config();

class GoogleSheetsService {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI;
  }

  /**
   * Get OAuth2 client with user's tokens
   */
  getOAuth2Client(user) {
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );

    if (user?.googleOAuth?.accessToken) {
      oauth2Client.setCredentials({
        access_token: user.googleOAuth.accessToken,
        refresh_token: user.googleOAuth.refreshToken,
        expiry_date: user.googleOAuth.tokenExpiry?.getTime()
      });
    }

    return oauth2Client;
  }

  /**
   * Refresh access token if expired
   */
  async refreshTokenIfNeeded(user, UserModel) {
    if (!user?.googleOAuth?.refreshToken) {
      throw new Error('Google account not connected. Please connect your Google account first.');
    }

    const oauth2Client = this.getOAuth2Client(user);
    const expiryTime = user.googleOAuth.tokenExpiry?.getTime() || 0;
    const now = Date.now();
    
    // Refresh if token expires in next 5 minutes
    if (expiryTime && expiryTime < now + 5 * 60 * 1000) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Update user's tokens in database
        user.googleOAuth.accessToken = credentials.access_token;
        user.googleOAuth.tokenExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : null;
        if (credentials.refresh_token) {
          user.googleOAuth.refreshToken = credentials.refresh_token;
        }
        await user.save();

        return credentials.access_token;
      } catch (error) {
        console.error('Error refreshing Google token:', error);
        throw new Error('Failed to refresh Google access token. Please reconnect your account.');
      }
    }

    return user.googleOAuth.accessToken;
  }

  /**
   * Extract spreadsheet ID and sheet name from URL
   */
  parseSpreadsheetUrl(url) {
    try {
      // Pattern: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit#gid={SHEET_ID}
      // Or: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        throw new Error('Invalid Google Sheets URL format');
      }

      const spreadsheetId = match[1];
      
      // Extract sheet name from gid if present, or use default
      const gidMatch = url.match(/[#&]gid=(\d+)/);
      const sheetId = gidMatch ? parseInt(gidMatch[1]) : null;

      return { spreadsheetId, sheetId };
    } catch (error) {
      throw new Error(`Invalid Google Sheets URL: ${error.message}`);
    }
  }

  /**
   * Get or create the sheet and ensure headers exist
   */
  async ensureSheetWithHeaders(oauth2Client, spreadsheetId, sheetName = 'Sheet1') {
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    try {
      // Get spreadsheet metadata
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      
      // Find sheet by name or use first sheet
      let targetSheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      
      if (!targetSheet) {
        // Create new sheet if it doesn't exist
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName
                }
              }
            }]
          }
        });
        
        // Refresh to get new sheet
        const updatedSpreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        targetSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      }

      const sheetId = targetSheet.properties.sheetId;
      const range = `${sheetName}!A1:F1`;

      // Check if headers exist
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });

      const existingHeaders = headerResponse.data.values?.[0] || [];
      
      // Define expected headers
      const expectedHeaders = ['Document Name', 'Client', 'Type', 'Upload Date', 'Status', 'View Link'];
      
      // If headers don't match or don't exist, set them
      if (existingHeaders.length === 0 || JSON.stringify(existingHeaders) !== JSON.stringify(expectedHeaders)) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'RAW',
          requestBody: {
            values: [expectedHeaders]
          }
        });

        // Format header row (bold)
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: expectedHeaders.length
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                  }
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor)'
              }
            }]
          }
        });
      }

      return sheetName;
    } catch (error) {
      console.error('Error ensuring sheet with headers:', error);
      throw new Error(`Failed to access Google Sheet: ${error.message}`);
    }
  }

  /**
   * Append document row to Google Sheet
   */
  async appendDocumentRow(user, UserModel, document, googleSheetsUrl) {
    try {
      // Refresh token if needed
      await this.refreshTokenIfNeeded(user, UserModel);
      
      const oauth2Client = this.getOAuth2Client(user);
      const { spreadsheetId } = this.parseSpreadsheetUrl(googleSheetsUrl);
      
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

      // Ensure sheet exists with headers
      const sheetName = await this.ensureSheetWithHeaders(oauth2Client, spreadsheetId);

      // Prepare row data
      const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const viewLink = `${frontendBaseUrl}/documents?documentId=${document._id}`;
      
      const clientName = document.clientId?.name || 
                        (typeof document.clientId === 'object' && document.clientId?.name) ||
                        'Unknown Client';
      
      const rowData = [
        document.name || 'Untitled',
        clientName,
        document.type || 'Other',
        document.createdAt ? new Date(document.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
        document.status || 'pending',
        viewLink
      ];

      // Append row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:F`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData]
        }
      });

      return {
        success: true,
        message: 'Document synced to Google Sheets successfully',
        spreadsheetId,
        sheetName
      };
    } catch (error) {
      console.error('Error appending to Google Sheets:', error);
      throw new Error(`Failed to sync to Google Sheets: ${error.message}`);
    }
  }

  /**
   * Get OAuth URL for user
   */
  getAuthUrl(userId) {
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: userId.toString() // Include userId in state for callback
    });

    return url;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code, userId, UserModel) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        this.redirectUri
      );

      const { tokens } = await oauth2Client.getToken(code);

      // Get user info
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      // Save tokens to user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.googleOAuth = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        connectedEmail: userInfo.data.email,
        connectedAt: new Date()
      };

      await user.save();

      return {
        success: true,
        email: userInfo.data.email
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error(`Failed to connect Google account: ${error.message}`);
    }
  }

  /**
   * Disconnect Google account
   */
  async disconnect(user) {
    try {
      user.googleOAuth = {
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        connectedEmail: null,
        connectedAt: null
      };
      await user.save();
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to disconnect Google account: ${error.message}`);
    }
  }
}

module.exports = new GoogleSheetsService();

