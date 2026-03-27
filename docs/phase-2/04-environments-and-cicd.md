# Phase 2 Environments and CI/CD Plan

## Objective
Define deployment environments, pipeline stages, and release controls for reliable MVP delivery.

## Environments
1. Development
- Purpose: local coding and quick iteration.
- Data: local seed data.

2. Staging
- Purpose: integration testing and demo rehearsal.
- Data: realistic synthetic pilot-like data.

3. Production
- Purpose: live pilot and final demo URL.
- Data: controlled real pilot data.

## Required Environment Variables
- DATABASE_URL
- JWT_SECRET
- REFRESH_TOKEN_SECRET
- WEATHER_API_KEY
- EVENTS_API_KEY
- APP_BASE_URL
- ADMIN_BASE_URL

## CI Pipeline (On Pull Request)
1. Install dependencies
2. Run lint
3. Run unit tests
4. Build frontend and backend
5. Upload test and build artifacts

## CD Pipeline
1. Merge to main triggers staging deploy.
2. Smoke tests run against staging.
3. Manual approval gate for production deploy.
4. Production deploy executes.
5. Post-deploy health check required.

## Rollback Strategy
- Keep previous production artifact/version.
- One-click rollback if health check fails or error rate spikes.

## Monitoring and Alerts
- Track API error rate, latency, and downtime.
- Daily check for failed signal source calls.
- Alert when error rate exceeds threshold.

## Minimal Reliability SLOs for MVP
- API uptime: 99 percent during pilot window.
- Recommendation endpoint success rate: at least 98 percent.
- Median recommendation response time: below 1200 ms.

## Phase 2 Exit Criteria
- CI/CD pipeline design approved.
- Environment variable inventory finalized.
- Rollback and health checks documented.
