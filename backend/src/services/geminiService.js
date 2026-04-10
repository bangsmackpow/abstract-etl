const { GoogleGenerativeAI } = require('@google/generative-ai');

// Function to handle key trimming
function getGenAI() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Startup test for Gemini
 */
async function testGeminiConnection() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey.includes('your_gemini')) {
    console.error('⚠️ [Gemini] No valid API key found in environment.');
    return;
  }

  console.log(`[Gemini] Running startup test...`);
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const result = await model.generateContent('Say "Ready"');
    console.log(`✅ [Gemini] Test result: "${result.response.text().trim()}"`);
  } catch (err) {
    console.error(`❌ [Gemini] Startup Test Failed: ${err.message}`);
  }
}

testGeminiConnection();

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
  ],
  "judgments_liens": [
    {
      "index": 1,
      "document_title": null,
      "book_instrument": null,
      "page": null,
      "dated": null,
      "recorded": null,
      "case_number": null,
      "amount": null,
      "plaintiff": null,
      "defendant": null
    }
  ],
  "miscellaneous": [
    {
      "index": 1,
      "document_title": null,
      "book_instrument": null,
      "page": null,
      "dated": null,
      "recorded": null,
      "consideration": null,
      "grantor_assignor": null,
      "grantee_assignee": null
    }
  ],
  "legal_description": null,
  "additional_information": null,
  "names_searched": []
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
- Notes field on chain entries: capture any asterisk (*) notations exactly as written
- legal_description: capture the full legal description text if found

Schema to populate:
${FIELD_SCHEMA}`;

/**
 * Send images to Gemini and get extracted fields JSON
 */
async function extractFromImages(base64Images) {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  // Build image parts for Gemini
  const imageParts = base64Images.map(b64 => ({
    inlineData: { mimeType: 'image/jpeg', data: b64 }
  }));

  try {
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      ...imageParts,
      { text: 'Extract JSON from these document images.' }
    ]);

    const responseText = result.response.text().trim();
    const cleaned = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('❌ [Gemini] AI Error:', err.message);
    const aiError = new Error(`Gemini AI Error: ${err.message}`);
    aiError.status = 502; // Map to 502 to avoid 401 logout issues
    throw aiError;
  }
}

/**
 * Intelligent merge logic
 */
function mergeExtractions(first, second) {
  const merged = { ...first };
  const arrayKeys = ['chain', 'mortgages', 'assoc_docs', 'judgments_liens', 'miscellaneous', 'names_searched'];
  
  arrayKeys.forEach(key => {
    const firstArr  = Array.isArray(first[key]) ? first[key] : [];
    const secondArr = Array.isArray(second[key]) ? second[key] : [];
    
    if (key === 'names_searched') {
      merged[key] = [...new Set([...firstArr, ...secondArr])];
      return;
    }

    const combined = [...firstArr, ...secondArr];
    const seen = new Set();
    
    merged[key] = combined.filter(item => {
      if (!item || typeof item !== 'object') return false;
      const fingerprint = `${item.document_title || ''}-${item.dated || ''}-${item.book_instrument || ''}-${item.page || ''}`;
      if (fingerprint === '---' || seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    });
  });

  Object.keys(second).forEach(key => {
    if (!arrayKeys.includes(key) && (merged[key] === null || merged[key] === undefined || merged[key] === '')) {
      merged[key] = second[key];
    }
  });

  return merged;
}

module.exports = { extractFromImages, mergeExtractions };
