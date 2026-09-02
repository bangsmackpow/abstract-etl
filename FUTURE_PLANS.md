# Future Plans & Improvements

> Status review: **2026-09-01** (post multi-tenant + v9). Items marked ✅ DONE are implemented; the rest are open.

## CI/CD Pipeline

### Current State
Two GitHub Actions workflows:
- `.github/workflows/build.yml` — validate → build + push Docker images → trigger Portainer webhook → poll `/api/health`. Runs on push to `main`, **pull requests** (validate + build, no push/deploy), and `workflow_dispatch`. A `notify` job emails `ADMIN_EMAIL` on failure.
- `.github/workflows/security.yml` — gitleaks, Trivy SCA + Docker image scans, semgrep, hadolint, compose/env audits. Triggered on push to `main`, **pull requests**, weekly schedule.

### Proposed Improvements

#### ✅ 2. Cache npm Dependencies — DONE
`build.yml` uses `actions/setup-node` with `cache: 'npm'`, so `node_modules` is cached via the lockfile hash. `security.yml`'s `trivy-sca` still runs a fresh `npm ci` — low value to cache, leave as-is.

#### ✅ 4. Dependency Vulnerability Scanning — DONE
`security.yml` `trivy-sca` job runs `trivy fs --severity CRITICAL,HIGH --exit-code 1` on the repo and uploads SARIF. Runs on main + PRs + weekly.

#### ✅ 5. Docker Image Vulnerability Scanning — DONE
`security.yml` `trivy-docker-backend` / `trivy-docker-frontend` jobs build and scan both images (`--exit-code 1`) and upload SARIF.

#### ✅ 9. Frontend-Specific Linting — DONE
Root `npm run lint` runs `eslint .` with the legacy `.eslintrc.cjs`, which includes `plugin:react`, `react-hooks`, and `react-refresh` and already lints `frontend/src/**`. No separate frontend lint step needed.

#### ✅ 3. Add Pull Request Build Checks — DONE
`build.yml` now has a `pull_request:` trigger. PRs run validate + docker build + backend smoke test but do **not** push images or deploy (push/deploy are gated to `refs/heads/main`). `security.yml` already ran on PRs.

#### ✅ 6. Deploy Health Check — DONE
After the Portainer webhook fires, `build.yml` polls `https://abstract.builtnetworks.com/api/health` every 10s for up to 5 min (overridable via `HEALTH_URL` secret). Failure fails the run (and triggers the notify job).

#### ✅ 7. Failure Notifications — DONE
A `notify` job (runs when any build job fails/cancels) emails `ADMIN_EMAIL` via SMTP using `.github/scripts/notify-failure.js`. Requires `SMTP_HOST/PORT/USER/PASS/FROM` + `ADMIN_EMAIL` secrets.

#### 1. Add Tests
No test suite exists (no `npm test` script; `backend/src/test/` is empty). **Higher value now** that multi-tenant isolation (tenant-scoped repo, 404 IDOR guards, suspension), per-tenant logos, job moves, and v9 rule rendering are core behavior. Recommended first targets:
- `tenantRepo` tenant-scoping + cross-tenant 404 guards (jobs/generate/admin) + `moveJobToTenant` reassignment
- v7 vs v9 generator dispatch + per-tenant logo embedding
- JSON sanitization/fallback parse in `googleAiService`

> Note: per `AGENTS.md`, do **not** add test-gated CI steps until a framework + `npm test` script actually exist. (CI install uses `--legacy-peer-deps`.)

#### 8. Semantic Image Tags
Currently only `:latest` and `:${sha}` are pushed. Add `:vYYYYMMDD-${sha-short}` for faster rollback and traceability.

---

## Application (post multi-tenant + v9)

These arise from the multi-tenant and v9 work now shipped, and are the highest-value next steps for the product itself:

- **V9 → V7 retirement gate.** V7 remains for side-by-side testing, but no acceptance criteria exist for when to remove it. Define a checkpoint (e.g., N consecutive v9 reports reviewed clean by the client) after which V7 extraction/generators can be dropped. Until then, keep both.
- **Per-tenant configurability (beyond logo).** Per-tenant logos are shipped. Remaining extensions when a second paying tenant appears: own prompt/schema, SMTP, master lists via a `tenant_config` table — the `tenant_id` linchpin is already in place.
- **Tenant data export / offboarding.** Tenants are suspended, never hard-deleted. Add a platform-admin "export tenant data" (jobs + users → zip) so offboarding a customer is possible without a full-DB restore.
- **Tenant usage metrics / quotas.** With real tenants, add per-tenant job counts and optional extraction caps (per-tenant reporting now exists; quotas don't).
- **Time-per-status (chokepoint) metrics.** Reporting uses `processingTimeMs` percentiles + a slow-jobs list today. Adding a `status_changed_at` column to jobs would enable time-in-draft / time-in-review lag tracking — deferred per decision.
- **Multi-parcel v9 QA samples.** The v9 rules add partition-deed, multi-parcel, and update/continuation workflows. Add fictional sample packets to `docs/sample_output/` so those paths are regression-testable by hand until a test suite exists.

## Security (tracked in `docs/security-hardening.md`)

Highest-priority unresolved items from the audit (P1 first):
- **Login rate limiting + per-account lockout** (Items 11, 37) — unlimited brute-force on `/api/auth/login`.
- **Token storage** (Items 9, 23, 39) — JWT in localStorage, no server-side revocation on password change.
- **Prompt-injection guardrails** (Item 29) — sanitize uploaded filename, harden the v7/v9 system prompts, cap AI usage (Item 30).
- **Gate `/api/docs/*`** (Item 36) — currently unauthenticated; exposes the proprietary rules/prompts/schemas.
