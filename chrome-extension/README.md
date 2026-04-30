# AI Cyber Fraud Detection - Chrome Extension

## Overview

A production-ready Chrome Extension (Manifest V3) for real-time scam detection across web applications including WhatsApp Web, Gmail, and social media platforms.

## Features

- ✅ Real-time scam message detection
- ✅ Link click interception & safety verification
- ✅ Voice alerts using Web Speech API
- ✅ Beautiful dashboard UI
- ✅ Protection toggle ON/OFF

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

## Configuration

Update the API endpoint in `background.js`:
```javascript
const CONFIG = {
  apiEndpoint: 'http://localhost:5000/api/analyze-text',
  checkUrlEndpoint: 'http://localhost:5000/api/check-url'
};
```

Update in `content.js`:
```javascript
const CONFIG = {
  apiEndpoint: 'http://localhost:5000/api/analyze-text'
};
```

## API Response Format

The extension expects this response format from the backend:

```json
{
  "prediction": "SCAM" | "SAFE",
  "risk": "Low" | "Medium" | "High",
  "score": 0-100,
  "matchedKeywords": []
}
```

## Files

- `manifest.json` - Extension manifest (MV3)
- `content.js` - DOM scanning & link interception
- `background.js` - API communication
- `popup.html` - Extension UI
- `popup.js` - UI logic

## Usage

1. Click the extension icon in Chrome toolbar
2. Toggle protection ON/OFF
3. The extension will automatically scan web pages
4. Click "Scan Now" to manually scan the current page

## Tech Stack

- Manifest V3
- Chrome Storage API
- Fetch API
- Web Speech API
- Vanilla JavaScript
