const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

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

const V4_SCHEMA = `{
  "order_info": {
    "order_number": null,
    "company_name": null,
    "effective_date": null,
    "completed_date": null,
    "property_address": null,
    "county": null,
    "township": null,
    "parcel_ids": [],
    "assessed_value": null,
    "land_value": null,
    "improvement_value": null,
    "tax_id": null,
    "tax_amount": null,
    "tax_due": null,
    "tax_delinquent": null,
    "tax_paid": null,
    "current_vesting_owner": null
  },
  "vesting_info": {
    "grantee": null,
    "grantor": null,
    "deed_date": null,
    "recorded_date": null,
    "instrument_book_page": null,
    "deed_type": null,
    "consideration": null,
    "in_out_sale": false,
    "notes": null
  },
  "chain_of_title": [{
    "deed_type": null,
    "grantors": [],
    "grantees": [],
    "deed_date": null,
    "recorded_date": null,
    "instrument_book_page": null,
    "consideration": null,
    "notes": null,
    "related_documents": []
  }],
  "mortgages": [{
    "borrower": null,
    "lender": null,
    "mortgage_amount": null,
    "mortgage_date": null,
    "recorded_date": null,
    "book": null,
    "page": null,
    "instrument": null,
    "maturity_date": null,
    "mortgage_type": null,
    "mers": "No",
    "vesting_status": null,
    "subordination_notes": null,
    "assignments": [{
      "document_type": null,
      "instrument": null,
      "book": null,
      "page": null,
      "recorded_date": null,
      "assignor": null,
      "assignee": null
    }]
  }],
  "associated_documents": [{
    "document_type": null,
    "book_instrument": null,
    "page": null,
    "dated": null,
    "recorded": null,
    "grantor_assignor": null,
    "grantee_assignee": null,
    "notes": null
  }],
  "judgments_liens": [{
    "document_title": null,
    "book_instrument": null,
    "page": null,
    "dated": null,
    "recorded": null,
    "case_number": null,
    "amount": null,
    "plaintiff": null,
    "defendant": null
  }],
  "misc_documents": [{
    "document_title": null,
    "book_instrument": null,
    "page": null,
    "dated": null,
    "recorded": null,
    "grantor_assignor": null,
    "grantee_assignee": null
  }],
  "tax_status": {
    "parcel_id": null,
    "tax_year": null,
    "total_amount": null,
    "status": null,
    "paid_date": null,
    "delinquent_amount": null,
    "installments": [{
      "installment_number": null,
      "amount": null,
      "due_date": null,
      "paid_date": null,
      "status": null,
      "delinquent_amount": null,
      "penalties_fees": null
    }]
  },
  "legal_description": null,
  "additional_information": null,
  "names_searched": [],
  "alternatives": {}
}`;

const SYSTEM_PROMPT_V4 = `You are an expert title abstract processor for Hazelwood & Associates, LLC.
Extract ALL property data from the PDF into the Hazelwood V4 JSON schema.

### CRITICAL EXTRACTION RULES:

1. **ORDER NUMBER**: Extract from the PDF filename or document header. Use the ENTIRE number exactly — no dropped digits, no shortened versions, no breaking apart number groups. This maps to order_info.order_number in the JSON schema. Combine company name with full order number when shown.
   - **FALLBACK RULE**: Two companies — "EASTMAN CREDIT UNION" and "CLEAR CHOICE ABSTRACTING" — sometimes do NOT provide an order number. When the order number is missing for these companies, use: "COMPANY NAME - PROPERTY ADDRESS" (e.g., "EASTMAN CREDIT UNION - 224 OAK LANE ROAD, DRYDEN, VA 24243").

2. **PARCEL IDs**: NEVER drop leading zeros (e.g., "069A17" stays "069A17"). Multiple IDs go in the "parcel_ids" array in source order.

3. **TOWNSHIP**: Default to the CITY from the property address.

4. **TAX INFORMATION**:
   - Capture EVERY installment shown — do NOT assume a two-installment limit.
   - Delinquent is a NUMERIC field, not Yes/No. Show original amount, due date, and full delinquent amount with penalties/fees.
   - Multiple parcels/installments are captured in the "installments" array.

5. **CHAIN OF TITLE**:
   - Use separate numbered entries (1, 2, 3...).
   - Deed Type FIRST, then Grantors and Grantees listed below.
   - Use these simplified deed titles: GENERAL WARRANTY, SPECIAL WARRANTY, QUITCLAIM, GIFT DEED, DEED OF ASSUMPTION, ESCHEAT DEED, PARTITION DEED, DEED OF FORECLOSURE, TRUSTEE'S DEED.
   - If no match, use: "OTHER - [DISCOVERED TYPE]".
   - Consideration comes from the DEED ITSELF only — specific numeric amount or "LOVE AND AFFECTION". Otherwise leave null.
   - In/Out Sale: true if the vesting owner acquires land in pieces or sells a portion.
   - Duplicate names: If someone is both Grantor and Grantee, list in BOTH places.
   - Life estates: Grantor reserving life estate → "Reserving Life Estate", other party → "REMAINDERMENT".
   - Foreclosures: Trustee's Deed = numbered chain entry. Related docs (Account of Sale, Sub Trustee, etc.) go in "related_documents" for that entry, NOT as new chain numbers.

6. **MARITAL LOGIC**:
   - NO separate marital-status field.
   - If instrument says "Husband and Wife" or similar → join names with "&" (e.g., "JOHN SMITH & JANE SMITH").
   - Otherwise → separate with commas (e.g., "JOHN SMITH, JANE SMITH").
   - Always use full names as they appear in that specific instrument.
   - If one instrument lists them as married and another does not, follow the wording of that specific instrument.

7. **NOTES / SPECIAL SITUATIONS**:
   - Only add notes for special situations: will, deceased person, life estate, divorce, third/fourth-party issue, foreclosure-related supporting documents.
   - Do NOT add notes under every deed.
   - Note wording templates:
     - "WILL OF [NAME] [BOOK/PAGE]"
     - "LOH FOR [NAME] [BOOK/PAGE]"
     - "REA FOR [NAME] [BOOK/PAGE OR CASE REFERENCE]"
     - "NO WILL OR LOH FOR [NAME] [DATE OF DEATH]"
     - "REFERENCE MADE TO A WILL FOR [NAME] BUT NONE WAS FOUND"
   - Notes follow the order they appear in source documents.

8. **MORTGAGES**:
   - List from OLDEST to NEWEST by date, unless a subordination agreement changes priority.
   - Associated document types: ASSIGNMENT, SUBSTITUTE TRUSTEE, MODIFICATION, or OTHER.
   - Abbreviations: DOT (Deed of Trust), RFDT (Refinance Deed of Trust), DTCL (Credit Line Deed of Trust).

9. **NAMES SEARCHED**:
   - Borrower (listed first).
   - Every Grantor/Grantee in the Chain.
   - Every heir named in a Will, LOH, or REA.
   - EXCLUDE: Special Commissioners and Trustees on a Trustee's Deed.

10. **LEGAL DESCRIPTION**: Only the VESTING DEED requires a full legal description. Do not repeat for other deeds unless a special note requires it.

11. **ALL CAPS**: All text values must be UPPERCASE.

12. **EXTRACT EVERY FIELD**: Do NOT leave fields null unless they truly don't exist in the document.

13. **ALTERNATIVES**: For any Names, Dates, or Legal Descriptions where OCR is blurry or ambiguous, provide the top 2 alternatives in the "alternatives" object using the field path as key.

### SCHEMA REFERENCE:
${V4_SCHEMA}

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

async function extractFromPDF(pdfPath, originalFilename = '', version = 'v4') {
  const model = getModel();
  const pdfBuffer = fs.readFileSync(pdfPath);

  const prompt =
    version === 'v4'
      ? SYSTEM_PROMPT_V4
      : SYSTEM_PROMPT_V4;

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
    
    if (version === 'v4') {
      console.log('🔍 [V4 Extraction] Raw response length:', rawText.length);
      console.log('🔍 [V4 Extraction] Parsed keys:', Object.keys(parsed));
      console.log('🔍 [V4 Extraction] order_info:', parsed.order_info);
      console.log('🔍 [V4 Extraction] vesting_info:', parsed.vesting_info);
      console.log('🔍 [V4 Extraction] chain_of_title count:', parsed.chain_of_title?.length || 0);
      console.log('🔍 [V4 Extraction] mortgages count:', parsed.mortgages?.length || 0);
    }
    
    return parsed;
  } catch (err) {
    console.error('❌ [GoogleAI] Error:', err.message);
    throw err;
  }
}

module.exports = { extractFromPDF, V4_SCHEMA, SYSTEM_PROMPT_V4 };
