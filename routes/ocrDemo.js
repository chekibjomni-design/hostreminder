const express = require('express');
const router = express.Router();
const { scanPassport } = require('../lib/passportScanner');

// Simple demo endpoint: GET /api/ocr-demo?url=<image_url>
router.get('/', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).json({ error: 'Missing query parameter `url`' });
  try {
    const result = await scanPassport(imageUrl, {
      logger: p => req.logger && req.logger.info(`OCR ${p}%`)
    });
    res.json(result);
  } catch (err) {
    req.logger && req.logger.error(`OCR demo error: ${err.message}`);
    res.status(500).json({ error: 'OCR processing failed', details: err.message });
  }
});

module.exports = router;
