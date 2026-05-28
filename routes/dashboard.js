const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login.html');

  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, name: true, email: true },
      include: {
        properties: {
          include: {
            _count: { select: { reservations: true } },
            reservations: { orderBy: { checkIn: 'desc' }, take: 5 }
          }
        }
      }
    });

    const stats = {
      properties: user.properties.length,
      totalReservations: user.properties.reduce((sum, p) => sum + p._count.reservations, 0),
      upcomingReservations: user.properties.reduce((sum, p) =>
        sum + p.reservations.filter(r => r.status === 'CONFIRMED' && new Date(r.checkIn) > new Date()).length, 0)
    };

    res.json({ user, stats, properties: user.properties });
  } catch (err) {
    req.logger.error(`Dashboard error: ${err.message}`);
    res.status(500).json({ error: 'Erreur' });
  }
});

router.get('/logs', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentification requise' });
  const fs = require('fs');
  const path = require('path');
  const logDir = path.join(__dirname, '..', 'logs');
  const combinedPath = path.join(logDir, 'combined.log');

  if (!fs.existsSync(combinedPath)) return res.json({ logs: [] });

  const lines = fs.readFileSync(combinedPath, 'utf-8').split('\n').filter(Boolean).slice(-100);
  const parsed = lines.map(l => {
    try { return JSON.parse(l); } catch { return { message: l, timestamp: new Date().toISOString() }; }
  });

  res.json({ logs: parsed.reverse() });
});

module.exports = router;