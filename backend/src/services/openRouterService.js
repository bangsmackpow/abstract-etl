const OpenAI = require('openai');

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

const DEFAULT_MODEL = 'google/gemini-2.0-flash-001';

async function testConnection() {
  const rawKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const cleanKey = rawKey.replace(/^["']|["']$/g, '');
  
  if (!cleanKey || cleanKey.length < 10) return;

  let model = (process.env.AI_MODEL || DEFAULT_MODEL).trim();
  if (model.endsWith(':free')) model = model.replace(':free', '');

  console.log(`[OpenRouter] Startup Test: model=${model}, key_start=${cleanKey.substring(0, 10)}...`);
  
  const variations = [model, `${model}:free`, 'google/gemini-2.0-flash-001'];
  const client = getClient();

  for (const v of variations) {
    try {
      const response = await client.chat.completions.create({
        model: v,
        messages: [{ role: 'user', content: 'Say "Ready"' }],
        max_tokens: 10
      });
      console.log(`✅ [OpenRouter] Test Success with variation "${v}": "${response.choices[0].message.content.trim()}"`);
      return v;
    } catch (err) {
      console.warn(`⚠️ [OpenRouter] Variation "${v}" failed: ${err.status} ${err.message}`);
    }
  }
  console.error('❌ [OpenRouter] All variations failed.');
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

### CRITICAL INSTRUCTIONS:
1. **CAPTURE FULL DATA**: Do not summarize. If a document has 5 deeds, you must list all 5 in the "chain". If there are multiple tax parcels or IDs, capture them all.
2. **PROPERTY ADDRESS**: Always capture the COMPLETE address including Street, City, State, and Zip.
3. **IN/OUT SALE LOGIC**: 
   - Look for the "In/Out Sale" checkboxes on the search order.
   - If "Yes" is checked for a deed, set "in_out_sale" to true.
   - If "No" is checked, set "in_out_sale" to false.
4. **CURRENCY**: You MAY use commas in dollar amounts (e.g., "210,000.00").
5. **LEGAL DESCRIPTION**: Capture the FULL text of the legal description. Do not truncate with "...".
6. **NAMES SEARCHED**: List EVERY name mentioned in the "Names Searched" section of the document.
7. **MORTGAGES**: Capture all Deeds of Trust (DOT). Ensure you find the Borrower and Trustee names for each.

### RULES:
- Return ONLY the JSON object — no markdown, no explanation.
- Use null for missing fields.
- Use MM/DD/YYYY for dates.

Schema to populate:
${FIELD_SCHEMA}`;

async function extractFromImages(base64Images) {
  let model = (process.env.AI_MODEL || DEFAULT_MODEL).trim();
  if (model.endsWith(':free')) model = model.replace(':free', '');

  console.log(`[OpenRouter] Extracting: model=${model}, images=${base64Images.length}`);

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract JSON from these images.' },
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
    console.error(`❌ [OpenRouter] AI Error (${model}):`, err.status, err.message);
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
