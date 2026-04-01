# 🌳 Branching Strategy & CI/CD Workflow

This document outlines the Git branching strategy and deployment workflow for the MVP, ensuring a clear path from development to production.

## 🔀 Branching Model: Simplified GitHub Flow

For this MVP, we use a streamlined version of GitHub Flow optimized for speed and safety.

### 1. `main` Branch (The Source of Truth)
- **Status:** Always deployable.
- \`main\` is the default branch and represents the current state of both Staging and Production.
- Direct commits to \`main\` are allowed for trivial typos, but feature work should use feature branches.
- Pushing or merging to \`main\` aggressively triggers the automated CI/CD pipeline.

### 2. Feature Branches (`feature/*`, `fix/*`, `chore/*`)
- Created from: \`main\`
- Merged back to: \`main\` via Pull Request (PR).
- Used for all new features, bug fixes, and configuration changes.
- **Naming Convention:**
  - \`feature/add-chart-lib\`
  - \`fix/recommendation-math-bug\`

## 🔄 CI/CD Pipeline Lifecycle

Our GitHub Actions pipeline (`.github/workflows/ci-cd.yml`) automates progression through our environments.

### Phase 1: Continuous Integration (CI)
*Triggered on: PRs to `main` AND pushes to `main`*
1. **Linting:** Runs ESLint across API and both frontends. Fails if errors exist.
2. **Testing:** Runs the test suite (`npm run test`). Fails if any test breaks.
3. **Build:** Verifies that both Vite frontends and the Prisma client build successfully.

### Phase 2: Staging Deployment (CD - Staging)
*Triggered on: Push/Merge to `main` (if CI passes)*
1. **Auto-Deploy:** Automatically hits the deployment hooks for the Staging environment.
2. **Health Check:** Waits 60 seconds, then queries the `/health` endpoint of the Staging API.
3. If the health check fails, the pipeline halts, preventing Production deployment.

### Phase 3: Production Deployment (CD - Production)
*Triggered on: Completion of Staging Deployment*
1. **Manual Approval Gate:** The pipeline pauses. A designated reviewer must approve the deployment via the GitHub UI (`environment: production`).
2. **Production Deploy:** Once approved, hits the Production deployment hooks.
3. **Health Check:** Verifies the Production API `/health` endpoint is responding.

## 🛡️ Environment Protection Rules
To enforce this strategy, the repository should be configured with:
1. **Branch Protection on `main`:** Require status checks (CI tests/lint) to pass before merging.
2. **Environment Protection on `production`:** Require required reviewers (manual approval) before the `deploy-production` job executes.
