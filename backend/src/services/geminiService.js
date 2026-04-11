const { GoogleGenerativeAI } = require('@google/generative-ai');

function getGenAI() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  return new GoogleGenerativeAI(apiKey);
}

async function testGeminiConnection() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey.includes('your_gemini')) return;

  console.log(`[Gemini] Running startup test...`);
  const variations = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'models/gemini-1.5-flash'];
  
  const genAI = getGenAI();
  for (const v of variations) {
    try {
      const model = genAI.getGenerativeModel({ model: v });
      const result = await model.generateContent('Say "Ready"');
      console.log(`✅ [Gemini] Test Success with variation "${v}": "${result.response.text().trim()}"`);
      return v; // Return working variation
    } catch (err) {
      console.warn(`⚠️ [Gemini] Variation "${v}" failed: ${err.message}`);
    }
  }
  console.error('❌ [Gemini] All variations failed.');
}

testGeminiConnection();

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

const SYSTEM_PROMPT = `You are an expert title abstract processor. Extract all data and return ONLY valid JSON matching this schema.
Return ONLY JSON — no markdown. Use MM/DD/YYYY dates.
${FIELD_SCHEMA}`;

async function extractFromImages(base64Images) {
  const genAI = getGenAI();
  // Try stable flash model
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const imageParts = base64Images.map(b64 => ({
    inlineData: { mimeType: 'image/jpeg', data: b64 }
  }));

  try {
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      ...imageParts,
      { text: 'Extract JSON from these images.' }
    ]);

    const responseText = result.response.text().trim();
    const cleaned = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('❌ [Gemini] AI Error:', err.message);
    const aiError = new Error(`Gemini AI Error: ${err.message}`);
    aiError.status = 502; 
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
