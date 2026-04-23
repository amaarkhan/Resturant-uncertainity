const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const LLM_QTY_MAX_SCALE = Number(process.env.LLM_QTY_MAX_SCALE || 4);

function trimToLength(text, maxLength = 420) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}...`;
}

function weatherLabel(weatherType) {
  if (weatherType === "heatwave") return "hot";
  if (weatherType === "rain") return "rainy";
  if (weatherType === "pleasant") return "pleasant";
  return weatherType || "mixed";
}

function ensureCityAndWeather(summary, city, weatherType) {
  const base = String(summary || "").replace(/\s+/g, " ").trim();
  if (!base) return "";

  const cityText = String(city || "").trim();
  const weatherText = weatherLabel(weatherType);
  const lower = base.toLowerCase();
  const hasCity = cityText ? lower.includes(cityText.toLowerCase()) : false;
  const hasWeather = lower.includes(String(weatherText).toLowerCase()) ||
    lower.includes(String(weatherType || "").toLowerCase());

  if (hasCity && hasWeather) return base;

  const prefix = cityText
    ? `In ${cityText}, weather is expected to be ${weatherText}.`
    : `Weather is expected to be ${weatherText}.`;

  return `${prefix} ${base}`;
}

function buildMenuPreview(items) {
  return items.slice(0, 10).map((item) => ({
    name: item.itemName,
    baselineQty: item.baselineQty,
    recommendedQty: item.recommendedQty
  }));
}

function confidenceFromContext({ weatherType, eventType, usedFallback }) {
  if (usedFallback) return "Low";
  if (!weatherType && (!eventType || eventType === "none")) return "Medium";
  return "High";
}

function clampRecommendedQty(recommendedQty, baselineQty) {
  const safeBaseline = Math.max(1, Number(baselineQty) || 1);
  const maxQty = Math.max(1, Math.round(safeBaseline * LLM_QTY_MAX_SCALE));
  const parsed = Math.round(Number(recommendedQty));
  if (!Number.isFinite(parsed)) return safeBaseline;
  return Math.max(1, Math.min(maxQty, parsed));
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseJsonFromLlmContent(rawContent) {
  const raw = String(rawContent || "").trim();
  if (!raw) return null;

  const noFence = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const direct = tryParseJson(noFence);
  if (direct && typeof direct === "object") return direct;

  const firstBrace = noFence.indexOf("{");
  const lastBrace = noFence.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;

  const sliced = noFence.slice(firstBrace, lastBrace + 1);
  const parsed = tryParseJson(sliced);
  return parsed && typeof parsed === "object" ? parsed : null;
}

function normalizeLlmItems(parsed, menuItems, context, settings) {
  if (!parsed || typeof parsed !== "object") return null;
  if (!Array.isArray(parsed.items)) return null;

  const menuById = new Map(menuItems.map((item) => [item.id, item]));
  const normalizedItems = [];
  const seenIds = new Set();

  for (const row of parsed.items) {
    const id = String(row?.menuItemId || "").trim();
    if (!id || seenIds.has(id)) continue;

    const menuItem = menuById.get(id);
    if (!menuItem) continue;

    seenIds.add(id);

    const baselineQty = Number(menuItem.baselinePrepQty || 0);
    const recommendedQty = clampRecommendedQty(row.recommendedQty, baselineQty);
    const adjustmentFactor = baselineQty > 0
      ? Number((recommendedQty / baselineQty).toFixed(2))
      : 1;

    normalizedItems.push({
      menuItemId: menuItem.id,
      itemName: menuItem.name,
      baselineQty,
      recommendedQty,
      adjustmentFactor,
      reason: trimToLength(
        row.reason ||
          `LLM-adjusted based on weather (${context.weatherType || "none"}) and event (${context.eventType || "none"}).`,
        220
      )
    });
  }

  // Require at least one valid selected item, otherwise use deterministic fallback.
  if (normalizedItems.length === 0) return null;

  const usedFallback = context.sourceStatus === "fallback";
  const confidenceLevel = confidenceFromContext({
    weatherType: settings.weatherEnabled ? context.weatherType : null,
    eventType: settings.eventsEnabled ? context.eventType : null,
    usedFallback
  });

  return {
    items: normalizedItems,
    confidenceLevel,
    usedFallback,
    reasonSummary: trimToLength(
      parsed.reasonSummary ||
        "Prep quantities adjusted by LLM using active weather and event context.",
      420
    )
  };
}

async function callGroq({ apiKey, messages, temperature, maxTokens, timeoutMs = 8000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEFAULT_GROQ_MODEL,
        temperature,
        max_tokens: maxTokens,
        messages
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timer);
  }
}

export async function generateLlmItemRecommendations({ restaurant, context, settings, menuItems }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (!Array.isArray(menuItems) || menuItems.length === 0) return null;

  const payload = {
    restaurant: {
      name: restaurant.name,
      city: restaurant.city
    },
    context: {
      weatherType: context.weatherType,
      eventType: context.eventType,
      eventIntensity: context.eventIntensity,
      sourceStatus: context.sourceStatus
    },
    settings: {
      weatherEnabled: settings.weatherEnabled,
      eventsEnabled: settings.eventsEnabled,
      weatherWeight: settings.weatherWeight,
      eventWeight: settings.eventWeight
    },
    menuItems: menuItems.map((item) => ({
      menuItemId: item.id,
      itemName: item.name,
      baselineQty: item.baselinePrepQty,
      unit: item.unit
    }))
  };

  const systemPrompt = [
    "You are a restaurant demand planner.",
    "Decide prep quantity for relevant menu items using weather and event context.",
    "Return strict JSON only. No markdown, no commentary.",
    "Output format:",
    '{"reasonSummary":"string","items":[{"menuItemId":"string","recommendedQty":number,"reason":"string"}]}.',
    "Rules:",
    "- Include only items you recommend preparing today.",
    "- Omit low-likelihood items instead of listing everything.",
    "- Use only menuItemId values from the provided menu list.",
    "- recommendedQty must be an integer >= 1.",
    "- Keep recommendations practical and close to baseline unless signal strength justifies deviation.",
    "- Mention concrete weather/event rationale in item reasons."
  ].join(" ");

  const userPrompt = [
    "Generate today's prep plan JSON.",
    "Data:",
    JSON.stringify(payload)
  ].join("\n");

  try {
    const content = await callGroq({
      apiKey,
      temperature: 0.2,
      maxTokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const parsed = parseJsonFromLlmContent(content);
    const normalized = normalizeLlmItems(parsed, menuItems, context, settings);
    return normalized;
  } catch (error) {
    console.warn("LLM decision fallback triggered:", error?.message || error);
    return null;
  }
}

export async function generateLlmReasonSummary({ restaurant, context, settings, items }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const payload = {
    restaurant: {
      name: restaurant.name,
      city: restaurant.city
    },
    context: {
      weatherType: context.weatherType,
      eventType: context.eventType,
      eventIntensity: context.eventIntensity,
      sourceStatus: context.sourceStatus
    },
    settings: {
      weatherEnabled: settings.weatherEnabled,
      eventsEnabled: settings.eventsEnabled,
      weatherWeight: settings.weatherWeight,
      eventWeight: settings.eventWeight
    },
    menuPreview: buildMenuPreview(items)
  };

  const systemPrompt = [
    "You are an assistant for a restaurant prep planning app.",
    "Write a short practical recommendation for the owner (2-3 sentences, 60-90 words).",
    "The recommendation must explicitly mention both city and weather.",
    "Use the weather/event signal and only the provided menu items.",
    "Be precise, actionable, and business-focused.",
    "Do not mention model limitations or say you are an AI."
  ].join(" ");

  const userPrompt = [
    "Generate a concise recommendation summary for today.",
    "Must include city and weather in the response.",
    "Prefer mentioning categories like liquids/cold items/hot items only if relevant to listed menu names.",
    "Data:",
    JSON.stringify(payload)
  ].join("\n");

  try {
    const content = await callGroq({
      apiKey,
      temperature: 0.3,
      maxTokens: 220,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const summary = trimToLength(
      ensureCityAndWeather(content, restaurant.city, context.weatherType)
    );
    return summary || null;
  } catch (error) {
    console.warn("LLM summary fallback triggered:", error?.message || error);
    return null;
  }
}
