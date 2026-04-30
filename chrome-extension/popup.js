/**
 * Popup Script - UI Logic
 * Handles popup interactions and status display
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const protectionToggle = document.getElementById('protectionToggle');
  const loadingState = document.getElementById('loadingState');
  const resultCard = document.getElementById('resultCard');
  const resultIcon = document.getElementById('resultIcon');
  const resultStatus = document.getElementById('resultStatus');
  const resultMeta = document.getElementById('resultMeta');
  const riskBadge = document.getElementById('riskBadge');
  const scoreFill = document.getElementById('scoreFill');
  const keywordsSection = document.getElementById('keywordsSection');
  const keywordsList = document.getElementById('keywordsList');
  const scanNowBtn = document.getElementById('scanNowBtn');
  const clearBtn = document.getElementById('clearBtn');

  // State
  let isProtectionEnabled = true;

  // ===========================================
  // INITIALIZATION
  // ===========================================

  /**
   * Initialize popup
   */
  async function init() {
    // Get protection status
    await loadProtectionStatus();

    // Load last scan result
    await loadLastScanResult();

    // Set up event listeners
    setupEventListeners();
  }

  /**
   * Load protection status from storage
   */
  async function loadProtectionStatus() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getProtectionStatus'
      });
      
      isProtectionEnabled = response.enabled !== false;
      protectionToggle.checked = isProtectionEnabled;
    } catch (error) {
      console.error('Failed to load protection status:', error);
    }
  }

  /**
   * Load last scan result
   */
  async function loadLastScanResult() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getLastScan'
      });

      loadingState.classList.add('hidden');
      resultCard.classList.remove('hidden');

      if (response && response.result) {
        displayScanResult(response.result);
      } else {
        displayEmptyState();
      }
    } catch (error) {
      console.error('Failed to load scan result:', error);
      displayEmptyState();
    }
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Protection toggle
    protectionToggle.addEventListener('change', async () => {
      isProtectionEnabled = protectionToggle.checked;
      
      await chrome.runtime.sendMessage({
        action: 'setProtectionStatus',
        enabled: isProtectionEnabled
      });
    });

    // Scan now button
    scanNowBtn.addEventListener('click', async () => {
      await scanCurrentPage();
    });

    // Clear button
    clearBtn.addEventListener('click', async () => {
      await clearResults();
    });
  }

  // ===========================================
  // UI DISPLAY
  // ===========================================

  /**
   * Display scan result
   * @param {Object} result - Scan result
   */
  function displayScanResult(result) {
    const isScam = result.prediction === 'SCAM' || result.isFraud;
    const risk = result.risk || (result.score >= 70 ? 'High' : result.score >= 40 ? 'Medium' : 'Low');
    const score = result.score || 0;

    // Icon and status
    if (isScam) {
      resultIcon.textContent = '⚠️';
      resultStatus.textContent = 'SCAM DETECTED';
      resultStatus.className = 'result-status danger';
      resultMeta.textContent = 'This content appears to be fraudulent';
    } else {
      resultIcon.textContent = '✅';
      resultStatus.textContent = 'SAFE';
      resultStatus.className = 'result-status safe';
      resultMeta.textContent = 'No threats detected';
    }

    // Risk badge
    riskBadge.textContent = `${risk} Risk`;
    riskBadge.className = `risk-badge ${risk.toLowerCase()}`;

    // Score bar
    scoreFill.style.width = `${score}%`;
    scoreFill.className = `score-fill ${risk.toLowerCase()}`;

    // Keywords
    if (result.matchedKeywords && result.matchedKeywords.length > 0) {
      keywordsSection.classList.remove('hidden');
      keywordsList.innerHTML = result.matchedKeywords
        .map(keyword => `<span class="keyword-tag">${keyword}</span>`)
        .join('');
    } else {
      keywordsSection.classList.add('hidden');
    }

    // Timestamp
    if (result.timestamp) {
      const date = new Date(result.timestamp);
      resultMeta.textContent += ` • ${formatTime(date)}`;
    }
  }

  /**
   * Display empty state
   */
  function displayEmptyState() {
    resultIcon.textContent = '🔍';
    resultStatus.textContent = 'No Scans Yet';
    resultStatus.className = 'result-status safe';
    resultMeta.textContent = 'Click "Scan Now" to check this page';
    riskBadge.textContent = 'Low Risk';
    riskBadge.className = 'risk-badge low';
    scoreFill.style.width = '15%';
    scoreFill.className = 'score-fill low';
    keywordsSection.classList.add('hidden');
  }

  /**
   * Format time relative to now
   * @param {Date} date - Date to format
   * @returns {string} - Formatted time
   */
  function formatTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  // ===========================================
  // ACTIONS
  // ===========================================

  /**
   * Scan current page
   */
  async function scanCurrentPage() {
    // Show loading
    loadingState.classList.remove('hidden');
    resultCard.classList.add('hidden');

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) return;

      // Execute scan in content script
      chrome.tabs.sendMessage(tab.id, { action: 'scanPage' }, async (response) => {
        if (chrome.runtime.lastError) {
          console.error('Scan error:', chrome.runtime.lastError);
          displayEmptyState();
          return;
        }

        loadingState.classList.add('hidden');
        resultCard.classList.remove('hidden');

        if (response && response.result) {
          displayScanResult(response.result);
        } else {
          displayEmptyState();
        }
      });
    } catch (error) {
      console.error('Scan failed:', error);
      loadingState.classList.add('hidden');
      resultCard.classList.remove('hidden');
      displayEmptyState();
    }
  }

  /**
   * Clear results
   */
  async function clearResults() {
    try {
      await chrome.runtime.sendMessage({ action: 'clearScan' });
      displayEmptyState();
    } catch (error) {
      console.error('Clear failed:', error);
    }
  }

  // Add message listener for background updates
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'scanCompleted') {
      displayScanResult(message.result);
    }
  });

  // Initialize
  init();
});
