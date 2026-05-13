# Abstract ETL v3 — Rules & Documentation

> This document is the single source of truth for extraction rules, output formatting, and system behavior. Every rule change or major feature must be reflected here.

---

## V4 Extraction Rules (Hazelwood & Associates)

### Rule 1 — Order Number

- Extract from the PDF filename or document header.
- Use the **ENTIRE** number exactly — no dropped digits, no shortened versions, no breaking apart number groups.
- Combine company name with full order number when shown together in the source.
- **Fallback**: Two companies sometimes do NOT provide an order number:
  - **Eastman Credit Union**
  - **Clear Choice Abstracting**
  - When the order number is missing for these companies, use: `"COMPANY NAME - PROPERTY ADDRESS"`
  - Example: `"EASTMAN CREDIT UNION - 224 OAK LANE ROAD, DRYDEN, VA 24243"`

### Rule 2 — Parcel IDs

- **NEVER** drop leading zeros (e.g., `069A17` stays `069A17`).
- Multiple IDs go in the `parcel_ids` array in source order.

### Rule 3 — Township

- Default to the **CITY** from the property address.

### Rule 4 — Tax Information

- Capture **EVERY** installment shown — do NOT assume a two-installment limit.
- Delinquent is a **NUMERIC** field, not Yes/No. Show original amount, due date, and full delinquent amount with penalties/fees.
- Multiple parcels/installments are captured in the `installments` array.

### Rule 5 — Chain of Title

- Use separate numbered entries (1, 2, 3...).
- Deed Type FIRST, then Grantors and Grantees listed below.
- Use these **standardized deed titles**:
  - `GENERAL WARRANTY`
  - `SPECIAL WARRANTY`
  - `QUITCLAIM`
  - `GIFT DEED`
  - `DEED OF ASSUMPTION`
  - `ESCHEAT DEED`
  - `PARTITION DEED`
  - `DEED OF FORECLOSURE`
  - `TRUSTEE'S DEED`
  - If no match: `OTHER - [DISCOVERED TYPE]`
- Consideration comes from the **DEED ITSELF** only — specific numeric amount or `"LOVE AND AFFECTION"`. Otherwise leave `null`.
- **In/Out Sale**: `true` if the vesting owner acquires land in pieces or sells a portion.
- **Duplicate names**: If someone is both Grantor and Grantee, list in BOTH places.
- **Life estates**: Grantor reserving life estate → `"Reserving Life Estate"`, other party → `"REMAINDERMENT"`.
- **Foreclosures**: Trustee's Deed = numbered chain entry. Related docs (Account of Sale, Sub Trustee, etc.) go in `related_documents` for that entry, NOT as new chain numbers.

### Rule 6 — Marital Logic

- **NO** separate marital-status field.
- If instrument says "Husband and Wife" or similar → join names with `&` (e.g., `"JOHN SMITH & JANE SMITH"`).
- Otherwise → separate with commas (e.g., `"JOHN SMITH, JANE SMITH"`).
- Always use full names as they appear in that specific instrument.
- If one instrument lists them as married and another does not, follow the wording of that specific instrument.

### Rule 7 — Notes / Special Situations

- Only add notes for **special situations**: will, deceased person, life estate, divorce, third/fourth-party issue, foreclosure-related supporting documents.
- Do **NOT** add notes under every deed.
- Note wording templates:
  - `"WILL OF [NAME] [BOOK/PAGE]"`
  - `"LOH FOR [NAME] [BOOK/PAGE]"`
  - `"REA FOR [NAME] [BOOK/PAGE OR CASE REFERENCE]"`
  - `"NO WILL OR LOH FOR [NAME] [DATE OF DEATH]"`
  - `"REFERENCE MADE TO A WILL FOR [NAME] BUT NONE WAS FOUND"`
- Notes follow the order they appear in source documents.

### Rule 8 — Mortgages

- List from **OLDEST to NEWEST** by date, unless a subordination agreement changes priority.
- Associated document types: `ASSIGNMENT`, `SUBSTITUTE TRUSTEE`, `MODIFICATION`, or `OTHER`.
- Abbreviations: `DOT` (Deed of Trust), `RFDT` (Refinance Deed of Trust), `DTCL` (Credit Line Deed of Trust).

### Rule 9 — Names Searched

- Borrower (listed first).
- Every Grantor/Grantee in the Chain.
- Every heir named in a Will, LOH, or REA.
- **EXCLUDE**: Special Commissioners and Trustees on a Trustee's Deed.

### Rule 10 — Legal Description

- Only the **VESTING DEED** requires a full legal description.
- Do not repeat for other deeds unless a special note requires it.

### Rule 11 — ALL CAPS

- All text values must be **UPPERCASE**.

### Rule 12 — Extract Every Field

- Do NOT leave fields `null` unless they truly don't exist in the document.

### Rule 13 — Alternatives

- For any Names, Dates, or Legal Descriptions where OCR is blurry or ambiguous, provide the top 2 alternatives in the `alternatives` object using the field path as key.

---

## V4 Output Sections (12 Total)

The V4 Hazelwood run sheet contains these sections in order:

1. **ORDER INFORMATION** — order_number, company_name, effective_date, completed_date, property_address, county, township, parcel_ids, assessed/land/improvement values, tax summary
2. **VESTING DEED** — grantee, grantor, deed_date, recorded_date, book/page, deed_type, consideration, in/out sale, notes
3. **CHAIN OF TITLE** — numbered entries with deed_type, grantors[], grantees[], dates, consideration, notes, related_documents[]
4. **MORTGAGES** — borrower, lender, amount, dates, book/page/instrument, maturity, type, MERS, vesting_status, assignments[]
5. **ASSOCIATED DOCUMENTS** — document_type, book_instrument, page, dates, parties, notes
6. **JUDGMENTS & LIENS** — document_title, book_instrument, page, dates, case_number, amount, plaintiff, defendant
7. **MISC DOCUMENTS** — document_title, book_instrument, page, dates, parties
8. **TAX STATUS** — parcel_id, tax_year, total_amount, status, paid_date, delinquent_amount, installments[]
9. **LEGAL DESCRIPTION** — full legal description from vesting deed only
10. **ADDITIONAL INFORMATION** — free-text notes
11. **NAMES SEARCHED** — array of all names searched
12. **ALTERNATIVES** — ambiguous field alternatives for blurry OCR

---

## Template Versions

| Version | Description | Status |
| :--- | :--- | :--- |
| `v1` | Legacy — basic abstract format | ✅ Active |
| `v2` | ProTitleUSA — 12-section detailed report | ✅ Active |
| `v4` | Hazelwood & Associates — run sheet format, ALL CAPS, Times-Roman | ✅ Active |

---

## Supported Input Formats

- **PDF** — Native PDF pass-through via Gemini 2.5 Flash (no image conversion)
- **DOCX** — Generated output (verified output from title companies)

## Supported Output Formats

- **PDF** — A4, Hazelwood branding, Times-Roman font, section page breaks, all fields editable
- **DOCX** — Microsoft Word document matching PDF layout
- **Markdown** — Plain text format for all versions

---

## System Architecture

### Tech Stack
- **Backend**: Node.js Express (CommonJS)
- **Frontend**: React (Vite, ESM) + Zustand
- **Database**: SQLite (Drizzle ORM)
- **AI**: Gemini 2.5 Flash via `@google/generative-ai` SDK
- **Validation**: Zod (runtime environment checks)

### Core Services
| Service | Purpose |
| :--- | :--- |
| `googleAiService.js` | Primary AI engine — PDF extraction with structured JSON output |
| `pdfGenerator.js` | Multi-page PDF reports (v2, v4) |
| `docxGenerator.js` | Word documents (v1, v2) |
| `markdownGenerator.js` | Markdown output (v1, v2, v4) |
| `emailService.js` | SMTP email notifications |
| `backupService.js` | SQLite database backups |
| `env.js / env.ts` | Zod-validated environment config |

### Database Tables
- `jobs` — Stores all abstract jobs with `templateVersion` (text) and `fieldsJson` (JSON)
- `settings` — Key-value config (SMTP, backup settings)
- `backups` — Backup metadata

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

*Last updated: 2026-05-10*
*Version: 1.0*
