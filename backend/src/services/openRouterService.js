const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/builtnetworks/abstract-etl',
    'X-Title': 'Abstract ETL Tool'
  }
});

// Use :free suffix to avoid 404s on free tier
const DEFAULT_MODEL = process.env.AI_MODEL || 'google/gemini-flash-1.5-8b:free';

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

async function extractFromImages(base64Images) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENROUTER_API_KEY is missing');
    err.status = 500;
    throw err;
  }
  
  console.log(`[OpenRouter] Requesting extraction from model: ${DEFAULT_MODEL}`);

  try {
    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
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
    console.error('❌ [OpenRouter] AI Error:', err.status, err.message);
    if (err.response?.data) console.error('   AI Response Data:', JSON.stringify(err.response.data));
    
    // Convert AI 401s to 502s so they don't trigger app logouts
    const aiError = new Error(`AI Provider Error: ${err.message}`);
    aiError.status = 502; 
    aiError.data = err.response?.data;
    throw aiError;
  }
}

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
