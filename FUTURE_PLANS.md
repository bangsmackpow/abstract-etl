# Future Plans & Improvements

## CI/CD Pipeline

### Current State
Single GitHub Actions workflow (`.github/workflows/build.yml`): validate → build + push Docker images → trigger Portainer webhook. Triggered only on push to `main`.

### Proposed Improvements

#### 1. Add Tests
No test suite exists. A dedicated `npm test` script should be added to the validate step so regressions are caught before deployment.

#### 2. Cache npm Dependencies
Each CI job runs `npm install` independently, wasting 30-60s per job. Use `actions/cache` to share `node_modules` between steps.

#### 3. Add Pull Request Checks
Currently only pushes to `main` trigger CI. Adding `pull_request:` triggers would catch breakage before merge. Pair with branch protection rules requiring CI to pass.

#### 4. Dependency Vulnerability Scanning
Add `npm audit` or a dedicated scanner (Socket.dev, Snyk, Trivy) to detect supply-chain issues before they reach production.

#### 5. Docker Image Vulnerability Scanning
Run `trivy` on built images to catch OS-level CVEs before pushing to ghcr.io.

#### 6. Deploy Health Check
After the Portainer webhook fires, poll `GET /api/health` (or a suitable endpoint) with retries and a timeout. If unhealthy, rollback the image tag or notify.

#### 7. Failure Notifications
Post build/deploy failures to Slack, Discord, or email so the team knows immediately without checking Actions manually.

#### 8. Semantic Image Tags
Currently only `:latest` and `:${sha}` are pushed. Add `:vYYYYMMDD-${sha-short}` for faster rollback and traceability.

#### 9. Frontend-Specific Linting
The root-level `npm run lint` may not cover frontend-specific rules. Ensure frontend ESLint runs independently in the validate step.
