const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const { DEED_TYPES, VESTING_STATUSES, MORTGAGE_TYPES } = require('./proTitleConstants');

/**
 * Native Google AI Service
 * Supports v1 (Legacy) and v2 (ProTitleUSA) extraction.
 */

function getModel() {
  const apiKey = (process.env.GOOGLE_AI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is missing from environment.');

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ 
    model: 'gemini-3-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });
}

const V1_SCHEMA = `{
  "order_info": { "file_number": null, "property_address": null, "effective_date": null, "completed_date": null, "county": null, "township": null, "parcel_id": null, "assessed_value": null, "land_value": null, "improvement_value": null, "tax_id": null, "tax_amount_1st": null, "tax_amount_2nd": null, "tax_due_1st": null, "tax_due_2nd": null, "tax_delinquent": null, "tax_paid": null, "excise_tax": null, "search_depth": null, "current_vesting_owner": null, "marital_status": null },
  "chain_of_title": [{ "document_title": null, "book_instrument": null, "page": null, "dated": null, "recorded": null, "consideration": null, "in_out_sale": null, "grantors": [], "grantees": [], "notes": null }],
  "mortgages": [{ "document_title": null, "book_instrument": null, "page": null, "dated": null, "recorded": null, "consideration": null, "maturity_date": null, "lender": null, "mers_number": null, "borrower": null, "trustee": null, "notes": null }],
  "associated_documents": [{ "document_title": null, "consideration": null, "dated": null, "book_instrument": null, "page": null, "recorded": null, "grantor_assignor": null, "grantee_assignee": null, "notes": null }],
  "judgments_liens": [{ "document_title": null, "book_instrument": null, "page": null, "dated": null, "recorded": null, "case_number": null, "amount": null, "plaintiff": null, "defendant": null, "notes": null }],
  "misc_documents": [{ "document_title": null, "book_instrument": null, "page": null, "dated": null, "recorded": null, "consideration": null, "grantor_assignor": null, "grantee_assignee": null, "notes": null }],
  "legal_description": null, "additional_information": null, "names_searched": [], "alternatives": {}
}`;

const V2_SCHEMA = `{
  "property_info": { "order_no": null, "current_owner": null, "address": null, "apn_parcel_pin": null, "county": null, "completed_date": null, "index_date": null, "misc_info_to_examiner": null },
  "vesting_info": { "grantee": null, "grantor": null, "deed_date": null, "recorded_date": null, "instrument_book_page": null, "vbook_num": null, "vpage_num": null, "consideration_amount": null, "sale_price": null, "deed_type": null, "probate_status": null, "divorce_status": null, "notes": null },
  "chain_of_title": [{ "grantee": null, "grantor": null, "deed_date": null, "recorded_date": null, "instrument_book_page": null, "vbook_num": null, "vpage_num": null, "consideration_amount": null, "deed_type": null, "notes": null }],
  "mortgages": [{ "borrower": null, "lender": null, "mortgage_amount": null, "mortgage_date": null, "recorded_date": null, "book": null, "page": null, "instrument": null, "maturity_date": null, "mortgage_type": null, "mers": "No", "vesting_status": null, "assignments": [{ "document_type": null, "instrument": null, "book": null, "page": null, "recorded_date": null, "assignor": null, "assignee": null }] }],
  "tax_status": { "parcel_id": null, "tax_year": null, "total_amount": null, "status": null, "paid_date": null, "delinquent_amount": null },
  "legal_description": null,
  "alternatives": {}
}`;

const SYSTEM_PROMPT_V2 = `You are an expert title abstract processor.
Extract property data into the ProTitleUSA v2 JSON schema.

### MANDATORY RULES:
1. **ALL CAPS**: All text values must be UPPERCASE.
2. **DEED TYPE MATCHING**: Match the discovered deed type against this list: [${DEED_TYPES.join(', ')}].
   - If a near match is found, use the exact string from the list.
   - If NO match is found, use the format: "OTHER - [DISCOVERED TYPE]".
3. **MORTGAGE TYPE MATCHING**: Match against: [${MORTGAGE_TYPES.join(', ')}].
4. **VESTING STATUS**: Match against: [${VESTING_STATUSES.join(', ')}].
5. **ALTERNATIVES**: For any Names, Dates, or Legal Descriptions where OCR is blurry or ambiguous, provide the top 2 alternatives in the "alternatives" object using the field path as key.

Return valid JSON:
${V2_SCHEMA}`;

async function extractFromPDF(pdfPath, originalFilename = '', version = 'v1') {
  const model = getModel();
  const pdfBuffer = fs.readFileSync(pdfPath);

  const prompt =
    version === 'v2'
      ? SYSTEM_PROMPT_V2
      : `The original schema is: ${V1_SCHEMA}. Use All Caps. Use Schema: ${V1_SCHEMA}`;

  const promptParts = [
    { text: `Filename: "${originalFilename}"` },
    { text: prompt },
    {
      inlineData: {
        data: pdfBuffer.toString('base64'),
        mimeType: 'application/pdf',
      },
    },
  ];

  try {
    const result = await model.generateContent(promptParts);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (err) {
    console.error('❌ [GoogleAI] Error:', err.message);
    throw err;
  }
}

module.exports = { extractFromPDF };
