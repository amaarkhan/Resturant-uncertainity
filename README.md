# Restaurant Uncertainty MVP

Phase 3 MVP for context-aware prep planning in small Pakistani restaurants.

## What Is Included
- Customer-facing web app (daily recommendation, outcomes, feedback)
- Admin web panel (restaurants, users, menu items, metrics)
- Backend API (JWT auth, recommendation engine, persistence)
- Prisma database schema and seed data
- CI/CD pipeline with deploy hooks
- Phase 1/2/3 documentation and sign-off artifacts

## Prerequisites
- Node.js 20+
- npm 10+

## Install
```bash
npm install
```

## Database Setup
```bash
npm run db:setup
```

## Run Apps (Three Terminals)
```bash
npm run dev:api
npm run dev:customer
npm run dev:admin
```

Default ports:
- API: 4000
- Customer app: 5173
- Admin app: 5174

## Demo Credentials
- Owner: owner@example.com / owner123
- Admin: admin@example.com / admin123

## Build All
```bash
npm run build
```

## Run Tests
```bash
npm run test
```

## Project Structure
- apps/customer-web: customer interface
- apps/admin-web: admin panel
- services/api: backend API, Prisma schema, seed, tests
- docs: phase planning and specs

## Environment Variables
API env file: services/api/.env

Required keys:
- DATABASE_URL
- JWT_SECRET
- PORT

Template is provided in services/api/.env.example.

## CI/CD
Workflow file: .github/workflows/ci-cd.yml

Pipeline steps:
1. Install dependencies
2. Generate Prisma client
3. Run migration
4. Seed data
5. Lint, test, build
6. Trigger deployment hooks on main

Set these repository secrets to enable deploy automation:
- API_DEPLOY_HOOK
- CUSTOMER_DEPLOY_HOOK
- ADMIN_DEPLOY_HOOK

## Public URL Access
This repository is deployment-ready via deploy hooks.

Example production URLs after deployment:
- Customer: https://<customer-domain>
- Admin: https://<admin-domain>
- API: https://<api-domain>

Replace placeholders in your final submission once hosting is configured.

Detailed deployment guide:
- docs/phase-3/06-deployment-runbook.md
- docs/phase-3/07-go-live-checklist.md
