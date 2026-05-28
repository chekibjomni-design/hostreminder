const express = require('express');
const router = express.Router();
const { sendWhatsApp } = require('../lib/messaging');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentification requise' });
  next();
}

router.use(requireAuth);

router.post('/send', async (req, res) => {
  try {
    const { reservationId, message } = req.body;
    if (!reservationId || !message) return res.status(400).json({ error: 'reservationId et message requis' });

    const reservation = await req.prisma.reservation.findFirst({
      where: { id: reservationId, property: { userId: req.session.userId } }
    });
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });
    if (!reservation.guestPhone) return res.status(400).json({ error: 'Aucun numéro de téléphone pour ce voyageur' });

    await sendWhatsApp(reservation.guestPhone, message);

    await req.prisma.message.create({
      data: {
        reservationId,
        content: message,
        direction: 'outbound',
        channel: 'whatsapp'
      }
    });

    res.json({ success: true });
  } catch (err) {
    req.logger.error(`WhatsApp route error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de l\'envoi WhatsApp' });
  }
});

router.post('/webhook', async (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.META_VERIFY_TOKEN) {
    return res.send(req.query['hub.challenge']);
  }

  res.sendStatus(403);
});

router.post('/webhook/incoming', async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (message) {
      const from = message.from;
      const text = message.text?.body || '';

      const reservation = await req.prisma.reservation.findFirst({
        where: { guestPhone: { contains: from.slice(-10) } }
      });

      if (reservation) {
        await req.prisma.message.create({
          data: {
            reservationId: reservation.id,
            content: text,
            direction: 'inbound',
            channel: 'whatsapp'
          }
        });
        req.logger.info(`WhatsApp reçu de ${from}: ${text.substring(0, 100)}`);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    req.logger.error(`WhatsApp webhook error: ${err.message}`);
    res.sendStatus(200);
  }
});

module.exports = router;