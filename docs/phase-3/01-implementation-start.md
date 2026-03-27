# Phase 3 Implementation Start Guide

## What Is Already Scaffolded
- Customer web app: apps/customer-web
- Admin web app: apps/admin-web
- Backend API: services/api (JWT auth + Prisma)
- CI/CD workflow: .github/workflows/ci-cd.yml

## Default Local URLs
- API: http://localhost:4000
- Customer app: http://localhost:5173
- Admin app: http://localhost:5174

## Default Demo Credentials
- Owner: owner@example.com / owner123
- Admin: admin@example.com / admin123

## Start Commands
1. npm install
2. npm run db:setup
3. npm run dev:api
4. npm run dev:customer
5. npm run dev:admin

## MVP Flow You Can Demo Now
1. Customer logs in and generates recommendation.
2. Customer views confidence and item-level quantities.
3. Customer submits daily outcomes and quick feedback.
4. Admin logs in, creates restaurants/menu/users, and checks metrics.

## Immediate Next Build Tasks
1. Integrate live weather and local events APIs.
2. Add refresh tokens and password reset.
3. Add charts for waste/stockout trends.
4. Add integration tests for key API routes.
5. Configure actual host deployment URLs and secrets.
