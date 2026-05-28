const express = require('express');
const router = express.Router();
const { fetchReservations } = require('../lib/ical');

router.post('/sync/:propertyId', async (req, res) => {
  try {
    const property = await req.prisma.property.findFirst({
      where: { id: req.params.propertyId, userId: req.session.userId }
    });
    if (!property) return res.status(404).json({ error: 'Propriété introuvable' });
    if (!property.airbnbIcalUrl) return res.status(400).json({ error: 'Aucun flux iCal configuré' });

    const count = await fetchReservations(property.airbnbIcalUrl, property.id, req.prisma);
    res.json({ success: true, imported: count });
  } catch (err) {
    req.logger.error(`iCal sync error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de la synchronisation iCal' });
  }
});

module.exports = router;