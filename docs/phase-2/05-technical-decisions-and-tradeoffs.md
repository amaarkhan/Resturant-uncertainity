# Phase 2 Technical Decisions and Trade-Offs

## Objective
Justify engineering choices based on MVP goals, speed, and validation requirements.

## Decision 1: Rule-Based Recommendation Engine First
Choice
- Use baseline prep + context multipliers in MVP.

Why
- Works without historical sales data.
- Easy to explain and debug for trust building.

Trade-Off
- Lower ceiling than advanced ML, but faster and safer for early validation.

## Decision 2: Modular Monolith Backend
Choice
- Single backend service with clear internal modules.

Why
- Faster development and simpler deployment for student MVP.

Trade-Off
- Less scalable than microservices at very high traffic.

## Decision 3: Two Frontends, One API
Choice
- Customer app and admin panel separated at UI level, shared backend.

Why
- Cleaner role separation while minimizing backend duplication.

Trade-Off
- Slightly more frontend work, but clearer demo and access control.

## Decision 4: Postgres + ORM
Choice
- PostgreSQL and Prisma.

Why
- Reliable relational model and rapid schema iteration.

Trade-Off
- Requires schema discipline and migration handling.

## Decision 5: Confidence and Fallback Exposure
Choice
- Always show confidence level and fallback usage.

Why
- Required for trust and transparent limitation handling.

Trade-Off
- May reduce perceived certainty, but increases credibility.

## Decision 6: CI/CD from Early Stage
Choice
- Add automated lint/test/build/deploy early.

Why
- Reduces demo-day failures and supports stable iteration.

Trade-Off
- Initial setup time cost, repaid by reduced integration risk.

## Explicitly Not Building in Phase 2
- Advanced model training pipelines.
- Real-time event streaming architecture.
- Deep analytics dashboards beyond MVP metrics.

## Phase 2 Exit Criteria
- Every major technical choice has written rationale and trade-off.
- Non-goals documented to prevent overengineering.
