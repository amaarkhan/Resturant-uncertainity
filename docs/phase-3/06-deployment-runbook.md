# Deployment Runbook (Public URL Access)

## Objective
Deploy API, customer app, and admin app to publicly accessible URLs.

## Recommended Hosting (Fastest Path)
- Vercel for all three apps and Supabase PostgreSQL for data.

## Prerequisites
1. Push this project to a GitHub repository.
2. Create Vercel and Supabase accounts.

## Step-by-Step Deployment
1. In Supabase, create a new project.
2. Copy the Postgres connection string and set it as `DATABASE_URL` for the API.
3. In Vercel, create three projects from this repository with these root directories:
- `services/api`
- `apps/customer-web`
- `apps/admin-web`
4. Configure API env vars in Vercel:
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT=4000`
5. Configure web env vars in Vercel:
- Customer: `VITE_API_BASE=https://<api-domain>`
- Admin: `VITE_API_BASE=https://<api-domain>`
6. Deploy all three projects.

## Post-Deploy URLs
Expected URL pattern:
- API: https://<api-project>.vercel.app
- Customer: https://<customer-project>.vercel.app
- Admin: https://<admin-project>.vercel.app

Use your actual generated service URLs in final report.

## First-Run API Setup
Run one-time commands against Supabase before pilot kickoff:
1. npm run db:push
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
1. API_STAGING_DEPLOY_HOOK
2. CUSTOMER_STAGING_DEPLOY_HOOK
3. ADMIN_STAGING_DEPLOY_HOOK
4. API_PROD_DEPLOY_HOOK
5. CUSTOMER_PROD_DEPLOY_HOOK
6. ADMIN_PROD_DEPLOY_HOOK

Use Vercel deploy hook URLs from each Vercel project.

## Notes for Course Demo
- Supabase provides persistent PostgreSQL for pilot-grade data stability.
- Keep API and web URLs documented in README and slides before submission.
