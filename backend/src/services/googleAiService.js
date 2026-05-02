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
    model: 'gemini-2.5-flash',
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
Extract ALL property data from the PDF into the ProTitleUSA v2 JSON schema.

### CRITICAL INSTRUCTIONS:
1. **EXTRACT EVERY FIELD**: Do NOT leave fields null unless they truly don't exist in the document.
2. **ALL CAPS**: All text values must be UPPERCASE.
3. **DEED TYPE MATCHING**: Match the discovered deed type against this list: [${DEED_TYPES.join(', ')}].
   - If a near match is found, use the exact string from the list.
   - If NO match is found, use the format: "OTHER - [DISCOVERED TYPE]".
4. **MORTGAGE TYPE MATCHING**: Match against: [${MORTGAGE_TYPES.join(', ')}].
5. **VESTING STATUS**: Match against: [${VESTING_STATUSES.join(', ')}].
6. **CHAIN OF TITLE**: Extract ALL entries from the chain, not just the first one.
7. **MORTGAGES**: Extract ALL mortgages/deeds of trust with complete details.
8. **ALTERNATIVES**: For any Names, Dates, or Legal Descriptions where OCR is blurry or ambiguous, provide the top 2 alternatives in the "alternatives" object using the field path as key.

### SCHEMA REFERENCE:
${V2_SCHEMA}

Return ONLY valid JSON matching the schema above. Every field must have a value if it exists in the document.`;

function sanitizeJsonResponse(text) {
  let cleaned = text.trim();

  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();

  // Find the outermost { ... } pair by tracking brace depth
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) return cleaned;

  let depth = 0;
  let endIndex = -1;
  for (let i = firstBrace; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    if (cleaned[i] === '}') {
      depth--;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex > firstBrace) {
    cleaned = cleaned.slice(firstBrace, endIndex + 1);
  }

  return cleaned;
}

function parseJsonResponse(rawText, pdfFilename) {
  const sanitized = sanitizeJsonResponse(rawText);

  try {
    return JSON.parse(sanitized);
  } catch (firstError) {
    // If parsing fails, try stripping trailing commas and single quotes
    try {
      const fixed = sanitized
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/\\'/g, "'")
        .replace(/'/g, '"');
      return JSON.parse(fixed);
    } catch (secondError) {
      // Log details and re-throw the original error
      console.error(`❌ [JSON Parse] Failed for ${pdfFilename}`);
      console.error(`❌ [JSON Parse] Raw length: ${rawText.length}, sanitized length: ${sanitized.length}`);
      console.error('❌ [JSON Parse] Last 200 chars of sanitized:', sanitized.slice(-200));
      throw firstError;
    }
  }
}

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
    const rawText = response.text();
    const parsed = parseJsonResponse(rawText, originalFilename);
    
    // Debug logging for v2 extraction
    if (version === 'v2') {
      console.log('🔍 [V2 Extraction] Raw response length:', rawText.length);
      console.log('🔍 [V2 Extraction] Parsed keys:', Object.keys(parsed));
      console.log('🔍 [V2 Extraction] property_info:', parsed.property_info);
      console.log('🔍 [V2 Extraction] vesting_info:', parsed.vesting_info);
      console.log('🔍 [V2 Extraction] chain_of_title count:', parsed.chain_of_title?.length || 0);
      console.log('🔍 [V2 Extraction] mortgages count:', parsed.mortgages?.length || 0);
    }
    
    return parsed;
  } catch (err) {
    console.error('❌ [GoogleAI] Error:', err.message);
    throw err;
  }
}

module.exports = { extractFromPDF };
