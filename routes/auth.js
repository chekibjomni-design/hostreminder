const express = require('express');
const passport = require('passport');
const router = express.Router();
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'hostreminder-salt').digest('hex');
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const isAdminEmail = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;
    if (!email || !password || !name) return res.status(400).json({ error: 'Champs requis: email, password, name' });

    const existing = await req.prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });

    const user = await req.prisma.user.create({
      data: { email, password: hashPassword(password), name, role: isAdminEmail ? 'ADMIN' : undefined }
    });

    req.session.userId = user.id;
    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    req.logger.error(`Register error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

    const user = await req.prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    req.session.userId = user.id;
    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    req.logger.error(`Login error: ${err.message}`);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

router.post('/logout', (req, res) => {
  // Déconnexion standard

  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// ---------- Mot de passe oublié / réinitialisation ----------
router.post('/forgot', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  const user = await req.prisma.user.findUnique({ where: { email } });
  // Ne pas révéler si l'e‑mail existe – toujours renvoyer le même message
  if (!user) {
    return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
  }

  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

  await req.prisma.user.update({
    where: { email },
    data: { resetToken: tokenHash, resetExpires: expires }
  });

  const resetLink = `${process.env.APP_URL || `http://localhost:${process.env.PORT || 3050}`}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  const html = `Cliquez sur le lien suivant pour réinitialiser votre mot de passe :<br><a href="${resetLink}">${resetLink}</a><br>Ce lien expire dans 1 heure.`;
  const { sendEmail } = require('../lib/messaging');
  await sendEmail(email, 'Réinitialisation de votre mot de passe', html);

  res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
});

router.post('/reset', async (req, res) => {
  const { email, token, password } = req.body;
  if (!email || !token || !password) return res.status(400).json({ error: 'email, token et password requis' });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await req.prisma.user.findFirst({
    where: {
      email,
      resetToken: tokenHash,
      resetExpires: { gt: new Date() }
    }
  });
  if (!user) return res.status(400).json({ error: 'Token invalide ou expiré' });

  await req.prisma.user.update({
    where: { id: user.id },
    data: { password: hashPassword(password), resetToken: null, resetExpires: null }
  });

  res.json({ message: 'Mot de passe réinitialisé avec succès' });
});

// ---------- Authentification OAuth ----------
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login.html' }), (req, res) => {
  // Synchroniser la session Express traditionnelle
  if (req.user && req.user.id) req.session.userId = req.user.id;
  res.redirect('/dashboard.html');
});

router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login.html' }), (req, res) => {
  if (req.user && req.user.id) req.session.userId = req.user.id;
  res.redirect('/dashboard.html');
});

router.get('/airbnb', passport.authenticate('airbnb'));
router.get('/airbnb/callback', passport.authenticate('airbnb', { failureRedirect: '/login.html' }), (req, res) => {
  if (req.user && req.user.id) req.session.userId = req.user.id;
  res.redirect('/dashboard.html');
});

router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Non connecté' });
  const user = await req.prisma.user.findUnique({
    where: { id: req.session.userId },
    select: { id: true, email: true, name: true, role: true }
  });
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
  res.json(user);
});

module.exports = router;