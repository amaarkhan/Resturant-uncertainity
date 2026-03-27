# Phase 1 Scope Lock

## Project
Context-First Demand Uncertainty Assistant for Small Pakistani Restaurants

## Phase 1 Objective
Freeze MVP scope before implementation so the team builds only what is required for Phase 3 grading and early validation.

## Problem Statement
Small restaurants in Pakistan make daily food prep decisions without reliable sales history and without systematic use of external context (weather, events, exams, holidays), causing food waste, stockouts, and financial stress.

## Target Users
- Primary: Restaurant owners and kitchen managers in Karachi, Lahore, Islamabad, and Rawalpindi.
- Secondary: Operations stakeholders affected by stockouts and waste.

## MVP In Scope (Must Build)
1. Customer-facing web app
- Daily recommendation screen for key menu items.
- Context signals shown in simple form (weather/events).
- Quick feedback actions: Ran out early / Too much left.

2. Admin panel
- Manage restaurants and users.
- Configure menu items and baseline prep quantities.
- Enable or disable context signals.

3. Recommendation engine (v1)
- Rule-based or lightweight model combining baseline + context multipliers.
- Confidence label (High/Medium/Low).
- Human-readable reason for each recommendation.

4. Data logging for validation
- Daily prep, sold, leftover, stockout, recommendation used/not used.

5. CI/CD + Deployment
- Automated build/test/deploy pipeline.
- Publicly accessible URL for demo.

## MVP Out of Scope (Do Not Build)
- Full POS replacement.
- Full inventory procurement module.
- Accounting and payroll.
- Staff scheduling.
- Advanced AI optimization requiring long historical datasets.
- Multi-country expansion features.

## Assumptions to Test in MVP
1. Users will check recommendations before prep time.
2. Recommendations will reduce waste and stockouts vs baseline.
3. Users will trust recommendations enough to keep using the system.
4. Users will show willingness to pay if value is clear.

## Non-Negotiable Constraints
- Keep workflows mobile-friendly and simple.
- No feature may be added unless tied to a Phase 1 or 2 assumption.
- Every recommendation must include uncertainty communication.

## Phase 1 Exit Criteria
- Scope in/out frozen and approved.
- Assumptions clearly listed and measurable.
- Backlog prioritized into Must/Should/Nice.
- Team alignment on what not to build.
