const express = require('express');
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentification requise' });
  next();
}

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const reservations = await req.prisma.reservation.findMany({
      where: { property: { userId: req.session.userId } },
      include: { property: { select: { id: true, name: true } }, messages: { take: 5, orderBy: { sentAt: 'desc' } } },
      orderBy: { checkIn: 'desc' },
      take: 100
    });
    res.json(reservations);
  } catch (err) {
    req.logger.error(`Reservations list error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const reservation = await req.prisma.reservation.findFirst({
      where: { id: req.params.id, property: { userId: req.session.userId } },
      include: { property: true, messages: { orderBy: { sentAt: 'asc' } } }
    });
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });
    res.json(reservation);
  } catch (err) {
    req.logger.error(`Reservation get error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { propertyId, guestName, guestEmail, guestPhone, checkIn, checkOut, flightNumber, passportName, passportNumber } = req.body;
    if (!propertyId || !guestName || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'Champs requis: propertyId, guestName, checkIn, checkOut' });
    }

    const property = await req.prisma.property.findFirst({
      where: { id: propertyId, userId: req.session.userId }
    });
    if (!property) return res.status(404).json({ error: 'Propriété introuvable' });

    const reservation = await req.prisma.reservation.create({
      data: { propertyId, guestName, guestEmail, guestPhone, checkIn: new Date(checkIn), checkOut: new Date(checkOut), flightNumber, passportName, passportNumber }
    });

    res.status(201).json(reservation);
  } catch (err) {
    req.logger.error(`Reservation create error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { guestName, guestEmail, guestPhone, checkIn, checkOut, flightNumber, status, passportName, passportNumber } = req.body;
    const reservation = await req.prisma.reservation.findFirst({
      where: { id: req.params.id, property: { userId: req.session.userId } }
    });
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });

    const updated = await req.prisma.reservation.update({
      where: { id: req.params.id },
      data: { guestName, guestEmail, guestPhone, checkIn: checkIn ? new Date(checkIn) : undefined, checkOut: checkOut ? new Date(checkOut) : undefined, flightNumber, status, passportName, passportNumber }
    });
    res.json(updated);
  } catch (err) {
    req.logger.error(`Reservation update error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

module.exports = router;