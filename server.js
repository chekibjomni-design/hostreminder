require('dotenv').config();

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const logger = require('./lib/logger');
const passport = require('passport');
require('./lib/passport-config')(passport);
const icalParser = require('./lib/ical');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.APP_URL : true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  req.prisma = prisma;
  req.logger = logger;
  next();
});

// Initialise Passport (OAuth) – utilise la même session Express
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/checkin', require('./routes/checkin'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/flights', require('./routes/flights'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/ical', require('./routes/ical'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/ocr-demo', require('./routes/ocrDemo'));

app.get('/', (req, res) => res.redirect('/login.html'));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

cron.schedule('0 */12 * * *', async () => {
  logger.info('[CRON] Démarrage du cycle de vérification 12h');
  try {
    const { checkReminders } = require('./lib/reminders');
    await checkReminders(prisma, logger);
  } catch (err) {
    logger.error(`[CRON] Erreur: ${err.message}`);
  }
});

app.listen(PORT, () => {
  logger.info(`HostReminder démarré sur le port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  console.log(`✓ HostReminder — http://localhost:${PORT}`);
}).on('error', (err) => {
  logger.error(`Échec démarrage port ${PORT}: ${err.message}`);
  console.error(`✗ Erreur: ${err.message}`);
  process.exit(1);
});

module.exports = app;