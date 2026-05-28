const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const user = await prisma.user.findUnique({ where: { email: 'testreset@example.com' } });
  console.log(JSON.stringify(user, null, 2));
  await prisma.$disconnect();
})();