const nodemailer = require('nodemailer');
const axios = require('axios');

let twilioClient = null;
const hasTwilioConfig = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;

if (hasTwilioConfig) {
  try {
    // eslint-disable-next-line global-require
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (error) {
    console.warn('Twilio SDK is not installed. SMS/WhatsApp reminders will be logged only.', error?.message);
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sanitizeRecipient = (value) => {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const deduped = [...new Set(value.filter(Boolean))];
    return deduped.length ? deduped : undefined;
  }
  return value;
};

async function sendEmail(to, subject, html, options = {}) {
  const recipient = sanitizeRecipient(to);
  if (!recipient) {
    return { skipped: true, reason: 'no-email' };
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: recipient,
      subject,
      html,
      ...options,
    });
    return { success: true };
  } catch (error) {
    console.error('Email reminder failed', error);
    return { success: false, error: error.message };
  }
}

async function sendSMS(to, message) {
  const recipient = sanitizeRecipient(to);
  if (!recipient) {
    return { skipped: true, reason: 'no-sms' };
  }

  if (twilioClient && process.env.TWILIO_SMS_FROM) {
    try {
      const response = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_SMS_FROM,
        to: recipient,
      });
      return { success: true, sid: response.sid };
    } catch (error) {
      console.error('SMS reminder failed', error);
      return { success: false, error: error.message };
    }
  }

  if (process.env.SMS_WEBHOOK_URL) {
    try {
      await axios.post(process.env.SMS_WEBHOOK_URL, { to: recipient, message });
      return { success: true, via: 'webhook' };
    } catch (error) {
      console.error('SMS webhook reminder failed', error);
      return { success: false, error: error.message };
    }
  }

  console.log(`[Reminder][SMS] ${recipient}: ${message}`);
  return { simulated: true };
}

async function sendWhatsApp(to, message) {
  const recipient = sanitizeRecipient(to);
  if (!recipient) {
    return { skipped: true, reason: 'no-whatsapp' };
  }

  if (twilioClient && process.env.TWILIO_WHATSAPP_FROM) {
    try {
      const response = await twilioClient.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
        to: recipient.startsWith('whatsapp:') ? recipient : `whatsapp:${recipient}`,
      });
      return { success: true, sid: response.sid };
    } catch (error) {
      console.error('WhatsApp reminder failed', error);
      return { success: false, error: error.message };
    }
  }

  if (process.env.WHATSAPP_WEBHOOK_URL) {
    try {
      await axios.post(process.env.WHATSAPP_WEBHOOK_URL, { to: recipient, message });
      return { success: true, via: 'webhook' };
    } catch (error) {
      console.error('WhatsApp webhook reminder failed', error);
      return { success: false, error: error.message };
    }
  }

  console.log(`[Reminder][WhatsApp] ${recipient}: ${message}`);
  return { simulated: true };
}

async function dispatchReminder({
  channels = ['email'],
  contacts = {},
  subject,
  html,
  smsText,
  whatsappText,
}) {
  const results = [];
  for (const channel of channels) {
    switch (channel) {
      case 'email':
        results.push({ channel, ...(await sendEmail(contacts.email, subject, html)) });
        break;
      case 'sms':
        results.push({ channel, ...(await sendSMS(contacts.sms, smsText || html)) });
        break;
      case 'whatsapp':
        results.push({ channel, ...(await sendWhatsApp(contacts.whatsapp, whatsappText || smsText || html)) });
        break;
      default:
        console.warn(`Unsupported reminder channel: ${channel}`);
        results.push({ channel, skipped: true, reason: 'unsupported-channel' });
    }
  }
  return results;
}

module.exports = {
  sendEmail,
  sendSMS,
  sendWhatsApp,
  dispatchReminder,
};

