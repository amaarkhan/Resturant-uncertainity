# Restaurant Uncertainty MVP

A highly robust, context-aware preparation planning tool built for small restaurants to minimize food waste and eliminate stockouts using AI-driven external integrations.

Currently functioning up to **Phase 8 (Data, Pilot Readiness & Telemetry)**.

## 🚀 Key Features
- **Customer-Facing Kitchen Portal**: Daily smart prep recommendations, real-time context configurations (Auto-Detect Weather & Events), and 14-day history visualizations.
- **Admin Command Center**: Global menu management, restaurant signal routing (weighting/multipliers), and high-density telemetry dashboards.
- **Backend Analytics Engine**: Custom Express API orchestrating dynamic multipliers, automatically fetching OpenMeteo WMO forecasts, and tracking core business profit margins.
- **Extensive Metrics**: API reliability tracking (ms latency), usage metrics, and algorithmic fallbacks.

## 📁 Repository Structure
- `apps/customer-web/`: Vite + React UI for the Kitchen Portal.
- `apps/admin-web/`: Vite + React UI for the isolated System Administrators.
- `services/api/`: Express API backend, Prisma Schema, OpenMeteo Integrations, and Analytics Interceptors.
- `docs/pilot_onboarding/`: The official Onboarding guides for Admins and Owners testing the Pilot application.

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Recharts, Lucide Icons, Vanilla CSS (Dark/Light Design System).
- **Backend**: Node.js, Express, Prisma ORM, SQLite.
- **External Integration**: OpenMeteo (Live Forecasting & Geolocation).

## 📥 Installation

1. Clone and install dependencies:
```bash
npm install
```

2. Push the Database Schema and inject the complete multi-archetype mock histories (Phase 7):
```bash
cd services/api
npx prisma db push --force-reset
node prisma/seed.js
```

## 🚀 Running Locally

You'll need three separate terminal processes to run the full Monorepo:
1. **API Backend** (Port 4000):
```bash
cd services/api && node src/index.js
```
2. **Customer App** (Port 5173):
```bash
npm run dev:customer
```
3. **Admin Dashboard** (Port 5174):
```bash
npm run dev --workspace apps/admin-web
```

## 🔐 Demo Credentials
The Phase 7 database seed creates 3 unique restaurant scenarios (Diner, Food Truck, Student Cafe). Use the following base credentials to explore.

- **Kitchen Owner**: `karachi@example.com` / `owner123` (or `weekend@example.com` / `uni@example.com`)
- **System Admin**: `admin@example.com` / `admin123`

## 🧪 Automated Testing
Validate the internal math of the recommendation algorithm (Phases 7/8 scenarios):
```bash
cd services/api
npm run test
```

## 🚢 CI/CD (Phase 3 Outline)
Workflow file mappings are present in `.github/workflows/ci-cd.yml`.
This project is deployment-ready via custom deploy hooks, pending final cloud infrastructure assignment (E.g. Vercel + Supabase).
