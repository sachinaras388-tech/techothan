"""
Email Fraud Detector
Email-based scam and phishing detection
Hybrid System: Content Analysis + Header Inspection
"""

import re
from typing import Dict, Any, Optional, List
from email.utils import parseaddr


class EmailDetector:
    """Email fraud detection model"""
    
    def __init__(self):
        # Suspicious email patterns
        self.suspicious_patterns = [
            r'urgent.*action',
            r'account.*suspend',
            r'verify.*account',
            r'won.*prize',
            r'claim.*reward',
            r'bank.*update',
            r'otp.*share',
            r'kyc.*update',
            r'password.*reset',
            r'click.*link',
            r'confirm.*identity',
            r'security.*alert',
            r'unusual.*activity',
            r'account.*blocked',
            r'limited.*time',
            r'act.*now'
        ]
        
        # Fraud keywords for emails
        self.fraud_keywords = {
            'scam': [
                'won lottery', 'congratulations', 'prize', 'claim reward',
                'urgent action', 'account suspended', 'verify details',
                'otp', 'share otp', 'kyc', 'expire', 'bank update',
                'gift card', 'free gift', 'winner', 'lucky draw',
                'claim now', 'limited time', 'act now', 'exclusive offer',
                'congrats', 'you have been selected', 'cash prize',
                'aadhaar', 'aadhar', 'update kyc', 'kyc expired',
                'account blocked', 'account suspended', 'verify identity',
                'click link', 'click here now', 'confirm account',
                'bank details', 'update bank', 'link activated'
            ],
            'phishing': [
                'verify account', 'update information', 'confirm password',
                'click here', 'login now', 'secure login', 'unusual activity',
                'suspended', 'restricted', 'verify identity', 'security alert',
                'password expire', 'sign in required', 're-confirm',
                'unauthorized', 'suspicious activity', 'confirm details',
                'reset password', 'account verification', 'email confirmation'
            ],
            'threat': [
                'police', 'court', 'legal action', 'arrest warrant',
                'lawsuit', 'legal notice', 'court summons', 'criminal code'
            ],
            'abuse': [
                'threat', 'kill', 'die', 'hurt', 'abuse', 'harass',
                'offensive', 'racist', 'sexist', 'discriminate'
            ]
        }
        
        # Suspicious sender domains
        self.suspicious_domains = [
            'gmail.com',  # Common for spoofing
            'yahoo.com',
            'hotmail.com',
            'outlook.com',
            # Add more suspicious domains
        ]
        
        # Known scam sender patterns
        self.scam_sender_patterns = [
            r'bank.*support',
            r'customer.*service',
            r'admin.*support',
            r'security.*team',
            r'no.*reply',
            r'notification.*system'
        ]
        
        self.initialized = True
        
    def _analyze_sender(self, sender: str) -> Dict[str, Any]:
        """Analyze sender email for suspicious patterns"""
        parsed_name, parsed_email = parseaddr(sender)
        email_lower = parsed_email.lower()
        
        # Check for suspicious domains
        domain = email_lower.split('@')[-1] if '@' in email_lower else ''
        is_suspicious_domain = domain in self.suspicious_domains
        
        # Check sender name patterns
        name_lower = parsed_name.lower()
        suspicious_sender = False
        for pattern in self.scam_sender_patterns:
            if re.search(pattern, name_lower, re.IGNORECASE):
                suspicious_sender = True
                break
        
        # Check for display name mismatch
        display_name_suspicious = False
        if parsed_name and parsed_email:
            # If display name contains bank/official terms but email is personal
            official_terms = ['bank', 'support', 'admin', 'security', 'official']
            if any(term in name_lower for term in official_terms):
                if domain in ['gmail.com', 'yahoo.com', 'hotmail.com']:
                    display_name_suspicious = True
        
        sender_score = 0
        if is_suspicious_domain:
            sender_score += 20
        if suspicious_sender:
            sender_score += 15
        if display_name_suspicious:
            sender_score += 25
        
        return {
            'sender_score': sender_score,
            'is_suspicious_domain': is_suspicious_domain,
            'suspicious_sender': suspicious_sender,
            'display_name_suspicious': display_name_suspicious,
            'parsed_email': parsed_email,
            'parsed_name': parsed_name
        }
        
    def _analyze_content(self, subject: str, body: str) -> Dict[str, Any]:
        """Analyze email content for fraud patterns"""
        full_text = f"{subject} {body}".lower()
        
        # Check keywords
        matched_keywords = []
        for category, keywords in self.fraud_keywords.items():
            for keyword in keywords:
                if keyword in full_text:
                    matched_keywords.append(keyword)
        
        # Check patterns
        matched_patterns = []
        for pattern in self.suspicious_patterns:
            if re.search(pattern, full_text, re.IGNORECASE):
                matched_patterns.append(pattern)
        
        # Calculate content score
        keyword_score = len(matched_keywords) * 10
        pattern_score = len(matched_patterns) * 15
        
        content_score = min(keyword_score + pattern_score, 60)
        
        # Check for urgency indicators
        urgency_words = ['urgent', 'immediately', 'act now', 'hurry', 'limited time', 'expire', 'expires soon', 'deadline']
        has_urgency = any(word in full_text for word in urgency_words)
        
        # Check for money/prize indicators
        money_words = ['prize', 'won', 'lottery', 'cash', 'reward', 'gift', 'bonus', '₹', '$']
        has_money = any(word in full_text for word in money_words)
        
        # Check for links
        link_count = len(re.findall(r'http[s]?://', body))
        has_suspicious_links = link_count > 2
        
        return {
            'content_score': content_score,
            'matched_keywords': matched_keywords,
            'matched_patterns': matched_patterns,
            'has_urgency': has_urgency,
            'has_money': has_money,
            'link_count': link_count,
            'has_suspicious_links': has_suspicious_links
        }
        
    def analyze(
        self,
        subject: str,
        body: str,
        sender: Optional[str] = None,
        recipient: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze email for fraud detection"""
        
        # Analyze sender
        sender_analysis = self._analyze_sender(sender or "")
        
        # Analyze content
        content_analysis = self._analyze_content(subject, body)
        
        # Calculate total risk score
        total_score = sender_analysis['sender_score'] + content_analysis['content_score']
        
        # Boost score for combinations
        if content_analysis['has_urgency'] and content_analysis['has_money']:
            total_score += 20
        if sender_analysis['display_name_suspicious'] and content_analysis['has_suspicious_links']:
            total_score += 25
        
        risk_score = min(total_score, 100)
        
        # Determine fraud status
        is_fraud = risk_score >= 30  # Lower threshold for emails
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = "High"
        elif risk_score >= 40:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        
        # Determine fraud type
        matched_categories = []
        full_text = f"{subject} {body}".lower()
        
        for category, keywords in self.fraud_keywords.items():
            if any(kw in full_text for kw in keywords):
                matched_categories.append(category)
        
        if is_fraud:
            if 'phishing' in matched_categories:
                fraud_type = 'phishing'
            elif 'scam' in matched_categories:
                fraud_type = 'scam'
            elif 'threat' in matched_categories:
                fraud_type = 'threat'
            elif 'abuse' in matched_categories:
                fraud_type = 'abuse'
            else:
                fraud_type = 'phishing'  # Default to phishing for emails
        else:
            fraud_type = 'safe'
        
        # Calculate confidence
        confidence = 0.80 if is_fraud else 0.90
        if len(content_analysis['matched_keywords']) >= 2:
            confidence = min(confidence + 0.1, 0.95)
        
        return {
            'is_fraud': is_fraud,
            'prediction': 'SCAM' if is_fraud else 'SAFE',
            'risk': risk_level,
            'score': risk_score,
            'risk_score': risk_score,
            'confidence': confidence,
            'type': fraud_type,
            'category': 'email',
            'matchedKeywords': content_analysis['matched_keywords'],
            'details': {
                'sender_analysis': sender_analysis,
                'content_analysis': content_analysis,
                'subject': subject,
                'body_length': len(body),
                'has_attachments': False  # Could be extended
            }
        }
        
    def predict(self, subject: str, body: str, sender: Optional[str] = None) -> Dict[str, Any]:
        """Predict fraud probability for email"""
        return self.analyze(subject, body, sender)