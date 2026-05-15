const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Hazelwood V4 PDF Generator
 * Section page breaks, Times font, ALL CAPS, editable fields, Hazelwood layout.
 */
async function generateV4Report(jobData, outputPath) {
  const fields = jobData.fieldsJson || {};
  const order = fields.order_info || {};
  const vest = fields.vesting_info || {};
  const chain = fields.chain_of_title || [];
  const mortgages = fields.mortgages || [];
  const assoc = fields.associated_documents || [];
  const liens = fields.judgments_liens || [];
  const misc = fields.misc_documents || [];
  const tax = fields.tax_status || {};
  const legal = fields.legal_description;
  const names = fields.names_searched || [];
  const addInfo = fields.additional_information;

  const DARK = '#003366';
  const MARGIN = 50;
  const CONTENT_W = 512;
  const LOGO_W = 100;
  const DOCS_DIR = process.env.DOCS_DIR || path.resolve(__dirname, '../../../docs');
  const LOGO_PATH = path.join(DOCS_DIR, 'logo', 'HazelwoodLogoFinal.png');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', autoFirstPage: false });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    let pageTotal = 0;
    doc.on('pageAdded', () => { pageTotal++; });

    // --- Helpers ---
    const addPage = () => {
      doc.addPage();
      pageTotal++;
      renderFooter();
    };

    const renderFooter = () => {
      const footerY = doc.page.height - 30;
      doc.save();
      doc.fontSize(7).fillColor('#999999').font('Helvetica').text(
        `Page ${pageTotal}`,
        MARGIN, footerY, { width: CONTENT_W, align: 'right' }
      );
      doc.restore();
    };

    const sectionHeader = (title) => {
      const y = doc.y + 4;
      doc.rect(MARGIN, y, CONTENT_W, 20).fill(DARK);
      doc.fillColor('white').font('Times-Bold').fontSize(10).text(title.toUpperCase(), MARGIN + 6, y + 4);
      doc.fillColor('black');
      doc.moveDown(1.5);
    };

    const kv = (label, value) => {
      const labelText = (label || '').toUpperCase();
      const valText = (value || '\u2014').toString().toUpperCase();
      doc.font('Times-Bold').fontSize(9).fillColor('#333333').text(`${labelText}: `, { continued: true });
      doc.font('Times-Roman').fontSize(9).fillColor('black').text(valText);
    };

    const kvTwoCol = (label1, value1, label2, value2) => {
      const x1 = MARGIN + 6;
      const x2 = 290;
      const y = doc.y;
      doc.font('Times-Bold').fontSize(9).fillColor('#333333').text((label1 || '').toUpperCase() + ': ', x1, y, { continued: true });
      doc.font('Times-Roman').fontSize(9).fillColor('black').text((value1 || '\u2014').toString().toUpperCase(), { continued: false });
      doc.font('Times-Bold').fontSize(9).fillColor('#333333').text((label2 || '').toUpperCase() + ': ', x2, y, { continued: true });
      doc.font('Times-Roman').fontSize(9).fillColor('black').text((value2 || '\u2014').toString().toUpperCase());
    };

    const hr = () => {
      const yy = doc.y + 2;
      doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(MARGIN, yy).lineTo(MARGIN + CONTENT_W, yy).stroke();
      doc.moveDown(0.5);
    };

    const bodyText = (text, size = 9) => {
      doc.font('Times-Roman').fontSize(size).fillColor('black').text(
        (text || '').toUpperCase(),
        MARGIN + 6, doc.y, { width: CONTENT_W - 12, lineGap: 1.5 }
      );
    };

    const italicText = (text, size = 9) => {
      doc.font('Times-Italic').fontSize(size).fillColor('#666666').text(
        text, MARGIN + 6, doc.y, { width: CONTENT_W - 12 }
      );
    };

    const _addTextField = (label, value, yOverride) => {
      const yy = yOverride || doc.y;
      // Static text fallback — formTextField not available in all pdfkit builds
      doc.font('Times-Roman').fontSize(9).fillColor('black').text(
        (value || '').toString().toUpperCase(),
        MARGIN + 6, yy, { width: CONTENT_W - 12 }
      );
    };

    // ========================================================================
    // COVER PAGE — Hazelwood Header
    // ========================================================================
    addPage();

    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, MARGIN, 30, { width: LOGO_W });
    }
    doc.fontSize(18).font('Times-Bold').fillColor(DARK).text('HAZELWOOD & ASSOCIATES, LLC', { align: 'center' });
    doc.fontSize(12).font('Times-Roman').fillColor(DARK).text('PROPERTY ABSTRACT REPORT', { align: 'center' });
    doc.fontSize(9).fillColor('#666666').text('V4 Standard', { align: 'center' });
    doc.moveDown(0.5);
    doc.rect(MARGIN, doc.y, CONTENT_W, 2).fill(DARK);
    doc.moveDown(1.5);

    // Order info on cover
    kvTwoCol('ORDER NUMBER', order.order_number, 'COMPLETED DATE', order.completed_date);
    doc.moveDown(0.3);
    kvTwoCol('COMPANY', order.company_name, 'EFFECTIVE DATE', order.effective_date);
    doc.moveDown(0.3);
    kv('PROPERTY ADDRESS', order.property_address);
    doc.moveDown(0.3);
    kvTwoCol('COUNTY', order.county, 'TOWNSHIP', order.township);
    doc.moveDown(0.3);
    kv('CURRENT VESTING OWNER', order.current_vesting_owner);
    doc.moveDown(0.3);

    if (order.parcel_ids && order.parcel_ids.length > 0) {
      kv('PARCEL IDS', order.parcel_ids.join('; '));
      doc.moveDown(0.3);
    }
    kvTwoCol('ASSESSED VALUE', order.assessed_value, 'LAND VALUE', order.land_value);
    doc.moveDown(0.3);
    kvTwoCol('IMPROVEMENT VALUE', order.improvement_value, 'TAX ID', order.tax_id);
    doc.moveDown(1);

    // ========================================================================
    // 1. VESTING INFORMATION
    // ========================================================================
    addPage();
    sectionHeader('VESTING INFORMATION');

    kvTwoCol('GRANTEE', vest.grantee, 'GRANTOR', vest.grantor);
    doc.moveDown(0.3);
    kvTwoCol('DEED DATE', vest.deed_date, 'RECORDED DATE', vest.recorded_date);
    doc.moveDown(0.3);
    kv('INSTRUMENT / BOOK / PAGE', vest.instrument_book_page);
    doc.moveDown(0.3);
    kvTwoCol('DEED TYPE', vest.deed_type, 'CONSIDERATION', vest.consideration);
    doc.moveDown(0.3);
    kv('IN / OUT SALE', vest.in_out_sale ? 'YES' : 'NO');
    if (vest.notes) {
      doc.moveDown(0.3);
      kv('NOTES', vest.notes);
    }
    doc.moveDown(1);

    // ========================================================================
    // 2. CHAIN OF TITLE
    // ========================================================================
    addPage();
    sectionHeader('CHAIN OF TITLE');

    if (chain.length === 0) {
      italicText('No chain-of-title entries found in the record.');
    } else {
      chain.forEach((entry, i) => {
        doc.font('Times-Bold').fontSize(10).fillColor(DARK).text(`ENTRY ${i + 1} OF ${chain.length}`, MARGIN + 6, doc.y + 2);
        doc.fillColor('black').moveDown(0.5);

        kv('DEED TYPE', entry.deed_type);
        doc.moveDown(0.3);
        kv('GRANTORS', (entry.grantors || []).join(', '));
        doc.moveDown(0.3);
        kv('GRANTEES', (entry.grantees || []).join(', '));
        doc.moveDown(0.3);
        kvTwoCol('DEED DATE', entry.deed_date, 'RECORDED DATE', entry.recorded_date);
        doc.moveDown(0.3);
        kv('INSTRUMENT / BOOK / PAGE', entry.instrument_book_page);
        doc.moveDown(0.3);
        kv('CONSIDERATION', entry.consideration);

        if (entry.notes) {
          doc.moveDown(0.3);
          doc.font('Times-Bold').fontSize(8).fillColor('#444444').text('NOTES: ', MARGIN + 12, doc.y, { continued: true });
          doc.font('Times-Italic').fontSize(8).fillColor('#555555').text(entry.notes, { width: CONTENT_W - 60 });
          doc.fillColor('black');
        }

        const related = entry.related_documents || [];
        if (related.length > 0) {
          doc.moveDown(0.3);
          doc.font('Times-Bold').fontSize(8).fillColor(DARK).text('RELATED DOCUMENTS:', MARGIN + 12, doc.y);
          related.forEach((rd, ri) => {
            doc.font('Times-Roman').fontSize(8).fillColor('#444444').text(
              `  ${ri + 1}. ${rd.document_type || rd.title || 'N/A'} | ${rd.book_instrument || rd.instrument || 'N/A'} | ${rd.dated || rd.recorded_date || 'N/A'}`,
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
    // 3. MORTGAGES / LIENS
    // ========================================================================
    addPage();
    sectionHeader('MORTGAGES / LIENS');

    if (mortgages.length === 0) {
      italicText('No mortgages or deeds of trust found in the record.');
    } else {
      mortgages.forEach((m, i) => {
        doc.font('Times-Bold').fontSize(10).fillColor(DARK).text(`MORTGAGE ${i + 1} OF ${mortgages.length}`, MARGIN + 6, doc.y + 2);
        doc.fillColor('black').moveDown(0.5);

        kvTwoCol('BORROWER', m.borrower, 'LENDER', m.lender);
        doc.moveDown(0.3);
        kvTwoCol('AMOUNT', m.mortgage_amount, 'TYPE', m.mortgage_type);
        kvTwoCol('VESTING STATUS', m.vesting_status, 'MERS', m.mers || 'No');
        doc.moveDown(0.3);
        kvTwoCol('MORTGAGE DATE', m.mortgage_date, 'RECORDED DATE', m.recorded_date);
        kvTwoCol('MATURITY DATE', m.maturity_date, 'BOOK / PAGE / INSTR', `${m.book || '\u2014'} / ${m.page || '\u2014'} / ${m.instrument || '\u2014'}`);
        doc.moveDown(0.3);

        if (m.subordination_notes) {
          kv('SUBORDINATION NOTES', m.subordination_notes);
          doc.moveDown(0.3);
        }

        const assignments = m.assignments || [];
        if (assignments.length > 0) {
          doc.font('Times-Bold').fontSize(9).fillColor(DARK).text('ASSIGNMENTS:', MARGIN + 12, doc.y + 4);
          assignments.forEach((a, ai) => {
            doc.font('Times-Roman').fontSize(8).fillColor('#444444').text(
              `  ${ai + 1}. ${a.document_type || 'ASSIGNMENT'} | ${a.assignor || 'N/A'} \u2192 ${a.assignee || 'N/A'} | REC: ${a.recorded_date || 'N/A'} | INST: ${a.instrument || 'N/A'}`,
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
    // 4. ASSOCIATED DOCUMENTS
    // ========================================================================
    addPage();
    sectionHeader('ASSOCIATED DOCUMENTS');

    if (assoc.length === 0) {
      italicText('No associated documents found in the record.');
    } else {
      assoc.forEach((a, i) => {
        doc.font('Times-Bold').fontSize(10).fillColor(DARK).text(`DOCUMENT ${i + 1} OF ${assoc.length}`, MARGIN + 6, doc.y + 2);
        doc.fillColor('black').moveDown(0.5);

        kv('DOCUMENT TYPE', a.document_type || a.document_title);
        doc.moveDown(0.3);
        kvTwoCol('DATED', a.dated, 'RECORDED', a.recorded);
        doc.moveDown(0.3);
        kv('BOOK / INSTRUMENT / PAGE', a.book_instrument);
        doc.moveDown(0.3);
        kvTwoCol('GRANTOR / ASSIGNOR', a.grantor_assignor, 'GRANTEE / ASSIGNEE', a.grantee_assignee);
        if (a.notes) {
          doc.moveDown(0.3);
          kv('NOTES', a.notes);
        }
        doc.moveDown(0.3);
        hr();
        doc.moveDown(0.3);
      });
    }
    doc.moveDown(0.5);

    // ========================================================================
    // 5. JUDGMENTS / LIENS
    // ========================================================================
    addPage();
    sectionHeader('JUDGMENTS / LIENS');

    if (liens.length === 0) {
      italicText('No judgments or liens found in the record.');
    } else {
      liens.forEach((l, i) => {
        doc.font('Times-Bold').fontSize(10).fillColor(DARK).text(`JUDGMENT / LIEN ${i + 1} OF ${liens.length}`, MARGIN + 6, doc.y + 2);
        doc.fillColor('black').moveDown(0.5);

        kv('DOCUMENT TITLE', l.document_title);
        doc.moveDown(0.3);
        kvTwoCol('DATED', l.dated, 'CASE #', l.case_number);
        doc.moveDown(0.3);
        kv('BOOK / INSTRUMENT / PAGE', l.book_instrument);
        doc.moveDown(0.3);
        kvTwoCol('AMOUNT', l.amount, 'RECORDED', l.recorded);
        doc.moveDown(0.3);
        kvTwoCol('PLAINTIFF', l.plaintiff, 'DEFENDANT', l.defendant);
        doc.moveDown(0.3);
        hr();
        doc.moveDown(0.3);
      });
    }
    doc.moveDown(0.5);

    // ========================================================================
    // 6. MISCELLANEOUS DOCUMENTS
    // ========================================================================
    addPage();
    sectionHeader('MISCELLANEOUS DOCUMENTS');

    if (misc.length === 0) {
      italicText('No miscellaneous documents found in the record.');
    } else {
      misc.forEach((d, i) => {
        doc.font('Times-Bold').fontSize(10).fillColor(DARK).text(`DOCUMENT ${i + 1} OF ${misc.length}`, MARGIN + 6, doc.y + 2);
        doc.fillColor('black').moveDown(0.5);

        kv('DOCUMENT TITLE', d.document_title);
        doc.moveDown(0.3);
        kvTwoCol('DATED', d.dated, 'RECORDED', d.recorded);
        doc.moveDown(0.3);
        kv('BOOK / INSTRUMENT / PAGE', d.book_instrument);
        doc.moveDown(0.3);
        kvTwoCol('GRANTOR / ASSIGNOR', d.grantor_assignor, 'GRANTEE / ASSIGNEE', d.grantee_assignee);
        doc.moveDown(0.3);
        hr();
        doc.moveDown(0.3);
      });
    }
    doc.moveDown(0.5);

    // ========================================================================
    // 7. TAX STATUS
    // ========================================================================
    addPage();
    sectionHeader('TAX STATUS');

    kvTwoCol('PARCEL ID', tax.parcel_id || order.parcel_id, 'TAX YEAR', tax.tax_year);
    kvTwoCol('STATUS', tax.status, 'TOTAL AMOUNT', tax.total_amount);
    doc.moveDown(0.3);
    kvTwoCol('PAID DATE', tax.paid_date, 'DELINQUENT AMOUNT', tax.delinquent_amount);
    doc.moveDown(0.3);

    const installments = tax.installments || [];
    if (installments.length > 0) {
      doc.font('Times-Bold').fontSize(9).fillColor(DARK).text('INSTALLMENTS:', MARGIN + 6, doc.y + 4);
      installments.forEach((inst) => {
        doc.font('Times-Roman').fontSize(8).fillColor('#444444').text(
          `  Installment ${inst.installment_number || 'N/A'}: $${inst.amount || '0.00'} | Due: ${inst.due_date || 'N/A'} | Status: ${inst.status || 'N/A'} | Paid: ${inst.paid_date || 'N/A'} | Delinquent: $${inst.delinquent_amount || '0.00'} | Penalties/Fees: $${inst.penalties_fees || '0.00'}`,
          MARGIN + 12, doc.y + 2, { width: CONTENT_W - 30 }
        );
      });
      doc.fillColor('black');
    }
    doc.moveDown(1);

    // ========================================================================
    // 8. LEGAL DESCRIPTION
    // ========================================================================
    addPage();
    sectionHeader('LEGAL DESCRIPTION');
    doc.font('Times-Roman').fontSize(8.5).fillColor('black').text(
      (legal || 'SEE ATTACHED').toUpperCase(),
      MARGIN + 6, doc.y, { width: CONTENT_W - 12, lineGap: 2 }
    );
    doc.moveDown(1);

    // ========================================================================
    // 9. NAMES SEARCHED
    // ========================================================================
    addPage();
    sectionHeader('NAMES SEARCHED');

    if (names.length === 0) {
      italicText('No names searched.');
    } else {
      bodyText(names.map((n) => n.toUpperCase()).join('; '));
    }
    doc.moveDown(0.5);

    // ========================================================================
    // 10. ADDITIONAL INFORMATION
    // ========================================================================
    if (addInfo) {
      addPage();
      sectionHeader('ADDITIONAL INFORMATION');
      bodyText(addInfo);
    }

    // ========================================================================
    // EXAMINER NOTES (editable)
    // ========================================================================
    addPage();
    sectionHeader('EXAMINER NOTES');
    doc.font('Times-Italic').fontSize(9).fillColor('#666666').text(
      'Add notes below:', MARGIN + 6, doc.y, { width: CONTENT_W - 12 }
    );
    doc.moveDown(0.3);

    // Static text area for examiner notes
    doc.font('Times-Roman').fontSize(9).fillColor('#CCCCCC').text(
      '________________________________________________________________________________\n'.repeat(12),
      MARGIN + 6, doc.y, { width: CONTENT_W - 12 }
    );
    doc.fillColor('black');

    // Final footer on last page
    doc.moveDown(25);
    doc.fontSize(7).fillColor('#999999').font('Helvetica').text(
      `Page ${pageTotal}`,
      MARGIN, doc.y, { width: CONTENT_W, align: 'right' }
    );

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = { generateV4Report };
