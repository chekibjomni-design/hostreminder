const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    // Ensure a user and a property exist
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'demo@example.com',
          name: 'Demo User',
          password: 'dummyhash',
        },
      });
    }
    let property = await prisma.property.findFirst();
    if (!property) {
      property = await prisma.property.create({
        data: {
          name: 'Demo Property',
          userId: user.id,
        },
      });
    }
    const reservation = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestName: 'John Doe',
        checkIn: new Date(),
        checkOut: new Date(Date.now() + 86400000), // +1 day
        status: 'CONFIRMED',
      },
    });
    console.log('Created reservation ID:', reservation.id);
  } catch (e) {
    console.error('Error creating reservation', e);
  } finally {
    await prisma.$disconnect();
  }
})();