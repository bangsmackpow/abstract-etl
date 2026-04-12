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

const SYSTEM_PROMPT = `You are an expert title abstract processor with 20 years of experience.
Your task is to extract ALL relevant data from the scanned property documents and return valid JSON.

### CRITICAL ACCURACY RULES:
1. **PROPERTY ADDRESS**: Capture the COMPLETE address (Street, City, State, and Zip Code). Do not truncate.
2. **PARCEL ID / TAX ID**: Capture the exact string. If it contains parenthesis or dashes, include them exactly as written.
3. **IN/OUT SALE**: 
   - Look at the "In/Out Sale" section for each deed in the chain.
   - If "Yes" is checked or marked, set "in_out_sale" to true.
   - If "No" is checked or marked, set "in_out_sale" to false.
4. **COMPLETE CHAIN**: Extract EVERY deed or document listed in the "Chain-of-Title" section across all pages. Do not skip any entries.
5. **MORTGAGES / DOT**: Extract ALL mortgages and Deeds of Trust. Ensure you capture the Borrower and Trustee names for each.
6. **CURRENCY**: You SHOULD use commas in dollar amounts (e.g. "210,000.00").
7. **LEGAL DESCRIPTION**: Capture the ENTIRE legal description text word-for-word. Do NOT use "..." or summarize.
8. **NAMES SEARCHED**: Include EVERY individual or entity name listed in the "Names Searched" section.

### FORMATTING:
- Return ONLY the JSON object. No markdown, no explanation.
- Use null for missing fields.
- Use MM/DD/YYYY for all dates.

Schema to populate:
${FIELD_SCHEMA}`;

async function extractFromImages(base64Images) {
  console.log(`[OpenRouter] Extracting with model: ${PRIMARY_MODEL} (${base64Images.length} images)`);

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: PRIMARY_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract JSON data from these property images according to the schema and critical accuracy rules.' },
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
    console.error(`❌ [OpenRouter] AI Error:`, err.status, err.message);
    const aiError = new Error(`AI Provider Error: ${err.message}`);
    aiError.status = 502; 
    aiError.data = err.response?.data;
    throw aiError;
  }
}

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
