const express = require('express');
const router = express.Router();
const csurf = require('csurf');

// Middleware – seul les utilisateurs avec le rôle ADMIN sont autorisés
function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.redirect('/login.html');

  req.prisma.user.findUnique({ where: { id: req.session.userId } })
    .then(user => {
      if (user && user.role === 'ADMIN') return next();
      res.status(403).send('Accès interdit – vous n\'êtes pas administrateur');
    })
    .catch(err => {
      req.logger.error(`Admin middleware error: ${err.message}`);
      res.status(500).send('Erreur serveur');
    });
}

// Apply admin check first
router.use(requireAdmin);

// CSRF protection – désactivée en mode test pour simplifier les tests
if (process.env.NODE_ENV !== 'test') {
  const csrfProtection = csurf();
  router.use(csrfProtection);
  router.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  });
} else {
  // Fournir un token factice en environnement de test
  router.use((req, res, next) => {
    res.locals.csrfToken = 'test-csrf-token';
    next();
  });
}

// Helper pour la pagination générique
function getPagination(page, take = 10) {
  const currentPage = Math.max(parseInt(page) || 1, 1);
  const skip = (currentPage - 1) * take;
  return { take, skip, currentPage };
}

// Page d'administration (render EJS) – avec pagination et recherche
router.get('/', async (req, res) => {
  try {
    const { page = 1, search = '' } = req.query;
    const { take, skip, currentPage } = getPagination(page);

    // Filtre de recherche (email ou nom) – insensible à la casse
    const userWhere = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } }
          ]
        }
      : undefined;

    const [users, totalUsers] = await Promise.all([
      req.prisma.user.findMany({
        where: userWhere,
        skip,
        take,
        select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true, resetExpires: true, resetToken: true }
      }),
      req.prisma.user.count({ where: userWhere })
    ]);
    const totalPagesUsers = Math.ceil(totalUsers / take) || 1;

    // Réservations récentes (pas de recherche pour l’instant)
    const [reservations, totalReservations] = await Promise.all([
      req.prisma.reservation.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          guestName: true,
          checkIn: true,
          status: true,
          property: { select: { name: true } }
        }
      }),
      req.prisma.reservation.count()
    ]);
    const totalPagesReservations = Math.ceil(totalReservations / take) || 1;

    res.render('admin', {
      users,
      reservations,
      page: currentPage,
      totalPagesUsers,
      totalPagesReservations,
      search,
      csrfToken: res.locals.csrfToken
    });
  } catch (e) {
    req.logger.error(`Admin page error: ${e.message}`);
    res.status(500).send('Erreur lors du chargement de l\'admin');
  }
});

// Mise à jour du rôle d’un utilisateur
router.post('/users/:id/role', async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body; // le token est déjà validé par csurf
  if (!['ADMIN', 'HOST'].includes(role)) {
    return res.status(400).send('Rôle invalide');
  }
  try {
    await req.prisma.user.update({ where: { id: userId }, data: { role } });
    res.redirect('/admin');
  } catch (e) {
    req.logger.error(`Update role error: ${e.message}`);
    res.status(500).send('Impossible de modifier le rôle');
  }
});

// Suppression d'un utilisateur (POST)
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
