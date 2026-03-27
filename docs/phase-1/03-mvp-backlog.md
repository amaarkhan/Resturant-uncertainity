# Phase 1 Prioritized MVP Backlog

## Must Have (Build First)
1. Authentication and role access
- Owner/Kitchen user login
- Admin login and role checks

2. Customer recommendation flow
- Select date and menu context
- View item-level prep recommendations
- View confidence and reasoning
- Submit day-end feedback

3. Admin management flow
- Create/edit restaurant
- Add/edit menu items and baseline quantities
- Manage users and roles
- Configure signal toggles

4. Core backend APIs
- Recommendation generation endpoint
- Feedback submission endpoint
- Daily outcome logging endpoint
- Admin CRUD endpoints

5. Data inputs and fallback
- Weather signal integration
- Event/holiday signal integration
- Graceful fallback when signal unavailable

6. CI/CD and deployment
- Build and test pipeline
- Staging and production deployment
- Public URL availability

7. Basic analytics capture
- Recommendation viewed
- Recommendation followed
- Feedback submitted
- Stockout and leftover logged

## Should Have (After Must Have)
1. Recommendation history view (last 7-14 days)
2. Admin dashboard with usage summary
3. CSV export for pilot analysis
4. Basic alert for low confidence days

## Nice to Have (Only if Time Allows)
1. Multilingual labels (English/Urdu)
2. Restaurant benchmarking view
3. Advanced what-if simulation

## Task Ownership Template
- Product: Scope discipline and rubric alignment
- Backend: APIs, recommendation logic, data model
- Frontend: Customer app and admin panel UI
- DevOps: CI/CD, deployment, monitoring
- Data/QA: Metrics validation and pilot quality checks

## Definition of Done for Each Task
1. Functional behavior implemented
2. Basic tests pass
3. Error states handled
4. Logging added for metrics
5. Documented in README or endpoint docs
