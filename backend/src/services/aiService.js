const { fromPath }           = require('pdf2pic');
const fs                     = require('fs');
const path                   = require('path');
const geminiProvider         = require('./geminiService');
const openRouterProvider     = require('./openRouterService');

/**
 * Convert PDF file to array of base64 JPEG images
 */
async function pdfToImages(pdfPath, outputDir) {
  const options = {
    density: 150,
    saveFilename: 'page',
    savePath: outputDir,
    format: 'jpeg',
    width: 1200,
    height: 1600
  };

  const convert   = fromPath(pdfPath, options);
  const pageCount = await getPageCount(pdfPath);
  console.log(`[AI] Page count: ${pageCount}, outputDir: ${outputDir}`);

  const images = [];
  for (let i = 1; i <= pageCount; i++) {
    try {
      const result = await convert(i, { responseType: 'base64' });
      const size = result.base64?.length || 0;
      if (size > 0) images.push(result.base64);
    } catch (err) {
      console.error(`[AI] Page ${i} conversion failed:`, err.message);
    }
  }
  
  return images;
}

/**
 * Get page count using pdfinfo
 */
async function getPageCount(pdfPath) {
  const { execSync } = require('child_process');
  try {
    const output = execSync(`pdfinfo "${pdfPath}" 2>/dev/null | grep "Pages:" | awk '{print $2}'`).toString().trim();
    const count  = parseInt(output);
    return isNaN(count) ? 1 : count;
  } catch {
    return 1;
  }
}

/**
 * Main extraction pipeline
 */
async function extractFromPDF(pdfPath, tempDir) {
  const provider = process.env.AI_PROVIDER || 'gemini';
  console.log(`[AI] Starting extraction using provider: ${provider}`);

  const base64Images = await pdfToImages(pdfPath, tempDir);
  console.log(`[AI] Converted ${base64Images.length} pages to images`);

  let extractedFields;
  const activeProvider = provider === 'openrouter' ? openRouterProvider : geminiProvider;

  // Batching logic (shared across providers)
  if (base64Images.length <= 14) {
    extractedFields = await activeProvider.extractFromImages(base64Images);
  } else {
    const firstBatch  = base64Images.slice(0, 14);
    const firstResult = await activeProvider.extractFromImages(firstBatch);

    const secondBatch  = base64Images.slice(14);
    const secondResult = await activeProvider.extractFromImages(secondBatch);

    extractedFields = activeProvider.mergeExtractions(firstResult, secondResult);
  }

  return extractedFields;
}

module.exports = { extractFromPDF };
