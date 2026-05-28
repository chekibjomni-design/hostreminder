const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentification requise' });
  next();
}

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const logDir = path.join(__dirname, '..', 'logs');
    const combinedPath = path.join(logDir, 'combined.log');
    const errorPath = path.join(logDir, 'error.log');

    const combined = fs.existsSync(combinedPath) ? fs.readFileSync(combinedPath, 'utf-8').split('\n').filter(Boolean).slice(-200).map(l => {
      try { return JSON.parse(l); } catch { return { message: l }; }
    }) : [];

    const errors = fs.existsSync(errorPath) ? fs.readFileSync(errorPath, 'utf-8').split('\n').filter(Boolean).slice(-50).map(l => {
      try { return JSON.parse(l); } catch { return { message: l }; }
    }) : [];

    res.json({ logs: combined, errors });
  } catch (err) {
    req.logger.error(`Logs read error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de la lecture des logs' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const logDir = path.join(__dirname, '..', 'logs');
    ['combined.log', 'error.log'].forEach(f => {
      const p = path.join(logDir, f);
      if (fs.existsSync(p)) fs.writeFileSync(p, '');
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du nettoyage' });
  }
});

module.exports = router;