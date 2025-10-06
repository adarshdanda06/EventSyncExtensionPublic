# EventSync Extension

A Chrome extension that simplifies calendar event creation by extracting event information from screenshots using AI.

## Setup Instructions

### Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension` folder
4. Update the following in `extension/manifest.json`:
   - Create a Google Oauth Client in the Google Cloud Console Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Google OAuth client ID
   - Allow the following scopes in the Oauth Client
      - ./auth/userinfo.email
      - ./auth/userinfo.profile
      - openid
      - ./auth/calendar

### Server Setup

1. Navigate to the `server` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3001
   GOOGLE_CLIENT_ID=your_google_client_id_here
   EXTENSION_ID=your_chrome_extension_id_here
   ```
4. Update the server URL in `extension/src/service-workers/actions/events.js`:
   - Replace `YOUR_SERVER_URL` with your actual server URL

5. Start the server:
   ```bash
   npm start
   ```

## Required API Keys

- **Google OAuth Client ID**: For calendar access
- **Gemini API Key**: For AI-powered event extraction
- **Chrome Extension ID**: Generated when you load the extension

## Features

- Extract event information from screenshots
- Create calendar events automatically
- Edit event details before adding to calendar
- Support for multiple events from a single image

## Security Notes

- All sensitive information has been redacted for public release
- Replace placeholder values with your actual API keys and IDs
- Never commit real API keys to version control

