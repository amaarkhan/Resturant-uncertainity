/**
 * PMF Logic — Comprehensive Unit Tests
 * Covers: buildWindowMetrics, deltaPercent, decidePmfDirection with
 *         edge cases, boundary values, and all decision outcomes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildWindowMetrics, decidePmfDirection, deltaPercent } from "../services/api/src/pmf.js";

// ───────────────── buildWindowMetrics Tests ─────────────────

test("buildWindowMetrics: basic calculation correctness", () => {
  const outcomes = [
    { preparedQty: 100, leftoverQty: 10, stockout: false, recommendationFollowed: true },
    { preparedQty: 100, leftoverQty: 20, stockout: true, recommendationFollowed: false },
  ];
  const feedback = [{ confidenceRating: 4 }, { confidenceRating: 5 }];

  const m = buildWindowMetrics({ outcomes, feedback });
  assert.equal(m.outcomeCount, 2);
  assert.equal(m.feedbackCount, 2);
  assert.equal(m.wastePercent, 15);       // 30/200 = 15%
  assert.equal(m.stockoutRate, 50);        // 1/2 = 50%
  assert.equal(m.recommendationFollowRate, 50); // 1/2 = 50%
  assert.equal(m.trustScore, 4.5);
});

test("buildWindowMetrics: empty outcomes", () => {
  const m = buildWindowMetrics({ outcomes: [], feedback: [] });
  assert.equal(m.outcomeCount, 0);
  assert.equal(m.feedbackCount, 0);
  assert.equal(m.wastePercent, 0);
  assert.equal(m.stockoutRate, 0);
  assert.equal(m.recommendationFollowRate, 0);
  assert.equal(m.trustScore, 0);
});

test("buildWindowMetrics: all stockouts", () => {
  const outcomes = [
    { preparedQty: 50, leftoverQty: 0, stockout: true, recommendationFollowed: true },
    { preparedQty: 50, leftoverQty: 0, stockout: true, recommendationFollowed: true },
  ];
  const m = buildWindowMetrics({ outcomes, feedback: [] });
  assert.equal(m.stockoutRate, 100);
  assert.equal(m.wastePercent, 0);
  assert.equal(m.recommendationFollowRate, 100);
});

test("buildWindowMetrics: no stockouts, all followed", () => {
  const outcomes = [
    { preparedQty: 100, leftoverQty: 25, stockout: false, recommendationFollowed: true },
    { preparedQty: 100, leftoverQty: 25, stockout: false, recommendationFollowed: true },
  ];
  const m = buildWindowMetrics({ outcomes, feedback: [{ confidenceRating: 5 }] });
  assert.equal(m.stockoutRate, 0);
  assert.equal(m.recommendationFollowRate, 100);
  assert.equal(m.wastePercent, 25);
  assert.equal(m.trustScore, 5);
});

test("buildWindowMetrics: single outcome", () => {
  const outcomes = [
    { preparedQty: 200, leftoverQty: 50, stockout: false, recommendationFollowed: false },
  ];
  const m = buildWindowMetrics({ outcomes, feedback: [{ confidenceRating: 3 }] });
  assert.equal(m.wastePercent, 25);
  assert.equal(m.recommendationFollowRate, 0);
  assert.equal(m.trustScore, 3);
});

test("buildWindowMetrics: feedback without outcomes", () => {
  const m = buildWindowMetrics({
    outcomes: [],
    feedback: [{ confidenceRating: 1 }, { confidenceRating: 2 }, { confidenceRating: 3 }],
  });
  assert.equal(m.trustScore, 2);
  assert.equal(m.outcomeCount, 0);
});

test("buildWindowMetrics: large dataset", () => {
  const outcomes = [];
  for (let i = 0; i < 100; i++) {
    outcomes.push({
      preparedQty: 100,
      leftoverQty: 10,
      stockout: i % 10 === 0,      // 10% stockout
      recommendationFollowed: i % 4 !== 0, // 75% follow rate
    });
  }
  const feedback = [];
  for (let i = 0; i < 50; i++) {
    feedback.push({ confidenceRating: 4 });
  }

  const m = buildWindowMetrics({ outcomes, feedback });
  assert.equal(m.outcomeCount, 100);
  assert.equal(m.feedbackCount, 50);
  assert.equal(m.wastePercent, 10);
  assert.equal(m.stockoutRate, 10);
  assert.equal(m.recommendationFollowRate, 75);
  assert.equal(m.trustScore, 4);
});

// ───────────────── deltaPercent Tests ─────────────────

test("deltaPercent: positive reduction (invert)", () => {
  const result = deltaPercent(20, 10, true);
  assert.equal(result, 50); // (10-20)/20 * 100 = -50, inverted = 50
});

test("deltaPercent: positive increase (no invert)", () => {
  const result = deltaPercent(20, 30, false);
  assert.equal(result, 50); // (30-20)/20 * 100 = 50
});

test("deltaPercent: no change", () => {
  const result = deltaPercent(50, 50, true);
  assert.equal(result, 0); // (50-50)/50 * 100 = 0, inverted = -0, toFixed normalizes to 0
});

test("deltaPercent: both zero", () => {
  const result = deltaPercent(0, 0, true);
  assert.equal(result, 0);
});

test("deltaPercent: baseline zero, pilot non-zero", () => {
  const result = deltaPercent(0, 10, true);
  assert.equal(result, 100);
});

test("deltaPercent: negative improvement direction", () => {
  const result = deltaPercent(10, 20, true);
  // (20-10)/10 * 100 = 100, inverted = -100 (waste got worse)
  assert.equal(result, -100);
});

test("deltaPercent: fractional values", () => {
  const result = deltaPercent(3, 1, true);
  // (1-3)/3 * 100 = -66.67, inverted = 66.67
  assert.equal(result, 66.67);
});

// ───────────────── decidePmfDirection Tests ─────────────────

test("PMF decision: PMF_DIRECTION_POSITIVE when all thresholds met", () => {
  const result = decidePmfDirection({
    wasteReduction: 15,
    stockoutReduction: 20,
    followRate: 70,
    trustScore: 4.5,
    week4Usage: 50,
    willingnessToPay: 30,
  });
  assert.equal(result.decision, "PMF_DIRECTION_POSITIVE");
  assert.equal(result.passedCount, 6);
});

test("PMF decision: PMF_DIRECTION_POSITIVE when wasteReduction passes + 4 others", () => {
  const result = decidePmfDirection({
    wasteReduction: 12,
    stockoutReduction: 18,
    followRate: 64,
    trustScore: 4.2,
    week4Usage: 45,
    willingnessToPay: 22,
  });
  assert.equal(result.decision, "PMF_DIRECTION_POSITIVE");
  assert.equal(result.passedCount, 6);
});

test("PMF decision: PROMISING_NOT_YET_PMF when wasteReduction fails but 3 others pass", () => {
  const result = decidePmfDirection({
    wasteReduction: 5,     // fails
    stockoutReduction: 18,
    followRate: 64,
    trustScore: 4.2,
    week4Usage: 10,         // fails
    willingnessToPay: 5,    // fails
  });
  assert.equal(result.decision, "PROMISING_NOT_YET_PMF");
});

test("PMF decision: PROMISING_NOT_YET_PMF with exactly 2 checks passing", () => {
  const result = decidePmfDirection({
    wasteReduction: 5,      // fails (< 10)
    stockoutReduction: 20,  // passes
    followRate: 65,         // passes
    trustScore: 3,          // fails
    week4Usage: 10,         // fails
    willingnessToPay: 5,    // fails
  });
  assert.equal(result.decision, "PROMISING_NOT_YET_PMF");
  assert.equal(result.passedCount, 2);
});

test("PMF decision: PIVOT_NEEDED when < 2 checks pass", () => {
  const result = decidePmfDirection({
    wasteReduction: 5,
    stockoutReduction: 10,
    followRate: 50,
    trustScore: 3,
    week4Usage: 10,
    willingnessToPay: 5,
  });
  assert.equal(result.decision, "PIVOT_NEEDED");
  assert.ok(result.passedCount < 2);
});

test("PMF decision: PIVOT_NEEDED when all fail", () => {
  const result = decidePmfDirection({
    wasteReduction: 0,
    stockoutReduction: 0,
    followRate: 0,
    trustScore: 0,
    week4Usage: 0,
    willingnessToPay: 0,
  });
  assert.equal(result.decision, "PIVOT_NEEDED");
  assert.equal(result.passedCount, 0);
});

test("PMF decision: wasteReduction passes but only 3 total (not enough for POSITIVE)", () => {
  const result = decidePmfDirection({
    wasteReduction: 15,     // passes
    stockoutReduction: 20,  // passes
    followRate: 65,         // passes
    trustScore: 3,          // fails
    week4Usage: 10,         // fails
    willingnessToPay: 5,    // fails
  });
  // wasteReduction passes and passedCount = 3 (< 4), so not POSITIVE
  // passedCount >= 2, so PROMISING
  assert.equal(result.decision, "PROMISING_NOT_YET_PMF");
});

test("PMF decision: boundary values exactly at thresholds", () => {
  const result = decidePmfDirection({
    wasteReduction: 10,     // exactly at boundary
    stockoutReduction: 15,  // exactly at boundary
    followRate: 60,         // exactly at boundary
    trustScore: 4,          // exactly at boundary
    week4Usage: 40,         // exactly at boundary
    willingnessToPay: 20,   // exactly at boundary
  });
  assert.equal(result.decision, "PMF_DIRECTION_POSITIVE");
  assert.equal(result.passedCount, 6);
});

test("PMF decision: checks object has all expected keys", () => {
  const result = decidePmfDirection({
    wasteReduction: 0,
    stockoutReduction: 0,
    followRate: 0,
    trustScore: 0,
    week4Usage: 0,
    willingnessToPay: 0,
  });
  const keys = Object.keys(result.checks);
  assert.deepEqual(keys.sort(), [
    "followRate",
    "stockoutReduction",
    "trustScore",
    "wasteReduction",
    "week4Usage",
    "willingnessToPay",
  ]);
});
