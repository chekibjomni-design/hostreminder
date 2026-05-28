const path = require('path');
const { scanPassport } = require('../lib/passportScanner');

(async () => {
  const imgPath = path.join(__dirname, '..', 'WhatsApp Image 2026-05-28 at 20.45.48.jpeg');
  try {
    const result = await scanPassport(imgPath, {
      logger: p => console.log(`OCR ${p}%`)
    });
    console.log('OCR result:', result);
  } catch (err) {
    console.error('Error during OCR:', err);
  }
})();