import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.quickFeedback.deleteMany();
  await prisma.dailyOutcome.deleteMany();
  await prisma.recommendationItem.deleteMany();
  await prisma.recommendationRun.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();

  const restaurant = await prisma.restaurant.create({
    data: {
      name: "Karachi Kitchen",
      city: "Karachi",
      timezone: "Asia/Karachi",
      active: true
    }
  });

  const ownerHash = await bcrypt.hash("owner123", 10);
  const adminHash = await bcrypt.hash("admin123", 10);

  await prisma.user.createMany({
    data: [
      {
        fullName: "Owner Demo",
        email: "owner@example.com",
        passwordHash: ownerHash,
        role: "OWNER_MANAGER",
        restaurantId: restaurant.id
      },
      {
        fullName: "Admin Demo",
        email: "admin@example.com",
        passwordHash: adminHash,
        role: "ADMIN"
      }
    ]
  });

  await prisma.menuItem.createMany({
    data: [
      { restaurantId: restaurant.id, name: "Biryani", unit: "plate", baselinePrepQty: 80, active: true },
      { restaurantId: restaurant.id, name: "Chicken Roll", unit: "piece", baselinePrepQty: 120, active: true },
      { restaurantId: restaurant.id, name: "Chai", unit: "cup", baselinePrepQty: 150, active: true }
    ]
  });

  console.log("Seed complete");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
