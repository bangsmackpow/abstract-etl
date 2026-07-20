# Abstract ETL: Data Extraction & Processing Rules

This document outlines the core logic and priority rules governing the AI-powered extraction process. These rules ensure consistency, accuracy, and alignment with established run-sheet standards.

---

## 1. File Number Extraction (Priority Order)
The system determines the **File Number** using the following strict priority logic:

1.  **Primary Choice (Filename)**: If the PDF filename contains a usable ID (e.g., "512571 - 16683.pdf"), the full ID is used.
2.  **Company + ID**: If a known company (e.g., TACS, Mortiles, ECU) and an ID are found within the document, the format used is `CompanyName FullID`.
3.  **ID Only**: If a unique ID is found without a specific company name, the ID is used alone.
4.  **Company + Address**: If no ID exists, but both a company name and address are present, the format used is `CompanyName FullPropertyAddress`.
5.  **Address Only**: If no company name or ID is available, the full Property Address serves as the File Number.
6.  **Safety Rule**: The system will **never** invent or hallucinate a File Number.

## 2. Mandatory Document Sequence
To maintain alignment with the Hazelwood run-sheet standard, information is extracted and organized in this exact sequence:

1.  Order Information
2.  Chain of Title
3.  Mortgages / Deeds of Trust
4.  Judgments / Liens
5.  Miscellaneous Documents
6.  Legal Description
7.  Additional Information
8.  Names Searched

## 3. Names Searched Logic (Priority & Inclusions)
*   **Forced Inclusion**: The following parties MUST be included in the "Names Searched" section:
    *   Any borrower listed on the initial request form.
    *   Every Grantor and Grantee identified in the Chain of Title.
    *   Any individual who obtained, owned, bought, or sold the property.
    *   Heirs identified from Wills, Lists of Heirs (LOH), or Real Estate Affidavits (REA).
*   **Mandatory Exclusions**: The following parties are explicitly EXCLUDED from "Names Searched":
    *   Special Commissioners.
    *   Trustees listed on Trustee’s Deeds.
*   **Sorting Order**: 
    1.  Borrowers appear **FIRST** in the exact same order they appear on the original request form.
    2.  All other applicable parties follow the borrowers.

## 4. Trustee’s Deed & Foreclosure Logic
*   **Primary Entry**: A **Trustee’s Deed** is treated as a standard numbered entry in the Chain of Title.
*   **Related Documents**: Supporting foreclosure documents (e.g., Account of Sale, Substitute Trustee, Modification) are listed as **starred reference items** (e.g., `*ACCOUNT OF SALE`) directly within the notes of the Trustee's Deed, rather than as separate numbered entries.
*   **DOT Reference Standards**:
    *   The specific DOT being foreclosed is labeled: `*FORECLOSED DOT [BOOK/PAGE OR INSTRUMENT]`
    *   Any other DOT open at the time of foreclosure is labeled: `*DOT OPEN AT THE TIME OF FORECLOSURE [BOOK/PAGE OR INSTRUMENT]`
*   **Sequence**: Numbered indexing resumes only when the next actual deed or conveyance appears.

## 5. Formatting & Accuracy Standards
*   **Case Sensitivity**: All final generated reports (Word and Markdown) are forced to **ALL CAPS** for professional uniformity.
*   **Date Format**: All dates are standardized to `MM/DD/YYYY`.
*   **Currency**: Dollar amounts must include commas (e.g., `250,000.00`).
*   **Legal Descriptions**: Text is captured word-for-word exactly as it appears. Use of ellipses ("...") or summarization is prohibited.
*   **In/Out Sale**: 
    *   Marked **TRUE/YES** if "Yes" or "Out" is indicated on the deed.
    *   Marked **FALSE/NO** if "No" or "In" is indicated.

## 6. V2 System (ProTitleUSA) Rules
The following rules apply exclusively to jobs created using the "v2" standard:
*   **Schema**: Data is extracted into the ProTitleUSA-compliant schema.
*   **Output Formats**: V2 jobs support three export formats, each covering all 12 report sections:
    *   **PDF**: A branded multi-page report with Hazelwood logo, header, per-page footers, and dynamic page breaks. Sections: Property Information, Vesting Information, Chain of Title, Open Mortgages/Deeds of Trust, Associated Documents, Judgments/Liens, Miscellaneous Documents, Tax Status, Examiner Instructions, Legal Description, Names Searched, and Additional Information.
    *   **DOCX**: A professional Word document with all 12 sections in table format.
    *   **Markdown**: A structured .md file with all 12 sections in table/key-value format.
*   **Empty Sections**: Any section without data displays a placeholder message (e.g., "No associated documents found.") rather than being omitted.
*   **Deed Type Logic**: 
    *   The system will attempt to match the extracted deed type against a master list of 24 standard ProTitleUSA types.
    *   If no direct match is found, the value will be formatted as `OTHER - [DISCOVERED TYPE]`.
*   **UI Suggestions**: The user interface provides "Smart Suggestions" for many fields, including fuzzy-matched options from master lists for fields like `deed_type`.

## 7. V4 System (Hazelwood & Associates) Rules
The following rules apply exclusively to jobs created using the "v4" standard:
*   **Schema**: Data is extracted into the Hazelwood V4 run sheet schema with 12 sections.
*   **ALL CAPS**: All text values must be UPPERCASE.
*   **Order Number Fallback**: Two companies — Eastman Credit Union and Clear Choice Abstracting — sometimes do NOT provide an order number. When missing, use: `"COMPANY NAME - PROPERTY ADDRESS"`.
*   **Output Formats**: V4 jobs support three export formats, each covering all 12 report sections:
    *   **PDF**: Hazelwood-branded multi-page report with Times-Roman font, section page breaks, and all fields fully editable.
    *   **DOCX**: A professional Word document with all 12 sections.
    *   **Markdown**: A structured .md file with all 12 sections.
*   **Standardized Deed Types**: GENERAL WARRANTY, SPECIAL WARRANTY, QUITCLAIM, GIFT DEED, DEED OF ASSUMPTION, ESCHEAT DEED, PARTITION DEED, DEED OF FORECLOSURE, TRUSTEE'S DEED, or OTHER - [DISCOVERED TYPE].
*   **Full Details**: See [docs/rules.md](docs/rules.md) for complete V4 extraction rules.

## 8. V6 System (Enhanced) Rules
The following rules apply exclusively to jobs created using the "v6" standard:
*   **Schema**: Data is extracted into the Enhanced V6 schema extending V5 with additional fields and document accounting.
*   **No Completed Date**: V6 does not include a `completed_date` field in the output.
*   **Additional Order Info**: Captures `assessor_owner`, `assessor_description`, and `acreage` when available.
*   **Expanded Mortgage Fields**: Captures `loan_number`, `min`, and `status` for each mortgage.
*   **Expanded Judgment/Lien Fields**: Captures `interest`, `costs`, `attorneys_fees`, and `status`.
*   **Expanded Misc Document Fields**: Captures `area_or_width` and `notes`.
*   **Document Accounting**: Builds a page-by-page listing of every document in the PDF (`document_accounting[]` array with `page_range` and `document_label`).
*   **Complete Document Review**: Every PDF page must be reviewed and accounted for. Does not rely only on parsed text or cover sheets.
*   **Standardized Deed Types**: GENERAL WARRANTY, SPECIAL WARRANTY, QUITCLAIM, GIFT DEED, DEED OF ASSUMPTION, ESCHEAT DEED, PARTITION DEED, TRUSTEE'S DEED, DEED OF BARGAIN AND SALE, or OTHER - [DISCOVERED TYPE].
*   **Output Formats**: V6 jobs support three export formats, each covering all 8 report sections:
    *   **PDF**: Clean-format multi-page report with standard fonts (Helvetica), 8 sections, document accounting rendered in Additional Information.
    *   **DOCX**: A professional Word document with all 8 sections and expanded fields.
    *   **Markdown**: A structured .md file with all 8 sections and expanded fields.
*   **Full Details**: See [docs/v6_rules.md](docs/v6_rules.md) for complete V6 extraction rules.

---

### **Approval**

By signing below, the customer acknowledges that the rules above accurately represent the requirements for the Abstract ETL automated processing system.

**Customer Signature:** ________________________________________  **Date:** ______________

**Printed Name:** _____________________________________________
