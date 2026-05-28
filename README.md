# HostReminder – Passport Scanner Utility

## Overview
This repo now includes a reusable OCR helper built with tesseract.js. The helper lives in `lib/passportScanner.js` and can be imported anywhere you need to extract text from a passport (or any image with an MRZ).

## Usage
```js
const { scanPassport } = require('./lib/passportScanner');

(async () => {
  const result = await scanPassport('path/to/image.jpg', {
    logger: p => console.log(`OCR ${p}%`)
  });
  console.log(result);
})();
```

The function returns:
- `rawText`: first 500 characters of OCR output
- `extractedName`: detected full name (or `null`)
- `passportNumber`: detected passport number (or `null`)
- `confidence`: OCR confidence score

## Integration
`routes/checkin.js` now uses this helper. You can reuse it in any route or background job.

## Tests
Run `npm test` to execute the Jest test that mocks tesseract.js.

## License
MIT

## CI trigger
CI trigger: 2026-05-28T23:15:00Z

## Required Environment Variables
The application expects the following variables to be defined (either in a `.env` file for local development or as Render environment variables):
- `PORT` – HTTP port (default 3000)
- `NODE_ENV` – `production` or `development`
- `DATABASE_URL` – connection string for the SQLite (dev) or external DB
- `SESSION_SECRET` – secret for signed cookies
- `GROQ_API_KEY` – API key for Groq AI integration
- `FLIGHT_API_KEY` – RapidAPI key for AeroDataBox
- `META_WHATSAPP_PHONE_NUMBER_ID` – WhatsApp Business phone ID
- `META_WHATSAPP_ACCESS_TOKEN` – Long‑lived token for Meta Cloud API
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` – SMTP credentials for Brevo email sending

Make sure these are present before starting the server.