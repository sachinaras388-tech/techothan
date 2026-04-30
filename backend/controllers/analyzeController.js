const { validationResult } = require('express-validator');
const axios = require('axios');
const { ScanHistory, SCAN_TYPES, SCAN_RESULTS } = require('../models/ScanHistory');
const { Alert, ALERT_SEVERITY, ALERT_TYPES } = require('../models/Alert');
const config = require('../config/env');
const logger = require('../utils/logger');
const { APIError } = require('../middleware/errorHandler');

const getIO = () => {
  try {
    return require('../sockets').getIO();
  } catch (e) {
    return null;
  }
};

const analyzeText = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError(errors.array()[0].msg, 400);
    }

    const { text } = req.body;

    let analysisResult;
    try {
      const aiResponse = await axios.post(`${config.aiServiceUrl}/analyze/text`, {
        text,
      }, {
        headers: { 'X-API-Key': config.aiServiceApiKey },
        timeout: 10000,
      });
      analysisResult = aiResponse.data;
    } catch (aiError) {
      logger.warn('AI service unavailable, using local analysis');
      analysisResult = localTextAnalysis(text);
    }

// Create scan history - handle both response formats (isFraud/is_fraud, prediction)
    const isFraudDetected = analysisResult.isFraud || analysisResult.is_fraud || 
                          (analysisResult.prediction === 'SCAM');
    const riskScore = analysisResult.riskScore || analysisResult.risk_score || 
                     analysisResult.score || 0;
    const detectedType = analysisResult.type || 'unknown';
    
    const scan = await ScanHistory.create({
      userId: req.user?._id,
      type: SCAN_TYPES.TEXT,
      content: text.substring(0, 1000),
      result: isFraudDetected ? SCAN_RESULTS.FRAUD : SCAN_RESULTS.SAFE,
      riskScore: riskScore,
      confidence: analysisResult.confidence || 0,
      analysis: {
        detectedType: detectedType,
        category: analysisResult.category || 'text',
        matchedPatterns: analysisResult.matchedKeywords || analysisResult.patterns || [],
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Update user stats if logged in
    if (req.user) {
      await req.user.updateOne({
        $inc: {
          'stats.totalScans': 1,
          'stats.fraudDetected': isFraudDetected ? 1 : 0,
        },
      });
    }

    // Send real-time alert if fraud detected
    if (isFraudDetected) {
      const io = getIO();
      if (io) {
        io.emit('fraud_detected', {
          type: 'text',
          result: analysisResult,
          scanId: scan._id,
        });
      }
    }

logger.info('Text analyzed:', {
      userId: req.user?._id,
      isFraud: isFraudDetected,
      type: detectedType,
    });

    // Get recommendation based on detection
    let recommendations = analysisResult.recommendations || [];
    if (isFraudDetected && recommendations.length === 0) {
      if (detectedType === 'scam') {
        recommendations = [
          "Do not respond to this message",
          "Do not share personal information",
          "Report this message as spam",
          "Block the sender"
        ];
      } else if (detectedType === 'phishing') {
        recommendations = [
          "Do not click any links in this message",
          "Do not download attachments",
          "Report as phishing attempt"
        ];
      }
    }

    res.status(200).json({
      success: true,
      message: isFraudDetected ? 'Potential fraud detected' : 'Content appears safe',
      data: {
        scan: {
          id: scan._id,
          type: scan.type,
          result: scan.result,
          riskScore: scan.riskScore,
          confidence: scan.confidence,
        },
        analysis: {
          isFraud: isFraudDetected,
          prediction: analysisResult.prediction || (isFraudDetected ? 'SCAM' : 'SAFE'),
          risk: analysisResult.risk || (isFraudDetected ? 'High' : 'Low'),
          type: detectedType,
          category: analysisResult.category || 'text',
          confidence: analysisResult.confidence || 0.85,
          riskScore: riskScore,
          details: analysisResult.details || {
            matchedKeywords: analysisResult.matchedKeywords || [],
            ml_score: analysisResult.details?.ml_score || 0,
            keyword_boost: analysisResult.details?.keyword_boost || 0,
            pattern_score: analysisResult.details?.pattern_score || 0
          },
          recommendations: recommendations,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Analyze URL
 * POST /api/analyze/url
 */
const analyzeUrl = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError(errors.array()[0].msg, 400);
    }

    const { url } = req.body;

    // Call AI service for URL analysis
    let analysisResult;
    try {
      const aiResponse = await axios.post(`${config.aiServiceUrl}/analyze/url`, {
        url,
      }, {
        headers: { 'X-API-Key': config.aiServiceApiKey },
        timeout: 10000,
      });
      analysisResult = aiResponse.data;
    } catch (aiError) {
      // Fallback to local analysis
      logger.warn('AI service unavailable, using local analysis');
      analysisResult = localUrlAnalysis(url);
    }

    // Create scan history
    const scan = await ScanHistory.create({
      userId: req.user?._id,
      type: SCAN_TYPES.URL,
      content: url,
      result: analysisResult.isScam ? SCAN_RESULTS.FRAUD : SCAN_RESULTS.SAFE,
      riskScore: analysisResult.riskScore || 0,
      confidence: analysisResult.confidence || 0,
      analysis: {
        detectedType: analysisResult.type,
        category: analysisResult.category,
        matchedPatterns: analysisResult.patterns || [],
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Update user stats
    if (req.user) {
      await req.user.updateOne({
        $inc: {
          'stats.totalScans': 1,
          'stats.fraudDetected': analysisResult.isScam ? 1 : 0,
        },
      });
    }

    // Real-time alert
    if (analysisResult.isScam) {
      const io = getIO();
      if (io) {
        io.emit('fraud_detected', {
          type: 'url',
          result: analysisResult,
          scanId: scan._id,
        });
      }
    }

    logger.info('URL analyzed:', {
      userId: req.user?._id,
      url,
      isScam: analysisResult.isScam,
    });

    res.status(200).json({
      success: true,
      message: analysisResult.isScam ? 'Dangerous URL detected' : 'URL appears safe',
      data: {
        scan: {
          id: scan._id,
          type: scan.type,
          result: scan.result,
          riskScore: scan.riskScore,
        },
        analysis: {
          isScam: analysisResult.isScam,
          riskScore: analysisResult.riskScore,
          reason: analysisResult.reason,
          details: analysisResult.details,
          recommendations: analysisResult.recommendations,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Analyze UPI payment request
 * POST /api/analyze/upi
 */
const analyzeUpi = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError(errors.array()[0].msg, 400);
    }

    const { upiId, amount, merchantName, transactionNote } = req.body;

    // Analyze UPI request
    let analysisResult;
    try {
      const aiResponse = await axios.post(`${config.aiServiceUrl}/analyze/upi`, {
        upiId,
        amount,
        merchantName,
        transactionNote,
      }, {
        headers: { 'X-API-Key': config.aiServiceApiKey },
        timeout: 10000,
      });
      analysisResult = aiResponse.data;
    } catch (aiError) {
      logger.warn('AI service unavailable, using local analysis');
      analysisResult = localUpiAnalysis(upiId, merchantName);
    }

    // Create scan history
    const scan = await ScanHistory.create({
      userId: req.user?._id,
      type: SCAN_TYPES.UPI,
      content: `${upiId} - ${amount}`,
      result: analysisResult.isFraud ? SCAN_RESULTS.FRAUD : SCAN_RESULTS.SAFE,
      riskScore: analysisResult.riskScore || 0,
      confidence: analysisResult.confidence || 0,
      analysis: {
        detectedType: analysisResult.type,
        category: 'UPI Payment',
        details: { upiId, amount, merchantName },
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Update user stats
    if (req.user) {
      await req.user.updateOne({
        $inc: {
          'stats.totalScans': 1,
          'stats.fraudDetected': analysisResult.isFraud ? 1 : 0,
        },
      });
    }

    // Real-time alert
    if (analysisResult.isFraud) {
      const io = getIO();
      if (io) {
        io.emit('fraud_detected', {
          type: 'upi',
          result: analysisResult,
          scanId: scan._id,
        });
      }

      // Create alert
      if (req.user) {
        await Alert.create({
          userId: req.user._id,
          title: 'UPI Scam Alert',
          message: analysisResult.warning,
          type: ALERT_TYPES.FAKE_PAYMENT,
          severity: ALERT_SEVERITY.HIGH,
          recommendations: analysisResult.recommendations,
          referenceType: 'scan',
          referenceId: scan._id,
        });
      }
    }

    logger.info('UPI analyzed:', {
      userId: req.user?._id,
      upiId,
      isFraud: analysisResult.isFraud,
    });

    res.status(200).json({
      success: true,
      message: analysisResult.isFraud ? 'Potential UPI scam detected' : 'UPI request appears legitimate',
      data: {
        analysis: {
          isFraud: analysisResult.isFraud,
          riskScore: analysisResult.riskScore,
          warning: analysisResult.warning,
          details: analysisResult.details,
          recommendations: analysisResult.recommendations,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Analyze phone number
 * POST /api/analyze/phone
 */
const analyzePhone = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError(errors.array()[0].msg, 400);
    }

    const { phoneNumber, context } = req.body;

    // Analyze phone number
    let analysisResult;
    try {
      const aiResponse = await axios.post(`${config.aiServiceUrl}/analyze/phone`, {
        phoneNumber,
        context,
      }, {
        headers: { 'X-API-Key': config.aiServiceApiKey },
        timeout: 10000,
      });
      analysisResult = aiResponse.data;
    } catch (aiError) {
      logger.warn('AI service unavailable, using local analysis');
      analysisResult = localPhoneAnalysis(phoneNumber);
    }

    // Create scan history
    const scan = await ScanHistory.create({
      userId: req.user?._id,
      type: SCAN_TYPES.PHONE,
      content: phoneNumber,
      result: analysisResult.isScam ? SCAN_RESULTS.FRAUD : SCAN_RESULTS.SAFE,
      riskScore: analysisResult.riskScore || 0,
      confidence: analysisResult.confidence || 0,
      analysis: {
        detectedType: analysisResult.type,
        category: 'Phone Number',
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Update user stats
    if (req.user) {
      await req.user.updateOne({
        $inc: {
          'stats.totalScans': 1,
          'stats.fraudDetected': analysisResult.isScam ? 1 : 0,
        },
      });
    }

    logger.info('Phone analyzed:', {
      userId: req.user?._id,
      phoneNumber,
      isScam: analysisResult.isScam,
    });

    res.status(200).json({
      success: true,
      message: analysisResult.isScam ? 'Potential scam call number' : 'Phone number appears legitimate',
      data: {
        analysis: {
          isScam: analysisResult.isScam,
          riskScore: analysisResult.riskScore,
          type: analysisResult.type,
          category: analysisResult.category,
          details: analysisResult.details,
          recommendations: analysisResult.recommendations,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Local analysis fallbacks - IMPROVED with hybrid ML + Keyword Boost
function localTextAnalysis(text) {
  // Using the same hybrid approach as AI service
  const SCAM_KEYWORDS = [
    "OTP", "urgent", "bank", "verify", "click link",
    "won", "lottery", "prize", "suspended", "KYC",
    "Aadhaar", "account blocked"
  ];
  
  const scamPatterns = [
    /won lotter/i, /congratulations.*prize/i, /claim.*reward/i,
    /urgent.*action/i, /account.*suspend/i, /verify.*details/i,
    /otp.*share/i, /kYC.*expire/i, /bank.*update/i, /gift.*card/i,
    /click.*link/i, /verify/i, /aadhaar/i, /account.*block/i
  ];

  const textLower = text.toLowerCase();
  
  // Step 1: ML Score based on features
  let mlScore = 0;
  if (/\b\d{10,}\b/.test(text)) mlScore += 15;  // Has phone number
  if (/₹\d+/.test(text)) mlScore += 20;          // Has money symbol
  if (/urgent|immediately|act now|hurry|limited time|expire/i.test(textLower)) mlScore += 25;  // Urgency
  if (/won|lottery|prize|winner|cash|million/i.test(textLower)) mlScore += 30;  // Prize words
  if (/otp|verification|verify/i.test(textLower)) mlScore += 25;  // OTP/verification
  if (/bank|account|kyc|aadhaar|suspended|blocked/i.test(textLower)) mlScore += 20;  // Bank terms
  mlScore = Math.min(mlScore, 50);
  
  // Step 2: Keyword Boost
  const matchedKeywords = [];
  for (const keyword of SCAM_KEYWORDS) {
    if (textLower.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }
  const keywordBoost = Math.min(matchedKeywords.length * 15, 60);
  
  // Step 3: Pattern Score
  const matchedPatterns = scamPatterns.filter(pattern => pattern.test(text));
  const patternScore = Math.min(matchedPatterns.length * 10, 40);
  
  // Combine scores
  let totalScore = mlScore + keywordBoost + patternScore;
  
  // Ensure minimum score if priority keywords matched
  const priorityKeywords = ["OTP", "KYC", "Aadhaar", "lottery", "won", "prize", "account blocked", "bank"];
  const hasPriority = priorityKeywords.some(kw => textLower.includes(kw.toLowerCase()));
  if (hasPriority || matchedKeywords.length >= 2) {
    totalScore = Math.max(totalScore, 50);
  }
  
  const riskScore = Math.min(totalScore, 100);
  const isFraud = riskScore >= 25;
  const risk = riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low';
  const fraudType = isFraud ? 'scam' : 'safe';
  
  return {
    isFraud: isFraud,
    prediction: isFraud ? 'SCAM' : 'SAFE',
    risk: risk,
    type: fraudType,
    category: 'text',
    confidence: isFraud ? 0.85 : 0.95,
    riskScore: riskScore,
    matchedKeywords: matchedKeywords,
    details: {
      ml_score: mlScore,
      keyword_boost: keywordBoost,
      pattern_score: patternScore,
      matched_keywords: matchedKeywords
    }
  };
}

function localUrlAnalysis(url) {
  const suspiciousPatterns = [
    /bit\.ly/, /tinyurl/, /goo\.gl/, /t\.co/,
    /login.*verify/i, /account.*update/i, /secure.*bank/i,
    /free.*gift/i, /prize.*claim/i, /0auth/i,
  ];

  const phishingDomains = [
    'fake-bank', 'secure-pay', 'verify-account', 'amazon-support',
  ];

  const matchedPatterns = suspiciousPatterns.filter(pattern => pattern.test(url));
  const isPhishing = phishingDomains.some(d => url.toLowerCase().includes(d));

  return {
    isScam: matchedPatterns.length > 0 || isPhishing,
    riskScore: matchedPatterns.length > 0 || isPhishing ? 85 : 15,
    type: matchedPatterns.length > 0 ? 'phishing' : 'safe',
    reason: matchedPatterns.length > 0 ? 'Suspicious URL pattern detected' : 'URL appears legitimate',
    details: { patterns: matchedPatterns },
  };
}

function localUpiAnalysis(upiId, merchantName) {
  // Basic UPI analysis
  const suspiciousMerchants = ['gift', 'prize', 'winner', 'lucky'];
  const isSuspicious = suspiciousMerchants.some(m => 
    merchantName?.toLowerCase().includes(m)
  );

  return {
    isFraud: isSuspicious,
    riskScore: isSuspicious ? 75 : 20,
    type: isSuspicious ? 'upi_scam' : 'safe',
    warning: isSuspicious ? 'This merchant appears suspicious. Do not proceed.' : null,
    details: { upiId, merchantName },
    recommendations: isSuspicious ? [
      'Do not share OTP with anyone',
      'Verify merchant details independently',
      'Report suspicious UPI ID',
    ] : [],
  };
}

function localPhoneAnalysis(phoneNumber) {
  // Basic phone analysis
  const scamPrefixes = ['+91', '91', '0'];
  
  return {
    isScam: false,
    riskScore: 25,
    type: 'unknown',
    category: 'Phone Number',
    details: { phoneNumber },
    recommendations: [
      'Never share OTP with callers',
      'Verify caller identity independently',
      'Hang up on suspicious calls',
    ],
  };
}

// ===========================================
// NEW SCAM DETECTION MODULE FUNCTIONS
// ===========================================

// Feature 1: Text Scam Analyzer
function analyzeScamText(text) {
  const scamKeywords = [
    "lottery", "win", "urgent", "OTP", "bank", "verify", "click", "free", "prize",
    "won", "winner", "cash", "reward", "gift", "bonus", "claim", "act now",
    "limited time", "suspense", "account suspended", "KYC", "update details"
  ];
  
  const lowerText = text.toLowerCase();
  const matchedKeywords = [];
  
  for (const keyword of scamKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }
  
  // Calculate risk score based on matched keywords
  let score = 0;
  if (matchedKeywords.length > 0) {
    score = Math.min(30 + (matchedKeywords.length * 15), 100);
  }
  
  // Determine risk level
  let risk = 'Low';
  if (score >= 70) risk = 'High';
  else if (score >= 40) risk = 'Medium';
  
  return {
    risk: risk,
    score: score,
    matchedKeywords: matchedKeywords
  };
}

// Feature 2: Phone Number Analyzer
function analyzeScamPhone(phone) {
  // Remove any spaces or dashes
  const cleanPhone = phone.replace(/[\s-]/g, '');
  
  // Validate phone format
  const validPatterns = [
    /^\+?[1-9]\d{1,14}$/,  // E.164 format
    /^\d{10,12}$/,         // Basic 10-12 digits
  ];
  
  let valid = validPatterns.some(pattern => pattern.test(cleanPhone));
  
  // Extract country code
  let country = 'Unknown';
  let countryCode = '';
  
  if (cleanPhone.startsWith('+91') || cleanPhone.startsWith('91')) {
    country = 'India';
    countryCode = '+91';
  } else if (cleanPhone.startsWith('+1') || cleanPhone.startsWith('1')) {
    country = 'USA/Canada';
    countryCode = '+1';
  } else if (cleanPhone.startsWith('+44')) {
    country = 'UK';
    countryCode = '+44';
  } else if (cleanPhone.startsWith('+91')) {
    country = 'India';
    countryCode = '+91';
  } else if (cleanPhone.startsWith('+86')) {
    country = 'China';
    countryCode = '+86';
  } else if (cleanPhone.startsWith('+91')) {
    country = 'India';
    countryCode = '+91';
  }
  
  // Detect suspicious patterns
  let suspiciousReason = '';
  let risk = 'Low';
  
  // Check for repeated digits (e.g., 9999999999)
  const repeatedDigitPattern = /(.)\1{6,}/;
  if (repeatedDigitPattern.test(cleanPhone)) {
    suspiciousReason = 'Too many repeated digits';
    risk = 'Medium';
  }
  
  // Check for invalid length
  const digitCount = cleanPhone.replace(/\D/g, '').length;
  if (digitCount < 10 || digitCount > 15) {
    suspiciousReason = 'Invalid phone number length';
    risk = 'Medium';
  }
  
  // Check for common spam patterns (sequential numbers)
  const sequentialPattern = /(.)\1{3,}/;
  if (!suspiciousReason && sequentialPattern.test(cleanPhone)) {
    suspiciousReason = 'Suspicious sequential pattern';
    risk = 'Medium';
  }
  
  // Mock known spam numbers (in production, check against database)
  const knownSpamNumbers = ['9999999999', '8888888888', '7777777777'];
  if (knownSpamNumbers.includes(cleanPhone) || knownSpamNumbers.includes(cleanPhone.slice(-10))) {
    suspiciousReason = 'Known spam number';
    risk = 'High';
  }
  
  // If no suspicious pattern, default to low risk
  if (!suspiciousReason) {
    suspiciousReason = 'No suspicious patterns detected';
    risk = 'Low';
  }
  
  return {
    valid: valid,
    country: country,
    countryCode: countryCode,
    risk: risk,
    reason: suspiciousReason
  };
}

// Feature 3: Email Analyzer
function analyzeScamEmail(email) {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid = emailRegex.test(email);
  
  if (!valid) {
    return {
      valid: false,
      domain: '',
      risk: 'Invalid',
      reason: 'Invalid email format'
    };
  }
  
  const domain = email.split('@')[1].toLowerCase();
  
  // Trusted domains
  const trustedDomains = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'amazon.in', 'amazon.com', 'paytm.com', 'google.com',
    'apple.com', 'microsoft.com', 'flipkart.com'
  ];
  
  // Check if trusted
  if (trustedDomains.includes(domain)) {
    return {
      valid: true,
      domain: domain,
      risk: 'Low',
      reason: 'Trusted domain'
    };
  }
  
  // Suspicious patterns
  let suspiciousReason = '';
  let risk = 'Low';
  
  // Check for fake domains (fake bank domains)
  const fakeBankPatterns = [
    /bank-.*\.xyz$/, /bank-.*\.top$/, /bank-.*\.click$/,
    /secure-.*\.xyz/, /login-.*\.xyz/, /verify-.*\.xyz/
  ];
  
  for (const pattern of fakeBankPatterns) {
    if (pattern.test(domain)) {
      suspiciousReason = 'Suspicious fake bank domain';
      risk = 'High';
      break;
    }
  }
  
  // Check for misspelled trusted domains
  const misspellings = {
    'gmaill.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'yhaoo.com': 'yahoo.com',
    'amaz0n.com': 'amazon.com',
    'amazn.in': 'amazon.in',
    'paytmm.com': 'paytm.com',
    'g00gle.com': 'google.com'
  };
  
  if (!suspiciousReason && misspellings[domain]) {
    suspiciousReason = `Misspelled domain (real: ${misspellings[domain]})`;
    risk = 'High';
  }
  
  // Check for uncommon TLDs
  const uncommonTLDs = ['.xyz', '.top', '.click', '.work', '.loan', '.country'];
  const tld = '.' + domain.split('.').pop();
  
  if (!suspiciousReason && uncommonTLDs.includes(tld)) {
    suspiciousReason = 'Uncommon top-level domain';
    risk = 'Medium';
  }
  
  // Check for too many numbers in domain
  const numbersInDomain = domain.replace(/[^0-9]/g, '');
  if (!suspiciousReason && numbersInDomain.length > 3) {
    suspiciousReason = 'Suspicious domain with too many numbers';
    risk = 'Medium';
  }
  
  // Check for random string patterns
  if (!suspiciousReason && domain.length > 20) {
    suspiciousReason = 'Suspiciously long domain name';
    risk = 'Medium';
  }
  
  // Default if no issues found
  if (!suspiciousReason) {
    suspiciousReason = 'Standard domain';
    risk = 'Low';
  }
  
  return {
    valid: true,
    domain: domain,
    risk: risk,
    reason: suspiciousReason
  };
}

// Feature 4: Combined Scam Detector
function detectScam(text, phone, email) {
  const results = {
    text: null,
    phone: null,
    email: null
  };
  
  // Analyze text if provided
  if (text && text.trim()) {
    results.text = analyzeScamText(text);
  }
  
  // Analyze phone if provided
  if (phone && phone.trim()) {
    results.phone = analyzeScamPhone(phone);
  }
  
  // Analyze email if provided
  if (email && email.trim()) {
    results.email = analyzeScamEmail(email);
  }
  
  // Calculate combined score
  // Weights: Text 40%, Phone 20%, Email 40%
  let totalWeight = 0;
  let weightedScore = 0;
  
  if (results.text) {
    weightedScore += results.text.score * 0.4;
    totalWeight += 0.4;
  }
  
  if (results.phone) {
    const phoneScore = results.phone.risk === 'High' ? 80 : results.phone.risk === 'Medium' ? 50 : 20;
    weightedScore += phoneScore * 0.2;
    totalWeight += 0.2;
  }
  
  if (results.email) {
    const emailScore = results.email.risk === 'High' ? 90 : results.email.risk === 'Medium' ? 55 : 15;
    weightedScore += emailScore * 0.4;
    totalWeight += 0.4;
  }
  
  // Normalize score
  const finalScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  
  // Determine final risk level
  let finalRisk = 'Low';
  if (finalScore >= 70) finalRisk = 'High';
  else if (finalScore >= 40) finalRisk = 'Medium';
  
  // Generate advice
  let advice = '';
  if (finalRisk === 'High') {
    advice = '⚠️ This is likely a scam! Do not share OTP, click suspicious links, or provide personal information.';
  } else if (finalRisk === 'Medium') {
    advice = '⚠️ Be cautious. Verify the sender\'s identity independently before taking any action.';
  } else {
    advice = '✅ This appears to be from a legitimate source. Always stay vigilant.';
  }
  
  // Count high risk factors
  let highRiskFactors = 0;
  if (results.text && results.text.risk === 'High') highRiskFactors++;
  if (results.phone && results.phone.risk === 'High') highRiskFactors++;
  if (results.email && results.email.risk === 'High') highRiskFactors++;
  
  return {
    finalRisk: finalRisk,
    confidence: finalScore,
    advice: advice,
    details: {
      text: results.text,
      phone: results.phone,
      email: results.email
    },
    highRiskFactors: highRiskFactors
  };
}

// Controller handlers for new endpoints

// @route   POST /api/analyze-text
// @desc   Analyze text for scam keywords
// @access Private
const analyzeTextScam = async (req, res, next) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }
    
    const result = analyzeScamText(text);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/analyze-phone
// @desc   Analyze phone number for scam patterns
// @access Private
const analyzePhoneScam = async (req, res, next) => {
  try {
    const { phone } = req.body;
    
    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
    
    const result = analyzeScamPhone(phone);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/analyze-email
// @desc   Analyze email for suspicious patterns
// @access Private
const analyzeEmailScam = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const result = analyzeScamEmail(email);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/detect-scam
// @desc   Combined scam detection
// @access Private
const detectScamAll = async (req, res, next) => {
  try {
    const { text, phone, email } = req.body;
    
    if (!text && !phone && !email) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (text, phone, or email) is required'
      });
    }
    
    const result = detectScam(text, phone, email);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Analyze Gmail emails for fraud
 * POST /api/analyze/gmail
 */
const analyzeGmail = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { maxResults = 30, daysBack = 90 } = req.query;
    
    // Check if user has Google access token
    const user = await User.findById(userId);
    if (!user.googleAccessToken) {
      throw new APIError('Google account not connected. Please connect your Gmail first.', 400);
    }
    
    // Check if token is expired and refresh if needed
    if (user.googleTokenExpiry && user.googleTokenExpiry < new Date()) {
      if (!user.googleRefreshToken) {
        throw new APIError('Google token expired and no refresh token available', 401);
      }
      
      try {
        const googleAuthService = require('../services/googleAuthService');
        const tokens = await googleAuthService.refreshAccessToken(user.googleRefreshToken);
        
        user.googleAccessToken = tokens.accessToken;
        user.googleTokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000);
        await user.save();
      } catch (refreshError) {
        logger.error('Failed to refresh Google token:', refreshError.message);
        throw new APIError('Failed to refresh Google access token', 401);
      }
    }
    
    // Fetch and analyze emails
    const { gmailService } = require('../services/gmailService');
    const result = await gmailService.fetchAndAnalyzeEmails(
      user.googleAccessToken,
      userId,
      { maxResults: parseInt(maxResults), daysBack: parseInt(daysBack) }
    );
    
    // Update user stats
    await user.updateOne({
      $inc: {
        'stats.totalScans': result.total,
        'stats.fraudDetected': result.fraudCount,
        'stats.emailScans': result.total,
        'stats.emailFraud': result.fraudCount,
      },
    });
    
    res.status(200).json({
      success: true,
      message: `Analyzed ${result.total} emails, found ${result.fraudCount} suspicious`,
      data: {
        summary: {
          totalEmails: result.total,
          fraudCount: result.fraudCount,
          highRiskCount: result.highRiskCount,
          safeCount: result.total - result.fraudCount,
        },
        messages: result.messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Analyze single Gmail message
 * POST /api/analyze/gmail/message
 */
const analyzeGmailMessage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.body;
    
    if (!messageId) {
      throw new APIError('Message ID is required', 400);
    }
    
    // Check if user has Google access token
    const user = await User.findById(userId);
    if (!user.googleAccessToken) {
      throw new APIError('Google account not connected', 400);
    }
    
    // Check token expiry
    if (user.googleTokenExpiry && user.googleTokenExpiry < new Date()) {
      throw new APIError('Google token expired', 401);
    }
    
    // Analyze single message
    const { gmailService } = require('../services/gmailService');
    const result = await gmailService.analyzeEmail(user.googleAccessToken, messageId, userId);
    
    // Analyze content for fraud
    let fraudAnalysis = null;
    if (result.email.body) {
      try {
        const aiResponse = await axios.post(`${config.aiServiceUrl}/analyze/text`, {
          text: result.email.body,
        }, {
          headers: { 'X-API-Key': config.aiServiceApiKey },
          timeout: 10000,
        });
        fraudAnalysis = aiResponse.data;
      } catch (aiError) {
        logger.warn('AI service unavailable for email analysis');
        fraudAnalysis = localTextAnalysis(result.email.body);
      }
    }
    
    // Check URLs if present
    let urlAnalysis = [];
    if (result.links && result.links.length > 0) {
      for (const url of result.links.slice(0, 5)) { // Limit to 5 URLs
        try {
          const urlResult = await axios.post(`${config.aiServiceUrl}/analyze/url`, {
            url,
          }, {
            headers: { 'X-API-Key': config.aiServiceApiKey },
            timeout: 5000,
          });
          urlAnalysis.push({ url, analysis: urlResult.data });
        } catch (urlError) {
          logger.warn('URL analysis failed:', url, urlError.message);
        }
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        email: result.email,
        fraudAnalysis,
        urlAnalysis,
        linksCount: result.links?.length || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Gmail analysis stats
 * GET /api/analyze/gmail/stats
 */
const getGmailStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Get user's email scan stats
    const user = await User.findById(userId);
    const emailStats = {
      totalScans: user.stats?.emailScans || 0,
      fraudDetected: user.stats?.emailFraud || 0,
      safeEmails: (user.stats?.emailScans || 0) - (user.stats?.emailFraud || 0),
    };
    
    // Get recent email scans
    const recentEmailScans = await ScanHistory.find({ 
      userId, 
      type: 'email' 
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
    
    res.status(200).json({
      success: true,
      data: {
        stats: emailStats,
        recentScans: recentEmailScans,
        hasGoogleAccess: !!user.googleAccessToken,
        tokenExpiry: user.googleTokenExpiry,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeText,
  analyzeUrl,
  analyzeUpi,
  analyzePhone,
  // New exports
  analyzeTextScam,
  analyzePhoneScam,
  analyzeEmailScam,
  detectScamAll,
  analyzeGmail,
  analyzeGmailMessage,
  getGmailStats,
};
