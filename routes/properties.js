const express = require('express');
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentification requise' });
  next();
}

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const properties = await req.prisma.property.findMany({
      where: { userId: req.session.userId },
      include: { _count: { select: { reservations: true } } }
    });
    res.json(properties);
  } catch (err) {
    req.logger.error(`Properties list error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de la récupération des propriétés' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const property = await req.prisma.property.findFirst({
      where: { id: req.params.id, userId: req.session.userId },
      include: { reservations: { orderBy: { checkIn: 'desc' }, take: 50 } }
    });
    if (!property) return res.status(404).json({ error: 'Propriété introuvable' });
    res.json(property);
  } catch (err) {
    req.logger.error(`Property get error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de la récupération de la propriété' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, airbnbIcalUrl, propertyMapsLink, timezone } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom est requis' });

    const property = await req.prisma.property.create({
      data: {
        userId: req.session.userId,
        name,
        airbnbIcalUrl,
        propertyMapsLink,
        timezone: timezone || 'Europe/Paris'
      }
    });

    if (airbnbIcalUrl) {
      const { fetchReservations } = require('../lib/ical');
      fetchReservations(airbnbIcalUrl, property.id, req.prisma);
    }

    res.status(201).json(property);
  } catch (err) {
    req.logger.error(`Property create error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, airbnbIcalUrl, propertyMapsLink, timezone } = req.body;
    const property = await req.prisma.property.findFirst({
      where: { id: req.params.id, userId: req.session.userId }
    });
    if (!property) return res.status(404).json({ error: 'Propriété introuvable' });

    const updated = await req.prisma.property.update({
      where: { id: req.params.id },
      data: { name, airbnbIcalUrl, propertyMapsLink, timezone }
    });

    if (airbnbIcalUrl && airbnbIcalUrl !== property.airbnbIcalUrl) {
      const { fetchReservations } = require('../lib/ical');
      fetchReservations(airbnbIcalUrl, updated.id, req.prisma);
    }

    res.json(updated);
  } catch (err) {
    req.logger.error(`Property update error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.property.deleteMany({
      where: { id: req.params.id, userId: req.session.userId }
    });
    res.json({ success: true });
  } catch (err) {
    req.logger.error(`Property delete error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = router;