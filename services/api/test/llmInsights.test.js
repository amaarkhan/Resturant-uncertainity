import test from "node:test";
import assert from "node:assert/strict";
import { generateLlmItemRecommendations } from "../src/llmInsights.js";

const menuItems = [
  { id: "m1", name: "Biryani", baselinePrepQty: 100, unit: "plate" },
  { id: "m2", name: "Lassi", baselinePrepQty: 40, unit: "glass" }
];

const context = {
  weatherType: "rain",
  eventType: "cricket",
  eventIntensity: 6,
  sourceStatus: "live"
};

const settings = {
  weatherEnabled: true,
  eventsEnabled: true,
  weatherWeight: 1,
  eventWeight: 1
};

test("LLM decision: returns null when GROQ_API_KEY is missing", async () => {
  const originalKey = process.env.GROQ_API_KEY;
  try {
    delete process.env.GROQ_API_KEY;

    const result = await generateLlmItemRecommendations({
      restaurant: { name: "Demo", city: "Karachi" },
      context,
      settings,
      menuItems
    });

    assert.equal(result, null);
  } finally {
    if (typeof originalKey === "undefined") delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
  }
});

test("LLM decision: parses and normalizes valid JSON response", async () => {
  const originalKey = process.env.GROQ_API_KEY;
  const originalFetch = global.fetch;

  try {
    process.env.GROQ_API_KEY = "test-key";
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reasonSummary: "Rain with match-day traffic favors mains and drinks.",
                items: [
                  { menuItemId: "m1", recommendedQty: 140, reason: "Cricket demand bump." },
                  { menuItemId: "m2", recommendedQty: 1000, reason: "High beverage demand." }
                ]
              })
            }
          }
        ]
      })
    });

    const result = await generateLlmItemRecommendations({
      restaurant: { name: "Demo", city: "Karachi" },
      context,
      settings,
      menuItems
    });

    assert.ok(result);
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].menuItemId, "m1");
    assert.equal(result.items[0].recommendedQty, 140);

    // Clamped by default max scale (baseline 40 * 4 = 160)
    assert.equal(result.items[1].recommendedQty, 160);
    assert.equal(result.usedFallback, false);
    assert.equal(result.confidenceLevel, "High");
  } finally {
    if (typeof originalKey === "undefined") delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
    global.fetch = originalFetch;
  }
});

test("LLM decision: accepts subset of menu items", async () => {
  const originalKey = process.env.GROQ_API_KEY;
  const originalFetch = global.fetch;

  try {
    process.env.GROQ_API_KEY = "test-key";
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reasonSummary: "Focused prep list for likely demand",
                items: [{ menuItemId: "m1", recommendedQty: 120, reason: "Only one item" }]
              })
            }
          }
        ]
      })
    });

    const result = await generateLlmItemRecommendations({
      restaurant: { name: "Demo", city: "Karachi" },
      context,
      settings,
      menuItems
    });

    assert.ok(result);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].menuItemId, "m1");
    assert.equal(result.items[0].recommendedQty, 120);
  } finally {
    if (typeof originalKey === "undefined") delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
    global.fetch = originalFetch;
  }
});

test("LLM decision: ignores unknown IDs and keeps valid shortlist", async () => {
  const originalKey = process.env.GROQ_API_KEY;
  const originalFetch = global.fetch;

  try {
    process.env.GROQ_API_KEY = "test-key";
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reasonSummary: "One valid and one hallucinated item",
                items: [
                  { menuItemId: "unknown-id", recommendedQty: 99, reason: "Invalid" },
                  { menuItemId: "m2", recommendedQty: 60, reason: "Valid drink item" }
                ]
              })
            }
          }
        ]
      })
    });

    const result = await generateLlmItemRecommendations({
      restaurant: { name: "Demo", city: "Karachi" },
      context,
      settings,
      menuItems
    });

    assert.ok(result);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].menuItemId, "m2");
    assert.equal(result.items[0].recommendedQty, 60);
  } finally {
    if (typeof originalKey === "undefined") delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
    global.fetch = originalFetch;
  }
});
