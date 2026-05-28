const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { scanPassport } = require('../lib/passportScanner');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format non supporté. Utilisez JPEG, PNG ou WebP.'));
  }
});

router.get('/:reservationId', async (req, res) => {
  try {
    const reservation = await req.prisma.reservation.findUnique({
      where: { id: req.params.reservationId },
      include: { property: { select: { name: true, propertyMapsLink: true } } }
    });
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });
    if (reservation.status === 'CHECKED_IN') {
      return res.json({ message: 'Déjà enregistré', reservation });
    }
    res.json({ reservation, message: 'Page de check-in — utilisez /api/checkin/:id/ocr pour scanner un passeport' });
  } catch (err) {
    req.logger.error(`Checkin get error: ${err.message}`);
    res.status(500).json({ error: 'Erreur' });
  }
});

router.post('/:reservationId/ocr', upload.single('passport'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier image requis' });

    const scanResult = await scanPassport(req.file.path, {
      logger: progress => req.logger.info(`OCR: ${progress}%`)
    });

    fs.unlink(req.file.path, () => {});

    const result = {
      rawText: scanResult.rawText.substring(0, 500),
      extractedName: scanResult.extractedName,
      passportNumber: scanResult.passportNumber,
      confidence: scanResult.confidence
    };

    if (result.extractedName || result.passportNumber) {
      await req.prisma.reservation.update({
        where: { id: req.params.reservationId },
        data: {
          passportName: result.extractedName || undefined,
          passportNumber: result.passportNumber || undefined,
          status: 'CHECKED_IN'
        }
      });
    }

    res.json(result);
  } catch (err) {
    req.logger.error(`OCR error: ${err.message}`);
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Erreur OCR. Réessayez avec une photo plus nette.' });
  }
});

router.post('/:reservationId/submit', async (req, res) => {
  try {
    const { guestName, passportNumber } = req.body;
    const updated = await req.prisma.reservation.update({
      where: { id: req.params.reservationId },
      data: { passportName: guestName, passportNumber, status: 'CHECKED_IN' }
    });
    res.json({ success: true, reservation: updated });
  } catch (err) {
    req.logger.error(`Checkin submit error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement' });
  }
});

module.exports = router;