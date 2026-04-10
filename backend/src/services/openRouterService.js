const OpenAI = require('openai');

function getClient() {
  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
  return new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/builtnetworks/abstract-etl',
      'X-Title': 'Abstract ETL Tool'
    }
  });
}

// Default to the free variant
const DEFAULT_MODEL = 'google/gemini-flash-1.5-8b:free';

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
You will be given images of scanned property abstract documents.

Your task is to extract all relevant data and return ONLY valid JSON matching this exact schema.
Rules:
- Return ONLY the JSON object — no markdown, no explanation, no backticks
- For any field you cannot find or confirm, use null (not empty string)
- For dates: use MM/DD/YYYY format
- For dollar amounts: omit the $ sign and commas (e.g. "210000.00")
- For arrays like grantors/grantees: include all names found
- For chain of title: list entries in reverse chronological order (most recent first)
- Notes field: capture any asterisk (*) notations exactly as written

Schema to populate:
${FIELD_SCHEMA}`;

async function extractFromImages(base64Images) {
  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!apiKey || apiKey.includes('your_openrouter_api_key')) {
    const err = new Error('OPENROUTER_API_KEY is missing or invalid');
    err.status = 500;
    throw err;
  }
  
  let model = process.env.AI_MODEL || DEFAULT_MODEL;
  
  // Auto-fix: If user provided the 8b model without :free, and they are getting 401s, 
  // we can't easily auto-fix it here without potentially annoying paid users,
  // so we'll just log it clearly.
  console.log(`[OpenRouter] Requesting extraction: model=${model}, images=${base64Images.length}, key_prefix=${apiKey.substring(0, 10)}...`);

  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all data from these document images and return the populated JSON schema.' },
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
    
    if (err.status === 401) {
      console.error('👉 TIP: "User not found" or 401 usually means an invalid API key OR you are using a paid model without credits.');
      console.error('👉 TRY: Setting AI_MODEL=google/gemini-flash-1.5-8b:free in your .env');
    }

    const aiError = new Error(`AI Provider Error: ${err.message}`);
    aiError.status = 502; 
    aiError.data = err.response?.data;
    throw aiError;
  }
}

/**
 * Intelligent merge: keeps the most complete record for scalars,
 * and deduplicates array entries by key fields.
 */
function mergeExtractions(first, second) {
  const merged = { ...first };

  const arrayKeys = ['chain', 'mortgages', 'assoc_docs'];
  arrayKeys.forEach(key => {
    const firstArr  = Array.isArray(first[key]) ? first[key] : [];
    const secondArr = Array.isArray(second[key]) ? second[key] : [];
    
    // Combine and deduplicate based on a "fingerprint" of the entry
    const combined = [...firstArr, ...secondArr];
    const seen = new Set();
    merged[key] = combined.filter(item => {
      if (!item || typeof item !== 'object') return false;
      // Create a fingerprint from title + date + book/page
      const fingerprint = `${item.document_title || ''}-${item.dated || ''}-${item.book_instrument || ''}-${item.page || ''}`;
      if (fingerprint === '---' || seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    });
  });

  // Fill in any nulls in 'first' with data from 'second'
  Object.keys(second).forEach(key => {
    if (!arrayKeys.includes(key) && (merged[key] === null || merged[key] === undefined)) {
      merged[key] = second[key];
    }
  });

  return merged;
}

module.exports = { extractFromImages, mergeExtractions };
