const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * High-fidelity PDF Generator for ProTitleUSA v2 Reports.
 * Clean, professional layout with Hazelwood & Associates branding.
 */
async function generateV2Report(jobData, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 45,
      size: 'A4',
      bufferPages: true,
    });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const fields = jobData.fieldsJson || {};
    const prop = fields.property_info || {};
    const vest = fields.vesting_info || {};
    const chain = fields.chain_of_title || [];
    const mortgages = fields.mortgages || [];
    const tax = fields.tax_status || {};

    const DARK_BLUE = '#003366';
    const BORDER_GRAY = '#CCCCCC';

    // --- Helpers ---
    let pageNumber = 1;
    const drawFooter = () => {
      const y = doc.page.height - 30;
      doc
        .fontSize(7)
        .fillColor('#999999')
        .text(`Page ${pageNumber++}`, 45, y, { width: 520, align: 'right' });
    };

    const drawSectionHeader = (title) => {
      if (doc.y > doc.page.height - 70) {
        drawFooter();
        doc.addPage();
      }
      const y = doc.y + 6;
      doc.rect(45, y, 520, 20).fill(DARK_BLUE);
      doc
        .fillColor('white')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(title, 52, y + 4);
      doc.fillColor('black');
      doc.moveDown(1.2);
    };

    const drawKeyValue = (label, value, x, y) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333').text(label, x, y, { continued: true });
      doc.font('Helvetica').fontSize(9).fillColor('black').text(` ${value || '\u2014'}`);
    };

    const drawHorizontalLine = (y) => {
      doc.strokeColor(BORDER_GRAY).lineWidth(0.5).moveTo(45, y).lineTo(565, y).stroke();
    };

    // --- Header ---
    doc.fontSize(18).font('Helvetica-Bold').fillColor(DARK_BLUE).text('Hazelwood & Associates, LLC', { align: 'center' });
    doc.fontSize(12).font('Helvetica').fillColor(DARK_BLUE).text('PROPERTY ABSTRACT REPORT', { align: 'center' });
    doc.fontSize(9).fillColor('#666666').text('ProTitleUSA V2 Standard', { align: 'center' });
    doc.moveDown(0.5);
    doc.rect(45, doc.y, 520, 2).fill(DARK_BLUE);
    doc.moveDown(1);

    // ========================================================================
    // SECTION 1: PROPERTY AND OWNERSHIP INFORMATION
    // ========================================================================
    drawSectionHeader('PROPERTY AND OWNERSHIP INFORMATION');

    const infoStartY = doc.y;
    drawKeyValue('ProTitle Order#', prop.order_no, 55, infoStartY);
    drawKeyValue('Completed Date', prop.completed_date, 310, infoStartY);
    doc.moveDown(0.3);
    drawKeyValue('Index Date', prop.index_date, 55, doc.y);
    drawKeyValue('APN / Parcel #', prop.apn_parcel_pin, 310, doc.y);
    doc.moveDown(0.8);
    drawKeyValue('Property Address', prop.address, 55, doc.y);
    doc.moveDown(0.8);
    drawKeyValue('Current Owner', prop.current_owner, 55, doc.y);
    drawKeyValue('County', prop.county, 310, doc.y);
    doc.moveDown(1);

    // ========================================================================
    // SECTION 2: VESTING INFORMATION
    // ========================================================================
    drawSectionHeader('VESTING INFORMATION');

    const vestStartY = doc.y;
    drawKeyValue('Grantee', vest.grantee, 55, vestStartY);
    drawKeyValue('Grantor', vest.grantor, 310, vestStartY);
    doc.moveDown(0.3);
    drawKeyValue('Deed Date', vest.deed_date, 55, doc.y);
    drawKeyValue('Recorded Date', vest.recorded_date, 310, doc.y);
    doc.moveDown(0.3);
    drawKeyValue('Instrument/Book/Page', vest.instrument_book_page, 55, doc.y);
    doc.moveDown(0.3);
    drawKeyValue('Deed Type', vest.deed_type, 55, doc.y);
    drawKeyValue('Consideration', vest.consideration_amount, 310, doc.y);
    doc.moveDown(0.3);
    drawKeyValue('Sale Price', vest.sale_price, 55, doc.y);

    if (vest.probate_status) {
      drawKeyValue('Probate Status', vest.probate_status, 310, doc.y);
    }
    if (vest.divorce_status) {
      doc.moveDown(0.3);
      drawKeyValue('Divorce Status', vest.divorce_status, 55, doc.y);
    }
    if (vest.notes) {
      doc.moveDown(0.3);
      drawKeyValue('Notes', vest.notes, 55, doc.y);
    }
    doc.moveDown(1);

    // ========================================================================
    // SECTION 3: CHAIN OF TITLE
    // ========================================================================
    drawSectionHeader('CHAIN OF TITLE');

    if (chain.length === 0) {
      doc.font('Helvetica-Oblique').fontSize(9).fillColor('#999999').text('No chain of title entries found.', 55);
      doc.fillColor('black');
    } else {
      chain.forEach((entry, i) => {
        if (doc.y > doc.page.height - 100) {
          drawFooter();
          doc.addPage();
        }

        const entryY = doc.y + 2;
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(DARK_BLUE)
          .text(`Entry ${i + 1} of ${chain.length}`, 55, entryY);
        doc.fillColor('black');

        doc.font('Helvetica-Bold').fontSize(9).text('Grantee: ', 65, doc.y + 2, { continued: true });
        doc.font('Helvetica').fontSize(9).text(entry.grantee || 'N/A');

        doc.font('Helvetica-Bold').fontSize(9).text('Grantor: ', 65, doc.y + 2, { continued: true });
        doc.font('Helvetica').fontSize(9).text(entry.grantor || 'N/A');

        const detailsY = doc.y + 3;
        drawKeyValue('Deed Date', entry.deed_date, 65, detailsY);
        drawKeyValue('Recorded Date', entry.recorded_date, 250, detailsY);
        drawKeyValue('Book/Page/Inst', entry.instrument_book_page, 420, detailsY);

        const detailsY2 = doc.y + 2;
        drawKeyValue('Deed Type', entry.deed_type, 65, detailsY2);
        drawKeyValue('Consideration', entry.consideration_amount, 250, detailsY2);

        if (entry.notes) {
          const notesY = doc.y + 3;
          doc
            .font('Helvetica-Oblique')
            .fontSize(8)
            .fillColor('#555555')
            .text(entry.notes, 65, notesY, { width: 480 });
          doc.fillColor('black');
        }

        doc.moveDown(0.5);
        drawHorizontalLine(doc.y + 2);
        doc.moveDown(0.3);
      });
    }
    doc.moveDown(0.5);

    // ========================================================================
    // SECTION 4: OPEN MORTGAGES / DEEDS OF TRUST
    // ========================================================================
    drawSectionHeader('OPEN MORTGAGES / DEEDS OF TRUST');

    if (mortgages.length === 0) {
      doc.font('Helvetica-Oblique').fontSize(9).fillColor('#999999').text('No open mortgages found.', 55);
      doc.fillColor('black');
    } else {
      mortgages.forEach((m, i) => {
        if (doc.y > doc.page.height - 100) {
          drawFooter();
          doc.addPage();
        }

        const mHeaderY = doc.y + 2;
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(DARK_BLUE)
          .text(`Mortgage ${i + 1} of ${mortgages.length}`, 55, mHeaderY);
        doc.fillColor('black');

        const mY = doc.y + 2;
        drawKeyValue('Borrower', m.borrower, 65, mY);
        drawKeyValue('Lender', m.lender, 310, mY);
        doc.moveDown(0.3);

        drawKeyValue('Mortgage Amount', m.mortgage_amount, 65, doc.y);
        drawKeyValue('Type', m.mortgage_type, 250, doc.y);
        drawKeyValue('Vesting', m.vesting_status, 410, doc.y);
        doc.moveDown(0.3);

        drawKeyValue('Mortgage Date', m.mortgage_date, 65, doc.y);
        drawKeyValue('Recorded Date', m.recorded_date, 250, doc.y);
        drawKeyValue('Maturity', m.maturity_date, 410, doc.y);
        doc.moveDown(0.3);

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333').text('Book / Page / Instrument: ', 65, doc.y, { continued: true });
        doc.font('Helvetica').fontSize(9).fillColor('black').text(`${m.book || '\u2014'} / ${m.page || '\u2014'} / ${m.instrument || '\u2014'}`);
        doc.moveDown(0.3);

        drawKeyValue('MERS', m.mers, 65, doc.y);

        const assignments = m.assignments || [];
        if (assignments.length > 0) {
          doc.moveDown(0.3);
          doc.font('Helvetica-Bold').fontSize(9).text('Assignments:', 65, doc.y);
          assignments.forEach((a, ai) => {
            doc.font('Helvetica').fontSize(8).text(
              `  ${ai + 1}. ${a.assignor || 'N/A'} \u2192 ${a.assignee || 'N/A'} | Recorded: ${a.recorded_date || 'N/A'} | Inst: ${a.instrument || 'N/A'}`,
              75,
              doc.y + 2,
              { width: 470 }
            );
          });
        }

        doc.moveDown(0.3);
        drawHorizontalLine(doc.y + 2);
        doc.moveDown(0.3);
      });
    }
    doc.moveDown(0.5);

    // ========================================================================
    // SECTION 5: TAX STATUS
    // ========================================================================
    drawSectionHeader('TAX STATUS');

    const taxY = doc.y;
    drawKeyValue('Parcel ID', tax.parcel_id, 55, taxY);
    drawKeyValue('Tax Year', tax.tax_year, 250, taxY);
    drawKeyValue('Status', tax.status, 420, taxY);
    doc.moveDown(0.3);

    drawKeyValue('Total Amount', tax.total_amount, 55, doc.y);
    drawKeyValue('Paid Date', tax.paid_date, 250, doc.y);
    drawKeyValue('Delinquent Amount', tax.delinquent_amount, 420, doc.y);
    doc.moveDown(0.3);

    const taxHistory = tax.tax_history || [];
    if (taxHistory.length > 0) {
      doc.font('Helvetica-Bold').fontSize(9).text('Tax History:', 55, doc.y);
      taxHistory.forEach((th) => {
        doc.font('Helvetica').fontSize(8).text(
          `  ${th.tax_year || th.year}: $${th.amount || '0.00'} \u2014 ${th.status || 'N/A'} ${th.paid_date ? `(Paid: ${th.paid_date})` : ''}`,
          65,
          doc.y + 2,
          { width: 480 }
        );
      });
    }
    doc.moveDown(1);

    // ========================================================================
    // SECTION 6: EXAMINER INSTRUCTIONS
    // ========================================================================
    if (prop.misc_info_to_examiner) {
      drawSectionHeader('EXAMINER INSTRUCTIONS');
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#444444')
        .text(prop.misc_info_to_examiner, 55, doc.y, {
          width: 500,
          lineGap: 1.5,
        });
      doc.fillColor('black');
      doc.moveDown(1);
    }

    // ========================================================================
    // SECTION 7: LEGAL DESCRIPTION
    // ========================================================================
    drawSectionHeader('LEGAL DESCRIPTION');
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('black')
      .text(fields.legal_description || 'SEE ATTACHED', 55, doc.y, {
        width: 500,
        lineGap: 2,
      });
    doc.moveDown(1);

    // ========================================================================
    // SECTION 8: NAMES SEARCHED
    // ========================================================================
    if (fields.names_searched && fields.names_searched.length > 0) {
      drawSectionHeader('NAMES SEARCHED');
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(fields.names_searched.map((n) => n.toUpperCase()).join('; '), 55, doc.y, { width: 500 });
      doc.moveDown(0.5);
    }

    // ========================================================================
    // SECTION 9: ADDITIONAL INFORMATION
    // ========================================================================
    if (fields.additional_info || fields.additional_information) {
      drawSectionHeader('ADDITIONAL INFORMATION');
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(fields.additional_info || fields.additional_information || '', 55, doc.y, { width: 500 });
    }

    drawFooter();
    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = { generateV2Report };
