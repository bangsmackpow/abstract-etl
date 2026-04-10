const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

async function inspectDoc(filename) {
  const filePath = path.join(__dirname, '..', 'docs', 'samples', filename);
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    console.log(`--- CONTENT OF ${filename} ---`);
    console.log(result.value);
    console.log(`-----------------------------`);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
  }
}

const targetFile = process.argv[2] || 'PUNCTUAL ABSTRACT 11916974.docx';
inspectDoc(targetFile);
