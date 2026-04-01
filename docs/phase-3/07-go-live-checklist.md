# Go-Live Checklist

## Deployment Readiness
- [ ] Repository pushed to GitHub
- [ ] Vercel projects created for API, customer, and admin apps
- [ ] JWT_SECRET configured in Vercel API project
- [ ] Supabase DATABASE_URL configured in Vercel API project
- [ ] API schema sync executed (`npm run db:push`)
- [ ] API seed executed

## URL Verification
- [ ] API URL reachable
- [ ] Customer URL reachable
- [ ] Admin URL reachable

## Core Flow Verification
- [ ] Customer login works
- [ ] Recommendation generation works
- [ ] Outcomes submission works
- [ ] Quick feedback submission works
- [ ] Admin login works
- [ ] Admin metrics page loads

## Demo Readiness
- [ ] One normal-day scenario prepared
- [ ] One low-confidence fallback scenario prepared
- [ ] Credentials documented
- [ ] Backup screenshots prepared

## Submission Readiness
- [ ] URLs added to project report/slides
- [ ] Repository README updated with final URLs
- [ ] Rubric mapping checked against live functionality
