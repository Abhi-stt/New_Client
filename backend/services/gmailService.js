const { google } = require('googleapis');
const EmailAccount = require('../schemas/EmailAccount');
const SyncedEmail = require('../schemas/SyncedEmail');
const EmailForwardingRule = require('../schemas/EmailForwardingRule');
const EmailAuditLog = require('../schemas/EmailAuditLog');
const User = require('../schemas/User');

class GmailService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/email/gmail/callback'
    );
  }

  // Generate OAuth2 URL for Gmail
  getAuthUrl(userId) {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId.toString(),
      prompt: 'consent',
      include_granted_scopes: true
    });
  }

  // Exchange code for tokens
  async exchangeCodeForTokens(code, userId) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Get user profile
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      // Save or update email account
      const emailAccount = await EmailAccount.findOneAndUpdate(
        { userId, provider: 'gmail' },
        {
          userId,
          provider: 'gmail',
          email: profile.data.emailAddress,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry: new Date(tokens.expiry_date),
          scope: tokens.scope,
          isActive: true,
          syncStatus: 'active'
        },
        { upsert: true, new: true }
      );

      // Log the connection
      await EmailAuditLog.create({
        userId,
        action: 'connect',
        emailAccountId: emailAccount._id,
        details: { to: profile.data.emailAddress }
      });

      return emailAccount;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken(emailAccount) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: emailAccount.refreshToken
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      emailAccount.accessToken = credentials.access_token;
      emailAccount.tokenExpiry = new Date(credentials.expiry_date);
      emailAccount.syncStatus = 'active';
      await emailAccount.save();

      return credentials.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      emailAccount.syncStatus = 'error';
      emailAccount.errorMessage = error.message;
      await emailAccount.save();
      throw error;
    }
  }

  // Sync emails from Gmail
  async syncEmails(userId, maxResults = 50) {
    try {
      const emailAccount = await EmailAccount.findOne({ userId, provider: 'gmail', isActive: true });
      if (!emailAccount) {
        throw new Error('No active Gmail account found');
      }

      // Check if we have Gmail scope
      if (!emailAccount.scope || !emailAccount.scope.includes('gmail.readonly')) {
        throw new Error('Gmail API access not available. Please reconnect your account with proper permissions.');
      }

      // Check if token needs refresh
      if (new Date() >= emailAccount.tokenExpiry) {
        await this.refreshAccessToken(emailAccount);
      }

      this.oauth2Client.setCredentials({
        access_token: emailAccount.accessToken,
        refresh_token: emailAccount.refreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Get recent emails
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: 'in:inbox'
      });

      const messages = response.data.messages || [];
      const syncedEmails = [];

      for (const message of messages) {
        try {
          // Check if email already exists
          const existingEmail = await SyncedEmail.findOne({ gmailId: message.id });
          if (existingEmail) continue;

          // Get full message details
          const messageDetails = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });

          const headers = messageDetails.data.payload.headers;
          const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;

          const emailData = {
            emailAccountId: emailAccount._id,
            userId,
            gmailId: message.id,
            threadId: messageDetails.data.threadId,
            sender: getHeader('From') || '',
            recipient: getHeader('To') || '',
            subject: getHeader('Subject') || '',
            receivedAt: new Date(parseInt(messageDetails.data.internalDate)),
            isRead: !messageDetails.data.labelIds?.includes('UNREAD'),
            hasAttachments: messageDetails.data.payload.parts?.some(part => part.filename) || false,
            attachmentCount: messageDetails.data.payload.parts?.filter(part => part.filename).length || 0,
            labels: messageDetails.data.labelIds || []
          };

          // Extract body content
          const bodyContent = this.extractEmailBody(messageDetails.data.payload);
          emailData.body = bodyContent.body;
          emailData.htmlBody = bodyContent.htmlBody;
          emailData.textBody = bodyContent.textBody;
          emailData.bodyPreview = (bodyContent.textBody || bodyContent.htmlBody || '').substring(0, 200) + ((bodyContent.textBody || bodyContent.htmlBody || '').length > 200 ? '...' : '');

          const syncedEmail = await SyncedEmail.create(emailData);
          syncedEmails.push(syncedEmail);

          // Check forwarding rules
          await this.checkForwardingRules(syncedEmail);

        } catch (error) {
          console.error(`Error syncing email ${message.id}:`, error);
        }
      }

      // Update last sync time
      emailAccount.lastSyncAt = new Date();
      await emailAccount.save();

      // Log sync action
      await EmailAuditLog.create({
        userId,
        action: 'sync',
        emailAccountId: emailAccount._id,
        details: { to: `${syncedEmails.length} emails synced` }
      });

      return syncedEmails;
    } catch (error) {
      console.error('Error syncing emails:', error);
      throw error;
    }
  }

  // Extract email body from Gmail message payload
  extractEmailBody(payload) {
    let htmlBody = '';
    let textBody = '';
    
    if (payload.body && payload.body.data) {
      const body = Buffer.from(payload.body.data, 'base64').toString();
      if (payload.mimeType === 'text/html') {
        htmlBody = body;
      } else {
        textBody = body;
      }
    } else if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body && part.body.data) {
          htmlBody = Buffer.from(part.body.data, 'base64').toString();
        } else if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          textBody = Buffer.from(part.body.data, 'base64').toString();
        } else if (part.parts) {
          // Handle nested parts (multipart/alternative)
          const nestedResult = this.extractEmailBody(part);
          if (nestedResult.htmlBody) htmlBody = nestedResult.htmlBody;
          if (nestedResult.textBody) textBody = nestedResult.textBody;
        }
      }
    }
    
    return {
      htmlBody: htmlBody,
      textBody: textBody,
      body: htmlBody || textBody // Return HTML if available, otherwise plain text
    };
  }

  // Send email via Gmail API
  async sendEmail(userId, { to, subject, htmlBody }) {
    try {
      const emailAccount = await EmailAccount.findOne({ userId, provider: 'gmail', isActive: true });
      if (!emailAccount) {
        throw new Error('No active Gmail account found');
      }

      // Check if we have Gmail send scope
      if (!emailAccount.scope || !emailAccount.scope.includes('gmail.send')) {
        throw new Error('Gmail send permission not available. Please reconnect your account with proper permissions.');
      }

      // Check if token needs refresh
      if (new Date() >= emailAccount.tokenExpiry) {
        await this.refreshAccessToken(emailAccount);
      }

      this.oauth2Client.setCredentials({
        access_token: emailAccount.accessToken,
        refresh_token: emailAccount.refreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Create email in RFC 2822 format
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const messageParts = [
        `From: ${emailAccount.email}`,
        `To: ${to}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        htmlBody
      ];
      const message = messageParts.join('\n');

      // Encode the message in base64url
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send the email
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      return result.data;
    } catch (error) {
      console.error('Error sending email via Gmail API:', error);
      throw error;
    }
  }

  // Check and execute forwarding rules
  async checkForwardingRules(syncedEmail) {
    try {
      const rules = await EmailForwardingRule.find({
        userId: syncedEmail.userId,
        isActive: true
      });

      for (const rule of rules) {
        if (await this.matchesRule(syncedEmail, rule)) {
          await this.executeForwardingRule(syncedEmail, rule);
        }
      }
    } catch (error) {
      console.error('Error checking forwarding rules:', error);
    }
  }

  // Check if email matches forwarding rule
  async matchesRule(email, rule) {
    const conditions = rule.conditions;

    // Check sender email
    if (conditions.senderEmail && !email.sender.includes(conditions.senderEmail)) {
      return false;
    }

    // Check sender domain
    if (conditions.senderDomain && !email.sender.includes(conditions.senderDomain)) {
      return false;
    }

    // Check subject keywords
    if (conditions.subjectKeywords && conditions.subjectKeywords.length > 0) {
      const subjectLower = email.subject.toLowerCase();
      const hasKeyword = conditions.subjectKeywords.some(keyword => 
        subjectLower.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) return false;
    }

    // Check body keywords
    if (conditions.bodyKeywords && conditions.bodyKeywords.length > 0) {
      const bodyLower = email.body.toLowerCase();
      const hasKeyword = conditions.bodyKeywords.some(keyword => 
        bodyLower.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) return false;
    }

    // Check attachments
    if (conditions.hasAttachments !== undefined && email.hasAttachments !== conditions.hasAttachments) {
      return false;
    }

    return true;
  }

  // Execute forwarding rule
  async executeForwardingRule(email, rule) {
    try {
      const recipients = await this.getRecipientEmails(rule.actions.recipients, email.userId);
      
      if (recipients.length === 0) return;

      const forwardType = rule.actions.forwardType;
      const subject = `FWD: ${email.subject}`;
      
      let body = '';
      if (forwardType === 'full') {
        const emailContent = email.htmlBody || email.textBody || email.body || 'No content available';
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <div style="background-color: #f5f5f5; padding: 20px; border-left: 4px solid #2563eb;">
              <h3 style="margin: 0 0 10px 0; color: #2563eb;">Forwarded Email (Auto-Rule: ${rule.ruleName})</h3>
              <p style="margin: 5px 0;"><strong>From:</strong> ${email.sender}</p>
              <p style="margin: 5px 0;"><strong>To:</strong> ${email.recipient}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(email.receivedAt).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Subject:</strong> ${email.subject}</p>
            </div>
            <div style="padding: 20px; background-color: white; border: 1px solid #e5e7eb;">
              ${emailContent}
            </div>
            ${rule.actions.addNote ? `<div style="background-color: #fef3c7; padding: 15px; margin-top: 10px; border-left: 4px solid #f59e0b;"><strong>Note:</strong> ${rule.actions.addNote}</div>` : ''}
          </div>
        `;
      } else {
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f5f5f5; padding: 20px; border-left: 4px solid #2563eb;">
              <h3 style="margin: 0 0 10px 0; color: #2563eb;">Email Summary (Auto-Rule: ${rule.ruleName})</h3>
              <p style="margin: 5px 0;"><strong>From:</strong> ${email.sender}</p>
              <p style="margin: 5px 0;"><strong>Subject:</strong> ${email.subject}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(email.receivedAt).toLocaleString()}</p>
            </div>
            <div style="padding: 20px; background-color: white; border: 1px solid #e5e7eb;">
              <p><strong>Preview:</strong></p>
              <p style="color: #6b7280; font-style: italic;">${email.bodyPreview || 'No preview available'}</p>
            </div>
            ${rule.actions.addNote ? `<div style="background-color: #fef3c7; padding: 15px; margin-top: 10px; border-left: 4px solid #f59e0b;"><strong>Note:</strong> ${rule.actions.addNote}</div>` : ''}
          </div>
        `;
      }

      // Send emails using Gmail API
      for (const recipient of recipients) {
        await this.sendEmail(email.userId, {
          to: recipient,
          subject,
          htmlBody: body
        });
      }

      // Update email as forwarded
      email.isForwarded = true;
      email.forwardedAt = new Date();
      email.forwardingRuleId = rule._id;
      await email.save();

      // Update rule statistics
      rule.executionCount += 1;
      rule.lastExecutedAt = new Date();
      await rule.save();

      // Log forwarding action
      await EmailAuditLog.create({
        userId: email.userId,
        action: 'forward',
        emailId: email._id,
        ruleId: rule._id,
        details: {
          from: email.sender,
          to: recipients.join(', '),
          subject: email.subject,
          ruleName: rule.ruleName
        }
      });

    } catch (error) {
      console.error('Error executing forwarding rule:', error);
    }
  }

  // Get recipient emails based on rule configuration
  async getRecipientEmails(recipients, userId) {
    const emails = [];

    for (const recipient of recipients) {
      if (recipient.type === 'email') {
        emails.push(recipient.value);
      } else if (recipient.type === 'role') {
        const roleUsers = await User.find({ 
          role: recipient.value,
          isActive: true 
        }).select('email');
        emails.push(...roleUsers.map(user => user.email));
      }
    }

    return [...new Set(emails)]; // Remove duplicates
  }

  // Get user's emails with pagination
  async getUserEmails(userId, page = 1, limit = 20, filters = {}) {
    try {
      const query = { userId };
      
      if (filters.sender) {
        query.sender = { $regex: filters.sender, $options: 'i' };
      }
      if (filters.subject) {
        query.subject = { $regex: filters.subject, $options: 'i' };
      }
      if (filters.isRead !== undefined) {
        query.isRead = filters.isRead;
      }
      if (filters.hasAttachments !== undefined) {
        query.hasAttachments = filters.hasAttachments;
      }

      const skip = (page - 1) * limit;
      
      const emails = await SyncedEmail.find(query)
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('emailAccountId', 'email provider');

      const total = await SyncedEmail.countDocuments(query);

      return {
        emails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting user emails:', error);
      throw error;
    }
  }
}

module.exports = new GmailService();
