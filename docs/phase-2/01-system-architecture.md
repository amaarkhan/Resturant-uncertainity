# Phase 2 System Architecture

## Objective
Define a simple, buildable architecture for the MVP that supports customer recommendations, admin management, metrics tracking, and live deployment.

## Architecture Style
- Modular monolith backend for speed and simplicity in MVP stage.
- Two frontend clients sharing one backend API.

## High-Level Components
1. Customer Web App
- Used by restaurant owners and kitchen managers.
- Main flow: view recommendation, submit outcomes and feedback.

2. Admin Panel
- Used by internal admin/team.
- Main flow: manage users, restaurants, menu items, and signal settings.

3. Backend API Service
- Auth and role-based access.
- Recommendation computation endpoint.
- Daily records and feedback endpoints.
- Admin CRUD endpoints.

4. Database
- Stores users, restaurants, menu items, recommendations, outcomes, and feedback.

5. External Signal Connectors
- Weather source.
- Events/holiday/exam source.
- Uses fallback defaults when external API fails.

6. Observability Layer
- Application logs.
- Request-level error tracking.
- Health endpoint for CI/CD and uptime checks.

## Recommended Stack (MVP-Friendly)
- Frontend: Next.js (App Router) for customer app and admin panel.
- Backend: Node.js with NestJS or Express.
- Database: PostgreSQL.
- ORM: Prisma.
- Auth: JWT with role claims.
- Hosting: Vercel for API and frontend, Supabase for PostgreSQL.

## Security and Access
- Roles: OWNER_MANAGER, ADMIN.
- Admin-only routes protected with role checks.
- JWT token expiry and refresh approach.
- Secrets only in environment variables.

## Core Sequence (Daily Use)
1. User logs in and selects restaurant/day context.
2. Backend fetches baseline + context signals.
3. Recommendation engine calculates item-level prep quantities.
4. User views recommendation with confidence and reasons.
5. User submits day-end outcomes and quick feedback.
6. Data is logged for MVP and PMF metrics.

## Failure and Fallback Strategy
- If weather/events unavailable, apply baseline-only recommendation and mark confidence Low.
- If invalid input, return clear validation errors.
- If recommendation service fails, return last known baseline suggestion with warning.

## Scale Boundaries (Intentional)
- Single-region deployment for MVP.
- No event streaming or microservices in Phase 2.
- No auto-scaling complexity unless pilot load requires it.

## Phase 2 Exit Criteria
- Architecture approved by team.
- Chosen stack and deployment targets confirmed.
- Failure and security strategy documented.
