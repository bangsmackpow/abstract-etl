const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * High-fidelity multi-page PDF Generator for ProTitleUSA v2 Reports.
 */
async function generateV2Report(jobData, outputPath) {
  const fields = jobData.fieldsJson || {};
  const prop = fields.property_info || {};
  const vest = fields.vesting_info || {};
  const chain = fields.chain_of_title || [];
  const mortgages = fields.mortgages || [];
  const tax = fields.tax_status || {};

  const DARK = '#003366';
  const MARGIN = 50;
  const CONTENT_W = 512;
  const PAGE_H = 842; // A4
  const BOTTOM = PAGE_H - 50;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // State
    let pageNum = 1;

    // --- Helpers ---
    const ensureSpace = (needed) => {
      const footerSpace = 50; // Reserve space for footer
      if (doc.y + needed > doc.page.height - footerSpace) newPage();
    };

    const newPage = () => {
      // Footer for current page - use dynamic page height
      const footerY = doc.page.height - 40;
      doc.fontSize(7).fillColor('#999999').text(`Page ${pageNum}`, MARGIN, footerY, { width: CONTENT_W, align: 'right' });
      doc.addPage({ margin: MARGIN });
      pageNum++;
    };

    const sectionHeader = (title) => {
      ensureSpace(28);
      const y = doc.y + 6;
      doc.rect(MARGIN, y, CONTENT_W, 20).fill(DARK);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text(title, MARGIN + 6, y + 4);
      doc.fillColor('black');
      doc.moveDown(1.5);
    };

    const kv = (label, value, x, y) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333').text(label, x, y, { continued: true });
      doc.font('Helvetica').fontSize(9).fillColor('black').text(` ${value || '\u2014'}`);
    };

    const hr = () => {
      doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(MARGIN, doc.y + 2).lineTo(MARGIN + CONTENT_W, doc.y + 2).stroke();
    };

    const bodyText = (text, size = 9, opts = {}) => {
      doc.font('Helvetica').fontSize(size).fillColor('black').text(text, MARGIN + 6, doc.y, { width: CONTENT_W - 12, lineGap: 1.5, ...opts });
    };

    const italicText = (text, size = 9) => {
      doc.font('Helvetica-Oblique').fontSize(size).fillColor('#666666').text(text, MARGIN + 6, doc.y, { width: CONTENT_W - 12 });
    };

    // ========================================================================
    // COVER / HEADER
    // ========================================================================
    doc.fontSize(18).font('Helvetica-Bold').fillColor(DARK).text('Hazelwood & Associates, LLC', { align: 'center' });
    doc.fontSize(12).font('Helvetica').fillColor(DARK).text('PROPERTY ABSTRACT REPORT', { align: 'center' });
    doc.fontSize(9).fillColor('#666666').text('ProTitleUSA V2 Standard', { align: 'center' });
    doc.moveDown(0.5);
    doc.rect(MARGIN, doc.y, CONTENT_W, 2).fill(DARK);
    doc.moveDown(1.2);

    // ========================================================================
    // 1. PROPERTY INFORMATION
    // ========================================================================
    sectionHeader('PROPERTY INFORMATION');
    const piY = doc.y;
    kv('ProTitle Order#', prop.order_no, MARGIN + 6, piY);
    kv('Completed Date', prop.completed_date, 300, piY);
    doc.moveDown(0.3);
    kv('Index Date', prop.index_date, MARGIN + 6, doc.y);
    kv('APN / Parcel #', prop.apn_parcel_pin, 300, doc.y);
    doc.moveDown(0.8);
    kv('Property Address', prop.address, MARGIN + 6, doc.y);
    doc.moveDown(0.8);
    kv('Current Owner', prop.current_owner, MARGIN + 6, doc.y);
    kv('County', prop.county, 300, doc.y);
    doc.moveDown(1.2);

    // ========================================================================
    // 2. VESTING INFORMATION
    // ========================================================================
    sectionHeader('VESTING INFORMATION');
    const vY = doc.y;
    kv('Grantee', vest.grantee, MARGIN + 6, vY);
    kv('Grantor', vest.grantor, 300, vY);
    doc.moveDown(0.3);
    kv('Deed Date', vest.deed_date, MARGIN + 6, doc.y);
    kv('Recorded Date', vest.recorded_date, 300, doc.y);
    doc.moveDown(0.3);
    kv('Instrument / Book / Page', vest.instrument_book_page, MARGIN + 6, doc.y);
    doc.moveDown(0.3);
    kv('Deed Type', vest.deed_type, MARGIN + 6, doc.y);
    kv('Consideration', vest.consideration_amount, 300, doc.y);
    doc.moveDown(0.3);
    kv('Sale Price', vest.sale_price, MARGIN + 6, doc.y);
    if (vest.probate_status) {
      kv('Probate Status', vest.probate_status, 300, doc.y);
    }
    if (vest.divorce_status) {
      doc.moveDown(0.3);
      kv('Divorce Status', vest.divorce_status, MARGIN + 6, doc.y);
    }
    if (vest.notes) {
      doc.moveDown(0.3);
      kv('Notes', vest.notes, MARGIN + 6, doc.y);
    }
    doc.moveDown(1.2);

    // ========================================================================
    // 3. CHAIN OF TITLE
    // ========================================================================
    sectionHeader('CHAIN OF TITLE');

    if (chain.length === 0) {
      italicText('No chain of title entries found.');
    } else {
      chain.forEach((entry, i) => {
        ensureSpace(140);

        doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text(`Entry ${i + 1} of ${chain.length}`, MARGIN + 6, doc.y + 2);
        doc.fillColor('black').moveDown(0.5);

        const eY = doc.y;
        kv('Grantee', entry.grantee, MARGIN + 12, eY);
        kv('Grantor', entry.grantor, 280, eY);
        doc.moveDown(0.3);

        kv('Deed Date', entry.deed_date, MARGIN + 12, doc.y);
        kv('Recorded Date', entry.recorded_date, 280, doc.y);
        doc.moveDown(0.3);

        kv('Book / Page / Inst', entry.instrument_book_page, MARGIN + 12, doc.y);
        if (entry.vbook_num || entry.vpage_num) {
          kv('Vol Book / Page', `${entry.vbook_num || '\u2014'} / ${entry.vpage_num || '\u2014'}`, 280, doc.y);
        }
        doc.moveDown(0.3);

        kv('Deed Type', entry.deed_type, MARGIN + 12, doc.y);
        kv('Consideration', entry.consideration_amount, 280, doc.y);
        doc.moveDown(0.3);

        if (entry.notes) {
          ensureSpace(30);
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#444444').text('Notes: ', MARGIN + 12, doc.y, { continued: true });
          doc.font('Helvetica-Oblique').fontSize(8).fillColor('#555555').text(entry.notes, { width: CONTENT_W - 60 });
          doc.fillColor('black');
        }

        doc.moveDown(0.3);
        hr();
        doc.moveDown(0.3);
      });
    }
    doc.moveDown(0.5);

    // ========================================================================
    // 4. OPEN MORTGAGES / DEEDS OF TRUST
    // ========================================================================
    sectionHeader('OPEN MORTGAGES / DEEDS OF TRUST');

    if (mortgages.length === 0) {
      italicText('No open mortgages found.');
    } else {
      mortgages.forEach((m, i) => {
        ensureSpace(120);

        doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text(`Mortgage ${i + 1} of ${mortgages.length}`, MARGIN + 6, doc.y + 2);
        doc.fillColor('black').moveDown(0.5);

        const mY = doc.y;
        kv('Borrower', m.borrower, MARGIN + 12, mY);
        kv('Lender', m.lender, 280, mY);
        doc.moveDown(0.3);

        kv('Mortgage Amount', m.mortgage_amount, MARGIN + 12, doc.y);
        kv('Type', m.mortgage_type, 200, doc.y);
        kv('Vesting', m.vesting_status, 380, doc.y);
        doc.moveDown(0.3);

        kv('Mortgage Date', m.mortgage_date, MARGIN + 12, doc.y);
        kv('Recorded Date', m.recorded_date, 200, doc.y);
        kv('Maturity', m.maturity_date, 380, doc.y);
        doc.moveDown(0.3);

        kv('Book / Page / Instrument', `${m.book || '\u2014'} / ${m.page || '\u2014'} / ${m.instrument || '\u2014'}`, MARGIN + 12, doc.y);
        doc.moveDown(0.3);

        kv('MERS', m.mers || 'No', MARGIN + 12, doc.y);

        const assignments = m.assignments || [];
        if (assignments.length > 0) {
          ensureSpace(20 + assignments.length * 14);
          doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK).text('Assignments:', MARGIN + 12, doc.y + 4);
          assignments.forEach((a, ai) => {
            doc.font('Helvetica').fontSize(8).fillColor('#444444').text(
              `  ${ai + 1}. ${a.assignor || 'N/A'} \u2192 ${a.assignee || 'N/A'}  |  Recorded: ${a.recorded_date || 'N/A'}  |  Inst: ${a.instrument || 'N/A'}`,
              MARGIN + 18, doc.y + 2, { width: CONTENT_W - 40 }
            );
          });
          doc.fillColor('black');
        }

        doc.moveDown(0.3);
        hr();
        doc.moveDown(0.3);
      });
    }
    doc.moveDown(0.5);

    // ========================================================================
    // 5. ASSOCIATED DOCUMENTS
    // ========================================================================
    const associated = fields.associated_documents || [];
    sectionHeader('ASSOCIATED DOCUMENTS');
    if (associated.length === 0) {
      italicText('No associated documents found.');
    } else {
      associated.forEach((a, i) => {
        ensureSpace(80);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text(`Document ${i + 1} of ${associated.length}`, MARGIN + 6, doc.y + 2);
        doc.fillColor('black').moveDown(0.5);
        kv('Title', a.document_title, MARGIN + 12, doc.y);
        kv('Book / Inst / Page', `${a.book_instrument || '\u2014'} / ${a.page || '\u2014'}`, 280, doc.y);
        doc.moveDown(0.3);
        kv('Dated', a.dated, MARGIN + 12, doc.y);
        kv('Recorded', a.recorded, 280, doc.y);
        doc.moveDown(0.3);
        kv('Grantor / Assignor', a.grantor_assignor, MARGIN + 12, doc.y);
        kv('Grantee / Assignee', a.grantee_assignee, 280, doc.y);
        if (a.notes) {
          doc.moveDown(0.3);
          kv('Notes', a.notes, MARGIN + 12, doc.y);
        }
        doc.moveDown(0.3);
        hr();
        doc.moveDown(0.3);
      });
    }
    doc.moveDown(0.5);

    // ========================================================================
    // 6. JUDGMENTS / LIENS
    // ========================================================================
    const liens = fields.judgments_liens || [];
    sectionHeader('JUDGMENTS / LIENS');
    if (liens.length === 0) {
      italicText('No judgments or liens found.');
    } else {
      liens.forEach((l, i) => {
        ensureSpace(80);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text(`Judgment / Lien ${i + 1} of ${liens.length}`, MARGIN + 6, doc.y + 2);
        doc.fillColor('black').moveDown(0.5);
        kv('Title', l.document_title, MARGIN + 12, doc.y);
        kv('Case #', l.case_number, 280, doc.y);
        doc.moveDown(0.3);
        kv('Dated', l.dated, MARGIN + 12, doc.y);
        kv('Recorded', l.recorded, 280, doc.y);
        doc.moveDown(0.3);
        kv('Amount', l.amount, MARGIN + 12, doc.y);
        kv('Plaintiff', l.plaintiff, 280, doc.y);
        doc.moveDown(0.3);
        kv('Defendant', l.defendant, MARGIN + 12, doc.y);
        doc.moveDown(0.3);
        hr();
        doc.moveDown(0.3);
      });
    }
    doc.moveDown(0.5);

    // ========================================================================
    // 7. MISCELLANEOUS DOCUMENTS
    // ========================================================================
    const misc = fields.misc_documents || [];
    sectionHeader('MISCELLANEOUS DOCUMENTS');
    if (misc.length === 0) {
      italicText('No miscellaneous documents found.');
    } else {
      misc.forEach((d, i) => {
        ensureSpace(80);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text(`Document ${i + 1} of ${misc.length}`, MARGIN + 6, doc.y + 2);
        doc.fillColor('black').moveDown(0.5);
        kv('Title', d.document_title, MARGIN + 12, doc.y);
        kv('Book / Inst / Page', `${d.book_instrument || '\u2014'} / ${d.page || '\u2014'}`, 280, doc.y);
        doc.moveDown(0.3);
        kv('Dated', d.dated, MARGIN + 12, doc.y);
        kv('Recorded', d.recorded, 280, doc.y);
        doc.moveDown(0.3);
        kv('Grantor / Assignor', d.grantor_assignor, MARGIN + 12, doc.y);
        kv('Grantee / Assignee', d.grantee_assignee, 280, doc.y);
        doc.moveDown(0.3);
        hr();
        doc.moveDown(0.3);
      });
    }
    doc.moveDown(0.5);

    // ========================================================================
    // 8. TAX STATUS
    // ========================================================================
    sectionHeader('TAX STATUS');
    const tY = doc.y;
    kv('Parcel ID', tax.parcel_id, MARGIN + 6, tY);
    kv('Tax Year', tax.tax_year, 260, tY);
    kv('Status', tax.status, 400, tY);
    doc.moveDown(0.3);
    kv('Total Amount', tax.total_amount, MARGIN + 6, doc.y);
    kv('Paid Date', tax.paid_date, 260, doc.y);
    kv('Delinquent Amount', tax.delinquent_amount, 400, doc.y);
    doc.moveDown(0.3);

    const taxHistory = tax.tax_history || [];
    if (taxHistory.length > 0) {
      ensureSpace(20 + taxHistory.length * 12);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK).text('Tax History:', MARGIN + 6, doc.y + 2);
      taxHistory.forEach((th) => {
        doc.font('Helvetica').fontSize(8).fillColor('#444444').text(
          `  ${th.tax_year || th.year}: $${th.amount || '0.00'} \u2014 ${th.status || 'N/A'}${th.paid_date ? ` (Paid: ${th.paid_date})` : ''}`,
          MARGIN + 12, doc.y + 2, { width: CONTENT_W - 30 }
        );
      });
      doc.fillColor('black');
    }
    doc.moveDown(1.2);

    // ========================================================================
    // 9. EXAMINER INSTRUCTIONS
    // ========================================================================
    if (prop.misc_info_to_examiner) {
      sectionHeader('EXAMINER INSTRUCTIONS');

      const instrText = prop.misc_info_to_examiner;
      // Split into paragraphs for better page handling
      const paragraphs = instrText.split(/\. (?=[A-Z])/g);
      let currentParagraph = '';

      paragraphs.forEach((sentence) => {
        const candidate = currentParagraph ? `${currentParagraph}. ${sentence.trim()}` : sentence.trim();
        // Estimate height needed (rough: 1 line per 85 chars at width 500, size 7.5, gap 1.5)
        const charsPerLine = Math.floor((CONTENT_W - 12) / 3.2); // ~160 at size 7.5
        const estimatedLines = Math.ceil(candidate.length / charsPerLine);
        const estimatedHeight = estimatedLines * 12;

        if (estimatedHeight > BOTTOM - doc.y - 20) {
          // Flush current paragraph before page break
          if (currentParagraph) {
            bodyText(currentParagraph, 7.5, { lineGap: 1.2 });
            currentParagraph = '';
          }
          newPage();
        }

        // If the sentence alone is too long for one page, split it
        if (candidate.length > 500 && doc.y > BOTTOM - 60) {
          newPage();
        }

        bodyText(candidate, 7.5, { lineGap: 1.2 });
        doc.moveDown(0.2);
      });

      doc.moveDown(1);
    }

    // ========================================================================
    // 10. LEGAL DESCRIPTION
    // ========================================================================
    sectionHeader('LEGAL DESCRIPTION');
    ensureSpace(40);
    doc.font('Helvetica').fontSize(8.5).fillColor('black').text(
      fields.legal_description || 'SEE ATTACHED',
      MARGIN + 6, doc.y,
      { width: CONTENT_W - 12, lineGap: 2 }
    );
    doc.moveDown(1.2);

    // ========================================================================
    // 11. NAMES SEARCHED
    // ========================================================================
    sectionHeader('NAMES SEARCHED');
    const names = fields.names_searched || [];
    if (names.length === 0) {
      italicText('No names searched.');
    } else {
      bodyText(names.map((n) => n.toUpperCase()).join('; '));
    }
    doc.moveDown(0.5);

    // ========================================================================
    // 12. ADDITIONAL INFORMATION
    // ========================================================================
    const addInfo = fields.additional_info || fields.additional_information;
    if (addInfo) {
      sectionHeader('ADDITIONAL INFORMATION');
      bodyText(addInfo);
    }

    // Final footer - draw at bottom of current page
    const finalFooterY = doc.page.height - 40;
    doc.fontSize(7).fillColor('#999999').text(`Page ${pageNum}`, MARGIN, finalFooterY, { width: CONTENT_W, align: 'right' });

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = { generateV2Report };
