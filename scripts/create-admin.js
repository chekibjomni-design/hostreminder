const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

(async () => {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  if (!email || !password) {
    console.error('⚠️ ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans .env');
    process.exit(1);
  }

  const hashed = crypto.createHash('sha256').update(password + 'hostreminder-salt').digest('hex');

  // Vérifie s’il existe déjà un utilisateur avec cet e‑mail
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Met à jour le mot de passe et le rôle si nécessaire
    await prisma.user.update({
      where: { id: existing.id },
      data: { password: hashed, role: 'ADMIN', name: existing.name || 'Super‑Admin' }
    });
    console.log(`✅ Admin existant mis à jour (ID ${existing.id})`);
  } else {
    const admin = await prisma.user.create({
      data: { email, password: hashed, name: 'Super‑Admin', role: 'ADMIN' }
    });
    console.log('✅ Super‑admin créé :', admin.id);
  }

  await prisma.$disconnect();
})();
