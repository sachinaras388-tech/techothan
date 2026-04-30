/**
 * Content Script - DOM Scanning & Link Interception
 * Real-time scam detection for web pages
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiEndpoint: 'http://localhost:5000/api/analyze-text',
    checkOnLoad: true,
    checkOnClick: true,
    scanSelectors: [
      // WhatsApp Web
      'div[role="textbox"]',
      'div._1Gy50',
      // Gmail
      'div.nH',
      'div.a3q',
      // Generic
      '[contenteditable="true"]',
      'textarea',
      '.message',
      '.chat-message',
      '.msg-content'
    ],
    linkSelectors: [
      'a[href]',
      'a[href]:not([href^="#"]):not([href^="javascript"])',
      'button a[href]',
      'div[role="link"]'
    ]
  };

  // State
  let isProtectionEnabled = true;
  let lastScannedUrl = null;
  let lastScanResult = null;

  // ===========================================
  // VOICE ALERT SYSTEM
  // ===========================================

  /**
   * Play voice alert using Web Speech API
   * @param {string} message - Message to speak
   */
  function playVoiceAlert(message) {
    if (!window.speechSynthesis) {
      console.log('[Fraud Detection] Voice alert not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(message);
    speech.lang = 'en-US';
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;

    window.speechSynthesis.speak(speech);
  }

  /**
   * Play scam warning voice alert
   */
  function playScamWarningAlert() {
    const warningMessage = 'Warning! Scam detected. Do not click any links or share personal information.';
    playVoiceAlert(warningMessage);
  }

  /**
   * Play safe confirmation
   */
  function playSafeAlert() {
    const safeMessage = 'Link verified safe. You can proceed.';
    playVoiceAlert(safeMessage);
  }

  // ===========================================
  // API COMMUNICATION
  // ===========================================

  /**
   * Send text to backend API for analysis
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} - Analysis result
   */
  async function analyzeText(text) {
    try {
      const response = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ text }),
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('[Fraud Detection] API error:', error);
      // Fallback: use local analysis for demo
      return localAnalysis(text);
    }
  }

  /**
   * Local fallback analysis when API unavailable
   * @param {string} text - Text to analyze
   * @returns {Object} - Analysis result
   */
  function localAnalysis(text) {
    const scamKeywords = [
      'otp', 'urgent', 'bank', 'verify', 'click link',
      'won', 'lottery', 'prize', 'suspended', 'kyc',
      'aadhaar', 'account blocked', 'verify your account',
      'click here', 'login now', 'update payment'
    ];

    const textLower = text.toLowerCase();
    const matchedKeywords = scamKeywords.filter(keyword => 
      textLower.includes(keyword.toLowerCase())
    );

    const score = Math.min(30 + (matchedKeywords.length * 15), 100);
    const isScam = score >= 25;
    const risk = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';

    return {
      prediction: isScam ? 'SCAM' : 'SAFE',
      risk: risk,
      score: score,
      isFraud: isScam,
      matchedKeywords: matchedKeywords
    };
  }

  // ===========================================
  // DOM SCANNING
  // ===========================================

  /**
   * Scan page content for potential scam messages
   */
  async function scanPageContent() {
    if (!isProtectionEnabled) return;

    console.log('[Fraud Detection] Scanning page content...');

    const selectors = CONFIG.scanSelectors;
    let allText = [];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 10 && text.length < 2000) {
          allText.push(text);
        }
      });
    }

    // Remove duplicates
    allText = [...new Set(allText)];

    // Analyze each text block
    for (const text of allText.slice(0, 5)) { // Limit to 5 to avoid spam
      const result = await analyzeText(text);
      if (result.prediction === 'SCAM') {
        showWarningBadge('SCAM');
        return;
      }
    }

    showWarningBadge('SAFE');
  }

  /**
   * Extract text from clicked element
   * @param {HTMLElement} element - Clicked element
   * @returns {string} - Extracted text
   */
  function extractTextFromElement(element) {
    // Check the element itself
    let text = element.textContent?.trim();
    if (text && text.length > 10) return text;

    // Check parent element
    const parent = element.parentElement;
    if (parent) {
      text = parent.textContent?.trim();
      if (text && text.length > 10) return text;
    }

    // Check for message containers
    const messageEl = element.closest('[role="textbox"], .message, .msg-content, .chat-message');
    if (messageEl) {
      text = messageEl.textContent?.trim();
      if (text && text.length > 10) return text;
    }

    return '';
  }

  // ===========================================
  // LINK INTERCEPTION
  // ===========================================

  /**
   * Handle link click events
   * @param {Event} event - Click event
   */
  async function handleLinkClick(event) {
    if (!isProtectionEnabled) return;

    const link = event.target.closest('a[href]');
    if (!link) return;

    const url = link.href;
    if (!url || url.startsWith('#') || url.startsWith('javascript:')) return;

    // Don't re-check the same URL
    if (url === lastScannedUrl) return;
    lastScannedUrl = url;

    // Prevent default to check first
    event.preventDefault();
    event.stopPropagation();

    console.log('[Fraud Detection] Checking link:', url);

    // Show checking indicator
    showCheckingIndicator();

    try {
      // Analyze the URL text (use href as content)
      const result = await analyzeText(url);

      lastScanResult = result;

      if (result.prediction === 'SCAM') {
        // Block navigation and show warning
        showScamWarning(result);
        playScamWarningAlert();
      } else {
        // Allow navigation
        showSafeIndicator();
        playSafeAlert();
        window.location.href = url;
      }
    } catch (error) {
      console.error('[Fraud Detection] Check error:', error);
      // On error, allow navigation with warning
      window.location.href = url;
    }
  }

  // ===========================================
  // UI WARNING ELEMENTS
  // ===========================================

  /**
   * Show warning badge on page
   * @param {string} status - Status (SCAM/SAFE)
   */
  function showWarningBadge(status) {
    // Remove existing badge
    const existingBadge = document.getElementById('fraud-detection-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    const badge = document.createElement('div');
    badge.id = 'fraud-detection-badge';
    badge.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: bold;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    if (status === 'SCAM') {
      badge.style.background = '#dc2626';
      badge.style.color = '#fff';
      badge.innerHTML = '⚠️ Scam Risk Detected';
    } else {
      badge.style.background = '#16a34a';
      badge.style.color = '#fff';
      badge.innerHTML = '✅ Page Scanned - Safe';
    }

    document.body.appendChild(badge);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      badge.remove();
    }, 5000);
  }

  /**
   * Show checking indicator
   */
  function showCheckingIndicator() {
    const existing = document.getElementById('fraud-check-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'fraud-check-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1f2937;
      color: #fff;
      padding: 20px 30px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 16px;
      z-index: 999999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      text-align: center;
    `;
    popup.innerHTML = '🔍 Checking link safety...';

    document.body.appendChild(popup);
  }

  /**
   * Show safe indicator
   */
  function showSafeIndicator() {
    const existing = document.getElementById('fraud-check-popup');
    if (existing) existing.remove();
  }

  /**
   * Show scam warning modal
   * @param {Object} result - Analysis result
   */
  function showScamWarning(result) {
    const existing = document.getElementById('fraud-check-popup');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'fraud-check-popup';
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fef2f2;
      border: 3px solid #dc2626;
      color: #991b1b;
      padding: 24px;
      border-radius: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 16px;
      z-index: 999999;
      box-shadow: 0 12px 40px rgba(220,38,38,0.3);
      max-width: 400px;
      text-align: center;
    `;

    const riskColor = result.risk === 'High' ? '#dc2626' : result.risk === 'Medium' ? '#f59e0b' : '#84cc16';

    modal.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
      <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: bold;">⚠️ Scam Detected!</h2>
      <p style="margin: 0 0 16px; color: #7f1d1d;">
        This link has been identified as a potential scam. Do not proceed.
      </p>
      <div style="background: ${riskColor}; color: #fff; padding: 8px 16px; border-radius: 8px; display: inline-block; margin-bottom: 16px;">
        Risk Level: ${result.risk} (Score: ${result.score})
      </div>
      ${result.matchedKeywords && result.matchedKeywords.length > 0 ? `
        <div style="margin-top: 12px; font-size: 13px; color: #7f1d1d;">
          <strong>Matched Keywords:</strong><br>
          ${result.matchedKeywords.join(', ')}
        </div>
      ` : ''}
      <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: center;">
        <button id="fraud-proceed-btn" style="
          background: #dc2626;
          color: #fff;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
        ">Proceed Anyway (Not Safe)</button>
        <button id="fraud-close-btn" style="
          background: #fff;
          color: #dc2626;
          border: 2px solid #dc2626;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
        ">Go Back</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Button handlers
    document.getElementById('fraud-proceed-btn').addEventListener('click', () => {
      modal.remove();
      if (lastScannedUrl) {
        window.location.href = lastScannedUrl;
      }
    });

    document.getElementById('fraud-close-btn').addEventListener('click', () => {
      modal.remove();
    });
  }

  // ===========================================
  // MESSAGE PASSING TO BACKGROUND
  // ===========================================

  /**
   * Send message to background script
   * @param {Object} message - Message to send
   */
  function sendToBackground(message) {
    chrome.runtime.sendMessage(message).catch(err => {
      console.log('[Fraud Detection] Background communication error:', err);
    });
  }

  /**
   * Listen for messages from background script
   * @param {Object} message - Received message
   * @param {Object} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  function handleMessage(message, sender, sendResponse) {
    if (message.action === 'getStatus') {
      sendResponse({ protectionEnabled: isProtectionEnabled });
    } else if (message.action === 'setStatus') {
      isProtectionEnabled = message.enabled;
      sendResponse({ success: true });
    } else if (message.action === 'scanResult') {
      // Update display with scan result from background
      if (message.result.prediction === 'SCAM') {
        showWarningBadge('SCAM');
        playScamWarningAlert();
      } else {
        showWarningBadge('SAFE');
      }
    }
  }

  // ===========================================
  // INITIALIZATION
  // ===========================================

  /**
   * Initialize the content script
   */
  function initialize() {
    console.log('[Fraud Detection] Initializing...');

    // Check if protection is enabled
    chrome.storage.sync.get(['protectionEnabled'], (result) => {
      isProtectionEnabled = result.protectionEnabled !== false;
      console.log('[Fraud Detection] Protection:', isProtectionEnabled ? 'ON' : 'OFF');

      if (isProtectionEnabled) {
        // Set up link click listener
        document.addEventListener('click', handleLinkClick, true);

        // Scan page content on load
        if (CONFIG.checkOnLoad) {
          setTimeout(scanPageContent, 2000);
        }
      }
    });

    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener(handleMessage);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
