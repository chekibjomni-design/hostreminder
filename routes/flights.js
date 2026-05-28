const express = require('express');
const router = express.Router();
const { getFlightStatus } = require('../lib/flights');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentification requise' });
  next();
}

router.use(requireAuth);

router.get('/:reservationId', async (req, res) => {
  try {
    const reservation = await req.prisma.reservation.findFirst({
      where: { id: req.params.reservationId, property: { userId: req.session.userId } }
    });
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });
    if (!reservation.flightNumber) return res.json({ flightNumber: null, status: 'Aucun vol enregistré' });

    const status = await getFlightStatus(reservation.flightNumber);

    await req.prisma.reservation.update({
      where: { id: reservation.id },
      data: { flightStatus: status }
    });

    res.json({ flightNumber: reservation.flightNumber, status });
  } catch (err) {
    req.logger.error(`Flight route error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de la récupération du statut du vol' });
  }
});

router.put('/:reservationId', async (req, res) => {
  try {
    const { flightNumber } = req.body;
    if (!flightNumber) return res.status(400).json({ error: 'flightNumber requis' });

    const reservation = await req.prisma.reservation.findFirst({
      where: { id: req.params.reservationId, property: { userId: req.session.userId } }
    });
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });

    await req.prisma.reservation.update({
      where: { id: reservation.id },
      data: { flightNumber }
    });

    const status = await getFlightStatus(flightNumber);

    await req.prisma.reservation.update({
      where: { id: reservation.id },
      data: { flightStatus: status }
    });

    res.json({ flightNumber, status });
  } catch (err) {
    req.logger.error(`Flight update error: ${err.message}`);
    res.status(500).json({ error: 'Erreur' });
  }
});

module.exports = router;