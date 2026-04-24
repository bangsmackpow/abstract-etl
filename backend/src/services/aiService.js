const { fromPath }           = require('pdf2pic');
const fs                     = require('fs');
const path                   = require('path');
// REMOVED broken geminiProvider to ensure it can NEVER be used
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
  
  console.log(`[AI] Converted ${images.length}/${pageCount} pages`);
  if (images.length === 0 && pageCount > 0) {
    throw new Error('Failed to convert any PDF pages to images. Check graphicsmagick/ghostscript.');
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
  // IGNORE provider env var - forcing OpenRouter because it's the only one working
  console.log(`[AI] Starting extraction (OpenRouter FORCED)`);

  const base64Images = await pdfToImages(pdfPath, tempDir);
  console.log(`[AI] Total pages for AI: ${base64Images.length}`);

  const activeProvider = openRouterProvider;

  // More conservative batching for OpenRouter/Gemini limits
  const BATCH_SIZE = 5;
  let finalResult = null;

  for (let i = 0; i < base64Images.length; i += BATCH_SIZE) {
    const batch = base64Images.slice(i, i + BATCH_SIZE);
    console.log(`[AI] Processing batch ${Math.floor(i/BATCH_SIZE) + 1} (${batch.length} images)...`);
    
    const batchResult = await activeProvider.extractFromImages(batch);
    
    if (!finalResult) {
      finalResult = batchResult;
    } else {
      finalResult = activeProvider.mergeExtractions(finalResult, batchResult);
    }

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < base64Images.length) {
      console.log(`[AI] Cooldown between batches...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return finalResult;
}

module.exports = { extractFromPDF };
