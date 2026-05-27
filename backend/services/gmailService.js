/**
 * Gmail Service - FIXED VERSION
 * Real Scam Detection + Risk Scoring + Link Analysis
 */

const axios = require('axios');
const { ScanHistory, SCAN_TYPES, SCAN_RESULTS } = require('../models/ScanHistory');
const logger = require('../utils/logger');

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

/**
 * Create Gmail client
 */
const createGmailClient = (accessToken) => {
  return axios.create({
    baseURL: GMAIL_API_BASE,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });
};

/* ---------------------- SCAM AI ENGINE ---------------------- */

const scamKeywords = [
  "otp",
  "urgent",
  "verify",
  "bank",
  "kyc",
  "suspended",
  "click here",
  "lottery",
  "prize",
  "password",
  "login",
  "update account",
  "security alert",
  "unusual activity"
];

/**
 * Text Risk Analysis (AI logic)
 */
const analyzeTextRisk = (text = "") => {
  let score = 0;
  let matchedKeywords = [];

  const lowerText = text.toLowerCase();

  scamKeywords.forEach((word) => {
    if (lowerText.includes(word)) {
      score += 15;
      matchedKeywords.push(word);
    }
  });

  return {
    score: Math.min(score, 100),
    matchedKeywords,
    risk:
      score >= 70
        ? "High"
        : score >= 40
        ? "Medium"
        : "Low",
    prediction: score >= 70 ? "SCAM" : "SAFE"
  };
};

/**
 * Link Risk Analysis
 */
const analyzeLinks = (links = []) => {
  let score = 0;
  let riskyLinks = [];

  links.forEach((link) => {
    const lower = link.toLowerCase();

    if (
      lower.includes(".xyz") ||
      lower.includes(".click") ||
      lower.includes(".top") ||
      lower.includes(".loan")
    ) {
      score += 30;
      riskyLinks.push(link);
    }

    if (lower.includes("bit.ly") || lower.includes("tinyurl") || lower.includes("t.co")) {
      score += 20;
      riskyLinks.push(link);
    }

    if (lower.includes("login") || lower.includes("verify")) {
      score += 15;
    }
  });

  return {
    score: Math.min(score, 100),
    riskyLinks
  };
};

/* ---------------------- GMAIL FUNCTIONS ---------------------- */

const listMessages = async (accessToken, options = {}) => {
  const { maxResults = 10, query = 'in:inbox', includeSpamTrash = false } = options;

  try {
    const gmail = createGmailClient(accessToken);

    const response = await gmail.get('/users/me/messages', {
      params: { maxResults, q: query, includeSpamTrash }
    });

    return response.data.messages || [];
  } catch (error) {
    logger.error('Gmail list error:', error.message);
    throw new Error('Failed to list Gmail messages');
  }
};

const getMessage = async (accessToken, messageId) => {
  try {
    const gmail = createGmailClient(accessToken);

    const response = await gmail.get(`/users/me/messages/${messageId}`, {
      params: { format: 'full' }
    });

    return response.data;
  } catch (error) {
    logger.error('Gmail get message error:', error.message);
    throw new Error('Failed to get Gmail message');
  }
};

/**
 * Extract body
 */
const getMessageBody = (message) => {
  const { payload } = message;
  let body = "";
  let htmlBody = "";

  if (payload?.parts) {
    for (const part of payload.parts) {
      if (part.body?.data) {
        const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');

        if (part.mimeType === 'text/plain') body = decoded;
        if (part.mimeType === 'text/html') htmlBody = decoded;
      }
    }
  }

  if (!body && payload?.body?.data) {
    body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  return { text: body, html: htmlBody };
};

/**
 * Extract headers
 */
const extractEmailHeaders = (message) => {
  const headers = {};

  if (message.payload?.headers) {
    for (const h of message.payload.headers) {
      headers[h.name.toLowerCase()] = h.value;
    }
  }

  return {
    from: headers.from || "",
    to: headers.to || "",
    subject: headers.subject || "",
    date: headers.date || ""
  };
};

/**
 * Extract links
 */
const extractLinks = (message) => {
  const { text, html } = getMessageBody(message);
  const content = text + " " + html;

  const urlRegex = /https?:\/\/[^\s]+/g;
  return content.match(urlRegex) || [];
};

/* ---------------------- MAIN ANALYSIS ---------------------- */

const parseEmail = async (accessToken, messageId) => {
  const message = await getMessage(accessToken, messageId);

  const headers = extractEmailHeaders(message);
  const { text, html } = getMessageBody(message);
  const links = extractLinks(message);

  const content = `
    ${headers.subject}
    ${text}
  `;

  // AI ANALYSIS
  let analysis;
  try {
    const axios = require('axios');
    const config = require('../config/env');
    const aiResponse = await axios.post(`${config.aiServiceUrl}/analyze/email`, {
      subject: headers.subject,
      body: text,
      sender: headers.from,
    }, {
      headers: { 'X-API-Key': config.aiServiceApiKey },
      timeout: 10000,
    });
    analysis = aiResponse.data;
  } catch (aiError) {
    // Fallback to local analysis
    const textAnalysis = analyzeTextRisk(content);
    const linkAnalysis = analyzeLinks(links);

    const finalScore = Math.min(
      textAnalysis.score + linkAnalysis.score,
      100
    );

    const isFraud = finalScore >= 70;

    analysis = {
      prediction: isFraud ? "SCAM" : "SAFE",
      risk: finalScore >= 70 ? "High" : finalScore >= 40 ? "Medium" : "Low",
      score: finalScore,
      confidence: finalScore / 100,
      matchedKeywords: textAnalysis.matchedKeywords,
      riskyLinks: linkAnalysis.riskyLinks,
      reason: isFraud ? "Suspicious keywords + risky links detected" : "No threat detected"
    };
  }

  return {
    id: message.id,
    headers,
    body: text,
    htmlBody: html,
    links,
    analysis: analysis
  };
};

/**
 * Fetch and analyze emails
 */
const fetchAndAnalyzeEmails = async (accessToken, userId, options = {}) => {
  const { maxResults = 10 } = options;

  try {
    const messages = await listMessages(accessToken, { maxResults });

    const results = [];

    for (const msg of messages) {
      try {
        const email = await parseEmail(accessToken, msg.id);

        const scan = await ScanHistory.create({
          userId,
          type: SCAN_TYPES.EMAIL,
          content: email.headers.subject,
          result:
            email.analysis.prediction === "SCAM"
              ? SCAN_RESULTS.FRAUD
              : SCAN_RESULTS.SAFE,
          riskScore: email.analysis.score,
          confidence: email.analysis.confidence,
          analysis: email.analysis,
          isFlagged: email.analysis.prediction === "SCAM"
        });

        results.push({
          id: email.id,
          from: email.headers.from,
          subject: email.headers.subject,
          links: email.links,
          analysis: email.analysis,
          scanId: scan._id
        });
      } catch (err) {
        logger.warn("Email processing failed:", err.message);
      }
    }

    return {
      total: results.length,
      messages: results
    };
  } catch (error) {
    logger.error("Fetch emails error:", error.message);
    throw error;
  }
};

/**
 * Analyze single email
 */
const analyzeEmail = async (accessToken, messageId) => {
  return await parseEmail(accessToken, messageId);
};

module.exports = {
  listMessages,
  getMessage,
  getMessageBody,
  extractEmailHeaders,
  extractLinks,
  parseEmail,
  fetchAndAnalyzeEmails,
  analyzeEmail
};
