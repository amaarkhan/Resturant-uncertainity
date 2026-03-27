# Phase 3 Technical Summary (2-3 Slides)

## Slide 1: Product Scope and Build
- Problem: prep uncertainty without historical sales data.
- Built:
  - Customer web app for daily prep recommendations.
  - Admin panel for operations and configuration.
  - API with recommendation engine, outcomes, feedback.
- Not built intentionally:
  - POS replacement
  - Accounting/inventory/staffing
  - Heavy ML model training pipeline

## Slide 2: System and Decisions
- Architecture: two web apps + one API + Prisma DB.
- Key decisions:
  - Rule-based context engine for interpretability and speed.
  - JWT auth for secure role-based access.
  - Metrics-first data model for PMF readiness.
- Trade-offs:
  - Faster build, lower complexity now.
  - Limited predictive sophistication in early stage.

## Slide 3: Risks, Limitations, and Assumptions
- Known limitations:
  - Mock signal connector still used by default.
  - Single-region, MVP-grade reliability.
- Assumptions tested:
  - Daily usage behavior
  - Recommendation usefulness
  - Trust and willingness to continue/pay
- PMF gate metrics captured:
  - Waste percent, stockout rate, retention proxy, trust score
