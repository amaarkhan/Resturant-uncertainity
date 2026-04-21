# Restaurant Uncertainty MVP

Context-aware prep planning for small restaurants, with owner-facing recommendations, admin controls, and PMF telemetry.

Current scope includes implementation up to Phase 8.

## Key Features
- Customer app for daily recommendations, outcomes logging, and trends.
- Admin panel for restaurant/menu/user management and signal weighting.
- Backend recommendation engine with OpenMeteo integration and fallback logic.
- Metrics endpoints for adoption, reliability, business outcomes, and PMF reporting.

## Repository Structure
- `apps/customer-web/`: Vite + React customer interface.
- `apps/admin-web/`: Vite + React admin interface.
- `services/api/`: Express API, Prisma schema, recommendation logic, and tests.
- `docs/`: phase docs and pilot onboarding SOPs.

## Tech Stack
- Frontend: React (Vite), Recharts.
- Backend: Node.js, Express.
- Data: Prisma + PostgreSQL (Supabase in production).
- External signals: OpenMeteo.

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Configure API environment variables.

```bash
copy services\api\.env.example services\api\.env
```

3. Set `DATABASE_URL` in `services/api/.env`.

- For Supabase: use the project Postgres connection string.
- For local Postgres: use a local PostgreSQL URL.

4. Sync schema and seed demo data.

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

## Run Locally

Run in separate terminals:

```bash
npm run dev:api
npm run dev:customer
npm run dev:admin
```

Default ports:
- API: `4000`
- Customer: `5173`
- Admin: `5174`

## Demo Credentials
- Owner: `karachi@example.com` / `owner123`
- Additional owners: `weekend@example.com` / `owner123`, `uni@example.com` / `owner123`
- Admin: `admin@example.com` / `admin123`

## Tests

```bash
npm run test
```

## Deployment (Vercel + Supabase)

1. Create a Supabase project.
2. Copy its Postgres URL into API env var `DATABASE_URL`.
3. Create three Vercel projects from this repo:
- API project root: `services/api`
- Customer project root: `apps/customer-web`
- Admin project root: `apps/admin-web`
4. Set Vercel env vars:
- API: `DATABASE_URL`, `JWT_SECRET`, `PORT=4000`
- Customer: `VITE_API_BASE=https://<your-api-domain>`
- Admin: `VITE_API_BASE=https://<your-api-domain>`
5. Run schema sync on Supabase before first production use:

```bash
npm run db:push
npm run db:seed
```

## CI/CD

GitHub Actions workflow: `.github/workflows/ci-cd.yml`

- CI uses PostgreSQL service for Prisma schema sync, tests, and builds.
- Staging and production deploy jobs trigger deploy hooks.

Optional deploy hook secrets:
- `API_STAGING_DEPLOY_HOOK`
- `CUSTOMER_STAGING_DEPLOY_HOOK`
- `ADMIN_STAGING_DEPLOY_HOOK`
- `API_PROD_DEPLOY_HOOK`
- `CUSTOMER_PROD_DEPLOY_HOOK`
- `ADMIN_PROD_DEPLOY_HOOK`
