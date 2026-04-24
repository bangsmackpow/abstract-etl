const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

/**
 * Native Google AI Service
 * Bypasses OpenRouter for native PDF pass-through and maximum accuracy.
 */

function getModel() {
  const apiKey = (process.env.GOOGLE_AI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is missing from environment.');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });
}

async function testConnection() {
  const apiKey = (process.env.GOOGLE_AI_API_KEY || '').trim();
  if (!apiKey) {
    console.warn('⚠️ [GoogleAI] GOOGLE_AI_API_KEY not set.');
    return;
  }

  try {
    const model = getModel();
    const result = await model.generateContent("Say 'Ready'");
    const response = await result.response;
    console.log(`✅ [GoogleAI] Connection Verified: "${response.text().trim()}"`);
  } catch (err) {
    console.error(`❌ [GoogleAI] Connection Failed:`, err.message);
  }
}

testConnection();

const FIELD_SCHEMA = `{
  "order_info": {
    "file_number": null, "property_address": null, "effective_date": null, "completed_date": null,
    "county": null, "township": null, "parcel_id": null, "assessed_value": null,
    "land_value": null, "improvement_value": null, "tax_id": null,
    "tax_amount_1st": null, "tax_amount_2nd": null, "tax_due_1st": null, "tax_due_2nd": null,
    "tax_delinquent": null, "tax_paid": null, "excise_tax": null, "search_depth": null,
    "current_vesting_owner": null, "marital_status": null
  },
  "chain_of_title": [{ "document_title": null, "book_instrument": null, "page": null, "dated": null, "recorded": null, "consideration": null, "in_out_sale": null, "grantors": [], "grantees": [], "notes": null }],
  "mortgages": [{ "document_title": null, "book_instrument": null, "page": null, "dated": null, "recorded": null, "consideration": null, "maturity_date": null, "lender": null, "mers_number": null, "borrower": null, "trustee": null, "notes": null }],
  "associated_documents": [{ "document_title": null, "consideration": null, "dated": null, "book_instrument": null, "page": null, "recorded": null, "grantor_assignor": null, "grantee_assignee": null, "notes": null }],
  "judgments_liens": [{ "document_title": null, "book_instrument": null, "page": null, "dated": null, "recorded": null, "case_number": null, "amount": null, "plaintiff": null, "defendant": null, "notes": null }],
  "misc_documents": [{ "document_title": null, "book_instrument": null, "page": null, "dated": null, "recorded": null, "consideration": null, "grantor_assignor": null, "grantee_assignee": null, "notes": null }],
  "legal_description": null, "additional_information": null, "names_searched": [], "alternatives": {}
}`;

const SYSTEM_PROMPT = `You are an expert title abstract processor. Extract ALL relevant data from the attached PDF.

### MANDATORY EXTRACTION SEQUENCE:
The PDF is arranged in a specific order. You MUST extract and organize information in this exact sequence:
1. Order Information
2. Chain of Title
3. Mortgages / Deeds of Trust
4. Associated Documents (Assignments/Releases)
5. Judgments / Liens
6. Miscellaneous Documents
7. Legal Description
8. Additional Information
9. Names Searched

### FILE NUMBER PRIORITY RULES:
You must determine the "file_number" using this strict priority order:
1. **Filename first**: If the provided filename contains a usable ID (e.g., "512571 - 16683.pdf"), use the full ID ("512571-16683").
2. **Company + ID**: If a company name (e.g., TACS, Mortiles, ECU) and an ID are found, use "CompanyName FullID" (e.g., "TACS 512571-16683").
3. **ID Only**: If there is an ID but no company, use the ID alone.
4. **Company + Address**: If no ID exists, but a company and address are found, use "CompanyName FullPropertyAddress" (e.g., "ECU 123 Bible Lane...").
5. **Address Only**: If no company or ID exists, use the full Property Address as the File Number.
6. **Never invent a File Number.**

### CRITICAL ACCURACY RULES:
1. **PROPERTY ADDRESS**: Capture COMPLETE address.
2. **TAX INFO**: Capture split 1st/2nd installments.
3. **IN/OUT SALE**: True if "Yes/Out", False if "No/In".
4. **LEGAL DESCRIPTION**: Capture ENTIRE text word-for-word.
5. **TRUSTEE'S DEED & FORECLOSURE**:
   - If a **Trustee's Deed** appears, index it as the numbered chain entry.
   - Any related foreclosure documents (Account of Sale, Substitute Trustees, Modification, Foreclosed DOT, etc.) MUST be listed directly below that Trustee's Deed as separate **starred items** (starting with *) in the "notes" field, NOT as separate numbered entries.
   - **DOT Identification**: 
     - Label the foreclosed DOT as: `*FORECLOSED DOT [BOOK/PAGE OR INSTRUMENT]`
     - Label any other DOT open at the time as: `*DOT OPEN AT THE TIME OF FORECLOSURE [BOOK/PAGE OR INSTRUMENT]`
   - Resume normal numbered numbering for the next actual deed or conveyance.
5. **NAMES SEARCHED**: 
   - **INCLUSION**: Must include:
     - Borrower(s) listed on the request form.
     - EVERY Grantor and EVERY Grantee from the Chain of Title.
     - EVERY person who obtained, owned, bought, or sold the property.
     - Heirs identified from Wills, List of Heirs (LOH), or Real Estate Affidavits (REA).
   - **EXCLUSIONS**: Do NOT include:
     - Special Commissioners.
     - Trustees listed on Trustee’s Deeds.
   - **SORTING**: 
     - 1st: Borrower(s) in the exact order they appear on the request form.
     - 2nd: All other applicable names captured from the document.
6. **ALTERNATIVES**: Provide best guess in field and up to 2 others in "alternatives" object keyed by JSON path.


Return valid JSON matching this schema:
${FIELD_SCHEMA}`;

async function extractFromPDF(pdfPath, originalFilename = '') {
  console.log(`[GoogleAI] Extracting native PDF: ${pdfPath} (Filename: ${originalFilename})`);
  
  const model = getModel();
  const pdfBuffer = fs.readFileSync(pdfPath);

  const promptParts = [
    { text: `The original filename is: "${originalFilename}"` },
    { text: SYSTEM_PROMPT },
    {
      inlineData: {
        data: pdfBuffer.toString("base64"),
        mimeType: "application/pdf"
      }
    }
  ];

  try {
    const result = await model.generateContent(promptParts);
    const response = await result.response;
    const text = response.text();
    return JSON.parse(text);
  } catch (err) {
    console.error(`❌ [GoogleAI] Error:`, err.message);
    throw err;
  }
}

module.exports = { extractFromPDF };
