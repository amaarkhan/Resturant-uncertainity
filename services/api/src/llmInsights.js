const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEFAULT_GROQ_MODEL,
        temperature: 0.3,
        max_tokens: 220,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const summary = trimToLength(
      ensureCityAndWeather(content, restaurant.city, context.weatherType)
    );
    return summary || null;
  } catch (error) {
    console.warn("LLM summary fallback triggered:", error?.message || error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
