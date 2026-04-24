const OpenAI = require('openai');

/**
 * OpenRouter Service
 * Standardized on google/gemini-2.0-flash-001 for stability and accuracy.
 */

function getClient() {
  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  return new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/builtnetworks/abstract-etl',
      'X-Title': 'Abstract ETL Tool'
    }
  });
}

// HARDCODED WORKING MODEL
const PRIMARY_MODEL = 'google/gemini-2.0-flash-001';

async function testConnection() {
  const rawKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const cleanKey = rawKey.replace(/^["']|["']$/g, '');
  
  if (!cleanKey || cleanKey.length < 10) {
    console.error('❌ [OpenRouter] No API key detected.');
    return;
  }

  console.log(`[OpenRouter] Startup Test using: ${PRIMARY_MODEL}`);
  
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: PRIMARY_MODEL,
      messages: [{ role: 'user', content: 'Say "Ready"' }],
      max_tokens: 10
    });
    console.log(`✅ [OpenRouter] Startup Test Success: "${response.choices[0].message.content.trim()}"`);
  } catch (err) {
    console.error(`❌ [OpenRouter] Startup Test Failed: ${err.status} ${err.message}`);
  }
}

testConnection();

const FIELD_SCHEMA = `{
  "order_info": {
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
    "excise_tax": null,
    "search_depth": null,
    "current_vesting_owner": null,
    "marital_status": null
  },
  "chain_of_title": [
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
      "notes": null
    }
  ],
  "associated_documents": [
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
      "notes": null
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
      "defendant": null,
      "notes": null
    }
  ],
  "misc_documents": [
    {
      "index": 1,
      "document_title": null,
      "book_instrument": null,
      "page": null,
      "dated": null,
      "recorded": null,
      "consideration": null,
      "grantor_assignor": null,
      "grantee_assignee": null,
      "notes": null
    }
  ],
  "legal_description": null,
  "additional_information": null,
  "names_searched": [],
  "alternatives": {}
}`;

const SYSTEM_PROMPT = `You are an expert title abstract processor with 20 years of experience.
Your task is to extract ALL relevant data from the scanned property documents and return valid JSON.

### CRITICAL ACCURACY RULES:
1. **PROPERTY ADDRESS**: Capture the COMPLETE address (Street, City, State, and Zip Code). Do not truncate.
2. **PARCEL ID / TAX ID**: Capture the exact string. Include all dashes, dots, or parentheses.
3. **TAX INFORMATION**: Look for split installments (1st and 2nd). Populate tax_amount_1st, tax_amount_2nd, etc. accordingly.
4. **IN/OUT SALE**: 
   - Set "in_out_sale" to true if "Yes" or "Out" is marked for a deed.
   - Set "in_out_sale" to false if "No" or "In" is marked.
5. **COMPLETE CHAIN**: Extract EVERY deed or document listed in the "Chain-of-Title" section. 
6. **MORTGAGES / DOT**: Extract ALL mortgages and Deeds of Trust. Capture Borrower and Trustee names.
7. **ASSOCIATED DOCUMENTS**: Capture Assignments, Subordinations, and Releases here.
8. **LEGAL DESCRIPTION**: Capture the ENTIRE text word-for-word. Do NOT summarize or use "...".
9. **NOTES**: Capture any field notes prefixed with an asterisk (*) or in marginalia.
10. **NAMES SEARCHED**: Include EVERY name listed in the search section.

### ALTERNATIVES FEATURE:
If a field is difficult to read (handwritten, blurry, or ambiguous like "Cook" vs "Cash"), provide your best guess in the primary field and list up to 2 other possible interpretations in the "alternatives" object.
The "alternatives" object should be keyed by the JSON path of the field.
Example: "alternatives": { "order_info.current_vesting_owner": ["JOHN S. BLILEY", "JOHN B. SMILEY"] }

### FORMATTING:
- Return ONLY the JSON object.
- Use MM/DD/YYYY for all dates.
- Use commas in dollar amounts (e.g., "142,900.00").

Schema to populate:
${FIELD_SCHEMA}`;

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function extractFromImages(base64Images, retryCount = 0) {
  const MAX_RETRIES = 3;
  console.log(`[OpenRouter] Extracting with model: ${PRIMARY_MODEL} (${base64Images.length} images) - Attempt ${retryCount + 1}`);

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: PRIMARY_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract JSON data from these property images according to the schema and critical accuracy rules. Be thorough and capture all details.' },
            ...base64Images.map(b64 => ({
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${b64}` }
            }))
          ]
        }
      ],
      response_format: { type: 'json_object' }
    });

    const responseText = response.choices[0].message.content.trim();
    const cleaned = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    // Retry on 429 (Rate Limit) or 504 (Timeout/Aborted) or 502 (Bad Gateway)
    if ((err.status === 429 || err.status === 504 || err.status === 502) && retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
      console.warn(`⚠️ [OpenRouter] Error ${err.status}. Retrying in ${delay}ms...`);
      await sleep(delay);
      return extractFromImages(base64Images, retryCount + 1);
    }

    console.error(`❌ [OpenRouter] AI Error:`, err.status, err.message);
    const aiError = new Error(`AI Provider Error: ${err.message}`);
    aiError.status = err.status || 502; 
    aiError.data = err.response?.data;
    throw aiError;
  }
}

function mergeExtractions(first, second) {
  const merged = { ...first };
  
  // Merge order_info carefully - don't let nulls in 'second' overwrite values in 'first'
  merged.order_info = { ...(first.order_info || {}) };
  if (second.order_info) {
    Object.keys(second.order_info).forEach(key => {
      const val = second.order_info[key];
      // Only overwrite if the current value is empty/null and the new value is NOT empty/null
      if ((val !== null && val !== undefined && val !== '') && (!merged.order_info[key])) {
        merged.order_info[key] = val;
      }
    });
  }

  const arrayKeys = ['chain_of_title', 'mortgages', 'associated_documents', 'judgments_liens', 'misc_documents', 'names_searched'];
  
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

  // Merge top level strings
  ['legal_description', 'additional_information'].forEach(key => {
    if (!merged[key] && second[key]) merged[key] = second[key];
  });

  // Merge alternatives
  merged.alternatives = { ...(first.alternatives || {}), ...(second.alternatives || {}) };

  return merged;
}

module.exports = { extractFromImages, mergeExtractions };
