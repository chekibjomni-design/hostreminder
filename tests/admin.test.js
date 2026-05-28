const request = require('supertest');
const app = require('../server');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd + 'hostreminder-salt').digest('hex');
}

describe('Interface d\'administration', () => {
  let adminCookie;
  let regularCookie;
  let adminId;
  let userId;

  beforeAll(async () => {
    // Clean DB
    await prisma.message.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.property.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    // Crée un super‑admin
    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: hashPassword('adminpass'),
        name: 'SuperAdmin',
        role: 'ADMIN'
      }
    });
    adminId = admin.id;

    // Crée un utilisateur normal
    const user = await prisma.user.create({
      data: {
        email: 'user@test.com',
        password: hashPassword('userpass'),
        name: 'NormalUser',
        role: 'HOST'
      }
    });
    userId = user.id;

    // Login admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'adminpass' })
      .expect(200);
    adminCookie = adminRes.headers['set-cookie'];

    // Login regular user
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'userpass' })
      .expect(200);
    regularCookie = userRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Admin peut accéder à la page admin', async () => {
    const res = await request(app)
      .get('/admin')
      .set('Cookie', adminCookie)
      .expect(200);
    expect(res.text).toContain('Administration – HostReminder');
    expect(res.text).toContain('admin@test.com');
  });

  test('Utilisateur normal ne peut pas accéder à la page admin', async () => {
    await request(app)
      .get('/admin')
      .set('Cookie', regularCookie)
      .expect(403);
  });

  test('Admin peut changer le rôle d\'un utilisateur', async () => {
    await request(app)
      .post(`/admin/users/${userId}/role`)
      .set('Cookie', adminCookie)
      .send({ role: 'ADMIN', _csrf: 'test-csrf-token' })
      .expect(302); // redirect back to /admin

    const updated = await prisma.user.findUnique({ where: { id: userId } });
    expect(updated.role).toBe('ADMIN');
  });

  test('Admin peut supprimer un utilisateur', async () => {
    // Crée un utilisateur à supprimer
    const toDelete = await prisma.user.create({
      data: { email: 'delete@test.com', password: hashPassword('delpass'), name: 'ToDelete', role: 'HOST' }
    });
    await request(app)
      .post(`/admin/users/${toDelete.id}/delete`)
      .set('Cookie', adminCookie)
      .send({ _csrf: 'test-csrf-token' })
      .expect(302);
    const check = await prisma.user.findUnique({ where: { id: toDelete.id } });
    expect(check).toBeNull();
  });
});
