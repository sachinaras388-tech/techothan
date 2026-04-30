/**
 * Demo Server - for testing frontend without MongoDB
 * Run with: node demo-server.js
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Demo users (in-memory)
const demoUsers = [
  {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'demo@fraudshield.com',
    password: 'demo123',
    role: 'user',
    isVerified: true,
    isActive: true,
    createdAt: new Date()
  }
];

// Demo data
const demoStats = {
  totalScans: 156,
  fraudDetected: 42,
  safeMessages: 114,
  activeAlerts: 3
};

const demoAlerts = [
  {
    id: 'alert-1',
    title: 'Suspicious SMS Detected',
    message: 'Potential SMS phishing campaign detected in your area',
    severity: 'high',
    status: 'unread',
    createdAt: new Date()
  },
  {
    id: 'alert-2',
    title: 'New Scam Pattern',
    message: 'AI detected new UPI fraud pattern circulating online',
    severity: 'medium',
    status: 'unread',
    createdAt: new Date()
  },
  {
    id: 'alert-3',
    title: 'Security Update Available',
    message: 'New security features have been deployed',
    severity: 'low',
    status: 'read',
    createdAt: new Date()
  }
];

const demoScans = [
  { id: 'scan-1', type: 'text', result: 'safe', riskScore: 12, createdAt: new Date() },
  { id: 'scan-2', type: 'url', result: 'fraud', riskScore: 85, createdAt: new Date() },
  { id: 'scan-3', type: 'text', result: 'safe', riskScore: 5, createdAt: new Date() }
];

const JWT_SECRET = 'demo-secret-key';
const JWT_REFRESH_SECRET = 'demo-refresh-secret';

// ==================== AUTH ROUTES ====================

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  
  // Check if user exists
  const existing = demoUsers.find(u => u.email === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ success: false, message: 'User already exists' });
  }
  
  // Create new user
  const newUser = {
    id: `user-${Date.now()}`,
    firstName,
    lastName,
    email: email.toLowerCase(),
    password,
    role: 'user',
    isVerified: true,
    isActive: true,
    createdAt: new Date()
  };
  
  demoUsers.push(newUser);
  
  // Generate tokens
  const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId: newUser.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        isVerified: newUser.isVerified
      },
      token,
      refreshToken
    }
  });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = demoUsers.find(u => u.email === email.toLowerCase());
  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  
  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Account is deactivated' });
  }
  
  // Generate tokens
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
      token,
      refreshToken
    }
  });
});

// GET /api/auth/me
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = demoUsers.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// POST /api/auth/refresh-token
app.post('/api/auth/refresh-token', (req, res) => {
  const { refreshToken } = req.body;
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = demoUsers.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    
    res.status(200).json({
      success: true,
      data: { token, refreshToken: newRefreshToken }
    });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  res.status(200).json({ success: true, message: 'Logout successful' });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', (req, res) => {
  res.status(200).json({ success: true, message: 'Password changed successfully' });
});

// ==================== ANALYSIS ROUTES ====================

// POST /api/analyze/text
app.post('/api/analyze/text', (req, res) => {
  const { text } = req.body;
  
  // Simple keyword-based analysis for demo
  const fraudKeywords = ['lottery', 'prize', 'winner', 'won', 'congratulations', 'claim', 'urgent', 'bank details', 'processing fee'];
  const lowerText = text.toLowerCase();
  
  let isFraud = false;
  let riskScore = 10;
  
  for (const kw of fraudKeywords) {
    if (lowerText.includes(kw)) {
      isFraud = true;
      riskScore += 20;
    }
  }
  
  riskScore = Math.min(riskScore, 100);
  
  res.status(200).json({
    success: true,
    data: {
      analysis: {
        isFraud,
        riskScore,
        category: isFraud ? 'scam' : 'normal',
        type: 'text',
        confidence: 0.85,
        details: isFraud ? 'Potential scam detected' : 'Content appears safe'
      },
      scan: {
        id: `scan-${Date.now()}`,
        type: 'text',
        result: isFraud ? 'fraud' : 'safe',
        riskScore
      }
    }
  });
});

// POST /api/analyze/url
app.post('/api/analyze/url', (req, res) => {
  const { url } = req.body;
  
  // Simple URL analysis for demo
  let riskScore = 15;
  if (url.includes('bit.ly') || url.includes('tinyurl')) riskScore += 30;
  if (url.includes('free') || url.includes('win')) riskScore += 25;
  if (url.match(/[\d]{5,}/)) riskScore += 20;
  
  riskScore = Math.min(riskScore, 100);
  const isFraud = riskScore > 50;
  
  res.status(200).json({
    success: true,
    data: {
      analysis: {
        isFraud,
        riskScore,
        category: isFraud ? 'phishing' : 'legitimate',
        type: 'url',
        confidence: 0.8,
        suspiciousPatterns: isFraud ? ['URL shortener', 'Suspicious domain'] : []
      },
      scan: {
        id: `scan-${Date.now()}`,
        type: 'url',
        result: isFraud ? 'fraud' : 'safe',
        riskScore
      }
    }
  });
});

// ==================== DASHBOARD ROUTES ====================

// GET /api/dashboard/user
app.get('/api/dashboard/user', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  res.status(200).json({
    success: true,
    data: {
      user: {
        stats: demoStats
      },
      recentScans: demoScans,
      alerts: demoAlerts
    }
  });
});

// GET /api/dashboard/alerts
app.get('/api/dashboard/alerts', (req, res) => {
  res.status(200).json({
    success: true,
    data: demoAlerts
  });
});

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Demo Server running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'AI-Powered Cyber Fraud Detection API (Demo Mode)',
    version: 'v1'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Demo Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend: http://localhost:3000`);
  console.log(`🔐 Demo Login: demo@fraudshield.com / demo123\n`);
});
