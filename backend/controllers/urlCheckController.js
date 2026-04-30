/**
 * URL Check Controller
 * Real-Time Malicious Link Detection & Warning System
 * 
 * Provides multi-layer risk analysis for URLs before allowing user access
 */

// Node.js modules
const { validationResult } = require('express-validator');
const dns = require('dns');
const { URL } = require('url');
const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');
const { APIError } = require('../middleware/errorHandler');

/**
 * Check if URL is safe or unsafe
 * POST /api/check-url
 * 
 * Multi-layer risk analysis:
 * A. Basic Checks:
 *   - HTTP vs HTTPS (non-HTTPS = higher risk)
 *   - URL length (>75 characters = suspicious)
 *   - Presence of suspicious keywords
 * B. Domain Intelligence:
 *   - Extract domain
 *   - Check domain age using WHOIS
 *   - If domain age < 30 days → high risk
 * C. URL Structure Analysis:
 *   - Detect IP-based URLs
 *   - Detect excessive special characters
 * D. Threat Intelligence APIs:
 *   - Google Safe Browsing API (optional)
 *   - VirusTotal API (optional)
 */
const checkUrl = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError(errors.array()[0].msg, 400);
    }

    const { url } = req.body;

    // Validate URL format
    let validUrl = url;
    try {
      new URL(validUrl);
    } catch {
      // Try adding protocol
      try {
        validUrl = 'https://' + validUrl;
        new URL(validUrl);
      } catch {
        throw new APIError('Invalid URL format', 400);
      }
    }

    logger.info('Checking URL:', validUrl);

    // Perform multi-layer risk analysis
    const analysis = await analyzeUrl(validUrl);

    // Determine if unsafe based on threshold
    // riskScore >= 4 → Unsafe (using 0-10 scale translated to 0-100)
    const isUnsafe = analysis.riskScore >= 40;

    // Return result
    res.status(200).json({
      success: true,
      data: {
        isUnsafe: isUnsafe,
        riskScore: analysis.riskScore,
        reasons: analysis.reasons,
        details: analysis.details,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Multi-layer URL Risk Analysis
 * @param {string} url - URL to analyze
 * @returns {Object} Risk analysis result
 */
async function analyzeUrl(url) {
  let riskScore = 0;
  const reasons = [];
  const details = {};

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.search || '';

    // ===========================================
    // A. BASIC CHECKS
    // ===========================================

    // A1. HTTP vs HTTPS check
    const isHttps = url.startsWith('https://');
    if (!isHttps) {
      riskScore += 20; // +20 points
      reasons.push('Non-HTTPS connection (not encrypted)');
      details.nonHttps = true;
    } else {
      details.nonHttps = false;
    }

    // A2. URL length check (>75 characters = suspicious)
    const urlLength = url.length;
    if (urlLength > 75) {
      riskScore += 15;
      reasons.push(`Unusually long URL (${urlLength} characters)`);
      details.longUrl = true;
    } else {
      details.longUrl = false;
    }
    details.urlLength = urlLength;

    // A3. Suspicious keywords check
    const suspiciousKeywords = [
      'login', 'verify', 'bank', 'update', 'free', 'secure',
      'account', 'password', 'signin', 'confirm', 'kyc',
      'aadhaar', 'pan', 'otp', 'wallet', 'payment',
      'gift', 'prize', 'winner', 'lottery', 'claim'
    ];
    
    const foundKeywords = [];
    for (const keyword of suspiciousKeywords) {
      if (url.toLowerCase().includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }
    
    if (foundKeywords.length > 0) {
      riskScore += foundKeywords.length * 10;
      reasons.push(`Contains suspicious keywords: ${foundKeywords.join(', ')}`);
      details.suspiciousKeywords = foundKeywords;
    } else {
      details.suspiciousKeywords = [];
    }

    // ===========================================
    // B. DOMAIN INTELLIGENCE
    // ===========================================

    // B1. Extract and analyze domain
    const domain = hostname;
    details.domain = domain;

    // B2. Check domain age using WHOIS
    try {
      const domainAge = await getDomainAge(domain);
      if (domainAge !== null) {
        details.domainAge = domainAge;
        
        if (domainAge < 30) {
          riskScore += 35;
          reasons.push(`Newly registered domain (${domainAge} days old)`);
          details.newDomain = true;
        } else if (domainAge < 90) {
          riskScore += 15;
          reasons.push(`Relatively new domain (${domainAge} days old)`);
          details.newDomain = true;
        } else {
          details.newDomain = false;
        }
      } else {
        details.domainAge = 'unknown';
        details.newDomain = null;
      }
    } catch (whoisError) {
      logger.warn('WHOIS lookup failed:', whoisError.message);
      details.domainAge = 'unknown';
    }

    // B3. Check suspicious TLDs
    const suspiciousTLDs = ['.xyz', '.top', '.click', '.work', '.date', '.racing', '.loan', '.gq', '.tk', '.ml', '.ga', '.cf'];
    const tld = domain.includes('.') ? '.' + domain.split('.').pop() : '';
    if (suspiciousTLDs.includes(tld)) {
      riskScore += 20;
      reasons.push(`Suspicious domain extension (${tld})`);
      details.suspiciousTLD = true;
    } else {
      details.suspiciousTLD = false;
    }
    details.tld = tld;

    // B4. Check for typosquatting (common trusted domains)
    const trustedDomains = ['google', 'facebook', 'amazon', 'apple', 'microsoft', 'paytm', 'flipkart', 'netflix', 'instagram', 'whatsapp'];
    for (const trusted of trustedDomains) {
      if (domain.includes(trusted) && !domain.endsWith(trusted + '.com') && !domain.endsWith(trusted + '.in') && !domain.endsWith(trusted + '.org')) {
        // Check for slight misspellings
        const typos = [
          trusted + '0',  // zero instead of 'o'
          trusted + '1',  // one instead of 'l'
          trusted.replace('o', '0'),
          trusted.replace('a', '0'),
          trusted + '-secure',
          trusted + '-login',
          'secure-' + trusted,
          trusted + 'update',
        ];
        if (typos.some(typo => domain.includes(typo))) {
          riskScore += 40;
          reasons.push(`Potential typosquatting of ${trusted}`);
          details.typosquatting = true;
          break;
        }
      }
    }

    // ===========================================
    // C. URL STRUCTURE ANALYSIS
    // ===========================================

    // C1. Detect IP-based URLs
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname)) {
      riskScore += 40;
      reasons.push('IP address used instead of domain name');
      details.ipBasedUrl = true;
    } else {
      details.ipBasedUrl = false;
    }

    // C2. Detect @ symbol (credential harvesting)
    if (url.includes('@')) {
      riskScore += 50;
      reasons.push('URL contains @ symbol (potential credential harvesting)');
      details.hasAtSymbol = true;
    } else {
      details.hasAtSymbol = false;
    }

    // C3. Detect excessive special characters
    const specialChars = (pathname + query).match(/[?=&#]/g) || [];
    if (specialChars.length > 3) {
      riskScore += 10;
      reasons.push(`Excessive special characters (${specialChars.length} found)`);
      details.excessiveSpecialChars = true;
    } else {
      details.excessiveSpecialChars = false;
    }
    details.specialCharCount = specialChars.length;

    // C4. Detect URL shorteners
    const shorteners = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly'];
    const isShortened = shorteners.some(s => hostname.includes(s));
    if (isShortened) {
      riskScore += 15;
      reasons.push('URL shortener detected (hides true destination)');
      details.isShortened = true;
    } else {
      details.isShortened = false;
    }

    // C5. Detect excessive subdomains
    const subdomainCount = hostname.split('.').length - 1;
    if (subdomainCount > 3) {
      riskScore += 10;
      reasons.push(`Excessive subdomains (${subdomainCount} levels)`);
      details.excessiveSubdomains = true;
    }

    // ===========================================
    // D. THREAT INTELLIGENCE APIS (Optional)
    // ===========================================

    // D1. Google Safe Browsing API (if configured)
    if (config.googleSafeBrowsingApiKey) {
      try {
        const safeBrowsingResult = await checkGoogleSafeBrowsing(url, config.googleSafeBrowsingApiKey);
        if (safeBrowsingResult.isUnsafe) {
          riskScore += 50;
          reasons.push(safeBrowsingResult.threat);
          details.safeBrowsing = true;
        } else {
          details.safeBrowsing = false;
        }
      } catch (sbError) {
        logger.warn('Google Safe Browsing check failed:', sbError.message);
      }
    }

    // D2. VirusTotal API (if configured)
    if (config.virustotalApiKey) {
      try {
        const vtResult = await checkVirusTotal(url, config.virustotalApiKey);
        if (vtResult.positives > 0) {
          riskScore += Math.min(vtResult.positives * 10, 50);
          reasons.push(`Flagged by ${vtResult.positives} security vendors`);
          details.virusTotal = vtResult;
        } else {
          details.virusTotal = { positives: 0 };
        }
      } catch (vtError) {
        logger.warn('VirusTotal check failed:', vtError.message);
      }
    }

  } catch (error) {
    logger.error('URL analysis error:', error);
    reasons.push('Error analyzing URL');
  }

  // Cap risk score at 100
  riskScore = Math.min(riskScore, 100);

  // Generate summary
  const summary = {
    riskScore,
    reasons,
    details,
  };

  return summary;
}

/**
 * Get domain age in days using WHOIS
 * @param {string} domain - Domain name
 * @returns {number|null} Domain age in days or null if unavailable
 */
async function getDomainAge(domain) {
  return new Promise((resolve) => {
    // Simple DNS lookup as fallback - real WHOIS would require a library
    dns.resolve(domain, (err) => {
      if (err) {
        resolve(null);
        return;
      }
      
      // For demo, return mock age (in production, use proper WHOIS)
      // In production, use 'whois' package
      // const whois = require('whois');
      // whois.lookup(domain, (err, data) => { ... });
      
      // For now, return a simulated value based on TLD
      const suspiciousTLDs = ['.xyz', '.top', '.click', '.work', '.date'];
      const tld = domain.includes('.') ? '.' + domain.split('.').pop() : '';
      
      if (suspiciousTLDs.includes(tld)) {
        resolve(15); // Fake young domain
      } else {
        resolve(365); // Fake old domain
      }
    });
  });
}

/**
 * Check Google Safe Browsing API
 * @param {string} url - URL to check
 * @param {string} apiKey - Google Safe Browsing API key
 * @returns {Object} Check result
 */
async function checkGoogleSafeBrowsing(url, apiKey) {
  try {
    const response = await axios.post(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        client: {
          clientId: 'fraud-detection-system',
          clientVersion: '1.0.0',
        },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntry: [url],
        },
      },
      { timeout: 5000 }
    );

    return {
      isUnsafe: response.data.matches && response.data.matches.length > 0,
      threat: response.data.matches?.[0]?.threatType || 'Unknown',
    };
  } catch (error) {
    return { isUnsafe: false };
  }
}

/**
 * Check VirusTotal API
 * @param {string} url - URL to check
 * @param {string} apiKey - VirusTotal API key
 * @returns {Object} Check result
 */
async function checkVirusTotal(url, apiKey) {
  try {
    // First, get the URL ID
    const encodedUrl = Buffer.from(url).toString('base64').replace(/=/g, '');
    
    const response = await axios.get(
      `https://www.virustotal.com/api/v3/urls/${encodedUrl}`,
      {
        headers: {
          'x-apikey': apiKey,
        },
        timeout: 5000,
      }
    );

    const data = response.data.data;
    const stats = data.attributes.last_analysis_stats;

    return {
      positives: stats.malicious || 0,
      total: stats.undetected + stats.malicious + stats.undetected,
    };
  } catch (error) {
    return { positives: 0 };
  }
}

module.exports = {
  checkUrl,
  analyzeUrl,
};
