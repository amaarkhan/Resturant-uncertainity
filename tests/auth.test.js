/**
 * Auth Module — Unit Tests
 * Covers: token signing, token verification (via auth middleware),
 *         missing/invalid tokens, admin role check.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { signAccessToken, auth, requireAdmin } from "../services/api/src/auth.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// ───────────────── signAccessToken Tests ─────────────────

test("signAccessToken: produces a valid JWT string", () => {
  const token = signAccessToken({ userId: "u1", role: "ADMIN", restaurantId: null });
  assert.ok(typeof token === "string");
  assert.ok(token.split(".").length === 3, "Token should have 3 parts (JWT format)");
});

test("signAccessToken: payload is embedded correctly", () => {
  const payload = { userId: "u1", role: "OWNER_MANAGER", restaurantId: "r1" };
  const token = signAccessToken(payload);
  const decoded = jwt.verify(token, JWT_SECRET);
  assert.equal(decoded.userId, "u1");
  assert.equal(decoded.role, "OWNER_MANAGER");
  assert.equal(decoded.restaurantId, "r1");
});

test("signAccessToken: token has expiry set", () => {
  const token = signAccessToken({ userId: "u1" });
  const decoded = jwt.verify(token, JWT_SECRET);
  assert.ok(decoded.exp, "Token should have an expiry claim");
  assert.ok(decoded.exp > Math.floor(Date.now() / 1000), "Expiry should be in the future");
});

// ───────────────── auth middleware Tests ─────────────────

function mockReq(authHeader) {
  return {
    header: (name) => {
      if (name.toLowerCase() === "authorization") return authHeader;
      return "";
    },
  };
}

function mockRes() {
  let statusCode = 200;
  let body = null;
  return {
    status(code) { statusCode = code; return this; },
    json(data) { body = data; return this; },
    get statusCode() { return statusCode; },
    get body() { return body; },
  };
}

test("auth middleware: accepts valid bearer token", () => {
  const token = signAccessToken({ userId: "u1", role: "ADMIN" });
  const req = mockReq(`Bearer ${token}`);
  const res = mockRes();
  let nextCalled = false;

  auth(req, res, () => { nextCalled = true; });

  assert.ok(nextCalled, "next() should be called");
  assert.equal(req.user.userId, "u1");
  assert.equal(req.user.role, "ADMIN");
});

test("auth middleware: rejects missing token", () => {
  const req = mockReq("");
  const res = mockRes();
  let nextCalled = false;

  auth(req, res, () => { nextCalled = true; });

  assert.ok(!nextCalled);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Missing bearer token");
});

test("auth middleware: rejects null authorization header", () => {
  const req = mockReq(null);
  const res = mockRes();
  let nextCalled = false;

  auth(req, res, () => { nextCalled = true; });

  assert.ok(!nextCalled);
  assert.equal(res.statusCode, 401);
});

test("auth middleware: rejects invalid token", () => {
  const req = mockReq("Bearer invalid.garbage.token");
  const res = mockRes();
  let nextCalled = false;

  auth(req, res, () => { nextCalled = true; });

  assert.ok(!nextCalled);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Invalid or expired token");
});

test("auth middleware: rejects token without Bearer prefix", () => {
  const token = signAccessToken({ userId: "u1" });
  const req = mockReq(token); // no "Bearer " prefix
  const res = mockRes();
  let nextCalled = false;

  auth(req, res, () => { nextCalled = true; });

  assert.ok(!nextCalled);
  assert.equal(res.statusCode, 401);
});

test("auth middleware: rejects expired token", () => {
  // Create a token that's already expired
  const token = jwt.sign({ userId: "u1" }, JWT_SECRET, { expiresIn: "0s" });
  const req = mockReq(`Bearer ${token}`);
  const res = mockRes();
  let nextCalled = false;

  // Small delay to ensure expiry
  setTimeout(() => {
    auth(req, res, () => { nextCalled = true; });
    assert.ok(!nextCalled);
    assert.equal(res.statusCode, 401);
  }, 100);
});

// ───────────────── requireAdmin middleware Tests ─────────────────

test("requireAdmin: allows ADMIN role", () => {
  const req = { user: { role: "ADMIN" } };
  const res = mockRes();
  let nextCalled = false;

  requireAdmin(req, res, () => { nextCalled = true; });

  assert.ok(nextCalled);
});

test("requireAdmin: blocks OWNER_MANAGER role", () => {
  const req = { user: { role: "OWNER_MANAGER" } };
  const res = mockRes();
  let nextCalled = false;

  requireAdmin(req, res, () => { nextCalled = true; });

  assert.ok(!nextCalled);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, "Admin role required.");
});

test("requireAdmin: blocks unknown role", () => {
  const req = { user: { role: "VIEWER" } };
  const res = mockRes();
  let nextCalled = false;

  requireAdmin(req, res, () => { nextCalled = true; });

  assert.ok(!nextCalled);
  assert.equal(res.statusCode, 403);
});
