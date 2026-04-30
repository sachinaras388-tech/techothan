# FraudShield - Android Link Protection App

Real-Time Malicious Link Detection & Prevention System

## Features

- 🔒 **System-Level Protection**: Works across all apps (WhatsApp, Chrome, SMS, Email)
- 🚨 **Real-Time Warnings**: Detects unsafe links before opening
- 📱 **Modern UI**: Smooth animations, vibration alerts, red danger theme
- 🌐 **Backend Integration**: Connected to AI-powered fraud detection API

## How It Works

1. User installs the app
2. App becomes default link handler (Intent Filter)
3. When user clicks any link, app intercepts it
4. Sends URL to backend `/api/check-url`
5. Returns risk analysis
6. Shows safe/block screen

## Installation

```bash
# Install dependencies
npm install

# Run on Android
npx expo run:android

# Or build APK
npx expo run:android --variant release
```

## Android Configuration

### Intent Filter (app.json)
The app is configured to intercept HTTP/HTTPS links.

### Permissions Required
- INTERNET
- VIBRATE
- FOREGROUND_SERVICE

## API Endpoints

### Check URL Safety
```
POST /api/check-url
Body: { "url": "https://example.com" }
Response: {
  "isUnsafe": boolean,
  "riskScore": number,
  "reasons": string[]
}
```

## Risk Scoring

- 0-30%: ✅ Safe (Green)
- 31-59%: ⚠️ Medium Risk (Yellow)
- 60-79%: 🚨 High Risk (Orange)
- 80-100%: ⛔ Critical (Red)

## Project Structure

```
mobile-app/
├── App.tsx              # Main app entry
├── app.json             # Expo config
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── WarningScreen.tsx
│   │   └── ResultScreen.tsx
│   ├── components/
│   │   ├── RiskIndicator.tsx
│   │   └── LoadingOverlay.tsx
│   ├── services/
│   │   └── api.ts
│   ├── utils/
│   │   ├── linkChecker.ts
│   │   └── helpers.ts
│   └── types/
│       └── index.ts
└── android/
    └── AndroidManifest.xml
```

## Usage

The app automatically handles links via:
- Deep linking (fraudshield://check?url=...)
- App link handling (https://fraudshield.app/check?url=...)
- Intent handling for HTTP/HTTPS
