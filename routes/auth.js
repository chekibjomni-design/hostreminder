const express = require('express');
const router = express.Router();
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'hostreminder-salt').digest('hex');
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Champs requis: email, password, name' });

    const existing = await req.prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });

    const user = await req.prisma.user.create({
      data: { email, password: hashPassword(password), name }
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
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
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