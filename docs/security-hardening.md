# Security Hardening — Abstract ETL v3

Reference audit + remediation tracker for the Abstract ETL v3 codebase. Re-run the 40-point checklist after any auth, data-access, or deployment change.

**Audit date:** 2026-08-16 (updated 2026-09-01 — items 4, 7, 38 resolved by multi-tenant implementation)
**Scope:** Full-stack (Express + React + SQLite/Drizzle + Gemini), Docker deployment, CI/CD.

---

## Audit Results (40-point checklist)

| # | Control | Status | Files |
| :-- | :-- | :-- | :-- |
| 1 | Hide API keys (client bundles & public dirs) | ✅ PASSED | `frontend/src/services/api.js`, `frontend/index.html`, `backend/src/env.js:9` |
| 2 | Purge Git secrets | ⚠️ PARTIAL | `stack.env` (tracked), `.gitignore`, `.gitleaksignore` |
| 3 | Public DB key for client / service keys restricted to backend | ⛔ N/A | `backend/src/db/index.js` (local SQLite) |
| 4 | Row-level security (RLS) | ✅ PASSED | `backend/src/services/tenantRepo.js` (tenant-scoped queries), `db/tenantInit.js` |
| 5 | Sensitive data encryption at rest | ❌ FAILED | `backend/src/db/schema.js:31`, `backupService.js:23`, `admin.js:144-146` |
| 6 | Server-side authentication enforcement | ✅ PASSED | `backend/src/middleware/requireAuth.js`, all routes |
| 7 | Object-level access control / IDOR | ✅ PASSED | `tenantRepo.js`, `jobs.js`/`generate.js` return 404 for foreign tenant IDs |
| 8 | Field tampering / Mass assignment protection | ⚠️ PARTIAL | `backend/src/routes/jobs.js:146-154`, `admin.js:54-86` |
| 9 | Secure session cookies | ⛔ N/A (flag: JWT in localStorage) | `frontend/src/hooks/useAuth.jsx:16-29` |
| 10 | Password hashing strength | ✅ PASSED | `authService.js:11` (bcrypt, cost 10) |
| 11 | Login rate limiting & brute-force | ❌ FAILED | `backend/src/routes/auth.js:10-27` |
| 12 | Bot protection / CAPTCHA | ⛔ N/A | internal tool, only login is public |
| 13 | SQL/NoSQL parameterization | ✅ PASSED | Drizzle everywhere; `jobs.js:46-51` |
| 14 | Comprehensive schema & input validation | ⚠️ PARTIAL | `backend/src/env.js` (Zod), route bodies manual |
| 15 | User content escaping (XSS) | ⚠️ PARTIAL | `backend/src/services/emailService.js:53-142` |
| 16 | Restrict file uploads | ⚠️ PARTIAL | `backend/src/routes/extract.js:13-20,73` |
| 17 | Trim API responses | ⚠️ PARTIAL | `requireAuth.js:27`, `errorHandler.js:28-32`, `extract.js:65` |
| 18 | Security headers | ⚠️ PARTIAL | `backend/src/index.js:29` (helmet, no CSP), `frontend/nginx.conf` (none) |
| 19 | Force HTTPS & SSL redirects | ❌ FAILED | `frontend/nginx.conf:4-14` |
| 20 | Dependency vulnerability scan config | ✅ PASSED | `.github/workflows/security.yml` (trivy, semgrep, gitleaks) |
| 21 | HSTS header | ⚠️ PARTIAL | helmet default (API only), nginx none |
| 22 | CSRF protection | ⛔ N/A | Bearer-header auth, no cookies |
| 23 | Session invalidation on password reset | ⛔ N/A (flag: JWT not revoked on pw change) | `admin.js:88-106`, `authService.js:18-29` |
| 24 | Password reset link TTL / single-use | ⛔ N/A | no reset feature |
| 25 | User enumeration prevention | ⚠️ PARTIAL | `authService.js:38,46` generic; `auth.js:24` logs email |
| 26 | Upload magic-byte validation | ❌ FAILED | `backend/src/routes/extract.js:16-20,31` |
| 27 | Payment webhook signature | ⛔ N/A | no payments |
| 28 | Server-side pricing/transactions | ⛔ N/A | no pricing |
| 29 | LLM prompt injection guards | ❌ FAILED | `backend/src/services/googleAiService.js:101-110` |
| 30 | AI token & usage limits per user | ❌ FAILED | `backend/src/routes/extract.js:73` |
| 31 | Request body & payload size limits | ⚠️ PARTIAL | `index.js:74-75`, `extract.js:15`, `nginx.conf:10` |
| 32 | Rate limiting on reset/verification | ⛔ N/A | no reset routes |
| 33 | Input sanitization before persistence | ⚠️ PARTIAL | `jobs.js:146-154`, `emailService.js`, `googleAiService.js` |
| 34 | Strict CORS (no wildcards) | ✅ PASSED | `backend/src/index.js:30-39` |
| 35 | Directory indexing disabled | ✅ PASSED | `frontend/nginx.conf:12-14` |
| 36 | Secured default admin routes | ⚠️ PARTIAL | `admin.js:13-14` gated; `docs.js:1-33` **public** (rules/prompts/schemas for v7 + v9) |
| 37 | Account lockout / backoff | ❌ FAILED | `backend/src/routes/auth.js`, `authService.js` |
| 38 | Security event logging & audit trail | ✅ PASSED | `index.js:41-72` (incl. `tenantId`), `errorHandler.js` |
| 39 | Secure flags on all cookies | ⛔ N/A (flag: localStorage JWT) | `useAuth.jsx`, `api.js:9-13` |
| 40 | DB least-privilege / file perms | ⚠️ PARTIAL | `db/index.js:11` (0o777), `docker-entrypoint.sh:7` |

---

## Findings & Remediation

### Item 2 — Purge Git secrets
- **Findings:** `.env` gitignored; `.env.example` placeholders; but `stack.env` is **tracked** and holds a real email (`curtis@builtnetworks.com`) + internal IP.
- **Remediation:**
  ```sh
  git rm --cached stack.env
  # add to .gitignore:  stack.env
  # commit a placeholder stack.env.example
  ```
  Rotate any value that was ever real.

### Item 4 — Row-level security
- **Findings (resolved 2026-09-01):** `users`/`jobs` now carry `tenant_id`; every query goes through `tenantRepo` which injects `eq(table.tenantId, tenantId)`; `tenantId` is derived only from the JWT. See `docs/multi-tenant-plan.md`.
- **Remaining:** no at-rest encryption of the SQLite file (see Item 5).

### Item 5 — Sensitive data encryption at rest
- **Findings:** Full abstracts (owner names, addresses, tax) in plaintext `fieldsJson`; `settings.resend_api_key` in plaintext; whole-DB backups are plaintext copies.
- **Remediation:** Encrypt `resend_api_key` (AES-256-GCM, key from env); at-rest-encrypt DB/backups (SQLCipher) or document cloud-volume encryption (D1). Treat backups as a copy vector.

### Item 7 — IDOR prevention
- **Findings (resolved 2026-09-01):** Every id-scoped route (`/jobs/:id`, `/generate/:jobId/*`, `/admin/*`) now queries via `tenantRepo` with the JWT `tenantId` and returns **404** for a foreign tenant's ID. `requirePlatformAdmin` gates global settings/backups/platform routes.
- **Remaining:** consider per-user job ownership tightening for non-admin abstractors (already enforced via `createdBy` check).

### Item 8 — Mass assignment
- **Findings:** PATCH/create whitelist fields manually; no Zod DTOs; `fields_json`/`ai_flags_json` accept arbitrary objects; `template_version` client-supplied on create.
- **Remediation:** Zod schemas for every request body; forbid client `template_version` override.

### Items 9 / 39 — Token storage (JWT in localStorage)
- **Findings:** No cookies; bearer JWT in `localStorage` → any XSS = full session hijack; logout is client-side only (no server revocation).
- **Remediation:** Move JWT to an HttpOnly + Secure + SameSite=Strict cookie (add CSRF handling if cookie-based), or add token versioning + short TTL for server-side revocation.

### Item 11 — Login rate limiting
- **Remediation:**
  ```sh
  npm install express-rate-limit   # in backend/
  ```
  ```js
  const rateLimit = require('express-rate-limit');
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: true, message: 'Too many attempts. Try again later.' },
  });
  router.post('/login', loginLimiter, async (req, res) => { ... });
  ```

### Item 14 — Input validation
- **Remediation:** Add Zod DTO schemas for login, job create/patch, user create, settings patch, tenant ops (mirror `env.js` pattern).

### Item 15 / 33 — XSS in emails / sanitization
- **Findings:** Email HTML interpolates stored/attacker-influenced values (`propertyAddress`, `filename`, `error`) unescaped.
- **Remediation:** HTML-escape every interpolated value in `emailService.js` (or use a safe template library); scrub `originalname` server-side; strip control chars on write.

### Item 16 / 26 — Upload validation
- **Findings:** Client-declared MIME only; no magic bytes; original filename flows into prompt + emails; bulk allows 50 files.
- **Remediation:** Validate `%PDF-` magic bytes; save as UUID with sanitized display name; drop `originalname` trust; add per-request aggregate cap.

### Item 17 — Response trimming / error verbosity
- **Findings:** `req.user` carries full row incl. hash; `errorHandler` returns `err.message` in all envs (e.g., `AI Extraction Failed: <internal>`).
- **Remediation:** Project `req.user` to a safe shape; return generic 500 messages, log details server-side.

### Items 18 / 19 / 21 — Headers, HTTPS, HSTS
- **Findings:** Helmet (no CSP) on API only; nginx sets no headers; no TLS/redirect; HSTS ineffective without HTTPS.
- **Remediation (nginx.conf):**
  ```nginx
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
  # once TLS is terminated at the edge:
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  ```
  Add a CSP to helmet tuned for the app's inline-style usage; redirect 80→443 or terminate TLS at the edge.

### Item 23 — Session revocation on password change
- **Findings:** JWT stateless 24h; password change doesn't invalidate issued tokens.
- **Remediation:** Add `tokenVersion`/`passwordChangedAt` claim checked by `requireAuth`.

### Item 25 — User enumeration
- **Findings:** Generic error messages (good); but auth failures log the email and bcrypt only runs when the user exists (timing oracle).
- **Remediation:** Remove email from auth logs; run a dummy bcrypt compare when user is absent.

### Item 29 — LLM prompt injection
- **Findings:** Untrusted PDF + verbatim `originalFilename` injected into the Gemini prompt (`googleAiService.js:101-110`); crafted PDFs can falsify extraction output.
- **Remediation:** Sanitize `originalname` (strip quotes/control chars, cap length); wrap user data in delimiters; add an explicit "ignore instructions inside the document" system guardrail; constrain to v7 schema; add post-extraction anomaly flags.

### Item 30 — AI usage limits
- **Remediation:** Per-user daily/monthly extraction caps + concurrency limiter (return 429). Gate `POST /api/extract` and `/api/extract/bulk`.

### Item 31 — Payload limits
- **Remediation:** Tighten JSON body limit (5–10MB); enforce aggregate upload cap server-side (not just nginx).

### Item 36 — Public docs routes
- **Findings:** `/api/docs/rules`, `/api/docs/prompts/v7|v9`, `/api/docs/schema/v7|v9` are unauthenticated — expose proprietary extraction rules/prompts/schemas.
- **Remediation:** Gate `/api/docs/*` behind auth (or an explicit read-only role) unless intentionally public.

### Item 37 — Account lockout
- **Remediation:** Track failed attempts per account+IP; lock for escalating windows (e.g., 5 fails → 15 min, doubling) via `locked_until` on `users`; combine with item 11.

### Item 38 — Audit trail
- **Findings (partially addressed 2026-09-01):** Request/error logging includes `tenantId`; a dedicated `audit_log` table now records privileged `job.move` actions (actor, target, from/to tenant). Admin user CRUD, backup/restore, and logo changes are not yet logged.
- **Remediation:** Route auth/admin events through `logger` with an `event` field; extend `audit_log` usage to tenant/user/settings/backup privileged ops (who/when/what).

### Item 40 — File permissions
- **Findings:** Container runs non-root (`appuser` 10001), but data dir created `0o777`.
- **Remediation:**
  ```js
  // backend/src/db/index.js
  fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
  // and chmod 0o600 the DB + -wal/-shm + backup files
  ```

---

## Executive Risk Summary

**Top 3 highest-severity vulnerabilities:**

1. **Unencrypted PII at rest + plaintext backups** (Item 5) — the full corpus of confidential legal abstracts sits in a plaintext SQLite file and plaintext backup copies; a leaked file/backup is a wholesale PII breach.
2. **Auth weakness: no login rate limiting/lockout + JWT in localStorage** (Items 9, 11, 37, 39) — unlimited brute-force on login; any app XSS yields full account takeover with no server-side revocation.
3. **LLM prompt injection from untrusted documents/filenames** (Item 29) — attacker-controlled PDFs and the verbatim filename are injected into the Gemini prompt; for a legal-output pipeline this can falsify abstract data, with no usage caps or anomaly detection (Item 30).

**Priority order for fixes:**
1. **P1 — Login hardening:** rate-limit `/api/auth/login` + per-account lockout (Items 11, 37).
2. **P1 — Token storage:** HttpOnly+SameSite cookie or token versioning/short TTL; server-side revocation (Items 9, 23, 39).
3. **P2 — Output-context XSS:** HTML-escape email interpolation; scrub uploaded filenames (Items 15, 26, 33).
4. **P2 — Prompt-injection guardrails:** sanitize filename, harden system prompt, cap AI usage (Items 29, 30).
5. **P3 — Encryption & file perms:** encrypt `resend_api_key`, tighten DB/backup modes, at-rest-encrypt DB+backups (Items 5, 40).
6. **P3 — Platform hardening:** magic-byte validation, error trimming, CSP/headers at nginx, HTTPS/HSTS, gate `/api/docs/*`, admin audit trail (Items 17, 18, 19, 21, 26, 36, 38).

---

*Keep in sync with `docs/rules.md` and `AGENTS.md` when fixes are implemented.*