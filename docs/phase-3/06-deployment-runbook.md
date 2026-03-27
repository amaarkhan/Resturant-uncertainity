# Deployment Runbook (Public URL Access)

## Objective
Deploy API, customer app, and admin app to publicly accessible URLs.

## Recommended Hosting (Fastest Path)
- Render Blueprint using render.yaml in repository root.

## Prerequisites
1. Push this project to a GitHub repository.
2. Create a Render account and connect GitHub.

## Step-by-Step Deployment
1. In Render, click New + and select Blueprint.
2. Select your repository and branch.
3. Render will detect render.yaml and create 3 services:
- restaurant-uncertainty-api
- restaurant-uncertainty-customer
- restaurant-uncertainty-admin
4. Set JWT_SECRET for API service before deploy.
5. Start deploy.

## Post-Deploy URLs
Expected URL pattern:
- API: https://restaurant-uncertainty-api.onrender.com
- Customer: https://restaurant-uncertainty-customer.onrender.com
- Admin: https://restaurant-uncertainty-admin.onrender.com

Use your actual generated service URLs in final report.

## First-Run API Setup
After first deploy of API service, run one-time commands in Render shell:
1. npm run db:migrate
2. npm run db:seed

## Smoke Test Checklist
1. Open API health:
- GET /health returns status ok.
2. Login from customer app with owner@example.com / owner123.
3. Generate recommendation and submit outcomes + feedback.
4. Login from admin app with admin@example.com / admin123.
5. Load metrics and verify values update.

## CI/CD Hook Setup (Optional but Recommended)
To use workflow deploy triggers, add these GitHub repo secrets:
1. API_DEPLOY_HOOK
2. CUSTOMER_DEPLOY_HOOK
3. ADMIN_DEPLOY_HOOK

Get hook URLs from each Render service settings.

## Notes for Course Demo
- SQLite is acceptable for MVP demo but not ideal for large-scale production.
- If needed later, migrate Prisma datasource to PostgreSQL for stronger persistence.
