/**
 * Background Script - API Communication
 * Handles communication between content script and backend API
 */

// Configuration - Update this to your backend URL
const CONFIG = {
  apiEndpoint: 'http://localhost:5000/api/analyze-text',
  checkUrlEndpoint: 'http://localhost:5000/api/check-url',
  storageKey: 'protectionEnabled'
};

// Initialize default storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ protectionEnabled: true });
  console.log('[Fraud Detection] Extension installed');
});

// ===========================================
// MESSAGE HANDLING
// ===========================================

/**
 * Handle messages from content scripts
 * @param {Object} message - Message from content script
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Callback to send response
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analyzeText') {
    handleAnalyzeText(message.text, sender.tab)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Will respond async
  }

  if (message.action === 'checkUrl') {
    handleCheckUrl(message.url, sender.tab)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (message.action === 'getProtectionStatus') {
    chrome.storage.sync.get([CONFIG.storageKey], (result) => {
      sendResponse({ enabled: result[CONFIG.storageKey] !== false });
    });
    return true;
  }

  if (message.action === 'setProtectionStatus') {
    chrome.storage.sync.set({ protectionEnabled: message.enabled }, () => {
      // Notify all tabs of status change
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'statusChanged',
            enabled: message.enabled
          }).catch(() => {});
        });
      });
      sendResponse({ success: true });
    });
    return true;
  }
});

// ===========================================
// API CALLS
// ===========================================

/**
 * Analyze text via backend API
 * @param {string} text - Text to analyze
 * @param {Object} tab - Active tab
 * @returns {Promise<Object>} - Analysis result
 */
async function handleAnalyzeText(text, tab) {
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

    const data = await response.json();
    const result = data.data || data;

    // Store result for popup access
    chrome.storage.local.set({
      lastScanResult: {
        ...result,
        timestamp: Date.now(),
        url: tab?.url
      }
    });

    // Send notification to content script if scam detected
    if (result.prediction === 'SCAM' && tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'scanResult',
        result: result
      }).catch(() => {});
    }

    return result;
  } catch (error) {
    console.error('[Fraud Detection] API error:', error);
    // Fallback to local analysis
    return localAnalysis(text);
  }
}

/**
 * Check URL via backend API
 * @param {string} url - URL to check
 * @param {Object} tab - Active tab
 * @returns {Promise<Object>} - Check result
 */
async function handleCheckUrl(url, tab) {
  try {
    const response = await fetch(CONFIG.checkUrlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ url }),
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('[Fraud Detection] URL check error:', error);
    // Fallback local analysis
    return localUrlAnalysis(url);
  }
}

// ===========================================
// LOCAL ANALYSIS FALLBACK
// ===========================================

/**
 * Local text analysis fallback
 * @param {string} text - Text to analyze
 * @returns {Object} - Analysis result
 */
function localAnalysis(text) {
  const scamKeywords = [
    'otp', 'urgent', 'bank', 'verify', 'click link',
    'won', 'lottery', 'prize', 'suspended', 'kyc',
    'aadhaar', 'account blocked', 'verify your account',
    'click here', 'login now', 'update payment',
    'free gift', 'claim prize', 'act now',
    'limited time', 'you have been selected'
  ];

  const textLower = text.toLowerCase();
  const matchedKeywords = [];

  for (const keyword of scamKeywords) {
    if (textLower.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }

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

/**
 * Local URL analysis fallback
 * @param {string} url - URL to analyze
 * @returns {Object} - Analysis result
 */
function localUrlAnalysis(url) {
  const suspiciousPatterns = [
    /bit\.ly/, /tinyurl/, /goo\.gl/, /t\.co/,
    /login.*verify/i, /account.*update/i, /secure.*bank/i,
    /free.*gift/i, /prize.*claim/i, /0auth/i,
    /verify.*account/i, /update.*payment/i
  ];

  const phishingDomains = [
    'fake-bank', 'secure-pay', 'verify-account',
    'amazon-support', 'paytm-verify', 'bank-update'
  ];

  const matchedPatterns = suspiciousPatterns.filter(pattern => pattern.test(url));
  const isPhishing = phishingDomains.some(d => url.toLowerCase().includes(d));

  const isUnsafe = matchedPatterns.length > 0 || isPhishing;
  const riskScore = isUnsafe ? 85 : 15;

  return {
    isUnsafe: isUnsafe,
    riskScore: riskScore,
    prediction: isUnsafe ? 'SCAM' : 'SAFE',
    risk: isUnsafe ? 'High' : 'Low',
    reasons: matchedPatterns.length > 0 
      ? ['Suspicious URL pattern detected']
      : isPhishing
        ? ['Known phishing domain']
        : [],
    matchedPatterns: matchedPatterns.map(p => p.toString())
  };
}

// ===========================================
// STORAGE MANAGEMENT
// ===========================================

/**
 * Get last scan result from storage
 * @returns {Promise<Object>} - Last scan result
 */
async function getLastScanResult() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['lastScanResult'], (result) => {
      resolve(result.lastScanResult || null);
    });
  });
}

/**
 * Clear scan history
 */
async function clearScanHistory() {
  chrome.storage.local.remove(['lastScanResult']);
}

// Export for popup access
self.backgroundFunctions = {
  getLastScanResult,
  clearScanHistory
};

console.log('[Fraud Detection] Background script loaded');
