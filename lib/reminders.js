const logger = require('./logger');

async function checkReminders(prisma) {
  const now = new Date();
  const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

  const reservations = await prisma.reservation.findMany({
    where: { status: 'CONFIRMED' },
    include: { property: { include: { owner: true } } }
  });

  for (const res of reservations) {
    const checkIn = new Date(res.checkIn);
    const diffDays = Math.round((checkIn - now) / (1000 * 60 * 60 * 24));

    try {
      if (diffDays === 2) {
        await sendReminder(res, 'J-2', prisma);
      } else if (diffDays === 1) {
        await sendReminder(res, 'J-1', prisma);
      }

      if (res.flightNumber && (diffDays === 2 || diffDays === 1)) {
        await checkFlightStatus(res, prisma);
      }
    } catch (err) {
      logger.error(`Reminder error reservation ${res.id}: ${err.message}`);
    }
  }
}

async function sendReminder(reservation, label, prisma) {
  const { sendWhatsApp } = require('./messaging');
  const message = getTemplateMessage(label, reservation);

  await prisma.message.create({
    data: {
      reservationId: reservation.id,
      content: message,
      direction: 'outbound',
      channel: 'whatsapp'
    }
  });

  if (reservation.guestPhone) {
    try {
      await sendWhatsApp(reservation.guestPhone, message);
      logger.info(`[${label}] WhatsApp envoyé à ${reservation.guestName} (${reservation.guestPhone})`);
    } catch (err) {
      logger.warn(`[${label}] Échec WhatsApp ${reservation.id}: ${err.message}`);
      const { sendEmail } = require('./messaging');
      if (reservation.guestEmail) {
        await sendEmail(reservation.guestEmail, `Rappel ${label} — ${reservation.property.name}`, message);
      }
    }
  } else if (reservation.guestEmail) {
    const { sendEmail } = require('./messaging');
    await sendEmail(reservation.guestEmail, `Rappel ${label} — ${reservation.property.name}`, message);
  }
}

async function checkFlightStatus(reservation, prisma) {
  try {
    const { getFlightStatus } = require('./flights');
    const status = await getFlightStatus(reservation.flightNumber);
    if (status) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { flightStatus: status }
      });
      logger.info(`Vol ${reservation.flightNumber}: ${status}`);
    }
  } catch (err) {
    logger.warn(`Vol ${reservation.flightNumber} indisponible: ${err.message}`);
  }
}

function getTemplateMessage(label, reservation) {
  const propertyName = reservation.property?.name || 'votre hébergement';
  if (label === 'J-2') {
    return `Bonjour ${reservation.guestName} ! Plus que 2 jours avant votre arrivée chez nous 😊. Souhaitez-vous connaître les modalités d'accès à ${propertyName} ? Nous sommes à votre disposition.`;
  }
  return `Bonjour ${reservation.guestName} ! Nous vous attendons demain pour votre séjour à ${propertyName} 🏡. Voici quelques informations pratiques pour faciliter votre arrivée.`;
}

module.exports = { checkReminders };