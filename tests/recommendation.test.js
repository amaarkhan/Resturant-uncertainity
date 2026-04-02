/**
 * Recommendation Engine — Comprehensive Unit Tests
 * Covers: weather multipliers, event multipliers, weight configs,
 *         confidence levels, fallback logic, edge cases, combined scenarios.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { generateRecommendation } from "../services/api/src/recommendation.js";

const menu = [
  { id: "item-1", name: "Biryani", baselinePrepQty: 100 },
  { id: "item-2", name: "Karahi", baselinePrepQty: 50 },
];

const defaultSettings = {
  weatherEnabled: true,
  eventsEnabled: true,
  weatherWeight: 1.0,
  eventWeight: 1.0,
};

// ───────────────── Weather Multiplier Tests ─────────────────

test("Weather: pleasant day boosts qty by 5%", () => {
  const ctx = { weatherType: "pleasant", eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  assert.equal(result.items[0].recommendedQty, 105);
  assert.equal(result.items[1].recommendedQty, 53); // 50 * 1.05 = 52.5 -> 53
});

test("Weather: rain reduces qty by 20%", () => {
  const ctx = { weatherType: "rain", eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  assert.equal(result.items[0].recommendedQty, 80);
  assert.equal(result.items[1].recommendedQty, 40);
});

test("Weather: heatwave reduces qty by 10%", () => {
  const ctx = { weatherType: "heatwave", eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  assert.equal(result.items[0].recommendedQty, 90);
  assert.equal(result.items[1].recommendedQty, 45);
});

test("Weather: unknown weather type defaults to 1x", () => {
  const ctx = { weatherType: "tornado", eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  assert.equal(result.items[0].recommendedQty, 100);
});

test("Weather: null weather type defaults to 1x", () => {
  const ctx = { weatherType: null, eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  assert.equal(result.items[0].recommendedQty, 100);
});

test("Weather: disabled weather ignores weather signal", () => {
  const ctx = { weatherType: "rain", eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const settings = { ...defaultSettings, weatherEnabled: false };
  const result = generateRecommendation(menu, ctx, settings);
  // Weather disabled, event none -> factor = 1.0
  assert.equal(result.items[0].recommendedQty, 100);
});

// ───────────────── Event Multiplier Tests ─────────────────

test("Event: cricket match at intensity 5", () => {
  const ctx = { weatherType: "pleasant", eventType: "cricket", eventIntensity: 5, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  // pleasant = 1.05, cricket = 1 + 0.15*5 = 1.75, factor = 1.05 * 1.75 = 1.8375 -> 1.84
  assert.equal(result.items[0].recommendedQty, 184);
});

test("Event: holiday at intensity 10", () => {
  const ctx = { weatherType: "pleasant", eventType: "holiday", eventIntensity: 10, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  // pleasant = 1.05, holiday = 1 + 0.2*10 = 3.0, factor = 1.05 * 3.0 = 3.15
  assert.equal(result.items[0].recommendedQty, 315);
});

test("Event: exam at moderate intensity 3", () => {
  const ctx = { weatherType: "pleasant", eventType: "exam", eventIntensity: 3, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  // pleasant = 1.05, exam = 1 - 0.15*3 = 0.55, factor = 1.05 * 0.55 = 0.5775 -> 0.58
  assert.equal(result.items[0].recommendedQty, 58);
});

test("Event: local_event at intensity 7", () => {
  const ctx = { weatherType: "pleasant", eventType: "local_event", eventIntensity: 7, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  // pleasant = 1.05, local_event = 1 + 0.1*7 = 1.7, factor = 1.05 * 1.7 = 1.785 -> 1.79
  assert.equal(result.items[0].recommendedQty, 179);
});

test("Event: none event returns 1x multiplier", () => {
  const ctx = { weatherType: "pleasant", eventType: "none", eventIntensity: 5, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  assert.equal(result.items[0].recommendedQty, 105);
});

test("Event: unknown event type defaults to 1x", () => {
  const ctx = { weatherType: "pleasant", eventType: "concert", eventIntensity: 5, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  assert.equal(result.items[0].recommendedQty, 105);
});

test("Event: disabled events ignores event signal", () => {
  const ctx = { weatherType: "pleasant", eventType: "cricket", eventIntensity: 10, sourceStatus: "live" };
  const settings = { ...defaultSettings, eventsEnabled: false };
  const result = generateRecommendation(menu, ctx, settings);
  // event disabled, only pleasant weather -> 105
  assert.equal(result.items[0].recommendedQty, 105);
});

// ───────────────── Weight Configuration Tests ─────────────────

test("Weight: reduced weather weight dampens rain effect", () => {
  const ctx = { weatherType: "rain", eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const settings = { ...defaultSettings, weatherWeight: 0.5 };
  // w = 1.0 + (0.8 - 1.0) * 0.5 = 0.9, qty = 100 * 0.9 = 90
  const result = generateRecommendation(menu, ctx, settings);
  assert.equal(result.items[0].recommendedQty, 90);
});

test("Weight: amplified event weight boosts cricket effect", () => {
  const ctx = { weatherType: "pleasant", eventType: "cricket", eventIntensity: 5, sourceStatus: "live" };
  const settings = { ...defaultSettings, eventWeight: 2.0 };
  // pleasant = 1.05
  // rawE = 1 + 0.15*5 = 1.75
  // e = 1.0 + (1.75 - 1.0) * 2.0 = 1.0 + 1.5 = 2.5
  // factor = 1.05 * 2.5 = 2.625 -> 2.63
  // qty = 100 * 2.63 = 263
  const result = generateRecommendation(menu, ctx, settings);
  assert.equal(result.items[0].recommendedQty, 263);
});

test("Weight: zero weather weight neutralizes weather completely", () => {
  const ctx = { weatherType: "rain", eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const settings = { ...defaultSettings, weatherWeight: 0.0 };
  // w = 1.0 + (0.8 - 1.0) * 0 = 1.0
  const result = generateRecommendation(menu, ctx, settings);
  assert.equal(result.items[0].recommendedQty, 100);
});

// ───────────────── Confidence Level Tests ─────────────────

test("Confidence: High when live signals are present", () => {
  const ctx = { weatherType: "rain", eventType: "cricket", eventIntensity: 5, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  assert.equal(result.confidenceLevel, "High");
});

test("Confidence: Medium when neither weather nor event present", () => {
  const ctx = { weatherType: null, eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  assert.equal(result.confidenceLevel, "Medium");
});

test("Confidence: Low on fallback", () => {
  const ctx = { weatherType: "pleasant", eventType: "none", eventIntensity: 0, sourceStatus: "fallback" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  assert.equal(result.confidenceLevel, "Low");
  assert.equal(result.usedFallback, true);
});

test("Confidence: both signals disabled results in Medium", () => {
  const ctx = { weatherType: "rain", eventType: "cricket", eventIntensity: 5, sourceStatus: "live" };
  const settings = { weatherEnabled: false, eventsEnabled: false, weatherWeight: 1.0, eventWeight: 1.0 };
  const result = generateRecommendation(menu, ctx, settings);
  assert.equal(result.confidenceLevel, "Medium");
});

// ───────────────── Edge Cases ─────────────────

test("Edge: extreme exam intensity produces qty >= 1 (Math.max guard)", () => {
  const ctx = { weatherType: "pleasant", eventType: "exam", eventIntensity: 10, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  for (const item of result.items) {
    assert.ok(item.recommendedQty >= 1, `qty should be >= 1, got ${item.recommendedQty}`);
  }
});

test("Edge: single menu item works correctly", () => {
  const singleMenu = [{ id: "s1", name: "Solo Item", baselinePrepQty: 10 }];
  const ctx = { weatherType: "pleasant", eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const result = generateRecommendation(singleMenu, ctx, defaultSettings);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].recommendedQty, 11); // 10 * 1.05 = 10.5 -> 11
});

test("Edge: very large baseline qty", () => {
  const largeMenu = [{ id: "l1", name: "Mass Item", baselinePrepQty: 10000 }];
  const ctx = { weatherType: "rain", eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const result = generateRecommendation(largeMenu, ctx, defaultSettings);
  assert.equal(result.items[0].recommendedQty, 8000);
});

test("Edge: baseline qty of 1", () => {
  const tinyMenu = [{ id: "t1", name: "Tiny Item", baselinePrepQty: 1 }];
  const ctx = { weatherType: "rain", eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const result = generateRecommendation(tinyMenu, ctx, defaultSettings);
  assert.equal(result.items[0].recommendedQty, 1); // 1 * 0.8 = 0.8 -> rounds to 1
});

// ───────────────── Return Shape Tests ─────────────────

test("Return shape: result contains required fields", () => {
  const ctx = { weatherType: "pleasant", eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);

  assert.ok(Array.isArray(result.items));
  assert.ok(typeof result.confidenceLevel === "string");
  assert.ok(typeof result.usedFallback === "boolean");
  assert.ok(typeof result.reasonSummary === "string");
});

test("Return shape: each item contains all required fields", () => {
  const ctx = { weatherType: "pleasant", eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);

  for (const item of result.items) {
    assert.ok(typeof item.menuItemId === "string");
    assert.ok(typeof item.itemName === "string");
    assert.ok(typeof item.baselineQty === "number");
    assert.ok(typeof item.recommendedQty === "number");
    assert.ok(typeof item.adjustmentFactor === "number");
    assert.ok(typeof item.reason === "string");
  }
});

test("Return shape: items count matches menu length", () => {
  const ctx = { weatherType: "pleasant", eventType: "none", eventIntensity: 0, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  assert.equal(result.items.length, menu.length);
});

// ───────────────── Combined Scenario Tests ─────────────────

test("Combined: rain + cricket match (competing signals)", () => {
  const ctx = { weatherType: "rain", eventType: "cricket", eventIntensity: 5, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  // rain = 0.8, cricket = 1.75, factor = 0.8 * 1.75 = 1.4
  assert.equal(result.items[0].recommendedQty, 140);
});

test("Combined: heatwave + holiday (double boost scenario)", () => {
  const ctx = { weatherType: "heatwave", eventType: "holiday", eventIntensity: 5, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  // heatwave = 0.9, holiday = 1 + 0.2*5 = 2.0, factor = 0.9 * 2.0 = 1.8
  assert.equal(result.items[0].recommendedQty, 180);
});

test("Combined: rain + exam (double drop scenario)", () => {
  const ctx = { weatherType: "rain", eventType: "exam", eventIntensity: 5, sourceStatus: "live" };
  const result = generateRecommendation(menu, ctx, defaultSettings);
  // rain = 0.8, exam = 1 - 0.15*5 = 0.25, factor = 0.8 * 0.25 = 0.2
  assert.equal(result.items[0].recommendedQty, 20);
});
