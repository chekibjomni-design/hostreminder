const axios = require('axios');
const logger = require('./logger');

async function getFlightStatus(flightNumber) {
  if (!process.env.FLIGHT_API_KEY) {
    logger.warn('FLIGHT_API_KEY manquante');
    return null;
  }
  try {
    const { data } = await axios.get(
      `https://aerodatabox.p.rapidapi.com/flights/number/${flightNumber}/${new Date().toISOString().split('T')[0]}`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.FLIGHT_API_KEY,
          'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
        },
        params: { withAircraftImage: 'false', withLocation: 'true' }
      }
    );

    if (!data?.length) return 'Statut inconnu';

    const flight = data[0];
    const departure = flight.departure;
    const arrival = flight.arrival;

    let status = flight.status || 'Planifié';
    if (departure?.actualDeparture?.scheduledTime) status = `Départ ${departure.actualDeparture.scheduledTime}`;

    const parts = [];
    parts.push(`Vol: ${flight_number}`);
    if (departure?.airport?.name) parts.push(`Départ: ${departure.airport.name}`);
    if (departure?.scheduledTime?.local) parts.push(`Heure: ${departure.scheduledTime.local}`);
    if (arrival?.airport?.name) parts.push(`Arrivée: ${arrival.airport.name}`);
    parts.push(`Statut: ${status}`);
    if (departure?.terminal) parts.push(`Terminal: ${departure.terminal}`);
    if (departure?.gate) parts.push(`Porte: ${departure.gate}`);

    return parts.join(' | ');
  } catch (err) {
    logger.error(`Flight API error: ${err.message}`);
    return 'Indisponible';
  }
}

module.exports = { getFlightStatus };