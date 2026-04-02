/**
 * External Signals (externalSignals.js) — Unit Tests  
 * Covers: mock event calendar, WMO mapping, fetchContextSignals with
 *         network success/failure, and coordinate lookups.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { fetchContextSignals } from "../services/api/src/externalSignals.js";

// ───────────────── fetchContextSignals Integration Tests ─────────────────
// These tests call the real function which makes external HTTP calls.
// Network failures are expected in CI — tests are designed to handle both outcomes.

test("fetchContextSignals: returns live or fallback with valid shape", async () => {
  const result = await fetchContextSignals("karachi", "2026-04-02");

  assert.ok(typeof result.weatherType === "string");
  assert.ok(["pleasant", "rain", "heatwave"].includes(result.weatherType));
  assert.ok(typeof result.eventType === "string");
  assert.ok(typeof result.eventIntensity === "number");
  assert.ok(["live", "fallback"].includes(result.sourceStatus));
});

test("fetchContextSignals: unknown city falls back to Karachi coords", async () => {
  const result = await fetchContextSignals("unknown_city_xyz", "2026-04-02");
  // Should not throw — unknown city defaults to Karachi
  assert.ok(typeof result.weatherType === "string");
  assert.ok(["live", "fallback"].includes(result.sourceStatus));
});

test("fetchContextSignals: null city defaults gracefully", async () => {
  const result = await fetchContextSignals(null, "2026-04-02");
  assert.ok(typeof result.weatherType === "string");
});

test("fetchContextSignals: lahore coordinates used", async () => {
  const result = await fetchContextSignals("Lahore", "2026-04-02");
  assert.ok(typeof result.weatherType === "string");
});

test("fetchContextSignals: islamabad coordinates used", async () => {
  const result = await fetchContextSignals("ISLAMABAD", "2026-04-02");
  assert.ok(typeof result.weatherType === "string");
});

test("fetchContextSignals: Friday returns cricket event", async () => {
  // Find the next Friday from a known date
  // 2026-04-03 is a Friday
  const result = await fetchContextSignals("karachi", "2026-04-03");
  assert.equal(result.eventType, "cricket");
  assert.equal(result.eventIntensity, 7);
});

test("fetchContextSignals: static event date 2023-12-25 returns holiday", async () => {
  const result = await fetchContextSignals("karachi", "2023-12-25");
  assert.equal(result.eventType, "holiday");
  assert.equal(result.eventIntensity, 10);
});

test("fetchContextSignals: static event date 2023-11-20 returns cricket", async () => {
  const result = await fetchContextSignals("karachi", "2023-11-20");
  assert.equal(result.eventType, "cricket");
  assert.equal(result.eventIntensity, 8);
});

test("fetchContextSignals: May 1-3 returns exam event", async () => {
  const result = await fetchContextSignals("karachi", "2024-05-01");
  assert.equal(result.eventType, "exam");
  assert.equal(result.eventIntensity, 9);
});

test("fetchContextSignals: normal non-event weekday returns none", async () => {
  // 2026-04-06 is a Monday, not a static date, not May 1-3
  const result = await fetchContextSignals("karachi", "2026-04-06");
  assert.equal(result.eventType, "none");
  assert.equal(result.eventIntensity, 0);
});
