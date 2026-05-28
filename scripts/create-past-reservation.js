const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Ensure a demo user exists
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'demo@example.com',
          name: 'Demo User',
          password: 'dummyhash', // not used for auth in this test
        },
      });
    }
    // Ensure a property exists
    let property = await prisma.property.findFirst();
    if (!property) {
      property = await prisma.property.create({
        data: {
          name: 'Demo Property',
          userId: user.id,
        },
      });
    }
    // Create a reservation with check‑in two days ago
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const reservation = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestName: 'John Doe',
        checkIn: twoDaysAgo,
        checkOut: new Date(twoDaysAgo.getTime() + 24 * 60 * 60 * 1000), // +1 day
        status: 'CONFIRMED',
      },
    });
    console.log('Created past reservation ID:', reservation.id);
  } catch (e) {
    console.error('Error creating past reservation:', e);
  } finally {
    await prisma.$disconnect();
  }
})();