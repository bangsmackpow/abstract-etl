# Abstract ETL v3 — Rules & Documentation

> This document is the single source of truth for extraction rules, output formatting, and system behavior. Every rule change or major feature must be reflected here.

---

## V9 Extraction Rules (REVISION 9 — Enhanced Report)

### Overview
V9 (REVISION 9 rules) is the current extraction/formatting contract, defined by `docs/v9/v9_rules.md`. It supersedes the prior V7 rules. Tax information is captured in the JSON but rendered within ORDER INFORMATION (not as a standalone section). Chain of Title follows **PDF packet order** (not newest→oldest); only actual deeds are numbered and supporting instruments (WILL, LOH, REA, PROBATE, POA, plats, satisfied DOTs) appear as starred full-width entries. Names Searched is restricted to the direct subject chain and title-relevant heirs.

### Section Order
1. ORDER INFORMATION (tax info captured in JSON, rendered within this section)
2. CHAIN OF TITLE
3. MORTGAGES / DEEDS OF TRUST
4. JUDGMENTS / LIENS
5. MISCELLANEOUS DOCUMENTS
6. LEGAL DESCRIPTION
7. ADDITIONAL INFORMATION
8. NAMES SEARCHED

### V9-Specific Rules
- **PDF DOCUMENT ACCOUNTING**: Every page or page range is accounted for in `additional_information.document_accounting`. Unrelated instruments sharing a packet page get NO chain/misc/Additional Information block — acknowledged only in PDF DOCUMENT ACCOUNTING.
- **CLIENT / ORDER**: Single combined field containing company name, order case numbers, and reference numbers.
- **EFFECTIVE DATE**: ALWAYS included as a row in ORDER INFORMATION (blank or NOT SHOWN when not found). No COMPLETED DATE row.
- **VERIFICATION NOTES**: Only for material conflicts requiring verification, rendered as a VERIFICATION NOTES block after ORDER INFORMATION.
- **TAX INFORMATION**: Captured in `tax_information` JSON object. Rendered within ORDER INFORMATION in output. Do NOT repeat assessment figures already in ORDER INFORMATION. Use tax-ticket figures over assessor card when they conflict. Delinquent tax shows the actual amount owed (not yes/no). `TURNED OVER TO TAX` → report only `TURNED OVER TO TACS`.
- **CHAIN OF TITLE ORDER**: Follows the PDF packet order. Only actual deeds/conveyances are numbered `(1), (2), (3)`; supporting instruments between deeds (wills, probate, LOH, POA, satisfied DOTs, plats) are starred (`entry_type: SUPPORTING`).
- **NO IN/OUT SALE FIELD**: Chain of Title entries do not include an IN/OUT SALE field.
- **MANDATORY FIELDS**: Every actual deed must include a visible CONSIDERATION and RECORDED/RECORDING DATE field (blank only if unfound after full review — never omit the field). Every deed of trust must include a visible MIN field and MATURITY immediately after AMOUNT (NOT SHOWN when absent).
- **CONSIDERATION**: Must come from the operative consideration clause in the deed body, not from a cover sheet, index, tax stamp, or assessor record.
- **DEED TITLES**: Named from the operative granting/warranty language (GENERAL WARRANTY DEED, SPECIAL WARRANTY DEED, QUITCLAIM DEED, DEED OF GIFT, PARTITION DEED, TRUSTEE'S DEED, etc.).
- **EXACT RECORDED NAMES**: Never silently correct recorded names; preserve AKA/FKA/misspellings and include variations in Names Searched.
- **DECEASED PERSONS**: Deed referencing a deceased person → capture the person in the deed notes and Names Searched; if no estate reference, add exact note `NO WILL OR LIST OF HEIRS FOR [NAME]`.
- **PARTY OF THE THIRD PART**: Acknowledged in notes with the recorded reason for participation.
- **LIFE ESTATES**: List only actual grantee(s) in GRANTEE(S) field. Explain the life estate in NOTES. Do NOT add "RESERVES LIFE ESTATE" or "REMAINDERMENT" to grantee line.
- **TRUSTEE'S DEEDS**: Consolidated into one block including the full foreclosure sequence (`foreclosure_sequence`) in exact packet order; the security instrument is identified as FORECLOSED DEED OF TRUST and is NOT repeated in MORTGAGES / DEEDS OF TRUST.
- **PARTITION DEEDS**: Read in full; every title-relevant benefit, burden, reservation, right, and restriction affecting the subject tract is captured (`partition_deed_notes`).
- **OUTSALES**: Included outsale deed → full block in MISCELLANEOUS DOCUMENTS. Referenced-only outsale → compact note + COPY NOT INCLUDED; no separate block.
- **SUPPORTING DOCUMENTS**: Chain of Title entries support `supporting_documents` for starred entries (WILL, LOH, REA, PROBATE) with decedent, heirs, devisees/beneficiaries fields.
- **ESTATE CONSOLIDATION**: One decedent's will/probate/LOH/fiduciary papers consolidate into ONE block; duplicate copies accounted for only in PDF DOCUMENT ACCOUNTING.
- **MATURITY**: Report the final payment date from full mortgage review, immediately after AMOUNT. If none found: `MATURITY: NOT SHOWN`.
- **MIN**: Every deed of trust block contains a visible MIN field. If none found: `MIN: NOT SHOWN`.
- **OPEN/CLOSED ENDED**: Classified per the instrument (credit-line/future-advances → OPEN-ENDED; fixed principal → CLOSED-ENDED).
- **PLATS & SURVEYS**: Every plat and survey page must be reviewed and indexed separately in MISCELLANEOUS DOCUMENTS.
- **MORTGAGES/JUDGMENTS**: When empty, show `NONE — NO [DOCUMENT TYPE] WAS INCLUDED OR CLEARLY IDENTIFIED`. Include the last release/satisfaction information in the status when no open mortgage exists.
- **MISCELLANEOUS DOCUMENTS**: Numbered normally. Two sub-types — estate-type (WILL, LOH, REA, PROBATE with decedent/heirs) and document-type (PLAT, EASEMENT, RESTRICTIONS with grantor/assignor fields).
- **MULTI-PARCEL ORDERS**: Parcel-specific assessor/tax info compiled at the top in ORDER INFORMATION / TAX INFORMATION. Shared documents indexed once as "BOTH PARCELS".
- **NAMES SEARCHED**: Restricted to direct subject chain + title-relevant heirs. Excludes persons appearing only in mortgages, judgments, liens, misc docs, or outsales unless independently in the direct chain. Compact comma-separated format.
- **REPORT STYLE**: ALL CAPS throughout (Legal Description preserves recorded case). Red `C00000` ONLY for review/warning items (missing copies, conflicts, verification). Ordinary notes/fields black. Numeric M/D/YYYY dates. Light-gray label shading, 30/70 label:value split, full-width instrument tables, 7-pt editable spacer between tables, no repeated section headings inside a section.
- **SIGNATURE**: `Performed by: Patrick Hazelwood` once at the bottom of the final page — Patrick Hazelwood in Segoe Script 12pt (DOCX).
- **UPDATE / CONTINUATION REPORTS**: Handled via the `update_report` object (prior/current effective dates, actual recordings vs carried-forward open matters vs proposed/unrecorded items). Rules 23.x of v9_rules.md.
- **ADDITIONAL INFORMATION**: References and PDF Document Accounting are combined in a single `additional_information` object with `references[]` and `document_accounting[]` arrays; ALL CAPS shorthand entries.

### Schema
- Schema: `docs/schemas/v9-schema.json`
- Prompt: `docs/prompts/v9-prompt.md`
- Source rules: `docs/v9/v9_rules.md` (+ `v9_rules.docx`)

### Output Formats
Output is generated per the job's stored `templateVersion`. V7 jobs use the legacy V7 generators; V9 jobs use the current V9-rule generators. Each supports four output formats:
- **DOCX (Text)** — via `GET /api/generate/:jobId/docx-text` (`generateV7TextDocx` / `generateV9TextDocx`)
- **DOCX (Table)** — via `GET /api/generate/:jobId/docx-table` (`generateV7TableDocx` / `generateV9TableDocx` using 30/70 table layout)
- **Markdown** — via `GET /api/generate/:jobId/markdown` (`generateV7Markdown` / `generateV9Markdown`)
- **PDF** — via `GET /api/generate/:jobId/pdf` (`generateV7Report` / `generateV9Report`)

Default output is DOCX. PDF/Markdown generated only when specifically requested.

### Version Model (V7 vs V9)
- **V9 (REVISION 9 rules)** is the default/current contract — prompt `v9-prompt.md`, schema `v9-schema.json`, generators `v9*`.
- **V7** remains available for side-by-side testing — prompt `v7-prompt.md`, schema `v7-schema.json`, generators `v7*`.
- The extraction standard is selectable in the UI (New Job / Bulk Import) and persisted on the job's `templateVersion`.
- **Tenant logo**: DOCX/PDF generators render the job's tenant logo when one is set (tenant admin uploads via Admin → Branding). No logo set = no logo rendered (no Hazelwood fallback).

---

## Template Version

V9 (REVISION 9 rules) is the current/default extraction and formatting contract. V7 remains available for side-by-side testing. The report template is the Enhanced Report format; each job persists its `templateVersion` (`v7` or `v9`) and extraction + generation honor it. Legacy versions v1–v6 have been removed.

---

## Supported Input Formats

- **PDF** — Native PDF pass-through via Gemini 2.5 Flash (no image conversion)
- **DOCX** — Generated output (verified output from title companies)

## Supported Output Formats

- **PDF** — Clean format, standard fonts, 8 sections (v9 rules)
- **DOCX** — Text-based layout matching `blank.docx` (v9 Text) and 30/70 table-based layout (v9 Table)
- **Markdown** — Plain text format (v9)

---

## System Architecture

### Tech Stack
- **Backend**: Node.js Express (CommonJS)
- **Frontend**: React (Vite, ESM)
- **Database**: SQLite (Drizzle ORM)
- **AI**: Gemini 2.5 Flash via `@google/generative-ai` SDK
- **Validation**: Zod (runtime environment checks)

### Core Services
| Service | Purpose |
| :--- | :--- |
| `googleAiService.js` | Primary AI engine — native PDF extraction with structured JSON output; selects `v7` or `v9` prompt/schema by `templateVersion` |
| `v7DocxGenerator.js` / `v7PdfGenerator.js` / `v7MarkdownGenerator.js` | Legacy V7 generators (side-by-side testing) |
| `v9DocxGenerator.js` / `v9PdfGenerator.js` / `v9MarkdownGenerator.js` | Current V9-rule generators (ALL CAPS, packet-order chain, warning red, Segoe Script signature) |
| `emailService.js` | SMTP email notifications |
| `backupService.js` | SQLite database backups |
| `env.js` | Zod-validated environment config |

### Database Tables
- `tenants` — Tenant companies (platform-level). `users`/`jobs` are tenant-scoped via `tenant_id`.
- `jobs` — Stores all abstract jobs with `templateVersion` (text) and `fieldsJson` (JSON)
- `users` — Tenant-scoped users; `role` = tenant admin (`admin`) or `abstractor`; `is_platform_admin` = platform super-admin
- `settings` — Key-value config (SMTP, backup settings)
- `backups` — Backup metadata

> **Multi-tenant (see `docs/multi-tenant-plan.md`):** `users` and `jobs` are tenant-scoped. All queries go through `backend/src/services/tenantRepo.js` with `tenantId` from the JWT. Global settings/backups and `/api/platform/tenants` are platform-admin only. Existing data was backfilled into the `default` tenant; the seeded admin (`ADMIN_EMAIL`) is its tenant admin and `is_platform_admin`. Per-tenant logos are stored on `tenants` (`logo_blob`/`logo_mime`) and rendered by the DOCX/PDF generators. `audit_log` records platform moves (`job.move`). `GET /api/admin/metrics` (+ `/metrics/export`) provides per-tenant reporting with date filters.

---

## Documentation Update Policy

**Whenever any of the following occur, this document MUST be updated:**

1. A new extraction rule is added, modified, or removed
2. A new template version is created
3. A new output format is added
4. A new core service is added
5. A database schema change affects user-facing behavior
6. A major architectural change

**Update procedure:**
1. Edit `/docs/rules.md` with the change
2. Update AGENTS.md if the change affects agent workflows
3. Commit with message: `docs: update rules for [change description]`

---

*Last updated: 2026-09-01*
*Version: 3.0 (v9 rules)*
