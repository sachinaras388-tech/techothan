"""
URL Scanner Model
URL risk analysis and scam detection
"""

import re
import whois
import socket
from urllib.parse import urlparse
from typing import Dict, Any, Optional
from datetime import datetime


class URLScanner:
    """URL analysis model for fraud detection"""
    
    def __init__(self):
        # Suspicious URL patterns
        self.suspicious_patterns = [
            r'login.*verify',
            r'account.*update',
            r'secure.*bank',
            r'free.*gift',
            r'prize.*claim',
            r'0auth',
            r'verify.*account',
            r'confirm.*password',
            r'signin.*verify',
            r'banking.*update',
            r'password.*reset',
        ]
        
        # Suspicious TLDs
        self.suspicious_tlds = ['.xyz', '.top', '.click', '.work', '.date', '.racing']
        
        # Known phishing keywords
        self.phishing_keywords = [
            'fake', 'secure', 'login', 'verify', 'account', 'update',
            'banking', 'password', 'signin', 'confirm', 'support'
        ]
        
        # Known compromised/blacklisted domains (sample)
        self.blacklist = [
            'fake-bank.com',
            'secure-paypal.xyz',
            'amazon-verify.com',
            'google-account.net'
        ]
        
        self.initialized = True
        
    def analyze(self, url: str, check_blacklist: bool = True) -> Dict[str, Any]:
        """Analyze URL for fraud"""
        try:
            parsed = urlparse(url)
            
            # Get domain info
            domain = parsed.netloc
            
            # Check for URL shorteners
            shorteners = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly']
            is_shortened = any(s in domain.lower() for s in shorteners)
            
            # Check suspicious patterns
            suspicious_matches = []
            for pattern in self.suspicious_patterns:
                if re.search(pattern, url.lower()):
                    suspicious_matches.append(pattern)
            
            # Check TLD
            tld = ''
            if '.' in domain:
                tld = '.' + domain.split('.')[-1]
            is_suspicious_tld = tld in self.suspicious_tlds
            
            # Check for IP address in URL
            is_ip = bool(re.match(r'\d+\.\d+\.\d+\.\d+', domain))
            
            # Check for @ symbol (credential harvesting)
            has_at_symbol = '@' in url
            
            # Check for suspicious keywords in domain
            domain_lower = domain.lower()
            keyword_matches = [kw for kw in self.phishing_keywords if kw in domain_lower]
            
            # Check blacklist
            is_blacklisted = False
            if check_blacklisted:
                for bl_domain in self.blacklist:
                    if bl_domain in domain_lower:
                        is_blacklisted = True
                        break
            
            # Calculate risk score
            risk_score = 0.0
            
            if suspicious_matches:
                risk_score += 30
            
            if is_suspicious_tld:
                risk_score += 20
            
            if is_ip:
                risk_score += 40
            
            if has_at_symbol:
                risk_score += 50
            
            if is_shortened:
                risk_score += 15
            
            if keyword_matches:
                risk_score += len(keyword_matches) * 10
            
            if is_blacklisted:
                risk_score = 100
            
            risk_score = min(100, risk_score)
            
            # Determine fraud type
            is_scam = risk_score > 40
            
            if is_blacklisted:
                fraud_type = 'blacklisted'
            elif has_at_symbol:
                fraud_type = 'credential_harvesting'
            elif is_ip:
                fraud_type = 'ip_spoofing'
            elif is_shortened:
                fraud_type = 'shortened_link'
            elif suspicious_matches:
                fraud_type = 'phishing'
            else:
                fraud_type = 'safe'
            
            # Generate reason
            reason = 'URL appears legitimate'
            if is_scam:
                reasons = []
                if suspicious_matches:
                    reasons.append('Suspicious URL pattern')
                if is_suspicious_tld:
                    reasons.append('Suspicious domain extension')
                if is_ip:
                    reasons.append('IP address used instead of domain')
                if has_at_symbol:
                    reasons.append('Contains @ symbol (potential phishing)')
                if is_blacklisted:
                    reasons.append('Domain in blacklist')
                if keyword_matches:
                    reasons.append(f'Suspicious keywords: {", ".join(keyword_matches)}')
                reason = '; '.join(reasons)
            
            return {
                'is_scam': is_scam,
                'risk_score': risk_score,
                'confidence': 0.90 if is_scam else 0.95,
                'type': fraud_type,
                'reason': reason,
                'details': {
                    'domain': domain,
                    'shortened': is_shortened,
                    'suspicious_tld': is_suspicious_tld,
                    'ip_address': is_ip,
                    'pattern_matches': len(suspicious_matches),
                    'keyword_matches': keyword_matches,
                    'blacklisted': is_blacklisted
                }
            }
            
        except Exception as e:
            # Return safe by default on error
            return {
                'is_scam': False,
                'risk_score': 0.0,
                'confidence': 0.5,
                'type': 'error',
                'reason': 'Could not analyze URL',
                'details': {'error': str(e)}
            }
        
    def check_domain_age(self, domain: str) -> Optional[int]:
        """Check domain age in days"""
        try:
            w = whois.whois(domain)
            if w.creation_date:
                if isinstance(w.creation_date, list):
                    creation = w.creation_date[0]
                else:
                    creation = w.creation_date
                age = (datetime.now() - creation).days
                return age
        except:
            pass
        return None
        
    def predict(self, url: str) -> Dict[str, Any]:
        """Predict URL risk"""
        return self.analyze(url)
