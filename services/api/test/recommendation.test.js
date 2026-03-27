import test from "node:test";
import assert from "node:assert/strict";
import { generateRecommendation } from "../src/recommendation.js";

test("generateRecommendation raises quantities on high-intensity holiday", () => {
  const items = [{ id: "m1", name: "Biryani", baselinePrepQty: 100 }];
  const result = generateRecommendation(items, {
    weatherType: "pleasant",
    eventType: "holiday",
    eventIntensity: 1,
    sourceStatus: "live"
  });

  assert.equal(result.confidenceLevel, "High");
  assert.equal(result.items.length, 1);
  assert.ok(result.items[0].recommendedQty > 100);
});

test("generateRecommendation marks low confidence on fallback", () => {
  const items = [{ id: "m1", name: "Chai", baselinePrepQty: 50 }];
  const result = generateRecommendation(items, {
    weatherType: "rain",
    eventType: "none",
    eventIntensity: 0,
    sourceStatus: "fallback"
  });

  assert.equal(result.confidenceLevel, "Low");
  assert.equal(result.usedFallback, true);
});
