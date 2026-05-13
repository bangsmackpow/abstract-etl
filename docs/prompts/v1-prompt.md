# V1 Legacy Extraction Prompt

**Version**: 1.0.0  
**Effective**: 2026-05-13  
**Model**: gemini-2.5-flash  

---

**NOTE**: V1 currently uses the same extraction prompt as V4 (see `v4-prompt.md`). The AI produces V4-structured JSON regardless of template version. The V1 form component maps these fields to its own display schema.

The V1 form displays:
- Order Information (file_number, company_name, effective_date, completed_date, property_address, county, township, parcel_ids)
- Vesting Information (grantee, grantor, deed_date, recorded_date, instrument_book_page, deed_type, consideration, in_out_sale)
- Chain of Title (numbered entries with deed type, grantors, grantees, dates, instrument/book/page)
- Mortgages (borrower, lender, amount, dates, book/page/instrument, MERS, vesting status)
- Tax Status (parcel_id, tax_year, total_amount, status, paid_date)
- Legal Description
- Additional Information
- Names Searched

When V1-specific extraction rules are developed, they will be documented here as a separate prompt.
