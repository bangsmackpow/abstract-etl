const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * V5 (June 2026) PDF Generator
 * Clean, readable format — no Hazelwood branding, standard fonts.
 * 8 sections: Order Info, Chain of Title, Mortgages/Deeds of Trust,
 * Judgments/Liens, Miscellaneous Documents, Legal Description,
 * Additional Information, Names Searched.
 */
async function generateV5Report(jobData, outputPath) {
  const fields = jobData.fieldsJson || {};
  const order = fields.order_info || {};
  const chain = fields.chain_of_title || [];
  const mortgages = fields.mortgages || [];
  const liens = fields.judgments_liens || [];
  const misc = fields.misc_documents || [];
  const legal = fields.legal_description;
  const addInfo = fields.additional_information || [];
  const names = fields.names_searched || [];

  const MARGIN = 50;
  const CONTENT_W = 512;
  const SECTION_COLOR = '#2c3e50';
  const LABEL_COLOR = '#333333';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', autoFirstPage: false });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    let pageTotal = 0;
    doc.on('pageAdded', () => { pageTotal++; });

    const addPage = () => {
      doc.addPage();
      const savedY = doc.y;
      renderFooter();
      doc.y = savedY;
    };

    const renderFooter = () => {
      const footerY = doc.page.height - 60;
      doc.save();
      doc.fontSize(7).fillColor('#999999').font('Helvetica').text(
        `Page ${pageTotal}`,
        MARGIN, footerY, { width: CONTENT_W, align: 'right' }
      );
      doc.restore();
    };

    const sectionHeader = (title) => {
      const y = doc.y + 4;
      doc.rect(MARGIN, y, CONTENT_W, 18).fill(SECTION_COLOR);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text(title, MARGIN + 6, y + 3);
      doc.fillColor('black');
      doc.moveDown(1.3);
    };

    const kv = (label, value) => {
      const labelText = label || '';
      const valText = (value != null && value !== '') ? value.toString() : '—';
      doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text(`${labelText}: `, { continued: true });
      doc.font('Helvetica').fontSize(9).fillColor('black').text(valText);
    };

    const kvTwoCol = (label1, value1, label2, value2) => {
      const x1 = MARGIN + 6;
      const x2 = 290;
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text((label1 || '') + ': ', x1, y, { continued: true });
      doc.font('Helvetica').fontSize(9).fillColor('black').text((value1 != null && value1 !== '') ? value1.toString() : '—', { continued: false });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text((label2 || '') + ': ', x2, y, { continued: true });
      doc.font('Helvetica').fontSize(9).fillColor('black').text((value2 != null && value2 !== '') ? value2.toString() : '—');
    };

    const hr = () => {
      const yy = doc.y + 2;
      doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(MARGIN, yy).lineTo(MARGIN + CONTENT_W, yy).stroke();
      doc.moveDown(0.4);
    };

    const bodyText = (text, size = 9) => {
      doc.font('Helvetica').fontSize(size).fillColor('black').text(
        text || '',
        MARGIN + 6, doc.y, { width: CONTENT_W - 12, lineGap: 1.5 }
      );
    };

    const checkSpace = (needed = 60) => {
      if (doc.y + needed > doc.page.height - 60) addPage();
    };

    // ========================================================================
    // ORDER INFORMATION
    // ========================================================================
    doc.addPage();
    pageTotal++;
    sectionHeader('ORDER INFORMATION');

    kv('File Number', order.file_number);
    kv('Company Name', order.company_name);
    kvTwoCol('Effective Date', order.effective_date, 'Completed Date', order.completed_date);
    kv('Property Address', order.property_address);
    kvTwoCol('County', order.county, 'Township', order.township);

    if (order.parcel_ids && order.parcel_ids.length > 0) {
      doc.moveDown(0.3);
      kv('Parcel IDs', order.parcel_ids.join('\n'));
    }

    kvTwoCol('Assessed Value', order.assessed_value, 'Land Value', order.land_value);
    kv('Improvement Value', order.improvement_value);
    kv('Current Vesting Owner', order.current_vesting_owner);

    // Tax summary
    if (order.tax_id || order.tax_amount || order.tax_delinquent) {
      hr();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text('TAX SUMMARY', MARGIN + 6);
      doc.moveDown(0.2);
      kvTwoCol('Tax ID', order.tax_id, 'Tax Amount', order.tax_amount);
      kvTwoCol('Tax Due', order.tax_due, 'Tax Paid', order.tax_paid);
      if (order.tax_delinquent && typeof order.tax_delinquent === 'object') {
        const d = order.tax_delinquent;
        kv('Delinquent', `Original: ${d.original_amount || '—'} | Due: ${d.due_date || '—'} | Full: ${d.full_delinquent_amount || '—'}`);
      } else {
        kv('Delinquent', order.tax_delinquent);
      }
    }

    // ========================================================================
    // CHAIN OF TITLE
    // ========================================================================
    if (chain.length > 0) {
      checkSpace(80);
      sectionHeader('CHAIN OF TITLE');

      chain.forEach((entry, idx) => {
        checkSpace(100);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(SECTION_COLOR).text(`${idx + 1}. ${entry.deed_type || 'DEED'}`, MARGIN + 6);
        doc.moveDown(0.2);

        kvTwoCol('Book/Instrument', entry.instrument_book_page, 'Page', '');
        kvTwoCol('Dated', entry.deed_date, 'Recorded', entry.recorded_date);
        kv('Consideration', entry.consideration);
        kv('In/Out Sale', entry.in_out_sale ? 'YES' : 'NO');

        if (entry.grantors && entry.grantors.length > 0) {
          kv('Grantor(s)', Array.isArray(entry.grantors) ? entry.grantors.join(', ') : entry.grantors);
        }
        if (entry.grantees && entry.grantees.length > 0) {
          kv('Grantee(s)', Array.isArray(entry.grantees) ? entry.grantees.join(', ') : entry.grantees);
        }
        if (entry.notes) {
          doc.moveDown(0.2);
          doc.font('Helvetica-Oblique').fontSize(8).fillColor('#666666').text(`Note: ${entry.notes}`, MARGIN + 12, doc.y, { width: CONTENT_W - 18 });
          doc.fillColor('black');
        }
        if (entry.related_documents && entry.related_documents.length > 0) {
          doc.moveDown(0.2);
          doc.font('Helvetica-Bold').fontSize(8).fillColor(LABEL_COLOR).text('Related Documents:', MARGIN + 12, doc.y, { continued: true });
          doc.font('Helvetica').fontSize(8).fillColor('black').text(entry.related_documents.map(d => typeof d === 'string' ? d : d.document_type).join('; '));
        }
        hr();
      });
    }

    // ========================================================================
    // MORTGAGES / DEEDS OF TRUST
    // ========================================================================
    if (mortgages.length > 0) {
      checkSpace(80);
      sectionHeader('MORTGAGES / DEEDS OF TRUST');

      mortgages.forEach((m, idx) => {
        checkSpace(100);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(SECTION_COLOR).text(`${idx + 1}. ${m.document_title || 'MORTGAGE'}`, MARGIN + 6);
        doc.moveDown(0.2);

        kvTwoCol('Book/Instrument', m.book_instrument, 'Page', m.page);
        kvTwoCol('Dated', m.dated, 'Recorded', m.recorded);
        kvTwoCol('Consideration', m.consideration, 'Maturity Date', m.maturity_date);
        kvTwoCol('Lender', m.lender, 'Borrower', m.borrower);
        kv('Trustee', m.trustee);
        kv('Open/Closed Ended', m.open_closed_ended);

        if (m.associated_documents && m.associated_documents.length > 0) {
          doc.moveDown(0.2);
          doc.font('Helvetica-Bold').fontSize(8).fillColor(LABEL_COLOR).text('Associated Documents:', MARGIN + 12, doc.y, { continued: true });
          doc.font('Helvetica').fontSize(8).fillColor('black').text(m.associated_documents.map(d => d.document_type || 'Document').join('; '));
        }
        hr();
      });
    }

    // ========================================================================
    // JUDGMENTS / LIENS
    // ========================================================================
    checkSpace(60);
    sectionHeader('JUDGMENTS / LIENS');

    if (liens.length === 0) {
      bodyText('NO JUDGMENTS OR LIENS FOUND IN THE RECORD.');
    } else {
      liens.forEach((l, idx) => {
        checkSpace(80);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(SECTION_COLOR).text(`${idx + 1}. ${l.document_title || 'JUDGMENT/LIEN'}`, MARGIN + 6);
        doc.moveDown(0.2);
        kvTwoCol('Book/Instrument', l.book_instrument, 'Page', l.page);
        kvTwoCol('Dated', l.dated, 'Recorded', l.recorded);
        kvTwoCol('Case #', l.case_number, 'Amount', l.amount);
        kvTwoCol('Plaintiff', l.plaintiff, 'Defendant', l.defendant);
        hr();
      });
    }

    // ========================================================================
    // MISCELLANEOUS DOCUMENTS
    // ========================================================================
    checkSpace(60);
    sectionHeader('MISCELLANEOUS DOCUMENTS');

    if (misc.length === 0) {
      bodyText('NO MISCELLANEOUS DOCUMENTS FOUND IN THE RECORD.');
    } else {
      misc.forEach((m, idx) => {
        checkSpace(80);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(SECTION_COLOR).text(`${idx + 1}. ${m.document_title || 'DOCUMENT'}`, MARGIN + 6);
        doc.moveDown(0.2);
        kvTwoCol('Book/Instrument', m.book_instrument, 'Page', m.page);
        kvTwoCol('Dated', m.dated, 'Recorded', m.recorded);
        kv('Consideration', m.consideration);
        kvTwoCol('Grantor/Assignor', m.grantor_assignor, 'Grantee/Assignee', m.grantee_assignee);
        hr();
      });
    }

    // ========================================================================
    // LEGAL DESCRIPTION
    // ========================================================================
    checkSpace(60);
    sectionHeader('LEGAL DESCRIPTION');

    if (legal) {
      bodyText(legal, 8);
    } else {
      bodyText('No legal description available.');
    }

    // ========================================================================
    // ADDITIONAL INFORMATION
    // ========================================================================
    checkSpace(60);
    sectionHeader('ADDITIONAL INFORMATION');

    if (addInfo.length === 0 && !addInfo) {
      bodyText('No additional information.');
    } else if (Array.isArray(addInfo)) {
      addInfo.forEach((item, idx) => {
        checkSpace(30);
        if (typeof item === 'string') {
          bodyText(`${idx + 1}. ${item}`, 9);
        } else {
          bodyText(`${idx + 1}. ${item.book_instrument || ''} ${item.label || item.document_type || ''}`, 9);
        }
      });
    } else if (typeof addInfo === 'string') {
      bodyText(addInfo, 9);
    }

    // ========================================================================
    // NAMES SEARCHED
    // ========================================================================
    checkSpace(60);
    sectionHeader('NAMES SEARCHED');

    if (names.length === 0) {
      bodyText('No names searched.');
    } else {
      const namesText = names.map((n, idx) => `${idx + 1}. ${typeof n === 'string' ? n : n.name || n}`).join('\n');
      bodyText(namesText, 9);
    }

    // Final footer
    const finalFooterY = doc.page.height - 60;
    doc.fontSize(7).fillColor('#999999').font('Helvetica').text(
      `Page ${pageTotal}`,
      MARGIN, finalFooterY, { width: CONTENT_W, align: 'right' }
    );

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = { generateV5Report };
