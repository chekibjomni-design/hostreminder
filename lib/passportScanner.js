// lib/passportScanner.js
/**
 * Passport scanner utility using Tesseract.js.
 *
 * The function accepts an image source (file path, URL, data URL, Buffer)
 * and runs OCR with the English language pack. It returns the raw OCR text,
 * attempts to extract a full name and a passport number, and provides the OCR
 * confidence score.
 *
 * The extraction heuristics mirror the ones previously used in
 * `routes/checkin.js` but are encapsulated here for reuse.
 *
 * @param {string|Buffer} image - Path to an image file, a remote URL, a data URL (Base64),
 *                               or a Buffer containing the image bytes.
 * @param {object} [options] - Optional configuration.
 * @param {function} [options.logger] - Optional logger function that receives Tesseract
 *                                      progress objects (e.g. `msg => console.log(msg)`).
 * @returns {Promise<{ rawText: string, extractedName: string|null, passportNumber: string|null, confidence: number }>}
 */
async function scanPassport(image, options = {}) {
  // Lazy‑load Tesseract to avoid pulling it into other modules unless needed.
  const Tesseract = require('tesseract.js');

  const { logger } = options;

  // Tesseract returns a promise with a `data` object containing the recognized text
  // and a confidence metric. We use the English language pack; additional languages
  // can be added by adjusting the second argument (e.g. "eng+fra").
  const { data } = await Tesseract.recognize(image, 'eng', {
    logger: m => {
      // Provide progress only when callers care about it.
      if (logger && m.status === 'recognizing text') logger(Math.round(m.progress * 100));
    }
  });

  const text = data.text;

  // --- Extraction heuristics ------------------------------------------------
  // Name extraction: look for two consecutive lines that look like an uppercase
  // surname followed by a capitalised given name line.
  const nameMatch = text.match(/([A-ZÀ-Ù][A-ZÀ-Ù\s-]+)\n([A-ZÀ-Ù][a-zà-ùéèêëàâîïôöûüç]+(?:\s[A-ZÀ-Ù][a-zà-ùéèêëàâîïôöûüç]+)+)/);
  const extractedName = nameMatch ? `${nameMatch[1].trim()} ${nameMatch[2].trim()}` : null;

  // Passport number extraction: typical patterns are 5‑15 alphanumerics, or
  // the MRZ format (two letters followed by digits). We keep the first match that
  // satisfies a simple validation.
  const passportMatches = text.match(/\b[A-Z0-9]{5,15}\b/g) || [];
  const passportNumber = passportMatches.find(p => /^\d{5,15}$/.test(p) || /^[A-Z]{2}\d{6,10}$/.test(p)) || null;

  return {
    rawText: text,
    extractedName,
    passportNumber,
    confidence: data.confidence
  };
}

module.exports = { scanPassport };
