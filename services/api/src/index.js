import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { prisma } from "./db.js";
import { auth, requireAdmin, signAccessToken } from "./auth.js";
import { generateRecommendation } from "./recommendation.js";
import { fetchContextSignals } from "./externalSignals.js";
import { buildWindowMetrics, decidePmfDirection, deltaPercent } from "./pmf.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const latencyMs = Date.now() - start;
    if (req.path.startsWith("/api/v1/")) {
      prisma.apiMetric.create({
        data: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          latencyMs
        }
      }).catch(console.error);
    }
  });
  next();
});
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

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: { menuItems: { where: { active: true }, orderBy: { name: "asc" } } }
  });

  if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
  if (restaurant.menuItems.length === 0) return res.status(400).json({ error: "No active menu items found" });

  let context;
  if (!manualContext || manualContext.sourceStatus === "auto") {
    // Phase 7: Dynamic OpenMeteo integration
    context = await fetchContextSignals(restaurant.city, date);
  } else {
    // UI provided manual overrides
    context = {
      weatherType: manualContext.weatherType || "pleasant",
      eventType: manualContext.eventType || "none",
      eventIntensity: manualContext.eventIntensity ?? 0,
      sourceStatus: "live_manual"
    };
  }

  const settings = {
    weatherEnabled: restaurant.weatherEnabled,
    eventsEnabled: restaurant.eventsEnabled,
    weatherWeight: restaurant.weatherWeight,
    eventWeight: restaurant.eventWeight
  };

  const result = generateRecommendation(restaurant.menuItems, context, settings);
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

app.get("/api/v1/recommendations/trends", auth, async (req, res) => {
  const { restaurantId } = req.query;
  if (!restaurantId) return res.status(400).json({ error: "restaurantId required" });
  if (!canAccessRestaurant(req.user, String(restaurantId))) return res.status(403).json({ error: "Unauthorized" });

  const past14Days = new Date();
  past14Days.setDate(past14Days.getDate() - 14);
  const fromDateStr = past14Days.toISOString().split("T")[0];

  const outcomes = await prisma.dailyOutcome.findMany({
    where: { restaurantId: String(restaurantId), date: { gte: fromDateStr } },
    orderBy: { date: "asc" }
  });

  const aggregateByDate = outcomes.reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = { date: curr.date, preparedQty: 0, leftoverQty: 0, stockoutCount: 0 };
    acc[curr.date].preparedQty += curr.preparedQty;
    acc[curr.date].leftoverQty += curr.leftoverQty;
    if (curr.stockout) acc[curr.date].stockoutCount += 1;
    return acc;
  }, {});

  const trends = Object.values(aggregateByDate).map(day => ({
    date: day.date,
    wastePercent: day.preparedQty ? Math.round((day.leftoverQty / day.preparedQty) * 100) : 0,
    stockoutCount: day.stockoutCount
  }));

  res.json({ trends });
});

app.get("/api/v1/admin/restaurants", auth, requireAdmin, async (req, res) => {
  const restaurants = await prisma.restaurant.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ restaurants });
});

app.post("/api/v1/admin/restaurants", auth, requireAdmin, async (req, res) => {
  const { name, city, timezone, operatingDays, weatherEnabled, eventsEnabled, weatherWeight, eventWeight } = req.body || {};
  if (!name || !city || !timezone) {
    return res.status(400).json({ error: "name, city, timezone required" });
  }

  const restaurant = await prisma.restaurant.create({
    data: { 
      name, city, timezone, 
      active: true,
      operatingDays: operatingDays || "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
      weatherEnabled: weatherEnabled ?? true,
      eventsEnabled: eventsEnabled ?? true,
      weatherWeight: weatherWeight ?? 1.0,
      eventWeight: eventWeight ?? 1.0
    }
  });

  res.status(201).json(restaurant);
});

app.patch("/api/v1/admin/restaurants/:id", auth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const data = req.body || {};
  try {
    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        name: data.name,
        city: data.city,
        timezone: data.timezone,
        operatingDays: data.operatingDays,
        weatherEnabled: data.weatherEnabled,
        eventsEnabled: data.eventsEnabled,
        weatherWeight: data.weatherWeight,
        eventWeight: data.eventWeight,
        active: data.active
      }
    });
    res.json(restaurant);
  } catch (err) {
    res.status(400).json({ error: "Failed to update restaurant" });
  }
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
  const { restaurantId, name, unit, baselinePrepQty, cost, price } = req.body || {};
  if (!restaurantId || !name || !unit || typeof baselinePrepQty !== "number") {
    return res.status(400).json({ error: "restaurantId, name, unit, baselinePrepQty required" });
  }

  const menuItem = await prisma.menuItem.create({
    data: {
      restaurantId,
      name,
      unit,
      baselinePrepQty,
      cost: Number(cost) || 0.0,
      price: Number(price) || 0.0,
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

app.get("/api/v1/admin/metrics/instrumentation", auth, requireAdmin, async (req, res) => {
  try {
    // Product Usage
    const loginCount = await prisma.apiMetric.count({ where: { path: "/api/v1/auth/login" } });
    const viewCount = await prisma.recommendationRun.count();
    const viewRate = loginCount > 0 ? Number((viewCount / loginCount * 100).toFixed(1)) : 100;

    const totalOutcomes = await prisma.dailyOutcome.count();
    const followed = await prisma.dailyOutcome.count({ where: { recommendationFollowed: true } });
    const followRate = totalOutcomes ? Number((followed / totalOutcomes * 100).toFixed(1)) : 0;

    const totalFeedback = await prisma.quickFeedback.count();
    const allOutcomes = await prisma.dailyOutcome.findMany({ select: { date: true, restaurantId: true } });
    const uniqueOutcomeDays = new Set(allOutcomes.map((o) => `${o.restaurantId}-${o.date}`)).size;
    const feedbackCompletionRate = uniqueOutcomeDays ? Number((totalFeedback / uniqueOutcomeDays * 100).toFixed(1)) : 0;

    // Reliability
    const apiMetrics = await prisma.apiMetric.findMany();
    const totalCalls = apiMetrics.length || 1;
    const successCalls = apiMetrics.filter((m) => m.statusCode < 400).length;
    const errorCalls = totalCalls - successCalls;
    const successRate = Number((successCalls / totalCalls * 100).toFixed(1));
    const errorRate = Number((errorCalls / totalCalls * 100).toFixed(1));
    const avgLatency = Number((apiMetrics.reduce((a, b) => a + b.latencyMs, 0) / totalCalls).toFixed(1));

    // Business Outcomes
    let wastePercent = 0;
    let grossMargin = 0;
    if (totalOutcomes > 0) {
      const outcomes = await prisma.dailyOutcome.findMany({ include: { restaurant: { include: { menuItems: true } } } });
      let totalPrep = 0, totalLeft = 0;
      outcomes.forEach((o) => {
        totalPrep += o.preparedQty;
        totalLeft += o.leftoverQty;
        const item = o.restaurant.menuItems.find((m) => m.id === o.menuItemId);
        if (item) {
          grossMargin += (o.soldQty * item.price) - (o.preparedQty * item.cost);
        }
      });
      wastePercent = totalPrep ? Number((totalLeft / totalPrep * 100).toFixed(1)) : 0;
    }
    const stockoutDays = await prisma.dailyOutcome.count({ where: { stockout: true } });
    const stockoutRate = totalOutcomes ? Number((stockoutDays / totalOutcomes * 100).toFixed(1)) : 0;

    // Data Quality
    const activeItemsCount = await prisma.menuItem.count({ where: { active: true } });
    const expectedOutcomes = activeItemsCount * 14; 
    const completionRate = expectedOutcomes ? Math.min(100, Number((totalOutcomes / expectedOutcomes * 100).toFixed(1))) : 0;

    const missingInputFrequency = await prisma.recommendationRun.count({
      where: { signalsUsed: { contains: `"eventType":"none"` } }
    });

    res.json({
      product: { viewRate, followRate, feedbackCompletionRate },
      reliability: { successRate, errorRate, avgLatency },
      business: { wastePercent, stockoutRate, grossMargin: Number(grossMargin.toFixed(2)) },
      dataQuality: { completionRate, missingInputFrequency }
    });
  } catch(err) {
    res.status(500).json({ error: "Failed to load telemetry" });
  }
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

app.get("/api/v1/admin/dashboard", auth, requireAdmin, async (req, res) => {
  const activeRestaurants = await prisma.restaurant.count({ where: { active: true } });
  
  const past14Days = new Date();
  past14Days.setDate(past14Days.getDate() - 14);
  const fromStr = past14Days.toISOString().split("T")[0];
  
  const recentRunsCount = await prisma.recommendationRun.count({
    where: { date: { gte: fromStr } }
  });
  
  const expectedRuns = activeRestaurants * 14;
  const usageRate = expectedRuns > 0 ? Number(((recentRunsCount / expectedRuns) * 100).toFixed(1)) : 0;
  
  const fallbackCount = await prisma.recommendationRun.count({
    where: { usedFallback: true, date: { gte: fromStr } }
  });

  res.json({ activeRestaurants, usageRate, errorCount: fallbackCount });
});

app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    level: "error",
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  }));
  res.status(500).json({ error: "Internal server error" });
});

export default app;

const isDirectRun = process.argv[1] && process.argv[1].includes("src/index.js");

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}
