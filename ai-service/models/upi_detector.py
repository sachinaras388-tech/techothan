"""
UPI Fraud Detector
India-specific UPI payment scam detection
"""

import re
from typing import Dict, Any, Optional


class UPIDetector:
    """UPI payment fraud detection model"""
    
    def __init__(self):
        # Suspicious UPI patterns
        self.suspicious_patterns = [
            'gift', 'prize', 'winner', 'lucky', 'reward',
            'claim', 'bonus', 'offer', 'discount', 'free'
        ]
        
        # Known fake UPI handles
        self.blacklist = [
            'amazongift@upi',
            'giftpay@upi',
            'prizeclaim@upi',
            'winner@upi',
            'bankverify@upi'
        ]
        
        # Suspicious amount patterns
        self.suspicious_amounts = [
            1, 2, 5, 10,  # Very small amounts
            8888, 9999,  # Lucky number amounts
        ]
        
        self.initialized = True
        
    def analyze(
        self,
        upi_id: str,
        amount: Optional[float] = None,
        merchant_name: Optional[str] = None,
        transaction_note: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze UPI payment request"""
        
        # Parse UPI ID
        upi_lower = upi_id.lower()
        
        # Check blacklist
        is_blacklisted = False
        for blacklisted in self.blacklist:
            if blacklisted in upi_lower:
                is_blacklisted = True
                break
        
        # Check suspicious patterns in UPI handle
        pattern_matches = []
        for pattern in self.suspicious_patterns:
            if pattern in upi_lower or (merchant_name and pattern in merchant_name.lower()):
                pattern_matches.append(pattern)
        
        # Check suspicious amount
        is_suspicious_amount = False
        if amount:
            if amount in self.suspicious_amounts:
                is_suspicious_amount = True
        
        # Check transaction note
        note_matches = []
        if transaction_note:
            for pattern in self.suspicious_patterns:
                if pattern in transaction_note.lower():
                    note_matches.append(pattern)
        
        # Calculate risk score
        risk_score = 0.0
        
        if is_blacklisted:
            risk_score += 50
        
        if pattern_matches:
            risk_score += len(pattern_matches) * 15
        
        if is_suspicious_amount:
            risk_score += 20
        
        if note_matches:
            risk_score += len(note_matches) * 10
        
        # Check for common fraud scenarios
        if merchant_name:
            # Fake Amazon/UPI scam
            if 'amazon' in merchant_name.lower() and 'gift' in upi_lower:
                risk_score += 30
            
            # Fake bank verification
            if any(b in merchant_name.lower() for b in ['bank', 'verify', 'support']):
                risk_score += 25
        
        risk_score = min(100, risk_score)
        
        # Determine fraud type
        is_fraud = risk_score > 40
        
        if is_blacklisted:
            fraud_type = 'blacklisted_handle'
        elif 'gift' in pattern_matches or 'prize' in pattern_matches:
            fraud_type = 'fake_prize_scam'
        elif is_suspicious_amount:
            fraud_type = 'psychological_pricing'
        elif pattern_matches:
            fraud_type = 'suspicious_merchant'
        else:
            fraud_type = 'safe'
        
        # Generate warning
        warning = None
        if is_fraud:
            reasons = []
            if is_blacklisted:
                reasons.append('UPI handle is in blacklist')
            if pattern_matches:
                reasons.append(f'Suspicious patterns: {", ".join(pattern_matches)}')
            if is_suspicious_amount:
                reasons.append('Suspicious amount')
            if merchant_name and 'gift' in merchant_name.lower():
                reasons.append('Fake gift/promo scam')
            warning = '; '.join(reasons) if reasons else 'This payment request appears suspicious'
        
        return {
            'is_fraud': is_fraud,
            'risk_score': risk_score,
            'confidence': 0.85 if is_fraud else 0.95,
            'type': fraud_type,
            'warning': warning,
            'details': {
                'upi_id': upi_id,
                'amount': amount,
                'merchant_name': merchant_name,
                'blacklisted': is_blacklisted,
                'pattern_matches': pattern_matches,
                'suspicious_amount': is_suspicious_amount,
                'note_matches': note_matches
            }
        }
        
    def validate_upi_id(self, upi_id: str) -> bool:
        """Validate UPI ID format"""
        # Standard UPI format: name@upi.handle
        pattern = r'^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$'
        if re.match(pattern, upi_id):
            return True
        return False
        
    def predict(self, upi_id: str, amount: Optional[float] = None) -> Dict[str, Any]:
        """Predict UPI fraud"""
        return self.analyze(upi_id, amount)
