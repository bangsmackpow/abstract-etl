const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const { env } = require('../env');
const path = require('path');

/**
 * Native Google AI Service
 * Supports both v7 (Enhanced Report) and v9 (REVISION 9 rules) extraction.
 * The active contract is chosen per request via templateVersion, so both
 * standards can be tested side by side. Prompt/schema are loaded from docs/
 * at startup for auditability.
 */

const DOCS_DIR = env.DOCS_DIR || path.join(__dirname, '..', '..', '..', 'docs');

function loadPrompt(filename) {
  const filePath = path.join(DOCS_DIR, 'prompts', filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function loadSchema(filename) {
  const filePath = path.join(DOCS_DIR, 'schemas', filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Schema file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

const PROMPTS = {
  v7: loadPrompt('v7-prompt.md'),
  v9: loadPrompt('v9-prompt.md'),
};
const SCHEMAS = {
  v7: loadSchema('v7-schema.json'),
  v9: loadSchema('v9-schema.json'),
};

// Build the final prompt (with the schema injected in place of the
// SCHEMA REFERENCE placeholder) for each supported version.
const SYSTEM_PROMPTS = {};
for (const [version, prompt] of Object.entries(PROMPTS)) {
  SYSTEM_PROMPTS[version] = prompt.replace(
    /### SCHEMA REFERENCE:[\s\S]*?Return ONLY/,
    `### SCHEMA REFERENCE:\n${SCHEMAS[version]}\n\nReturn ONLY`
  );
}

/**
 * Resolve the prompt for a template version. Defaults to v9 (the current
 * active rules); falls back gracefully to v9 if an unknown version is passed.
 */
function promptForVersion(version) {
  return SYSTEM_PROMPTS[version] || SYSTEM_PROMPTS.v9;
}

function getModel() {
  const apiKey = (env.GOOGLE_AI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is missing from environment.');

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });
}

function sanitizeJsonResponse(text) {
  let cleaned = text.trim();

  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();

  // Find the outermost { ... } pair by tracking brace depth
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) return cleaned;

  let depth = 0;
  let endIndex = -1;
  for (let i = firstBrace; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    if (cleaned[i] === '}') {
      depth--;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex > firstBrace) {
    cleaned = cleaned.slice(firstBrace, endIndex + 1);
  }

  return cleaned;
}

function parseJsonResponse(rawText, pdfFilename) {
  const sanitized = sanitizeJsonResponse(rawText);

  try {
    return JSON.parse(sanitized);
  } catch (firstError) {
    // If parsing fails, try stripping trailing commas and single quotes
    try {
      const fixed = sanitized
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/\\'/g, "'")
        .replace(/'/g, '"');
      return JSON.parse(fixed);
    } catch (secondError) {
      // Log details and re-throw the original error
      console.error(`❌ [JSON Parse] Failed for ${pdfFilename}`);
      console.error(`❌ [JSON Parse] Raw length: ${rawText.length}, sanitized length: ${sanitized.length}`);
      console.error('❌ [JSON Parse] Last 200 chars of sanitized:', sanitized.slice(-200));
      throw firstError;
    }
  }
}

async function extractFromPDF(pdfPath, originalFilename = '', templateVersion = 'v9') {
  const model = getModel();
  const pdfBuffer = fs.readFileSync(pdfPath);
  const version = templateVersion === 'v7' ? 'v7' : 'v9';
  const prompt = promptForVersion(version);

  const promptParts = [
    { text: `Filename: "${originalFilename}"` },
    { text: prompt },
    {
      inlineData: {
        data: pdfBuffer.toString('base64'),
        mimeType: 'application/pdf',
      },
    },
  ];

  try {
    const result = await model.generateContent(promptParts);
    const response = await result.response;
    const rawText = response.text();
    const parsed = parseJsonResponse(rawText, originalFilename);

    console.log(`🔍 [${version.toUpperCase()} Extraction] Raw response length:`, rawText.length);
    console.log(`🔍 [${version.toUpperCase()} Extraction] Parsed keys:`, Object.keys(parsed));
    console.log(`🔍 [${version.toUpperCase()} Extraction] order_info:`, parsed.order_info);
    console.log(`🔍 [${version.toUpperCase()} Extraction] chain_of_title count:`, parsed.chain_of_title?.length || 0);
    console.log(`🔍 [${version.toUpperCase()} Extraction] mortgages count:`, parsed.mortgages?.length || 0);
    console.log(`🔍 [${version.toUpperCase()} Extraction] tax_information:`, parsed.tax_information);

    return parsed;
  } catch (err) {
    console.error('❌ [GoogleAI] Error:', err.message);
    throw err;
  }
}

module.exports = { extractFromPDF };