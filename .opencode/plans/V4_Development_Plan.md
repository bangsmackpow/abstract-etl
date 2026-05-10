# V4 Development Plan: Hazelwood Run Sheet Format

**Prepared for:** Chad  
**Date:** May 9, 2026  
**Status:** For Review & Approval  

---

## Objective

Return the output layout and flow to the familiar Hazelwood run sheet format while retaining the smart extraction functions from V2. The goal is to reduce client review errors by matching the visual structure they already know and trust.

---

## 1. Report Structure

The final report will follow this exact section order:

| # | Section | Notes |
|---|---------|-------|
| 1 | Order Information | Page 1 header with new logo |
| 2 | Chain of Title | Numbered entries (1, 2, 3...) |
| 3 | Mortgages / Deeds of Trust | Including assignments |
| 4 | Judgments / Liens | |
| 5 | Miscellaneous Documents | |
| 6 | Legal Description | Vesting deed only |
| 7 | Additional Information | Outsale, easement, utility ROW, C&R, lease |
| 8 | Names Searched | Footer — mandatory |

---

## 2. Key Changes from Current V2/V3

### A. Typography & Font
- **Font:** `Times-Roman`, `Times-Bold`, `Times-Italic` (PDFKit native)
- Industry standard for mortgage/title documents
- Superior readability at 8-10pt sizes for dense data
- Conveys legal authority and professional gravitas
- Drop-in replacement — no custom font registration needed

### B. Header (Page 1 Only)
- **New logo:** `docs/logo/HazelwoodLogoFinal.png`
- Only the first page header changes — all subsequent pages keep the current layout
- Header includes: File Number, Effective Date, Completed Date, Property Address, County, Township, Parcel ID, Assessed/Land/Improvement Value, TaxID, Tax Amount, Due, Delinquent, Paid, Current Vesting Owner

### C. Order Number Extraction
- **Primary source:** PDF filename (extract entire number exactly — no dropped digits)
- **Validation:** Cross-check with request sheet, email, or page one
- Company name combined with full order number when shown

### D. Parcel ID
- **Never drop leading zeros** (e.g., `069A17` stays `069A17`)
- Multiple parcel IDs displayed **stacked vertically** in source order (not comma-separated)

### E. Township
- Default to the **City** from the property address (simple rule)

### F. Tax Information
- **No two-installment limit** — capture every installment shown (current or delinquent)
- Delinquent is a **numeric field**, not Yes/No — show original amount, due date, and full delinquent amount with penalties/fees
- Multiple parcels/installments **stacked vertically**

### G. Chain of Title Formatting
- **Numbered entries** (1, 2, 3...) — do NOT repeat "1" for every entry
- **Deed Type FIRST**, then Grantors/Grantees below
- **Simplified deed titles:** GENERAL WARRANTY, SPECIAL WARRANTY, QUITCLAIM, GIFT DEED, DEED OF ASSUMPTION, ESCHEAT DEED, PARTITION DEED, DEED OF FORECLOSURE / TRUSTEE'S DEED (Hazelwood wording, not ProTitle). List remains open for expansion.
- **In/Out Sale:** ☐ Yes  ☐ No checkbox — "Yes" when vesting owner acquires land in pieces or sells a portion
- **Consideration:** From the **deed itself only** — specific numeric amount or "LOVE AND AFFECTION", otherwise blank
- **Marital status:** No separate field. If instrument says "Husband and Wife" → join with `&`. Otherwise → separate with commas. Always use full names as they appear in that specific instrument.
- **Duplicate names:** If someone is both Grantor and Grantee, show in **both** places (no AI "cleanup")
- **Life estates:** Grantor reserving life estate listed as "Reserving Life Estate", other party as REMAINDERMENT
- **Foreclosures:** Trustee's Deed = numbered chain entry. Related docs (Account of Sale, Sub Trustee, etc.) go under special-note/related-document field for that entry, NOT as new chain numbers

### H. Notes / Special Situations
- **No description/note under every deed** — only when something special is going on:
  - Will, deceased person, life estate, divorce, third/fourth-party issue, foreclosure-related supporting documents
- **Only the vesting deed** requires a full legal description (at the bottom, like Hazelwood)
- Notes follow the order they appear in source documents
- **Wording templates:**
  - `WILL OF [NAME] [BOOK/PAGE]`
  - `LOH FOR [NAME] [BOOK/PAGE]`
  - `REA FOR [NAME] [BOOK/PAGE OR CASE REFERENCE]`
  - `NO WILL OR LOH FOR [NAME] [DATE OF DEATH]`
  - `REFERENCE MADE TO A WILL FOR [NAME] BUT NONE WAS FOUND`

### I. Mortgages / Liens Section
- **Associated Documents:** ASSIGNMENT, SUBSTITUTE TRUSTEE, MODIFICATION, or OTHER (custom)
- **Abbreviations:** DOT (Deed of Trust), RFDT (Refinance Deed of Trust), DTCL (Credit Line Deed of Trust)
- **Ordering:** Oldest to newest by default, unless a subordination agreement changes priority

### J. Names Searched
- **Search depth:** Internal only — **do NOT display** on final report
- **Names Searched** (mandatory, at bottom of report):
  - Borrower (listed first)
  - Every Grantor/Grantee in the Chain
  - Every heir named in a Will, LOH, or REA
- **Exclusions:** Special Commissioners and Trustees on a Trustee's Deed do NOT need to be searched

### K. Empty Categories
Standard statements when no data exists:
- *No chain-of-title entries found in the record.*
- *No mortgages or deeds of trust found in the record.*
- *No judgments or liens found in the record.*
- *No miscellaneous documents found in the record.*

### L. Editable PDF Fields
- All fields must be truly editable in the final PDF (not just showing pencil icon)
- Currently only the note section at the bottom allows input
- Fix: Use PDFKit's `form` module or proper text field annotations for all data fields

---

## 3. Page Break Options

Below are two approaches for handling page breaks between sections. Both are viable — the choice depends on Chad's preference for readability vs. compactness.

---

### Option A: Continuous Flow (Current Behavior)

Sections flow naturally from one to the next. PDFKit handles page breaks automatically when content overflows. Sections may split across pages mid-entry.

**Visual Example:**

```
┌─────────────────────────────────────────────────┐
│  [PAGE 1]                                       │
│  HAZELWOOD & ASSOCIATES, LLC                    │
│  PROPERTY ABSTRACT REPORT                       │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ORDER INFORMATION                              │
│  File No: 512571-16683     Eff. Date: 01/15/25 │
│  Address: 123 Main St      County: Fairfax     │
│  ...                                            │
│                                                 │
│  CHAIN OF TITLE                                 │
│                                                 │
│  1. GENERAL WARRANTY DEED                       │
│     Grantor: JOHN SMITH & JANE SMITH            │
│     Grantee: ROBERT JOHNSON                     │
│     Date: 03/15/2020    Rec: 03/16/2020         │
│     Inst: 2020-045678    Consideration: $1.00   │
│  ─────────────────────────────────────────────  │
│                                                 │
│  2. QUITCLAIM DEED                              │
│     Grantor: ROBERT JOHNSON                     │
│     Grantee: SARAH WILLIAMS                     │
│     Date: 06/01/2022    Rec: 06/02/2022         │
│     Inst: 2022-098765    Consideration: —       │
│  ─────────────────────────────────────────────  │
│                                                 │
│  3. DEED OF TRUST                               │
│     [entry continues...]                        │
│  ─────────────────────────────────────────────  │
│                                                 │
│  4. SPECIAL WARRANTY DEED                       │
│     [entry starts at bottom of page 1...]       │
└─────────────────────────────────────────────────┘
                         ↓ (page break mid-section)
┌─────────────────────────────────────────────────┐
│  [PAGE 2]                                       │
│     [entry 4 continues from page 1...]          │
│     Grantor: ESTATE OF MARY JONES               │
│     Grantee: THOMAS BROWN                       │
│     Date: 09/10/2023    Rec: 09/11/2023         │
│     Inst: 2023-112233    Consideration: —       │
│     Note: WILL OF MARY JONES [WB 45/PG 123]     │
│  ─────────────────────────────────────────────  │
│                                                 │
│  MORTGAGES / DEEDS OF TRUST                     │
│                                                 │
│  1. DOT                                         │
│     Borrower: THOMAS BROWN                      │
│     Lender: FIRST NATIONAL BANK                 │
│     Amount: $250,000.00    Vesting: Open        │
│     Date: 09/10/2023    Rec: 09/11/2023         │
│     MERS: No                                    │
│  ─────────────────────────────────────────────  │
│                                                 │
│  JUDGMENTS / LIENS                              │
│  No judgments or liens found in the record.     │
│                                                 │
│  MISCELLANEOUS DOCUMENTS                        │
│  No miscellaneous documents found in the record.│
│                                                 │
│  LEGAL DESCRIPTION                              │
│  LOT 12, BLOCK B, FAIRVIEW SUBDIVISION...       │
│  [full legal description continues...]          │
│                                                 │
│  ADDITIONAL INFORMATION                         │
│  EASEMENT: 10FT UTILITY ROW ALONG REAR...       │
│                                                 │
│  NAMES SEARCHED                                 │
│  THOMAS BROWN; JOHN SMITH; JANE SMITH;          │
│  ROBERT JOHNSON; SARAH WILLIAMS; MARY JONES     │
│                                                 │
│                                    Page 2 of 2  │
└─────────────────────────────────────────────────┘
```

**Pros:**
- More compact — fewer pages overall
- Familiar to users of current system
- No wasted whitespace at page bottoms

**Cons:**
- Sections can split awkwardly across pages
- Chain entries may break mid-entry at page boundary
- Harder to skim for specific sections

---

### Option B: Section Page Breaks (Recommended)

Each major section starts on a new page. If a section doesn't fit on the current page, it moves entirely to the next page. Chain entries stay together and never split across pages.

**Visual Example:**

```
┌─────────────────────────────────────────────────┐
│  [PAGE 1]                                       │
│  HAZELWOOD & ASSOCIATES, LLC                    │
│  PROPERTY ABSTRACT REPORT                       │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ORDER INFORMATION                              │
│  File No: 512571-16683     Eff. Date: 01/15/25 │
│  Address: 123 Main St      County: Fairfax     │
│  ...                                            │
│                                                 │
│  CHAIN OF TITLE                                 │
│                                                 │
│  1. GENERAL WARRANTY DEED                       │
│     Grantor: JOHN SMITH & JANE SMITH            │
│     Grantee: ROBERT JOHNSON                     │
│     Date: 03/15/2020    Rec: 03/16/2020         │
│     Inst: 2020-045678    Consideration: $1.00   │
│  ─────────────────────────────────────────────  │
│                                                 │
│  2. QUITCLAIM DEED                              │
│     Grantor: ROBERT JOHNSON                     │
│     Grantee: SARAH WILLIAMS                     │
│     Date: 06/01/2022    Rec: 06/02/2022         │
│     Inst: 2022-098765    Consideration: —       │
│  ─────────────────────────────────────────────  │
│                                                 │
│  3. DEED OF TRUST                               │
│     [entry continues...]                        │
│  ─────────────────────────────────────────────  │
│                                                 │
│  [Page break — next section starts fresh]       │
└─────────────────────────────────────────────────┘
                         ↓ (clean section break)
┌─────────────────────────────────────────────────┐
│  [PAGE 2]                                       │
│                                                 │
│  MORTGAGES / DEEDS OF TRUST                     │
│                                                 │
│  1. DOT                                         │
│     Borrower: THOMAS BROWN                      │
│     Lender: FIRST NATIONAL BANK                 │
│     Amount: $250,000.00    Vesting: Open        │
│     Date: 09/10/2023    Rec: 09/11/2023         │
│     MERS: No                                    │
│  ─────────────────────────────────────────────  │
│                                                 │
│  [Page break — next section starts fresh]       │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│  [PAGE 3]                                       │
│                                                 │
│  JUDGMENTS / LIENS                              │
│  No judgments or liens found in the record.     │
│                                                 │
│  MISCELLANEOUS DOCUMENTS                        │
│  No miscellaneous documents found in the record.│
│                                                 │
│  [Page break — next section starts fresh]       │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│  [PAGE 4]                                       │
│                                                 │
│  LEGAL DESCRIPTION                              │
│  LOT 12, BLOCK B, FAIRVIEW SUBDIVISION...       │
│  [full legal description continues...]          │
│                                                 │
│  ADDITIONAL INFORMATION                         │
│  EASEMENT: 10FT UTILITY ROW ALONG REAR...       │
│                                                 │
│  NAMES SEARCHED                                 │
│  THOMAS BROWN; JOHN SMITH; JANE SMITH;          │
│  ROBERT JOHNSON; SARAH WILLIAMS; MARY JONES     │
│                                                 │
│                                    Page 4 of 4  │
└─────────────────────────────────────────────────┘
```

**Pros:**
- Clean, professional appearance — each section is self-contained
- Easy to skim and locate specific sections
- Chain entries never split across pages
- Matches traditional title abstract formatting conventions
- Better for printing and physical review

**Cons:**
- More pages overall (especially for reports with sparse data)
- Some whitespace at page bottoms when sections are short
- Slightly more complex PDF generation logic

---

### Recommendation

**Option B (Section Page Breaks)** is recommended for the following reasons:

1. **Industry alignment:** Traditional title abstracts and run sheets typically separate major sections onto their own pages for clarity during review.
2. **Client workflow:** Chad's clients review these documents carefully — clean section breaks reduce cognitive load and make it easier to verify specific sections.
3. **Print-friendly:** When printed, each section starts fresh on a new page, which is the expected format for legal/real estate documents.
4. **Professional appearance:** The extra pages convey thoroughness and attention to detail — important for a service that charges for abstract work.

---

## 4. Files to Modify

| File | Change |
|------|--------|
| `backend/src/services/googleAiService.js` | Update AI prompt/schema to match V4 rules (deed titles, marital logic, consideration source, note filtering, names searched logic) |
| `backend/src/services/pdfGenerator.js` | Reorder sections to match Hazelwood layout, update header with new logo, change font to Times-Roman, adjust formatting (ALL CAPS where practical, stacked displays, checkbox for In/Out Sale), implement section page breaks, fix editable PDF fields |
| `backend/src/services/docxGenerator.js` | Same reordering and formatting changes as PDF |
| `backend/src/services/markdownGenerator.js` | Same reordering and formatting changes |
| `.gitignore` | Add `v4/` directory exclusion |

---

## 5. What Stays the Same (Retained from V2)

- Native PDF pass-through (no image conversion)
- Gemini 2.5 Flash with structured JSON output
- JSON sanitization with brace-depth tracking
- All 12 report sections are still extracted (property_info, vesting_info, chain_of_title, mortgages, associated_documents, judgments_liens, misc_documents, tax_status, legal_description, names_searched, additional_information, alternatives)
- Drizzle ORM for data access
- Settings table for SMTP/backup config
- Email notifications, backup service

---

## 6. Implementation Timeline

| Phase | Task | Estimated Effort |
|-------|------|-----------------|
| 1 | Update AI prompt/schema in `googleAiService.js` | 2-3 hours |
| 2 | Rebuild `pdfGenerator.js` with Hazelwood layout, Times font, section breaks | 3-4 hours |
| 3 | Update `docxGenerator.js` to match PDF structure | 2-3 hours |
| 4 | Update `markdownGenerator.js` to match PDF structure | 1-2 hours |
| 5 | Update `.gitignore` and test end-to-end | 1 hour |
| **Total** | | **9-13 hours** |

---

## 7. Chad's Feedback (Confirmed)

1. **Page Breaks:** Option B (Section Page Breaks) confirmed.
2. **Deed Title List:** Add DEED OF FORECLOSURE / TRUSTEE'S DEED. List remains open for expansion.
3. **Mortgage Order:** Oldest to newest by default, unless a subordination agreement changes priority.
4. **Editable PDF Fields:** All fields must be truly editable (not just showing pencil icon). Currently only the note section at the bottom allows input.

---

## 8. Implementation Timeline

| Phase | Task | Estimated Effort |
|-------|------|-----------------|
| 1 | Update AI prompt/schema in `googleAiService.js` | 2-3 hours |
| 2 | Rebuild `pdfGenerator.js` with Hazelwood layout, Times font, section breaks, editable fields | 3-4 hours |
| 3 | Update `docxGenerator.js` to match PDF structure | 2-3 hours |
| 4 | Update `markdownGenerator.js` to match PDF structure | 1-2 hours |
| 5 | Update `.gitignore` and test end-to-end | 1 hour |
| **Total** | | **9-13 hours** |

---

## 9. Open Questions for Chad

1. **Deed Title List:** Currently open — Chad will provide a short list if more types come to mind.

---

## 10. Approval

Please review and confirm:
- [x] Report structure and section order
- [x] Font choice (Times-Roman family)
- [x] Page break approach (Option B confirmed)
- [x] Chain of title formatting rules
- [x] Tax information handling
- [x] Names searched logic
- [x] Empty category statements
- [x] Deed types (DEED OF FORECLOSURE / TRUSTEE'S DEED added)
- [x] Mortgage ordering (oldest to newest, subordination exception)
- [x] Editable PDF fields (all fields, not just notes)

Development is approved and in progress.
