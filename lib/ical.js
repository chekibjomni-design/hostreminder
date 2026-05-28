const ical = require('node-ical');
const logger = require('./logger');

async function fetchReservations(icalUrl, propertyId, prisma) {
  try {
    const data = await ical.async.fromURL(icalUrl);
    const events = Object.values(data).filter(e => e.type === 'VEVENT');
    let imported = 0;

    for (const event of events) {
      const existing = await prisma.reservation.findFirst({
        where: { propertyId, icalUid: event.uid }
      });
      if (existing) continue;

      await prisma.reservation.create({
        data: {
          propertyId,
          guestName: event.summary || 'Réservation Airbnb',
          checkIn: new Date(event.start),
          checkOut: new Date(event.end),
          status: 'CONFIRMED',
          icalUid: event.uid
        }
      });
      imported++;
    }
    logger.info(`ICAL: ${imported} réservations importées pour la propriété ${propertyId}`);
    return imported;
  } catch (err) {
    logger.error(`ICAL Erreur pour ${icalUrl}: ${err.message}`);
    return 0;
  }
}

module.exports = { fetchReservations };