import test from "node:test";
import assert from "node:assert/strict";
import { buildWindowMetrics, decidePmfDirection, deltaPercent } from "../src/pmf.js";

test("buildWindowMetrics calculates waste, stockout and trust", () => {
  const outcomes = [
    { preparedQty: 100, leftoverQty: 10, stockout: false, recommendationFollowed: true },
    { preparedQty: 100, leftoverQty: 20, stockout: true, recommendationFollowed: false }
  ];
  const feedback = [{ confidenceRating: 4 }, { confidenceRating: 5 }];

  const metrics = buildWindowMetrics({ outcomes, feedback });
  assert.equal(metrics.wastePercent, 15);
  assert.equal(metrics.stockoutRate, 50);
  assert.equal(metrics.recommendationFollowRate, 50);
  assert.equal(metrics.trustScore, 4.5);
});

test("deltaPercent treats reductions as positive when invertDirection is true", () => {
  const wasteReduction = deltaPercent(20, 10, true);
  assert.equal(wasteReduction, 50);
});

test("decidePmfDirection returns positive when key thresholds pass", () => {
  const result = decidePmfDirection({
    wasteReduction: 12,
    stockoutReduction: 18,
    followRate: 64,
    trustScore: 4.2,
    week4Usage: 45,
    willingnessToPay: 22
  });

  assert.equal(result.decision, "PMF_DIRECTION_POSITIVE");
});
