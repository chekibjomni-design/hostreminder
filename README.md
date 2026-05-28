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