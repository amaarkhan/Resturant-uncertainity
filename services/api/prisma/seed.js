import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.apiMetric.deleteMany();
  await prisma.quickFeedback.deleteMany();
  await prisma.dailyOutcome.deleteMany();
  await prisma.recommendationItem.deleteMany();
  await prisma.recommendationRun.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();

  const ownerHash = await bcrypt.hash("owner123", 10);
  const adminHash = await bcrypt.hash("admin123", 10);

  // 1. Karachi Kitchen (Consistent, slight weather impact)
  const r1 = await prisma.restaurant.create({
    data: {
      name: "Karachi Kitchen", city: "Karachi", timezone: "Asia/Karachi",
      operatingDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun", weatherEnabled: true, eventsEnabled: false, active: true
    }
  });

  // 2. Weekend Bites (Event-driven, strict days)
  const r2 = await prisma.restaurant.create({
    data: {
      name: "Weekend Bites", city: "Lahore", timezone: "Asia/Karachi",
      operatingDays: "Fri,Sat,Sun", weatherEnabled: true, eventsEnabled: true, eventWeight: 1.5, active: true
    }
  });

  // 3. Uni Cafe (Student-driven, exam impact)
  const r3 = await prisma.restaurant.create({
    data: {
      name: "Uni Cafe", city: "Islamabad", timezone: "Asia/Karachi",
      operatingDays: "Mon,Tue,Wed,Thu,Fri", weatherEnabled: false, eventsEnabled: true, eventWeight: 2.0, active: true
    }
  });

  // Users
  await prisma.user.createMany({
    data: [
      { fullName: "Karachi Owner", email: "karachi@example.com", passwordHash: ownerHash, role: "OWNER_MANAGER", restaurantId: r1.id },
      { fullName: "Weekend Owner", email: "weekend@example.com", passwordHash: ownerHash, role: "OWNER_MANAGER", restaurantId: r2.id },
      { fullName: "Uni Owner", email: "uni@example.com", passwordHash: ownerHash, role: "OWNER_MANAGER", restaurantId: r3.id },
      { fullName: "System Admin", email: "admin@example.com", passwordHash: adminHash, role: "ADMIN" }
    ]
  });

  // Menu Items
  await prisma.menuItem.createMany({
    data: [
      { restaurantId: r1.id, name: "Biryani", unit: "plate", baselinePrepQty: 200, cost: 3.5, price: 8.0 },
      { restaurantId: r1.id, name: "Karahi", unit: "kg", baselinePrepQty: 50, cost: 8.0, price: 15.0 },
      
      { restaurantId: r2.id, name: "Smash Burger", unit: "piece", baselinePrepQty: 300, cost: 4.0, price: 10.0 },
      { restaurantId: r2.id, name: "Fries", unit: "box", baselinePrepQty: 400, cost: 1.0, price: 4.0 },

      { restaurantId: r3.id, name: "Chai", unit: "cup", baselinePrepQty: 500, cost: 0.5, price: 2.0 },
      { restaurantId: r3.id, name: "Samosa", unit: "piece", baselinePrepQty: 300, cost: 0.2, price: 1.0 },
    ]
  });

  const restaurants = [r1, r2, r3];
  
  // Seed 21 Days of History
  for (let i = 21; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    for (const r of restaurants) {
      // Check if open
      const isOpenR2 = r.id === r2.id && [0, 5, 6].includes(dayOfWeek);
      const isOpenR3 = r.id === r3.id && [1, 2, 3, 4, 5].includes(dayOfWeek);
      
      if (r.id === r2.id && !isOpenR2) continue;
      if (r.id === r3.id && !isOpenR3) continue;

      const items = await prisma.menuItem.findMany({ where: { restaurantId: r.id } });

      // Mock event context
      let isExam = r.id === r3.id && Math.random() > 0.8;
      let isCricket = r.id === r2.id && Math.random() > 0.7;
      let isRain = Math.random() > 0.85;

      const signalsUsedStr = JSON.stringify({ 
        weatherType: isRain ? "rain" : "pleasant", 
        eventType: isExam ? "exam" : (isCricket ? "cricket" : "none") 
      });

      // Daily Recommendation Run
      await prisma.recommendationRun.create({
        data: {
          restaurantId: r.id,
          date: dateStr,
          confidenceLevel: isRain ? "Medium" : "High",
          reasonSummary: "Simulated Historical Engine Run",
          usedFallback: false,
          signalsUsed: signalsUsedStr
        }
      });

      for (const item of items) {
        let prep = item.baselinePrepQty;
        if (isExam) prep = Math.floor(prep * 1.5); // Uni cafe prep up
        if (isCricket) prep = Math.floor(prep * 1.8); // Weekend bites prep up
        if (isRain && r.id === r1.id) prep = Math.floor(prep * 0.8); // Diner down

        const stockoutRisk = Math.random();
        const isStockout = stockoutRisk > 0.85;
        let sold = isStockout ? prep : Math.floor(prep * (0.6 + Math.random() * 0.35));
        let left = prep - sold;

        await prisma.dailyOutcome.create({
          data: {
            restaurantId: r.id,
            date: dateStr,
            menuItemId: item.id,
            preparedQty: prep,
            soldQty: sold,
            leftoverQty: left,
            stockout: isStockout,
            recommendationFollowed: Math.random() > 0.3
          }
        });
      }

      // Add feedback randomly 60% of the time
      if (Math.random() > 0.4) {
        await prisma.quickFeedback.create({
          data: {
            restaurantId: r.id,
            date: dateStr,
            feedbackType: isStockout ? "stockout" : "balanced",
            confidenceRating: isStockout ? 3 : 5,
            note: "Phase 7 Seed feedback"
          }
        });
      }
    }
  }

  console.log("Phase 7 Seed Complete: Multiple archetypes generated.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
