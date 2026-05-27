from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import uvicorn
import numpy as np
from datetime import datetime
import os

from models.text_classifier import TextClassifier
from models.url_scanner import URLScanner
from models.upi_detector import UPIDetector
from models.email_detector import EmailDetector

app = FastAPI(
    title="AI Fraud Detection Service",
    description="ML-powered fraud detection for text, URLs, and UPI payments",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

text_classifier = TextClassifier()
url_scanner = URLScanner()
upi_detector = UPIDetector()
email_detector = EmailDetector()

class TextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=5000)
    
class URLAnalysisRequest(BaseModel):
    url: str = Field(..., min_length=5, max_length=2048)
    check_blacklist: bool = True
    
class UPIAnalysisRequest(BaseModel):
    upi_id: str = Field(..., min_length=5, max_length=100)
    amount: Optional[float] = None
    merchant_name: Optional[str] = None
    transaction_note: Optional[str] = None
    
class EmailAnalysisRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=10000)
    sender: Optional[str] = None
    recipient: Optional[str] = None
    
class PhoneAnalysisRequest(BaseModel):
    phone_number: str = Field(..., min_length=10, max_length=15)
    context: Optional[str] = None

# =====================
# Response Models
# =====================

class AnalysisResponse(BaseModel):
    success: bool = True
    is_fraud: bool = False
    risk_score: float = 0.0
    confidence: float = 0.0
    type: str = "safe"
    category: str = "unknown"
    details: dict = {}
    recommendations: List[str] = []

@app.get("/")
async def root():
    return {
        "service": "AI Fraud Detection",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "models": {
            "text_classifier": "loaded",
            "url_scanner": "loaded",
            "upi_detector": "loaded",
            "email_detector": "loaded"
        }
    }

@app.post("/analyze/text", response_model=AnalysisResponse)
async def analyze_text(request: TextAnalysisRequest):
    try:
        result = text_classifier.analyze(request.text)
        
        recommendations = []
        if result["is_fraud"]:
            if result["type"] == "scam":
                recommendations = [
                    "Do not respond to this message",
                    "Do not share personal information",
                    "Report this message as spam",
                    "Block the sender"
                ]
            elif result["type"] == "phishing":
                recommendations = [
                    "Do not click any links in this message",
                    "Do not download attachments",
                    "Report as phishing attempt"
                ]
            elif result["type"] == "abuse":
                recommendations = [
                    "Block the sender",
                    "Report to platform administrator",
                    "Save evidence if needed for legal action"
                ]
        
        return AnalysisResponse(
            success=True,
            is_fraud=result["is_fraud"],
            risk_score=result["risk_score"],
            confidence=result["confidence"],
            type=result["type"],
            category=result.get("category", "text"),
            details=result.get("details", {}),
            recommendations=recommendations
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/url", response_model=AnalysisResponse)
async def analyze_url(request: URLAnalysisRequest):
    try:
        result = url_scanner.analyze(
            request.url,
            check_blacklist=request.check_blacklist
        )
        
        recommendations = []
        if result["is_scam"]:
            if result["type"] == "phishing":
                recommendations = [
                    "Do not visit this URL",
                    "Do not enter any personal information",
                    "Report this URL to Google Safe Browsing",
                    "Delete this link from your device"
                ]
            elif result["type"] == "malware":
                recommendations = [
                    "Do not visit this URL",
                    "This page may infect your device with malware",
                    "Run antivirus scan on your device"
                ]
            elif result["type"] == "fake_store":
                recommendations = [
                    "This appears to be a fake shopping website",
                    "Do not enter payment information",
                    "Report to consumer protection agency"
                ]
        
        return AnalysisResponse(
            success=True,
            is_fraud=result.get("is_scam", result["is_fraud"]),
            risk_score=result["risk_score"],
            confidence=result["confidence"],
            type=result["type"],
            category="url",
            details=result.get("details", {}),
            recommendations=recommendations
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/upi", response_model=AnalysisResponse)
async def analyze_upi(request: UPIAnalysisRequest):
    try:
        result = upi_detector.analyze(
            request.upi_id,
            request.amount,
            request.merchant_name,
            request.transaction_note
        )
        
        recommendations = []
        if result["is_fraud"]:
            recommendations = [
                "Do not proceed with this payment",
                "Verify merchant independently",
                "Do not share OTP with anyone",
                "Report suspicious UPI ID to bank"
            ]
        
        return AnalysisResponse(
            success=True,
            is_fraud=result["is_fraud"],
            risk_score=result["risk_score"],
            confidence=result["confidence"],
            type=result["type"],
            category="upi_payment",
            details=result.get("details", {}),
            recommendations=recommendations
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/email", response_model=AnalysisResponse)
async def analyze_email(request: EmailAnalysisRequest):
    try:
        result = email_detector.analyze(
            request.subject,
            request.body,
            request.sender,
            request.recipient
        )
        
        recommendations = []
        if result["is_fraud"]:
            if result["type"] == "phishing":
                recommendations = [
                    "Do not click any links in this email",
                    "Do not download attachments",
                    "Do not reply to this email",
                    "Report as phishing to your email provider",
                    "Mark as spam"
                ]
            elif result["type"] == "scam":
                recommendations = [
                    "Do not respond to this email",
                    "Do not share personal information",
                    "Block the sender",
                    "Report to email provider"
                ]
            elif result["type"] == "threat":
                recommendations = [
                    "Do not engage with the sender",
                    "Save evidence for legal purposes",
                    "Report to authorities if threatened",
                    "Block the sender immediately"
                ]
        
        return AnalysisResponse(
            success=True,
            is_fraud=result["is_fraud"],
            risk_score=result["risk_score"],
            confidence=result["confidence"],
            type=result["type"],
            category=result.get("category", "email"),
            details=result.get("details", {}),
            recommendations=recommendations
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/phone", response_model=AnalysisResponse)
async def analyze_phone(request: PhoneAnalysisRequest):
    try:
        # Simple phone analysis
        result = {
            "is_fraud": False,
            "risk_score": 25.0,
            "confidence": 0.75,
            "type": "unknown",
            "category": "phone",
            "details": {
                "phone_number": request.phone_number,
                "context": request.context
            }
        }
        
        scam_patterns = [
            "+91-800",
            "+91-900",
        ]
        
        for pattern in scam_patterns:
            if pattern in request.phone_number:
                result["is_fraud"] = True
                result["risk_score"] = 75.0
                result["type"] = "phone_scam"
                result["details"]["reason"] = "Known scam prefix"
                break
        
        return AnalysisResponse(
            success=True,
            is_fraud=result["is_fraud"],
            risk_score=result["risk_score"],
            confidence=result["confidence"],
            type=result["type"],
            category=result["category"],
            details=result["details"],
            recommendations=[
                "Never share OTP with callers",
                "Verify caller identity independently",
                "Hang up on suspicious calls"
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
