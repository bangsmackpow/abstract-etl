const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Field schema sent to Gemini in the prompt ─────────────────────────────────
const FIELD_SCHEMA = `{
  "file_number": null,
  "property_address": null,
  "effective_date": null,
  "completed_date": null,
  "county": null,
  "township": null,
  "parcel_id": null,
  "assessed_value": null,
  "land_value": null,
  "improvement_value": null,
  "tax_id": null,
  "tax_amount_1st": null,
  "tax_amount_2nd": null,
  "tax_due_1st": null,
  "tax_due_2nd": null,
  "tax_delinquent": null,
  "tax_paid": null,
  "current_vesting_owner": null,
  "chain": [
    {
      "index": 1,
      "document_title": null,
      "book_instrument": null,
      "page": null,
      "dated": null,
      "recorded": null,
      "consideration": null,
      "in_out_sale": null,
      "grantors": [],
      "grantees": [],
      "notes": null
    }
  ],
  "mortgages": [
    {
      "index": 1,
      "document_title": null,
      "book_instrument": null,
      "page": null,
      "dated": null,
      "recorded": null,
      "consideration": null,
      "maturity_date": null,
      "lender": null,
      "mers_number": null,
      "borrower": null,
      "trustee": null,
      "open_mortgages_to_report": null
    }
  ],
  "assoc_docs": [
    {
      "index": 1,
      "document_title": null,
      "consideration": null,
      "dated": null,
      "book_instrument": null,
      "page": null,
      "recorded": null,
      "grantor_assignor": null,
      "grantee_assignee": null,
      "open_closed": null
    }
  ]
}`;

const SYSTEM_PROMPT = `You are an expert title abstract processor with 20 years of experience reading property records.
You will be given images of scanned property abstract documents (deeds, tax records, title searches, plat maps, mortgage documents).

Your task is to extract all relevant data and return ONLY valid JSON matching this exact schema.
Rules:
- Return ONLY the JSON object — no markdown, no explanation, no backticks
- For any field you cannot find or confirm, use null (not empty string)
- For dates: use MM/DD/YYYY format
- For dollar amounts: omit the $ sign and commas (e.g. "210000.00")
- For arrays like grantors/grantees: include all names found
- For chain of title: list entries in reverse chronological order (most recent first)
- For "in_out_sale": true means it IS an arm's-length sale, false means it is NOT
- For "open_closed" on assoc_docs: use "open" or "closed"
- Include ALL chain of title entries, ALL mortgages, and ALL associated documents you find
- Notes field on chain entries: capture any asterisk (*) notations exactly as written

Schema to populate:
${FIELD_SCHEMA}`;

/**
 * Send images to Gemini and get extracted fields JSON
 */
async function extractFromImages(base64Images) {
  // Use gemini-1.5-flash-latest (sometimes resolved 404s with stable names)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  // Build image parts for Gemini
  const imageParts = base64Images.map(b64 => ({
    inlineData: { mimeType: 'image/jpeg', data: b64 }
  }));

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    ...imageParts,
    { text: 'Extract all data from these document images and return the populated JSON schema.' }
  ]);

  const responseText = result.response.text().trim();

  // Strip any accidental markdown fences
  const cleaned = responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  return JSON.parse(cleaned);
}

/**
 * Merge two extraction results
 */
function mergeExtractions(first, second) {
  const merged = { ...first };

  ['chain', 'mortgages', 'assoc_docs'].forEach(key => {
    const firstArr  = first[key]  || [];
    const secondArr = second[key] || [];
    if (secondArr.length > firstArr.length) {
      merged[key] = secondArr;
    } else {
      merged[key] = firstArr;
    }
  });

  Object.keys(second).forEach(key => {
    if (!Array.isArray(second[key]) && (merged[key] === null || merged[key] === undefined)) {
      merged[key] = second[key];
    }
  });

  return merged;
}

module.exports = { extractFromImages, mergeExtractions };
