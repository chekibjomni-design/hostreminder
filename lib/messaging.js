const axios = require('axios');
const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendWhatsApp(to, message) {
  if (!process.env.META_WHATSAPP_PHONE_NUMBER_ID || !process.env.META_WHATSAPP_ACCESS_TOKEN) {
    logger.warn('WhatsApp non configuré — variables META_WHATSAPP manquantes');
    return false;
  }

  const url = `https://graph.facebook.com/v22.0/${process.env.META_WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: to.replace(/[^0-9]/g, ''),
    type: 'template',
    template: {
      name: 'hostreminder_reminder',
      language: { code: 'fr' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: message }] }]
    }
  };

  try {
    const { data } = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${process.env.META_WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
    });
    logger.info(`WhatsApp envoyé à ${to}: ${data.messages?.[0]?.id || 'OK'}`);
    return true;
  } catch (err) {
    logger.error(`WhatsApp Erreur: ${err.response?.data?.error?.message || err.message}`);
    throw err;
  }
}

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `"HostReminder" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px">${html}</div>`
    });
    logger.info(`Email envoyé à ${to} — ${subject}`);
    return true;
  } catch (err) {
    logger.error(`Email Erreur: ${err.message}`);
    throw err;
  }
}

module.exports = { sendWhatsApp, sendEmail };