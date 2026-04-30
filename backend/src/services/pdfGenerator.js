const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * High-fidelity PDF Generator for ProTitleUSA v2 Reports.
 * Clean layout with Hazelwood & Associates branding.
 */
async function generateV2Report(jobData, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const fields = jobData.fieldsJson || {};
    const prop = fields.property_info || {};
    const vest = fields.vesting_info || {};

    // --- Header ---
    doc.fontSize(16).text('Hazelwood & Associates, LLC', { align: 'center' });
    doc.fontSize(10).text('TITLE ABSTRACT REPORT', { align: 'center' });
    doc.moveDown();
    doc.rect(40, doc.y, 515, 2).fill('#003366');
    doc.moveDown(0.5);

    // --- Section Header Helper ---
    const drawSection = (title) => {
      doc.moveDown();
      doc.rect(40, doc.y, 515, 18).fill('#003366');
      doc
        .fillColor('white')
        .fontSize(10)
        .text(title, 45, doc.y - 14);
      doc.fillColor('black');
      doc.moveDown(0.5);
    };

    // --- Property Info ---
    drawSection('PROPERTY AND OWNERSHIP INFORMATION');
    doc.fontSize(9);
    const gridY = doc.y;
    doc.text(`ProTitle Order#: ${prop.order_no || 'N/A'}`, 50, gridY);
    doc.text(`Completed Date: ${prop.completed_date || 'N/A'}`, 300, gridY);
    doc.moveDown();
    doc.text(`Property Address: ${prop.address || 'N/A'}`, 50);
    doc.moveDown();
    doc.text(`Current Owner: ${prop.current_owner || 'N/A'}`, 50);
    doc.text(`County: ${prop.county || 'N/A'}`, 300);

    // --- Vesting Info ---
    drawSection('VESTING INFORMATION');
    doc.fontSize(9);
    doc.text(`Grantee: ${vest.grantee || 'N/A'}`, 50);
    doc.text(`Grantor: ${vest.grantor || 'N/A'}`, 300);
    doc.moveDown();
    doc.text(`Deed Date: ${vest.deed_date || 'N/A'}`, 50);
    doc.text(`Recorded Date: ${vest.recorded_date || 'N/A'}`, 300);
    doc.moveDown();
    doc.text(`Deed Type: ${vest.deed_type || 'N/A'}`, 50);
    doc.text(`Consideration: $${vest.consideration_amount || '0.00'}`, 300);

    // --- Mortgages ---
    drawSection('OPEN MORTGAGES');
    const mortgages = fields.mortgages || [];
    if (mortgages.length === 0) {
      doc.text('NO OPEN MORTGAGES FOUND', 50);
    } else {
      mortgages.forEach((m, i) => {
        doc.text(`${i + 1}. Lender: ${m.lender || 'N/A'}`, 50);
        doc.text(`   Amount: $${m.mortgage_amount || 'N/A'}`, 50);
        doc.text(`   Maturity: ${m.maturity_date || 'N/A'}`, 300);
        doc.moveDown(0.5);
      });
    }

    // --- Legal Description ---
    drawSection('LEGAL DESCRIPTION');
    doc.fontSize(8).text(fields.legal_description || 'SEE ATTACHED', 50, doc.y, { width: 480 });

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = { generateV2Report };
