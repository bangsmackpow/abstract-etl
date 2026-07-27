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

## V5 Extraction Rules (Standard — June 2026)

V5 uses a clean, readable format without copying the Hazelwood visual style. All text values are UPPERCASE where practical. Source names, descriptions, misspellings, and punctuation must be preserved exactly.

### Rule 1 — File Number

- Extract from the **PDF filename** first.
- **Fallback**: If no filename number, use `COMPANY NAME - PROPERTY ADDRESS`.
- If no company, use just the `PROPERTY ADDRESS`.

### Rule 2 — Tax Delinquent

- Numeric field with three sub-fields:
  - `original_amount` — the original tax amount
  - `due_date` — the date it was due (MM/DD/YYYY)
  - `full_delinquent_amount` — total including penalties and fees

### Rule 3 — Chain of Title

- Ordered **newest to oldest**.
- Use separate numbered entries.
- Standardized deed titles:
  - `GENERAL WARRANTY`, `SPECIAL WARRANTY`, `QUITCLAIM`, `GIFT DEED`, `DEED OF ASSUMPTION`, `ESCHEAT DEED`, `PARTITION DEED`, `DEED OF FORECLOSURE`, `TRUSTEE'S DEED`
  - If no match: `OTHER - [DISCOVERED TYPE]`
- Grantors and grantees listed as arrays (one per line in UI).
- `in_out_sale` is a boolean checkbox.

### Rule 4 — Mortgages / Deeds of Trust

- Ordered **oldest to newest** by date.
- Fields: document_title, book_instrument, page, dated, recorded, consideration, maturity_date, lender, borrower, trustee, mers_number, notes.

### Rule 5 — Judgments / Liens

- Fields: document_title, book_instrument, page, amount, dated, recorded, case_number, plaintiff, defendant.

### Rule 6 — Miscellaneous Documents

- Fields: document_title, book_instrument, page, dated, recorded, consideration, grantor_assignor, grantee_assignee, notes.

### Rule 7 — Names Searched

- Must include all name variations: AKA, FKA, maiden names, remarried names.
- Must include all heirs named in wills, LOHs, and REAs.
- Borrower listed first.

### Rule 8 — No Silent Corrections

- Do NOT silently correct misspellings, punctuation, or formatting from source documents.
- Preserve exact text as it appears in the original.

---

## V5 Output Sections (8 Total)

The V5 Standard report contains these sections in order:

1. **ORDER INFORMATION** — file_number, effective_date, completed_date, current_vesting_owner, property_address, county, township, tax_id, parcel_ids, assessed/land/improvement values, tax info, tax_delinquent (object)
2. **CHAIN OF TITLE** — numbered entries (newest to oldest) with deed_type, instrument_book_page, deed_date, recorded_date, consideration, in_out_sale, grantors[], grantees[], notes
3. **MORTGAGES / DEEDS OF TRUST** — numbered entries (oldest to newest) with document_title, book_instrument, page, dated, recorded, consideration, maturity_date, lender, borrower, trustee, mers_number, notes
4. **JUDGMENTS / LIENS** — numbered entries with document_title, book_instrument, page, amount, dated, recorded, case_number, plaintiff, defendant
5. **MISCELLANEOUS DOCUMENTS** — numbered entries with document_title, book_instrument, page, dated, recorded, consideration, grantor_assignor, grantee_assignee, notes
6. **LEGAL DESCRIPTION** — full legal description from vesting deed
7. **ADDITIONAL INFORMATION** — free-text notes
8. **NAMES SEARCHED** — array of all names (including variations and heirs)

---

## V6 Extraction Rules (Enhanced — July 2026)

V6 extends V5 with additional fields, complete document review requirements, and PDF document accounting. All V5 rules apply unless overridden below. Full rules are documented in `docs/v6_rules.md`.

### Key Differences from V5

1. **No Completed Date** — V6 does not include a `completed_date` field in order_info.
2. **Additional Order Info Fields** — `assessor_owner`, `assessor_description`, `acreage` are captured.
3. **Expanded Mortgage Fields** — `loan_number`, `min`, `status` are captured for each mortgage.
4. **Expanded Judgment/Lien Fields** — `interest`, `costs`, `attorneys_fees`, `status` are captured.
5. **Expanded Misc Document Fields** — `area_or_width` and `notes` are captured.
6. **Document Accounting** — A new top-level `document_accounting[]` array tracks every page/page range in the PDF.
7. **Complete Document Review** — Every PDF page must be reviewed and accounted for.
8. **DEED OF BARGAIN AND SALE** — Added to the list of standard deed titles.
9. **Wills/Probate/Heirs** — More detailed rules for heir extraction from wills, LOHs, and REAs.
10. **Recorded References** — Explicit rules for capturing source deeds, outsales, easements, and other references.

### Rule 1 — No Completed Date

- Do NOT include a `completed_date` field in the output.

### Rule 2 — Additional Order Info

- Capture `assessor_owner` (the owner name as shown on assessor records).
- Capture `assessor_description` (the property description from assessor records).
- Capture `acreage` (lot size in acres when shown).

### Rule 3 — Expanded Mortgage Fields

- Capture `loan_number` (the lender's internal loan identifier).
- Capture `min` (Mortgage Identification Number).
- Capture `status` (e.g., OPEN, RELEASED, FORECLOSED, STATUS UNCLEAR).

### Rule 4 — Expanded Judgment/Lien Fields

- Capture `interest` (interest rate or amount).
- Capture `costs` (court costs).
- Capture `attorneys_fees` (attorney fee amount).
- Capture `status` (e.g., SATISFIED, OPEN, STATUS UNCLEAR FROM PROVIDED DOCUMENTS).

### Rule 5 — Expanded Misc Document Fields

- Capture `area_or_width` (for easements, rights of way — width or area).
- Capture `notes` (additional notes about the document).

### Rule 6 — Document Accounting

- Build a `document_accounting[]` array listing every page or page range in the PDF.
- Each entry has `page_range` (e.g., "1-3", "5") and `document_label` (e.g., "GENERAL WARRANTY DEED", "DEED OF TRUST").
- Also render within Additional Information in the final report.

### Rule 7 — Complete Document Review

- Review every PDF page and every distinct document.
- Do not rely only on parsed text, the cover sheet, or the first page.
- Check recording stamps, signature pages, exhibits, riders, attachments.
- Account for every distinct document.

### Rule 8 — Standard Deed Titles

- Add `DEED OF BARGAIN AND SALE` to the list of standard deed titles.

---

## V6 Output Sections (8 Total)

The V6 Enhanced report contains these sections in order (same as V5, with expanded fields):

1. **ORDER INFORMATION** — file_number, effective_date, current_vesting_owner, assessor_owner, assessor_description, property_address, county, township, tax_id, parcel_ids, assessed/land/improvement values, acreage, tax info, tax_delinquent (object)
2. **CHAIN OF TITLE** — numbered entries (newest to oldest) with deed_type, instrument_book_page, deed_date, recorded_date, consideration, in_out_sale, grantors[], grantees[], notes
3. **MORTGAGES / DEEDS OF TRUST** — numbered entries (oldest to newest) with document_title, book_instrument, page, dated, recorded, consideration, maturity_date, lender, borrower, trustee, loan_number, min, open_closed_ended, status, associated_documents[]
4. **JUDGMENTS / LIENS** — numbered entries with document_title, book_instrument, page, amount, interest, costs, attorneys_fees, status, dated, recorded, case_number, plaintiff, defendant
5. **MISCELLANEOUS DOCUMENTS** — numbered entries with document_title, book_instrument, page, dated, recorded, consideration, area_or_width, grantor_assignor, grantee_assignee, notes
6. **LEGAL DESCRIPTION** — full legal description from vesting deed
7. **ADDITIONAL INFORMATION** — free-text notes + PDF DOCUMENT ACCOUNTING
8. **NAMES SEARCHED** — array of all names (including variations and heirs)

---

## Template Versions

| Version | Description | Status |
| :--- | :--- | :--- |
| `v1` | Legacy — basic abstract format | ✅ Active |
| `v2` | ProTitleUSA — 12-section detailed report | ✅ Active |
| `v4` | Hazelwood & Associates — run sheet format, ALL CAPS, Times-Roman | ✅ Active |
| `v5` | Standard — clean format, 8 sections, ALL CAPS where practical | ✅ Active |
| `v6` | Enhanced — extends V5 with additional fields, document accounting, complete document review rules | ✅ Active |
| `v7` | Enhanced Report — text-based report format, separate tax section, supporting documents for chain entries, extended field coverage | ✅ Active |

---

## Supported Input Formats

- **PDF** — Native PDF pass-through via Gemini 2.5 Flash (no image conversion)
- **DOCX** — Generated output (verified output from title companies)

## Supported Output Formats

- **PDF** — A4, Hazelwood branding, Times-Roman font, section page breaks, all fields editable (v2, v4). V5 uses clean format with standard fonts.
- **DOCX** — Microsoft Word document matching PDF layout (v1, v2, v5)
- **Markdown** — Plain text format for all versions (v1, v2, v4, v5)

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
| `googleAiService.js` | Primary AI engine — PDF extraction with structured JSON output (v1, v2, v4, v5) |
| `pdfGenerator.js` | Multi-page PDF reports (v2, v4) |
| `v5PdfGenerator.js` | V5 clean-format PDF reports (8 sections, standard fonts) |
| `docxGenerator.js` | Word documents (v1, v2, v5) |
| `markdownGenerator.js` | Markdown output (v1, v2, v4, v5) |
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

## V7 Extraction Rules (Enhanced Report)

### Overview
V7 (Enhanced Report) is a text-based report format defined by `docs/v7/blank.docx`. Tax information is captured in the JSON but rendered within ORDER INFORMATION (not as a standalone section). Chain of Title supports *-prefixed supporting documents (WILL, LOH, REA, PROBATE) under numbered entries. Names Searched is restricted to the direct subject chain and title-relevant heirs.

### Section Order
1. ORDER INFORMATION (tax info captured in JSON, rendered within this section)
2. CHAIN OF TITLE
3. MORTGAGES / DEEDS OF TRUST
4. JUDGMENTS / LIENS
5. MISCELLANEOUS DOCUMENTS
6. LEGAL DESCRIPTION
7. ADDITIONAL INFORMATION
8. NAMES SEARCHED

### V7-Specific Rules
- **CLIENT / ORDER**: Single combined field containing company name, order case numbers, and reference numbers.
- **TAX INFORMATION**: Captured in `tax_information` JSON object. Rendered within ORDER INFORMATION in output, NOT as a standalone section. Do NOT repeat assessment figures already in ORDER INFORMATION. Use tax-ticket figures over assessor card when they conflict.
- **NO IN/OUT SALE FIELD**: Chain of Title entries do not include an IN/OUT SALE field.
- **CONSIDERATION**: Must come from the operative consideration clause in the deed itself, not from a cover sheet, index, tax stamp, or assessor record.
- **LIFE ESTATES**: List only actual grantee(s) in GRANTEE(S) field. Explain the life estate in NOTES. Do NOT add "RESERVES LIFE ESTATE" or "REMAINDERMENT" to grantee line.
- **OUTSALES**: When an outsale deed is included in the PDF, index it as a complete copy-and-paste block in MISCELLANEOUS DOCUMENTS. Shorthand references only when the underlying deed is not included.
- **DECEASED PERSONS**: When a deed states a person is deceased with no estate reference, add note: "NO WILL OR LIST OF HEIRS FOR [NAME]".
- **SUPPORTING DOCUMENTS**: Chain of Title entries support a `supporting_documents` sub-array for *-prefixed entries (WILL, LOH, REA, PROBATE) with decedent, heirs, devisees/beneficiaries fields.
- **MATURITY**: Report the final payment date from full mortgage review. If none found: "MATURITY: NOT SHOWN".
- **PLATS & SURVEYS**: Every plat and survey page must be reviewed and indexed separately in MISCELLANEOUS DOCUMENTS.
- **MORTGAGES/JUDGMENTS**: When empty, show "NONE — NO [DOCUMENT TYPE] WAS INCLUDED OR CLEARLY IDENTIFIED" as the status. Include the last release/satisfaction information in the status when no open mortgage exists.
- **MISCELLANEOUS DOCUMENTS**: Supports two sub-types — estate-type (WILL, LOH, REA, PROBATE with decedent/heirs) and document-type (PLAT, EASEMENT, RESTRICTIONS with grantor/assignor fields).
- **MULTI-PARCEL ORDERS**: One combined report unless separate requested. Each parcel's order info, taxes, chain, and legal description kept separate. Shared documents indexed once as "BOTH PARCELS". Chain numbering continues consecutively.
- **NAMES SEARCHED**: Restricted to direct subject chain + title-relevant heirs. Excludes persons appearing only in mortgages, judgments, liens, misc docs, or outsales unless independently in the direct chain. Compact comma-separated format.
- **ADDITIONAL INFORMATION**: References and PDF Document Accounting are combined in a single `additional_information` object with `references[]` and `document_accounting[]` arrays.

### Schema
- Schema: `docs/schemas/v7-schema.json`
- Prompt: `docs/prompts/v7-prompt.md`
- Training data: `docs/v7/` (blank.docx template + 3 completed example reports)

### Output Formats
V7 supports four output formats:
- **DOCX (Text)** — via `GET /api/generate/:jobId/docx-text`, generated by `generateV7TextDocx` matching blank.docx layout
- **DOCX (Table)** — via `GET /api/generate/:jobId/docx-table`, generated by `generateV7TableDocx` using table-based layout
- **Markdown** — via `GET /api/generate/:jobId/markdown`, generated by `generateV7Markdown`
- **PDF** — via `GET /api/generate/:jobId/pdf`, generated by `generateV7Report` in v5PdfGenerator.js

---

*Last updated: 2026-07-26*
*Version: 1.3*
