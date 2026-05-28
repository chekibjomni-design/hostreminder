const express = require('express');
const router = express.Router();

// Middleware – seul un utilisateur avec le rôle ADMIN ou HOST (si vous décidez) peut accéder
function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.redirect('/login.html');
  // Utilise la session pour récupérer le rôle
  req.prisma.user.findUnique({ where: { id: req.session.userId } })
    .then(user => {
      if (user && user.role === 'ADMIN') return next();
      // Sinon, renvoie 403
      res.status(403).send('Accès interdit – vous n\'êtes pas administrateur');
    })
    .catch(err => {
      req.logger.error(`Admin middleware error: ${err.message}`);
      res.status(500).send('Erreur serveur');
    });
}

router.use(requireAdmin);

// Page d'administration (render EJS)
router.get('/', async (req, res) => {
  try {
    const users = await req.prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } });
    const reservations = await req.prisma.reservation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, guestName: true, checkIn: true, status: true, property: { select: { name: true } } }
    });
    res.render('admin', { users, reservations });
  } catch (e) {
    req.logger.error(`Admin page error: ${e.message}`);
    res.status(500).send('Erreur lors du chargement de l\'admin');
  }
});

// Suppression d'un utilisateur (POST pour éviter GET brut)
router.post('/users/:id/delete', async (req, res) => {
  const userId = req.params.id;
  try {
    await req.prisma.user.delete({ where: { id: userId } });
    res.redirect('/admin');
  } catch (e) {
    req.logger.error(`Delete user error: ${e.message}`);
    res.status(500).send('Impossible de supprimer l\'utilisateur');
  }
});

module.exports = router;
