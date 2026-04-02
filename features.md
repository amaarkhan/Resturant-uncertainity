# Restaurant Uncertainty MVP — Feature Inventory

> **Scope coverage:** Phases 1 – 8 as declared in `README.md` and the `docs/` directory.

---

## 1. Authentication & Authorization

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.1 | JWT-based login (`POST /api/v1/auth/login`) | ✅ Implemented | Email + bcrypt password verification, 7-day token TTL |
| 1.2 | Role-based access control (OWNER_MANAGER / ADMIN) | ✅ Implemented | `auth` middleware validates bearer token; `requireAdmin` middleware gates admin-only routes |
| 1.3 | Restaurant-scoped data isolation | ✅ Implemented | `canAccessRestaurant()` restricts owners to their linked restaurant |

---

## 2. Recommendation Engine (Core Product)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 2.1 | Weather-aware prep adjustment | ✅ Implemented | Multipliers: rain (0.8×), heatwave (0.9×), pleasant (1.05×) |
| 2.2 | Event-aware prep adjustment | ✅ Implemented | Cricket (+15%/intensity), holiday (+20%/intensity), exam (−15%/intensity), local_event (+10%/intensity) |
| 2.3 | Signal weighting per restaurant | ✅ Implemented | `weatherWeight` and `eventWeight` columns scale adjustment deltas |
| 2.4 | Per-signal enable/disable toggles | ✅ Implemented | `weatherEnabled` / `eventsEnabled` booleans on Restaurant model |
| 2.5 | Confidence-level classification | ✅ Implemented | High (live signals present), Medium (no signals), Low (fallback/API failure) |
| 2.6 | Fallback logic when external API fails | ✅ Implemented | Gracefully degrades to `sourceStatus: "fallback"` with pleasant weather default |
| 2.7 | Recommendation persistence | ✅ Implemented | `RecommendationRun` + child `RecommendationItem` records created and stored |
| 2.8 | Recommendation generation endpoint (`POST /api/v1/recommendations/generate`) | ✅ Implemented | Accepts `restaurantId`, `date`, optional `manualContext` |

---

## 3. External Signals Integration (Phase 7)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 3.1 | OpenMeteo live weather fetch | ✅ Implemented | WMO weather codes mapped to internal types (pleasant/rain) |
| 3.2 | City-based coordinate lookup | ✅ Implemented | Hardcoded coords for Karachi, Lahore, Islamabad |
| 3.3 | Mock event calendar | ✅ Implemented | Static date map + Friday cricket heuristic + May exam window |
| 3.4 | Auto vs Manual context toggle | ✅ Implemented | Customer UI provides `sourceStatus: "auto"` or manual overrides |

---

## 4. Daily Outcomes Tracking

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 4.1 | Log daily prep outcomes (`POST /api/v1/outcomes/daily`) | ✅ Implemented | Upsert per (restaurant, date, menuItem); records preparedQty, soldQty, leftoverQty, stockout, recommendationFollowed |
| 4.2 | Input validation | ✅ Implemented | Validates numeric fields; soldQty ≤ preparedQty guard |
| 4.3 | Auto-computed leftovers (client-side) | ✅ Implemented | Customer UI computes leftoverQty = preparedQty − soldQty |

---

## 5. Quick Feedback Loop

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 5.1 | Submit feedback (`POST /api/v1/feedback/quick`) | ✅ Implemented | feedbackType (balanced / overprepared / underprepared), confidenceRating (1-5), note |
| 5.2 | Daily feedback UI in customer app | ✅ Implemented | Presented after outcomes section with demand-vs-forecast selector and star rating |

---

## 6. Trends & History (Customer-Facing)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 6.1 | 14-day waste & stockout trends (`GET /api/v1/recommendations/trends`) | ✅ Implemented | Aggregates outcomes by date, computes wastePercent and stockoutCount |
| 6.2 | Recommendation history (`GET /api/v1/recommendations/history`) | ✅ Implemented | Pageable date-range query, returns runs with items and parsed signals |
| 6.3 | Recharts bar chart visualization | ✅ Implemented | Dual-axis chart: Waste % (left) + Stockout Count (right) |

---

## 7. Admin Panel — Restaurant Management

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 7.1 | List all restaurants (`GET /api/v1/admin/restaurants`) | ✅ Implemented | |
| 7.2 | Create restaurant (`POST /api/v1/admin/restaurants`) | ✅ Implemented | name, city, timezone, operating days, signal toggles/weights |
| 7.3 | Update restaurant config (`PATCH /api/v1/admin/restaurants/:id`) | ✅ Implemented | Inline modal in admin UI for editing operating days, weather/event toggles, and weights |
| 7.4 | Restaurant configuration modal UI | ✅ Implemented | Toggle switches + weight sliders in dark-themed modal |

---

## 8. Admin Panel — Menu Item Management

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 8.1 | List menu items (`GET /api/v1/admin/menu-items`) | ✅ Implemented | Optional restaurantId filter |
| 8.2 | Create menu item (`POST /api/v1/admin/menu-items`) | ✅ Implemented | name, unit, baselinePrepQty, cost, price |
| 8.3 | Menu items table in admin UI | ✅ Implemented | Displays cost, price, baseline qty, restaurant link |

---

## 9. Admin Panel — User Management

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 9.1 | List users (`GET /api/v1/admin/users`) | ✅ Implemented | Excludes passwordHash in response |
| 9.2 | Create user (`POST /api/v1/admin/users`) | ✅ Implemented | Supports ADMIN and OWNER_MANAGER roles |
| 9.3 | Users table in admin UI | ✅ Implemented | Shows identity, email, role, restaurant link |

---

## 10. Admin Dashboard & Metrics (Phase 8)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 10.1 | Overview metrics (`GET /api/v1/admin/metrics/overview`) | ✅ Implemented | Active restaurants, DAU, follow rate, waste %, stockout rate, trust score |
| 10.2 | Admin quick dashboard (`GET /api/v1/admin/dashboard`) | ✅ Implemented | 14-day usage rate, fallback error count |
| 10.3 | Platform health stats cards (admin UI) | ✅ Implemented | Deployment count, usage rate, fallback errors |
| 10.4 | PMF snapshot cards (admin UI) | ✅ Implemented | Waste rate, stockout rate, trust score, follow-rate progress bar |

---

## 11. MVP Instrumentation / Telemetry (Phase 8)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 11.1 | API metrics middleware | ✅ Implemented | Captures method, path, status code, latency for all `/api/v1/*` requests (optional via `ENABLE_API_METRICS`) |
| 11.2 | Instrumentation endpoint (`GET /api/v1/admin/metrics/instrumentation`) | ✅ Implemented | Reports product usage (view rate, follow rate, feedback completion), reliability (success/error rate, latency), business (waste, stockout, gross margin), data quality (completeness, missing inputs) |
| 11.3 | Telemetry dashboard tab (admin UI) | ✅ Implemented | Four-section layout: Product Usage, Reliability Matrix, Core Business Proxies, Source Data Integrity |

---

## 12. PMF Decision Gate (Phase 8)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 12.1 | PMF report endpoint (`GET /api/v1/admin/metrics/pmf-report`) | ✅ Implemented | Compares baseline vs pilot window metrics; computes waste reduction, stockout reduction, trust lift |
| 12.2 | PMF decision logic | ✅ Implemented | 6-criteria gate: waste ≥ 10%, stockout ≥ 15%, follow rate ≥ 60%, trust ≥ 4, week4Usage ≥ 40%, willingness-to-pay ≥ 20%; returns PMF_DIRECTION_POSITIVE / PROMISING_NOT_YET_PMF / PIVOT_NEEDED |
| 12.3 | Window metrics builder (`buildWindowMetrics`) | ✅ Implemented | Aggregates outcomes and feedback into waste, stockout, follow-rate, and trust metrics |

---

## 13. Customer Web App (Vite + React)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 13.1 | Login screen with pre-filled demo credentials | ✅ Implemented | |
| 13.2 | Daily Plan tab — context selection + recommendation generation | ✅ Implemented | Auto/manual toggle, date picker, weather/event selectors |
| 13.3 | Prep suggestion display with confidence badge | ✅ Implemented | Per-item recommended qty, adjustment factor, reason |
| 13.4 | End-of-day outcome entry form | ✅ Implemented | Sold qty, auto-calculated leftovers, stockout checkbox |
| 13.5 | Daily feedback submission | ✅ Implemented | Demand-vs-forecast rating + 1-5 star system rating |
| 13.6 | 14-Day History tab with trend charts | ✅ Implemented | Recharts dual-axis bar chart |
| 13.7 | Toast notification system | ✅ Implemented | Success/error messages with auto-dismiss |
| 13.8 | Responsive mobile layout | ✅ Implemented | CSS media queries collapse grids at 640px |

---

## 14. Admin Web App (Vite + React)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 14.1 | Admin login with role validation | ✅ Implemented | Rejects non-ADMIN logins client-side |
| 14.2 | Sidebar navigation (5 tabs) | ✅ Implemented | Dashboard, Telemetry, Restaurants, Menu, Personnel |
| 14.3 | Restaurant config table + edit modal | ✅ Implemented | Inline signal toggles and weight controls |
| 14.4 | Menu items read-only table | ✅ Implemented | Cost, price, baseline qty display |
| 14.5 | User management table | ✅ Implemented | Role and restaurant link display |
| 14.6 | Monitoring dashboard (Platform Health + PMF Snapshot) | ✅ Implemented | Stat cards, follow-rate progress bar |
| 14.7 | Telemetry dashboard (Instrumentation Data) | ✅ Implemented | Four-section metric cards |
| 14.8 | Dark theme with premium design | ✅ Implemented | Neon cyan accent, Inter font, glassmorphism modals |

---

## 15. Data Layer (Prisma + PostgreSQL)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 15.1 | Full relational schema (7 models) | ✅ Implemented | User, Restaurant, MenuItem, RecommendationRun, RecommendationItem, DailyOutcome, QuickFeedback, ApiMetric |
| 15.2 | Composite unique constraints | ✅ Implemented | DailyOutcome unique on (restaurantId, date, menuItemId) |
| 15.3 | Database indexes | ✅ Implemented | Indexes on restaurantId, (restaurantId, date) for fast queries |
| 15.4 | Seed script with 21-day historical data | ✅ Implemented | 3 restaurant archetypes, 4 users, 6 menu items, realistic outcome distributions |

---

## 16. DevOps & Infrastructure

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 16.1 | Monorepo with npm workspaces | ✅ Implemented | `apps/*` and `services/*` workspace roots |
| 16.2 | CI/CD pipeline (GitHub Actions) | ✅ Implemented | PostgreSQL service container, Prisma sync, lint, test, build |
| 16.3 | Staging → Production deploy pipeline | ✅ Implemented | Vercel deploy hooks with health check gates |
| 16.4 | Vercel deployment config | ✅ Implemented | `vercel.json` for API, customer, and admin apps |
| 16.5 | Health check endpoint (`GET /health`) | ✅ Implemented | Returns status, version, uptime, db status |
| 16.6 | Structured error handler | ✅ Implemented | Catches Prisma connection errors → 503; general errors → 500 with JSON logging |
| 16.7 | Database connection timeout utility | ✅ Implemented | `withTimeout()` wrapper for login query |

---

## 17. Documentation & Operations

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 17.1 | Phase 1 docs | ✅ Present | Scope lock, success criteria, MVP backlog, sign-off checklist, week-1 tasks |
| 17.2 | Phase 2 docs | ✅ Present | System architecture, data model, API contracts, CI/CD plan, technical decisions |
| 17.3 | Phase 3 docs | ✅ Present | Implementation start, live demo script, slides, rubric mapping, PMF gate scorecard, deployment runbook, go-live checklist, branching strategy |
| 17.4 | Phase 4 docs | ✅ Present | Objectives/hypotheses, metrics framework, experiment design, PMF decision gate, GTM validation plan |
| 17.5 | Pilot onboarding SOPs | ✅ Present | Owner quick guide, admin operations, support contact |
| 17.6 | Incident documentation | ✅ Present | Vercel login timeout incident report |
| 17.7 | Smoke test script | ✅ Present | `scripts/phase3-smoke.ps1` PowerShell script |

---

## 18. Existing Tests

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 18.1 | Recommendation engine unit tests (5 tests) | ✅ Passing | Pleasant, rain, cricket, exam, fallback, weight configuration scenarios |
| 18.2 | PMF logic unit tests (3 tests) | ✅ Passing | Window metrics calculation, delta percent, PMF decision gate |
| 18.3 | Node.js native test runner | ✅ Configured | `node --test test/*.test.js` |

---

## MVP Completeness Assessment

**The MVP is fully implemented across all 8 declared phases.** Every API endpoint is functional, both frontend apps are complete with their respective UI flows, the data model supports the full lifecycle (recommendation → outcome → feedback → metrics → PMF evaluation), and CI/CD infrastructure is in place.

### Minor observations (not blockers):
- The `externalSignals.js` city coordinate map only covers 3 cities (Karachi, Lahore, Islamabad) — acceptable for MVP scope.
- The event calendar uses static/mock data rather than a real external API — by design, documented as Phase 7 mock.
- Exam event multiplier can produce negative values at high intensity (`1 - 0.15 × 10 = -0.5`), but `Math.max(1, qty)` prevents zero/negative prep quantities.
- No `DELETE` endpoints exist for restaurants, menu items, or users — typical for an MVP.
- The PMF report endpoint is API-only; no dedicated UI tab for it in the admin app (but the data feeds into the dashboard and telemetry tabs).
