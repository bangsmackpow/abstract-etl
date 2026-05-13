const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

/**
 * Native Google AI Service
 * Supports v1 (Legacy) and v4 (Hazelwood) extraction.
 * Prompts are loaded from docs/prompts/ at startup for auditability.
 */

const DOCS_DIR = path.join(__dirname, '..', '..', '..', 'docs');

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

const V4_SCHEMA = loadSchema('v4-schema.json');
const SYSTEM_PROMPT_V4 = loadPrompt('v4-prompt.md').replace(/### SCHEMA REFERENCE:[\s\S]*?Return ONLY/, `### SCHEMA REFERENCE:\n${V4_SCHEMA}\n\nReturn ONLY`);

function getModel() {
  const apiKey = (process.env.GOOGLE_AI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
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

async function extractFromPDF(pdfPath, originalFilename = '', version = 'v4') {
  const model = getModel();
  const pdfBuffer = fs.readFileSync(pdfPath);

  const prompt =
    version === 'v4'
      ? SYSTEM_PROMPT_V4
      : SYSTEM_PROMPT_V4;

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
    
    if (version === 'v4') {
      console.log('🔍 [V4 Extraction] Raw response length:', rawText.length);
      console.log('🔍 [V4 Extraction] Parsed keys:', Object.keys(parsed));
      console.log('🔍 [V4 Extraction] order_info:', parsed.order_info);
      console.log('🔍 [V4 Extraction] vesting_info:', parsed.vesting_info);
      console.log('🔍 [V4 Extraction] chain_of_title count:', parsed.chain_of_title?.length || 0);
      console.log('🔍 [V4 Extraction] mortgages count:', parsed.mortgages?.length || 0);
    }
    
    return parsed;
  } catch (err) {
    console.error('❌ [GoogleAI] Error:', err.message);
    throw err;
  }
}

module.exports = { extractFromPDF };
