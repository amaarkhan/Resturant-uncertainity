import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { prisma } from "./db.js";
import { auth, requireAdmin, signAccessToken } from "./auth.js";
import { generateRecommendation } from "./recommendation.js";
import { buildWindowMetrics, decidePmfDirection, deltaPercent } from "./pmf.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

function canAccessRestaurant(user, restaurantId) {
  return user.role === "ADMIN" || user.restaurantId === restaurantId;
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    version: "0.1.0",
    uptimeSeconds: Math.round(process.uptime()),
    dbStatus: "prisma",
    externalSignalStatus: "mock"
  });
});

app.post("/api/v1/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signAccessToken({
    userId: user.id,
    role: user.role,
    restaurantId: user.restaurantId
  });

  return res.json({
    accessToken: token,
    role: user.role,
    userId: user.id,
    restaurantId: user.restaurantId
  });
});

app.post("/api/v1/recommendations/generate", auth, async (req, res) => {
  const { restaurantId, date, manualContext } = req.body || {};
  if (!restaurantId || !date) {
    return res.status(400).json({ error: "restaurantId and date are required" });
  }

  if (!canAccessRestaurant(req.user, restaurantId)) {
    return res.status(403).json({ error: "Unauthorized restaurant access" });
  }

  const menuItems = await prisma.menuItem.findMany({
    where: { restaurantId, active: true },
    orderBy: { name: "asc" }
  });

  if (menuItems.length === 0) {
    return res.status(400).json({ error: "No active menu items found" });
  }

  const context = {
    weatherType: manualContext?.weatherType || "pleasant",
    eventType: manualContext?.eventType || "none",
    eventIntensity: manualContext?.eventIntensity ?? 0,
    sourceStatus: manualContext?.sourceStatus || "live"
  };

  const result = generateRecommendation(menuItems, context);
  const run = await prisma.recommendationRun.create({
    data: {
      restaurantId,
      date,
      confidenceLevel: result.confidenceLevel,
      reasonSummary: result.reasonSummary,
      usedFallback: result.usedFallback,
      signalsUsed: JSON.stringify(context),
      items: {
        create: result.items.map((item) => ({
          menuItemId: item.menuItemId,
          itemName: item.itemName,
          baselineQty: item.baselineQty,
          recommendedQty: item.recommendedQty,
          adjustmentFactor: item.adjustmentFactor,
          reason: item.reason
        }))
      }
    },
    include: {
      items: true
    }
  });

  return res.json({
    recommendationRunId: run.id,
    confidenceLevel: run.confidenceLevel,
    reasonSummary: run.reasonSummary,
    items: run.items,
    signalsUsed: JSON.parse(run.signalsUsed),
    usedFallback: run.usedFallback
  });
});

app.post("/api/v1/outcomes/daily", auth, async (req, res) => {
  const { restaurantId, date, entries } = req.body || {};
  if (!restaurantId || !date || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: "restaurantId, date and entries are required" });
  }

  if (!canAccessRestaurant(req.user, restaurantId)) {
    return res.status(403).json({ error: "Unauthorized restaurant access" });
  }

  const saved = [];
  for (const entry of entries) {
    if (
      !entry.menuItemId ||
      typeof entry.preparedQty !== "number" ||
      typeof entry.soldQty !== "number" ||
      typeof entry.leftoverQty !== "number"
    ) {
      return res.status(400).json({ error: "Invalid outcome entry format" });
    }

    if (entry.soldQty > entry.preparedQty) {
      return res.status(400).json({ error: "soldQty cannot exceed preparedQty" });
    }

    const record = await prisma.dailyOutcome.upsert({
      where: {
        restaurantId_date_menuItemId: {
          restaurantId,
          date,
          menuItemId: entry.menuItemId
        }
      },
      create: {
        restaurantId,
        date,
        menuItemId: entry.menuItemId,
        preparedQty: entry.preparedQty,
        soldQty: entry.soldQty,
        leftoverQty: entry.leftoverQty,
        stockout: Boolean(entry.stockout),
        recommendationFollowed: Boolean(entry.recommendationFollowed)
      },
      update: {
        preparedQty: entry.preparedQty,
        soldQty: entry.soldQty,
        leftoverQty: entry.leftoverQty,
        stockout: Boolean(entry.stockout),
        recommendationFollowed: Boolean(entry.recommendationFollowed)
      }
    });

    saved.push(record.id);
  }

  return res.json({ savedCount: saved.length, ids: saved });
});

app.post("/api/v1/feedback/quick", auth, async (req, res) => {
  const { restaurantId, date, feedbackType, confidenceRating, note } = req.body || {};
  if (!restaurantId || !date || !feedbackType || typeof confidenceRating !== "number") {
    return res.status(400).json({ error: "restaurantId, date, feedbackType, confidenceRating required" });
  }

  if (!canAccessRestaurant(req.user, restaurantId)) {
    return res.status(403).json({ error: "Unauthorized restaurant access" });
  }

  const fb = await prisma.quickFeedback.create({
    data: {
      restaurantId,
      date,
      feedbackType,
      confidenceRating,
      note: note || ""
    }
  });

  return res.json({ feedbackId: fb.id });
});

app.get("/api/v1/recommendations/history", auth, async (req, res) => {
  const { restaurantId, fromDate, toDate } = req.query;
  if (!restaurantId) {
    return res.status(400).json({ error: "restaurantId query parameter is required" });
  }

  if (!canAccessRestaurant(req.user, String(restaurantId))) {
    return res.status(403).json({ error: "Unauthorized restaurant access" });
  }

  const rows = await prisma.recommendationRun.findMany({
    where: {
      restaurantId: String(restaurantId),
      ...(fromDate || toDate
        ? {
            date: {
              ...(fromDate ? { gte: String(fromDate) } : {}),
              ...(toDate ? { lte: String(toDate) } : {})
            }
          }
        : {})
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { items: true }
  });

  const runs = rows.map((row) => ({
    ...row,
    signalsUsed: JSON.parse(row.signalsUsed)
  }));

  res.json({ count: runs.length, runs });
});

app.get("/api/v1/admin/restaurants", auth, requireAdmin, async (req, res) => {
  const restaurants = await prisma.restaurant.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ restaurants });
});

app.post("/api/v1/admin/restaurants", auth, requireAdmin, async (req, res) => {
  const { name, city, timezone } = req.body || {};
  if (!name || !city || !timezone) {
    return res.status(400).json({ error: "name, city, timezone required" });
  }

  const restaurant = await prisma.restaurant.create({
    data: { name, city, timezone, active: true }
  });

  res.status(201).json(restaurant);
});

app.get("/api/v1/admin/menu-items", auth, requireAdmin, async (req, res) => {
  const { restaurantId } = req.query;

  const menuItems = await prisma.menuItem.findMany({
    where: restaurantId ? { restaurantId: String(restaurantId) } : undefined,
    orderBy: [{ restaurantId: "asc" }, { name: "asc" }]
  });

  res.json({ menuItems });
});

app.post("/api/v1/admin/menu-items", auth, requireAdmin, async (req, res) => {
  const { restaurantId, name, unit, baselinePrepQty } = req.body || {};
  if (!restaurantId || !name || !unit || typeof baselinePrepQty !== "number") {
    return res.status(400).json({ error: "restaurantId, name, unit, baselinePrepQty required" });
  }

  const menuItem = await prisma.menuItem.create({
    data: {
      restaurantId,
      name,
      unit,
      baselinePrepQty,
      active: true
    }
  });

  res.status(201).json(menuItem);
});

app.get("/api/v1/admin/users", auth, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      restaurantId: true,
      createdAt: true
    }
  });
  res.json({ users });
});

app.post("/api/v1/admin/users", auth, requireAdmin, async (req, res) => {
  const { fullName, email, password, role, restaurantId } = req.body || {};
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ error: "fullName, email, password, role required" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      role,
      restaurantId: role === "OWNER_MANAGER" ? restaurantId : null
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      restaurantId: true
    }
  });
  res.status(201).json(user);
});

app.get("/api/v1/admin/metrics/overview", auth, requireAdmin, async (req, res) => {
  const activeRestaurants = await prisma.restaurant.count({ where: { active: true } });
  const feedback = await prisma.quickFeedback.findMany({ select: { restaurantId: true, date: true } });
  const totalOutcomes = await prisma.dailyOutcome.count();
  const followed = await prisma.dailyOutcome.count({ where: { recommendationFollowed: true } });
  const recommendationFollowRate = totalOutcomes ? followed / totalOutcomes : 0;
  const feedbackCount = await prisma.quickFeedback.count();

  const outcomeAgg = await prisma.dailyOutcome.aggregate({
    _sum: {
      preparedQty: true,
      leftoverQty: true
    }
  });

  const stockoutCount = await prisma.dailyOutcome.count({ where: { stockout: true } });
  const wastePercent = outcomeAgg._sum.preparedQty
    ? Number(((outcomeAgg._sum.leftoverQty / outcomeAgg._sum.preparedQty) * 100).toFixed(2))
    : 0;
  const stockoutRate = totalOutcomes ? Number(((stockoutCount / totalOutcomes) * 100).toFixed(2)) : 0;
  const trustAgg = await prisma.quickFeedback.aggregate({ _avg: { confidenceRating: true } });
  const trustScore = Number((trustAgg._avg.confidenceRating || 0).toFixed(2));
  const dailyActiveUsers = new Set(feedback.map((f) => `${f.restaurantId}:${f.date}`)).size;

  res.json({
    activeRestaurants,
    dailyActiveUsers,
    recommendationFollowRate,
    feedbackCount,
    outcomeCount: totalOutcomes,
    wastePercent,
    stockoutRate,
    trustScore
  });
});

app.get("/api/v1/admin/metrics/pmf-report", auth, requireAdmin, async (req, res) => {
  const {
    restaurantId,
    baselineFrom,
    baselineTo,
    pilotFrom,
    pilotTo,
    week4Usage,
    willingnessToPay
  } = req.query;

  if (!baselineFrom || !baselineTo || !pilotFrom || !pilotTo) {
    return res.status(400).json({
      error: "baselineFrom, baselineTo, pilotFrom, pilotTo query params are required"
    });
  }

  const filter = (fromDate, toDate) => ({
    ...(restaurantId ? { restaurantId: String(restaurantId) } : {}),
    date: {
      gte: String(fromDate),
      lte: String(toDate)
    }
  });

  const [baselineOutcomes, baselineFeedback, pilotOutcomes, pilotFeedback] = await Promise.all([
    prisma.dailyOutcome.findMany({ where: filter(baselineFrom, baselineTo) }),
    prisma.quickFeedback.findMany({ where: filter(baselineFrom, baselineTo) }),
    prisma.dailyOutcome.findMany({ where: filter(pilotFrom, pilotTo) }),
    prisma.quickFeedback.findMany({ where: filter(pilotFrom, pilotTo) })
  ]);

  const baseline = buildWindowMetrics({ outcomes: baselineOutcomes, feedback: baselineFeedback });
  const pilot = buildWindowMetrics({ outcomes: pilotOutcomes, feedback: pilotFeedback });

  const wasteReduction = deltaPercent(baseline.wastePercent, pilot.wastePercent, true);
  const stockoutReduction = deltaPercent(baseline.stockoutRate, pilot.stockoutRate, true);
  const trustLift = deltaPercent(baseline.trustScore, pilot.trustScore, false);

  const decision = decidePmfDirection({
    wasteReduction,
    stockoutReduction,
    followRate: pilot.recommendationFollowRate,
    trustScore: pilot.trustScore,
    week4Usage: Number(week4Usage || 0),
    willingnessToPay: Number(willingnessToPay || 0)
  });

  res.json({
    windows: {
      baseline: { from: baselineFrom, to: baselineTo },
      pilot: { from: pilotFrom, to: pilotTo }
    },
    baseline,
    pilot,
    deltas: {
      wasteReduction,
      stockoutReduction,
      trustLift
    },
    externalInputs: {
      week4Usage: Number(week4Usage || 0),
      willingnessToPay: Number(willingnessToPay || 0)
    },
    decision
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
