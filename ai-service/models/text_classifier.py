"""
Text Classifier Model
NLP-based fraud detection for text messages
Hybrid System: ML Prediction + Keyword Boost
"""

import re
import numpy as np
from typing import Dict, Any, List


class TextClassifier:
    """Text classification model for fraud detection with hybrid system"""
    
    def __init__(self):
        # REQUIRED: Scam keywords as per task specification
        # High-priority keywords that indicate scam
        self.SCAM_KEYWORDS = [
            "OTP", "urgent", "bank", "verify", "click link",
            "won", "lottery", "prize", "suspended", "KYC",
            "Aadhaar", "account blocked"
        ]
        
        # Expanded fraud keywords for detection
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
                'unauthorized', 'suspicious activity', 'confirm details'
            ],
            'abuse': [
                'threat', 'kill', 'die', 'hurt', 'abuse', 'harass',
                'offensive', 'racist', 'sexist', 'discriminate'
            ],
            'threat': [
                'police', 'court', 'legal action', 'arrest warrant',
                'lawsuit', 'legal notice', 'court summons', 'Criminal Code'
            ]
        }
        
        # Regex patterns for scam detection
        self.scam_patterns = [
            r'\b\d{10,}\b',
            r'₹\d+[,.]?\d*',
            r'won.*lottery',
            r'congratulations.*prize',
            r'claim.*reward',
            r'gift.*card.*free',
            r'verify.*bank',
            r'update.*kyc',
            r'otp.*share',
            r'share.*otp',
            r'urgent.*action',
            r'act.*now',
            r'account.*suspend',
            r'kYC.*expire',
            r'click.*link',
            r'won.*prize',
            r'free.*gift',
            r'bank.*account',
            r'account.*blocked',
            r'verify.*now'
        ]
        
        self.initialized = True
        
    def _check_keywords(self, text: str) -> tuple[List[str], float]:
        """Check for scam keywords and return matched keywords with score boost"""
        text_lower = text.lower()
        matched_keywords = []
        
        # Check high-priority scam keywords first
        for keyword in self.SCAM_KEYWORDS:
            if keyword.lower() in text_lower:
                matched_keywords.append(keyword)
        
        # Check expanded fraud keywords
        additional_matches = []
        for category, keywords in self.fraud_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    additional_matches.append(keyword)
        
        # Combine all matched keywords
        all_matched = list(set(matched_keywords + additional_matches))
        
        # Calculate keyword boost score (each keyword adds to risk)
        keyword_boost = len(all_matched) * 15  # Each keyword adds 15 points
        
        return all_matched, min(keyword_boost, 60)  # Cap at 60 points from keywords
        
    def _check_patterns(self, text: str) -> tuple[int, List[str]]:
        """Check for regex patterns in text"""
        text_lower = text.lower()
        matched_patterns = []
        
        for pattern in self.scam_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                matched_patterns.append(pattern)
        
        # Each pattern match adds 10 points
        pattern_score = len(matched_patterns) * 10
        
        return min(pattern_score, 40), matched_patterns  # Cap at 40 points from patterns
        
    def _ml_prediction(self, text: str) -> float:
        """Step 1: ML-style prediction based on text features"""
        # Simplified ML prediction using text features
        text_lower = text.lower()
        
        # Feature weights (simulating trained model)
        features = {
            'has_phone_number': 15,  # Contains phone number
            'has_money_symbol': 20,   # Contains ₹ or money
            'has_urgency': 25,      # Has urgency words
            'has_prize_lottery': 30, # Has lottery/prize words
            'has_otp_verification': 25, # Has OTP/verification
            'has_bank_terms': 20,    # Has bank-related terms
            'has_threat': 25,       # Has threatening language
            'length_suspicious': 10   # Message length unusual
        }
        
        ml_score = 0
        
        # Feature checks
        if re.search(r'\b\d{10,}\b', text):
            ml_score += features['has_phone_number']
        
        if re.search(r'₹\d+', text_lower):
            ml_score += features['has_money_symbol']
        
        urgency_words = ['urgent', 'immediately', 'act now', 'hurry', 'limited time', 'expire', 'expires soon']
        if any(word in text_lower for word in urgency_words):
            ml_score += features['has_urgency']
        
        prize_words = ['won', 'lottery', 'prize', 'winner', 'cash', 'million', 'crore']
        if any(word in text_lower for word in prize_words):
            ml_score += features['has_prize_lottery']
        
        otp_words = ['otp', 'one time password', 'verification code', 'verify']
        if any(word in text_lower for word in otp_words):
            ml_score += features['has_otp_verification']
        
        bank_words = ['bank', 'account', 'kyc', 'aadhaar', 'verify', 'suspended', 'blocked']
        if any(word in text_lower for word in bank_words):
            ml_score += features['has_bank_terms']
        
        threat_words = ['police', 'court', 'legal', 'arrest', 'lawsuit']
        if any(word in text_lower for word in threat_words):
            ml_score += features['has_threat']
        
        # Suspicious length (too short or too long could be indicator)
        if len(text) < 20 or len(text) > 1000:
            ml_score += features['length_suspicious']
        
        return min(ml_score, 50)  # Cap ML score at 50
        
    def analyze(self, text: str) -> Dict[str, Any]:
        """Hybrid Analysis: ML Prediction + Keyword Boost"""
        
        # Step 1: ML Prediction
        ml_score = self._ml_prediction(text)
        
        # Step 2: Keyword Boost System
        matched_keywords, keyword_boost = self._check_keywords(text)
        
        # Step 3: Pattern matching
        pattern_score, pattern_matches = self._check_patterns(text)
        
        # Combine scores for final risk score
        # Formula: ML score + keyword boost + pattern score
        total_score = ml_score + keyword_boost + pattern_score
        
        # Ensure minimum score threshold for detection
        # If any high-priority keyword matched, ensure minimum 50
        priority_keywords = ["OTP", "KYC", "Aadhaar", "lottery", "won", "prize", "account blocked", "bank"]
        has_priority = any(kw.lower() in text.lower() for kw in priority_keywords)
        
        if has_priority or len(matched_keywords) >= 2:
            total_score = max(total_score, 50)
        
        # Cap at 100
        risk_score = min(total_score, 100)
        
        # Determine fraud status (threshold lowered to 25 for better detection)
        is_fraud = risk_score >= 25
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = "High"
        elif risk_score >= 40:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        
        # Determine fraud type
        matched_categories = []
        text_lower = text.lower()
        
        for category, keywords in self.fraud_keywords.items():
            if any(kw in text_lower for kw in keywords):
                matched_categories.append(category)
        
        if is_fraud:
            if 'scam' in matched_categories:
                fraud_type = 'scam'
            elif 'phishing' in matched_categories:
                fraud_type = 'phishing'
            elif 'threat' in matched_categories:
                fraud_type = 'threat'
            elif 'abuse' in matched_categories:
                fraud_type = 'abuse'
            else:
                fraud_type = 'scam'  # Default to scam for high confidence
        else:
            fraud_type = 'safe'
        
        # Calculate confidence based on keyword matches
        confidence = 0.85 if is_fraud else 0.95
        if len(matched_keywords) >= 3:
            confidence = 0.95  # Higher confidence with multiple keyword matches
        
        # Return response in required format
        # Convert to response format with prediction (SCAM/SAFE)
        return {
            'is_fraud': is_fraud,
            'prediction': 'SCAM' if is_fraud else 'SAFE',
            'risk': risk_level,
            'score': risk_score,
            'risk_score': risk_score,
            'confidence': confidence,
            'type': fraud_type,
            'category': 'text',
            'matchedKeywords': matched_keywords,
            'details': {
                'ml_score': ml_score,
                'keyword_boost': keyword_boost,
                'pattern_score': pattern_score,
                'matched_keywords': matched_keywords,
                'pattern_matches': len(pattern_matches),
                'text_length': len(text)
            }
        }
        
    def predict(self, text: str) -> Dict[str, Any]:
        """Predict fraud probability"""
        return self.analyze(text)
        
    def get_feature_importance(self, text: str) -> Dict[str, float]:
        """Get feature importance scores"""
        text_lower = text.lower()
        
        importance = {}
        for category, keywords in self.fraud_keywords.items():
            count = sum(1 for kw in keywords if kw in text_lower)
            importance[category] = count / len(keywords) * 100
            
        return importance
