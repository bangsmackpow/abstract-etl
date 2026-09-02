# Multi-Tenant Architecture Plan — Abstract ETL

**Status:** Implemented (2026-09-01) — schema, auth, tenant repo, route refactors, platform routes, and frontend are in place.
**Owner:** [Product/Engineering]
**Date:** 2026-08-16
**Version:** 1.0 (implemented)

---

## 1. Purpose

This document outlines the recommended direction for evolving Abstract ETL from its current single-tenant deployment into a secure **multi-tenant SaaS** architecture. It covers three areas:

1. **Tenant architecture** — how tenants are represented in the data model.
2. **Tenant sharing** — what is shared across tenants vs. isolated per tenant.
3. **Tenant security** — isolation controls, authentication, and authorization.

## 2. Decisions (confirmed)

- **What is a tenant:** a competing title abstract company, each with its own staff and confidential jobs. Hard isolation is required — cross-tenant data leakage is the worst-case failure.
- **Isolation model:** one shared database with a `tenant_id` column on every row; isolation is enforced at the application layer. This keeps schema migrations, backups, and restore as single-file operations and remains compatible with the future Cloudflare D1 (single SQLite binding) migration.
- **Sharing scope (now):** only `users` and `jobs` become tenant-scoped. `settings`, the AI extraction prompt/schema, backups, and email configuration stay globally shared.
- **Onboarding:** a platform administrator provisions tenants. Existing data migrates into a `default` tenant. No self-serve signup.

---

## 3. Tenant Architecture

### 3.1 Target data model

New **`tenants`** table:

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID (PK) | |
| `name` | TEXT (NOT NULL) | Company display name |
| `slug` | TEXT (UNIQUE) | Reserved for future subdomain/URL routing |
| `status` | TEXT | `active` \| `suspended` (default `active`) |
| `created_at` / `updated_at` | INTEGER (timestamp) | |

**Column changes to existing tables:**

- **`users`** — add `tenant_id` (FK → `tenants.id`, NOT NULL after backfill, indexed). `email` remains **globally unique** so login stays `email + password` with no tenant picker; the tenant is derived from the authenticated user.
- **`jobs`** — add `tenant_id` (FK → `tenants.id`, NOT NULL after backfill). New composite indexes: `(tenant_id, created_by)` and `(tenant_id, status)`.
- **`settings`** / **`backups`** — unchanged; remain global (platform-level).

> **Note:** SQLite has no native row-level security (unlike PostgreSQL). Isolation is therefore enforced at the application layer, which is why the query-layer discipline in §5.1 is the most important control.

### 3.2 Auth & roles

- **JWT payload** gains `tenantId` (plus an `isPlatformAdmin` flag) at login.
- **Roles** split the current global `admin` role into two concerns:

| Role | Scope | Capabilities |
| :--- | :--- | :--- |
| `abstractor` | Tenant | Work their own tenant's jobs |
| `admin` (tenant admin) | Tenant | Manage their own tenant's users, jobs, metrics |
| `is_platform_admin` (platform super-admin) | Platform | Provision/suspend tenants, global settings, backups, restore |

- The existing seeded admin account (`ADMIN_EMAIL`) becomes tenant admin of the `default` tenant **and** `is_platform_admin = true`, preserving today's operator powers.
- **Tenant suspension** is honored immediately: a suspended tenant's requests are rejected at authentication time (no JWT wait-out).

---

## 4. Tenant Sharing

| Concern | Shared across tenants | Isolated per tenant |
| :--- | :--- | :--- |
| Database | Single SQLite file (all tenants) | — |
| Users | — | Yes (tenant-scoped) |
| Jobs / abstracts | — | Yes (tenant-scoped) |
| `settings` (SMTP, backup config) | Yes (platform-managed) | — |
| AI extraction prompt / schema | Yes (global docs) | — |
| Master lists ("intelligent alternatives") | Yes (dormant today; revisit later) | — |
| Backups & restore | Yes (whole-DB, platform-admin only) | — |
| Email/SMTP | Yes (global config) | — |

**Extension path:** the schema is designed so per-tenant customization (own prompt/schema, master lists, SMTP, branding) can be layered on later via a `tenant_config` table **without a rewrite**, since `tenant_id` is already the linchpin of the model.

---

## 5. Tenant Security

### 5.1 Tenant-scoped data access layer (core control)

A thin repository layer (`tenantRepo`) becomes the **only** place routes may query `jobs` / `users`. Every call takes `tenantId` and always injects `eq(table.tenantId, tenantId)`:

- `jobRepo.list(tenantId, filters)` / `get` / `create` / `update` / `delete`
- `userRepo.listByTenant(tenantId)` / `getByTenant` / `createForTenant` / …

`tenantId` is derived **only** from the JWT (`req.tenantId`) — never from request bodies or URL params.

### 5.2 Defense-in-depth on every job/generate route

For all `GET/PATCH/DELETE /jobs/:id` and `GET /generate/:jobId/*`:

1. `eq(jobs.tenantId, req.tenantId)` in the query (repo-enforced), **and**
2. an ownership guard `record.tenantId === req.tenantId` before any further logic — returning **404** (not 403) so foreign tenant IDs never reveal existence.

### 5.3 Authorization re-scoping

| Current behavior | New behavior |
| :--- | :--- |
| `admin` sees all users/jobs globally | Tenant admin sees **only their tenant's** users/jobs/metrics |
| Global `requireAdmin` | `requireTenantAdmin` (tenant-scoped) + `requirePlatformAdmin` |
| `/api/admin/settings`, `/api/admin/backup*` | **Platform-admin only** (one tenant must not rewrite global SMTP/backup config) |
| New `/api/platform/tenants` | Platform-admin only |

### 5.4 Security checklist (acceptance criteria)

1. No query touches `jobs`/`users` outside the tenant repo (audit: grep for direct table access).
2. Cross-tenant reads by ID (jobs, generate endpoints, delete, patch) return **404** for a foreign tenant's ID.
3. Tenant admin cannot see another tenant's users, jobs, or metrics.
4. Tenant admin cannot read or modify global settings or backups (platform only).
5. Suspended tenant → all API calls rejected immediately (including fresh logins).
6. `tenant_id` is never accepted from client input.
7. The platform-admin flag can only be granted by a platform admin (and seeded via env admin).
8. Request logs include `tenantId` (no sensitive PII) for per-tenant tracing in Loki/Grafana.

---

## 6. Route Changes (concrete)

| Route | Change |
| :--- | :--- |
| `routes/auth.js` | Login includes tenant in JWT + user object |
| `routes/jobs.js` | All queries via tenant repo; `/admin/users` scoped to tenant; delete = tenant-admin + tenant-scoped |
| `routes/generate.js` | Add `tenantId` ownership guard to all four export endpoints |
| `routes/extract.js` | Jobs created with `req.user.tenantId` (via repo) |
| `routes/admin.js` | `/users`, `/metrics` → tenant-scoped. `/settings`, `/backup*` → platform-admin only |
| `routes/docs.js` | Unchanged (global) |
| **new** `routes/platform.js` | `/api/platform/tenants` — list / create / suspend / reactivate |

## 7. Platform Admin & Provisioning

- Platform admin creates a tenant (name, optional initial admin email), which seeds a tenant admin user. No self-serve.
- **Suspend over delete:** tenants are suspended rather than hard-deleted (jobs hold confidential abstract data; hard delete is destructive). A future "offboarding" flow is noted.

## 8. Backups & Restore

- Backups remain **whole-database** (one file backs up all tenants) — simplest and correct for the shared-schema model.
- `restoreBackup` is destructive to **all** tenants → platform-admin only, with an explicit confirmation in the UI.

## 9. Frontend Changes

- `services/api.js`: add platform tenant API calls.
- `hooks/useAuth.jsx`: expose `user.tenant` / `user.isPlatformAdmin`.
- `components/Navbar.jsx`: show current tenant name; **Platform** link for platform admins only.
- `pages/Admin.jsx`: add **Tenants** tab (platform admin only); user/job/metrics tabs show only the caller's tenant (server-enforced).
- `App.jsx`: platform route guard.

---

## 10. Migration & Rollout Order

1. **Schema:** add `tenants` table + nullable `tenant_id` on `users`/`jobs`; generate + commit migration; mirror `tenants` creation in startup raw SQL for fresh installs.
2. **Data migration (one-time):** seed `default` tenant → backfill existing `users`/`jobs` → set columns NOT NULL → add indexes.
3. **Auth changes:** JWT tenant claims, login tenant checks, tenant-suspension enforcement.
4. **Tenant repo + route refactors** and new platform routes.
5. **Frontend** changes.
6. **Docs:** update extraction-rules docs + agent guidelines.
7. **Validation:** run validation pipeline; cross-tenant IDOR smoke test using two tenant tokens.

---

## 11. Out of Scope / Future Extension Points

- Per-tenant customization — **per-tenant logos shipped (2026-09-01)** via `tenants.logo_blob`/`logo_mime` (tenant admin uploads via `PUT/DELETE /api/admin/logo`; generators render via `opts.logo`). Own prompt/schema, SMTP, master lists remain additive later via `tenant_config`.
- Cross-tenant platform operations — **job moves shipped (2026-09-01)**: `POST /api/platform/jobs/:id/move` reassigns `createdBy` to the destination tenant's first admin and records an `audit_log` entry; `GET /api/platform/tenants/:id/jobs` + `GET /api/platform/audit`. Cross-tenant analytics and tenant data export/offboarding remain.
- Subdomain/slug-based tenant routing (schema reserves `tenants.slug` for it).
- Database-per-tenant escape hatch remains available since `tenant_id` is the linchpin.