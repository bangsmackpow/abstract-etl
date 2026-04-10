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

const DEFAULT_MODEL = 'google/gemini-flash-1.5-8b:free';

async function testConnection() {
  const rawKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const cleanKey = rawKey.replace(/^["']|["']$/g, '');
  
  if (!cleanKey || cleanKey.length < 10) {
    console.error('❌ [OpenRouter] No API key detected or key too short.');
    return;
  }

  const model = process.env.AI_MODEL || DEFAULT_MODEL;
  console.log(`[OpenRouter] Startup Test: model=${model}, key_start=${cleanKey.substring(0, 10)}...`);
  
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: 'Say "Ready"' }],
      max_tokens: 10
    });
    console.log(`✅ [OpenRouter] Startup Test Success: "${response.choices[0].message.content.trim()}"`);
  } catch (err) {
    console.error(`❌ [OpenRouter] Startup Test Failed: ${err.status} ${err.message}`);
    if (err.status === 401) {
      console.error('   👉 ACTION REQUIRED: Your API key is being rejected.');
      console.error('   👉 1. Ensure your key starts with sk-or-v1-');
      console.error('   👉 2. Check your OpenRouter dashboard balance (some "free" models require $1 credit).');
      console.error('   👉 3. Ensure AI_MODEL is set to google/gemini-flash-1.5-8b:free (with the :free suffix).');
    }
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
  ]
}`;

const SYSTEM_PROMPT = `You are an expert title abstract processor. Extract data and return ONLY valid JSON.
${FIELD_SCHEMA}`;

async function extractFromImages(base64Images) {
  let model = process.env.AI_MODEL || DEFAULT_MODEL;
  
  // Hard enforcement of the free suffix if the user forgot it
  if (model === 'google/gemini-flash-1.5-8b') {
    console.warn(`⚠️ [OpenRouter] Automatically appending :free to model ID to avoid 401 errors.`);
    model = 'google/gemini-flash-1.5-8b:free';
  }

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
  const arrayKeys = ['chain', 'mortgages', 'assoc_docs'];
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
    if (!arrayKeys.includes(key) && (merged[key] === null || merged[key] === undefined)) {
      merged[key] = second[key];
    }
  });
  return merged;
}

module.exports = { extractFromImages, mergeExtractions };
