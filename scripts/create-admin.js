const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

(async () => {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin déjà présent : ', existing.id);
    await prisma.$disconnect();
    return;
  }
  const hashed = crypto.createHash('sha256').update(password + 'hostreminder-salt').digest('hex');
  const admin = await prisma.user.create({
    data: { email, password: hashed, name: 'Super‑Admin', role: 'ADMIN' }
  });
  console.log('Super‑admin créé :', admin.id);
  await prisma.$disconnect();
})();
