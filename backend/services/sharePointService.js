const axios = require('axios');
require('dotenv').config();

class SharePointService {
  constructor() {
    this.clientId = process.env.MS_CLIENT_ID;
    this.clientSecret = process.env.MS_CLIENT_SECRET;
    this.redirectUri = process.env.MS_REDIRECT_URI;
    this.tenantId = process.env.MS_TENANT_ID || 'common'; // Use 'common' for multi-tenant
  }

  /**
   * Refresh Microsoft access token if expired
   */
  async refreshTokenIfNeeded(user, UserModel) {
    if (!user?.microsoftOAuth?.refreshToken) {
      throw new Error('Microsoft account not connected. Please connect your Microsoft account first.');
    }

    const expiryTime = user.microsoftOAuth.tokenExpiry?.getTime() || 0;
    const now = Date.now();
    
    // Refresh if token expires in next 5 minutes
    if (expiryTime && expiryTime < now + 5 * 60 * 1000) {
      try {
        const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
        
        const params = new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: user.microsoftOAuth.refreshToken,
          grant_type: 'refresh_token',
          scope: 'https://graph.microsoft.com/Files.ReadWrite.All offline_access'
        });

        const response = await axios.post(tokenUrl, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const tokens = response.data;
        
        // Update user's tokens in database
        user.microsoftOAuth.accessToken = tokens.access_token;
        user.microsoftOAuth.tokenExpiry = tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null;
        if (tokens.refresh_token) {
          user.microsoftOAuth.refreshToken = tokens.refresh_token;
        }
        await user.save();

        return tokens.access_token;
      } catch (error) {
        console.error('Error refreshing Microsoft token:', error);
        throw new Error('Failed to refresh Microsoft access token. Please reconnect your account.');
      }
    }

    return user.microsoftOAuth.accessToken;
  }

  /**
   * Get Graph API client with user's token
   */
  async getGraphClient(user, UserModel) {
    const accessToken = await this.refreshTokenIfNeeded(user, UserModel);
    
    return axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Parse SharePoint URL to extract site and folder path
   */
  parseSharePointUrl(url) {
    try {
      // Pattern: https://{tenant}.sharepoint.com/sites/{site}/Shared%20Documents/{folder}
      // Or: https://{tenant}.sharepoint.com/sites/{site}/_layouts/15/folder.aspx?RootFolder={path}
      
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Extract site from path
      const pathMatch = urlObj.pathname.match(/\/sites\/([^\/]+)/);
      if (!pathMatch) {
        throw new Error('Invalid SharePoint URL. Must contain /sites/{siteName}');
      }

      const siteName = pathMatch[1];
      
      // Extract folder path
      let folderPath = '';
      
      // Check if it's a direct folder URL
      if (urlObj.pathname.includes('/Shared%20Documents') || urlObj.pathname.includes('/Shared Documents')) {
        folderPath = urlObj.pathname.split('/Shared%20Documents/')[1] || 
                     urlObj.pathname.split('/Shared Documents/')[1] || '';
        folderPath = decodeURIComponent(folderPath);
      } else if (urlObj.searchParams.has('RootFolder')) {
        folderPath = urlObj.searchParams.get('RootFolder');
        // Extract path after /sites/{site}/Shared Documents/
        const match = folderPath.match(/Shared Documents\/(.+)/);
        if (match) folderPath = match[1];
      }

      return {
        siteName,
        folderPath: folderPath || '',
        hostname
      };
    } catch (error) {
      throw new Error(`Invalid SharePoint URL: ${error.message}`);
    }
  }

  /**
   * Convert SharePoint URL to site ID using Graph API
   */
  async getSiteId(graphClient, hostname, siteName) {
    try {
      // Try to get site by hostname and site name
      const sitePath = `${hostname}:/sites/${siteName}`;
      const response = await graphClient.get(`/sites/${sitePath}`);
      return response.data.id;
    } catch (error) {
      // Alternative: search for site
      try {
        const response = await graphClient.get(`/sites?search=${siteName}`);
        const sites = response.data.value || [];
        const site = sites.find(s => s.displayName === siteName || s.webUrl.includes(siteName));
        if (site) return site.id;
        throw new Error('Site not found');
      } catch (err) {
        throw new Error(`Unable to find SharePoint site: ${error.message}`);
      }
    }
  }

  /**
   * Get or create folder in SharePoint
   */
  async ensureFolder(graphClient, siteId, folderPath) {
    try {
      // SharePoint uses /drive/root for document libraries
      const basePath = `/sites/${siteId}/drive/root`;
      
      if (!folderPath || folderPath === '') {
        return basePath;
      }

      // Split path and create folders if needed
      const folders = folderPath.split('/').filter(f => f.trim() !== '');
      let currentPath = basePath;

      for (const folderName of folders) {
        try {
          // Try to get the folder
          const encodedFolder = encodeURIComponent(folderName);
          const folderResponse = await graphClient.get(`${currentPath}:/${encodedFolder}:`);
          currentPath = folderResponse.data.id ? `/drives/${folderResponse.data.parentReference.driveId}/items/${folderResponse.data.id}` : currentPath;
        } catch (error) {
          // Folder doesn't exist, create it
          try {
            const createResponse = await graphClient.patch(`${currentPath}/children`, {
              name: folderName,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'rename'
            });
            currentPath = createResponse.data.id ? `/drives/${createResponse.data.parentReference.driveId}/items/${createResponse.data.id}` : currentPath;
          } catch (createError) {
            // Try using /children endpoint differently
            const driveId = currentPath.includes('/drives/') 
              ? currentPath.match(/\/drives\/([^\/]+)/)[1]
              : (await graphClient.get(`${basePath}`)).data.parentReference.driveId;
            
            const itemId = currentPath.includes('/items/') 
              ? currentPath.match(/\/items\/([^\/]+)/)[1]
              : 'root';

            const createResponse = await graphClient.post(`/drives/${driveId}/items/${itemId}/children`, {
              name: folderName,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'rename'
            });
            
            currentPath = `/drives/${driveId}/items/${createResponse.data.id}`;
          }
        }
      }

      return currentPath;
    } catch (error) {
      console.error('Error ensuring folder:', error);
      // Fallback: use root if folder creation fails
      return `/sites/${siteId}/drive/root`;
    }
  }

  /**
   * Upload document file to SharePoint
   */
  async uploadDocumentToSharePoint(user, UserModel, document, sharePointUrl, filePath) {
    try {
      const graphClient = await this.getGraphClient(user, UserModel);
      
      // Parse URL
      const { siteName, folderPath, hostname } = this.parseSharePointUrl(sharePointUrl);
      
      // Get site ID
      const siteId = await this.getSiteId(graphClient, hostname, siteName);
      
      // Ensure folder exists
      const folderItemId = await this.ensureFolder(graphClient, siteId, folderPath);
      
      // Read file
      const fs = require('fs');
      const path = require('path');
      const fullFilePath = path.join(__dirname, '..', filePath);
      
      if (!fs.existsSync(fullFilePath)) {
        throw new Error(`File not found: ${fullFilePath}`);
      }

      const fileBuffer = fs.readFileSync(fullFilePath);
      const fileName = document.files?.[0]?.filename || `document-${document._id}.pdf`;
      
      // Get drive ID from folder
      let driveId, parentItemId;
      
      if (folderItemId.includes('/drives/')) {
        driveId = folderItemId.match(/\/drives\/([^\/]+)/)[1];
        parentItemId = folderItemId.match(/\/items\/(.+)$/)?.[1] || 'root';
      } else {
        const driveInfo = await graphClient.get(`/sites/${siteId}/drive`);
        driveId = driveInfo.data.id;
        parentItemId = folderItemId.includes('/items/') 
          ? folderItemId.match(/\/items\/(.+)$/)[1]
          : 'root';
      }

      // Upload file using upload session for large files, or direct upload for small files
      const fileSize = fileBuffer.length;
      const maxDirectUpload = 4 * 1024 * 1024; // 4MB

      if (fileSize > maxDirectUpload) {
        // Use upload session for large files
        const uploadSession = await graphClient.post(
          `/drives/${driveId}/items/${parentItemId}:/${encodeURIComponent(fileName)}:/createUploadSession`,
          {
            item: {
              '@microsoft.graph.conflictBehavior': 'rename',
              name: fileName
            }
          }
        );

        // Upload in chunks (simplified - in production, handle large files properly)
        const chunkSize = 320 * 1024 * 1024; // 320KB per chunk
        // For simplicity, using direct upload - in production, implement chunked upload
        throw new Error('Large file upload not yet implemented. Please use files under 4MB.');
      } else {
        // Direct upload for small files
        await graphClient.put(
          `/drives/${driveId}/items/${parentItemId}:/${encodeURIComponent(fileName)}:/content`,
          fileBuffer,
          {
            headers: {
              'Content-Type': document.files?.[0]?.mimetype || 'application/octet-stream'
            }
          }
        );
      }

      return {
        success: true,
        message: 'Document uploaded to SharePoint successfully',
        siteName,
        folderPath
      };
    } catch (error) {
      console.error('Error uploading to SharePoint:', error);
      throw new Error(`Failed to sync to SharePoint: ${error.message}`);
    }
  }

  /**
   * Sync document metadata (create a metadata file in SharePoint)
   */
  async syncDocumentMetadata(user, UserModel, document, sharePointUrl) {
    try {
      const graphClient = await this.getGraphClient(user, UserModel);
      
      const { siteName, folderPath, hostname } = this.parseSharePointUrl(sharePointUrl);
      const siteId = await this.getSiteId(graphClient, hostname, siteName);
      const folderItemId = await this.ensureFolder(graphClient, siteId, folderPath);
      
      // Create metadata JSON file
      const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const metadata = {
        documentId: document._id.toString(),
        name: document.name,
        type: document.type,
        client: document.clientId?.name || 'Unknown',
        status: document.status,
        uploadedDate: document.createdAt,
        viewLink: `${frontendBaseUrl}/documents?documentId=${document._id}`
      };

      // Get drive ID
      let driveId, parentItemId;
      if (folderItemId.includes('/drives/')) {
        driveId = folderItemId.match(/\/drives\/([^\/]+)/)[1];
        parentItemId = folderItemId.match(/\/items\/(.+)$/)?.[1] || 'root';
      } else {
        const driveInfo = await graphClient.get(`/sites/${siteId}/drive`);
        driveId = driveInfo.data.id;
        parentItemId = 'root';
      }

      const metadataFileName = `metadata-${document._id}.json`;
      
      await graphClient.put(
        `/drives/${driveId}/items/${parentItemId}:/${encodeURIComponent(metadataFileName)}:/content`,
        JSON.stringify(metadata, null, 2),
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        message: 'Document metadata synced to SharePoint successfully'
      };
    } catch (error) {
      console.error('Error syncing metadata to SharePoint:', error);
      // Don't throw - metadata sync failure shouldn't fail the whole operation
      return {
        success: false,
        message: `Metadata sync failed: ${error.message}`
      };
    }
  }

  /**
   * Get OAuth URL for user
   */
  getAuthUrl(userId) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: 'https://graph.microsoft.com/Files.ReadWrite.All offline_access',
      state: userId.toString(), // Include userId in state
      prompt: 'consent'
    });

    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code, userId, UserModel) {
    try {
      const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
        scope: 'https://graph.microsoft.com/Files.ReadWrite.All offline_access'
      });

      const response = await axios.post(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const tokens = response.data;

      // Get user info from Graph API
      const graphClient = axios.create({
        baseURL: 'https://graph.microsoft.com/v1.0',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      const userInfo = await graphClient.get('/me');

      // Save tokens to user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.microsoftOAuth = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        connectedEmail: userInfo.data.mail || userInfo.data.userPrincipalName,
        connectedAt: new Date()
      };

      await user.save();

      return {
        success: true,
        email: userInfo.data.mail || userInfo.data.userPrincipalName
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error(`Failed to connect Microsoft account: ${error.message}`);
    }
  }

  /**
   * Disconnect Microsoft account
   */
  async disconnect(user) {
    try {
      user.microsoftOAuth = {
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        connectedEmail: null,
        connectedAt: null
      };
      await user.save();
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to disconnect Microsoft account: ${error.message}`);
    }
  }
}

module.exports = new SharePointService();

