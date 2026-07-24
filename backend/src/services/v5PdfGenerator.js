const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * V5 (June 2026) PDF Generator
 * Clean, readable format — no Hazelwood branding, standard fonts.
 * 8 sections: Order Info, Chain of Title, Mortgages/Deeds of Trust,
 * Judgments/Liens, Miscellaneous Documents, Legal Description,
 * Additional Information, Names Searched.
 *
 * V6 (July 2026) extends V5 with additional fields:
 * - Order Info: assessor_owner, assessor_description, acreage (no completed_date)
 * - Mortgages: loan_number, min, status
 * - Judgments/Liens: interest, costs, attorneys_fees, status
 * - Misc Documents: area_or_width, notes
 * - Document Accounting rendered in Additional Information
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

async function generateV6Report(jobData, outputPath) {
  const fields = jobData.fieldsJson || {};
  const order = fields.order_info || {};
  const chain = fields.chain_of_title || [];
  const mortgages = fields.mortgages || [];
  const liens = fields.judgments_liens || [];
  const misc = fields.misc_documents || [];
  const legal = fields.legal_description;
  const addInfo = fields.additional_information || [];
  const docAccounting = fields.document_accounting || [];
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
    // ORDER INFORMATION (V6: no completed_date, add assessor_owner, assessor_description, acreage)
    // ========================================================================
    doc.addPage();
    pageTotal++;
    sectionHeader('ORDER INFORMATION');

    kv('File Number', order.file_number);
    kv('Company Name', order.company_name);
    kv('Effective Date', order.effective_date);
    kv('Property Address', order.property_address);
    kvTwoCol('County', order.county, 'Township', order.township);

    if (order.parcel_ids && order.parcel_ids.length > 0) {
      doc.moveDown(0.3);
      kv('Parcel IDs', order.parcel_ids.join('\n'));
    }

    kvTwoCol('Assessed Value', order.assessed_value, 'Land Value', order.land_value);
    kv('Improvement Value', order.improvement_value);
    kv('Current Vesting Owner', order.current_vesting_owner);
    kv('Assessor Owner', order.assessor_owner);
    kv('Assessor Description', order.assessor_description);
    kv('Acreage', order.acreage);

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
    // MORTGAGES / DEEDS OF TRUST (V6: add loan_number, min, status)
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
        kv('Loan Number', m.loan_number);
        kv('MIN', m.min);
        kv('Open/Closed Ended', m.open_closed_ended);
        kv('Status', m.status);

        if (m.associated_documents && m.associated_documents.length > 0) {
          doc.moveDown(0.2);
          doc.font('Helvetica-Bold').fontSize(8).fillColor(LABEL_COLOR).text('Associated Documents:', MARGIN + 12, doc.y, { continued: true });
          doc.font('Helvetica').fontSize(8).fillColor('black').text(m.associated_documents.map(d => d.document_type || 'Document').join('; '));
        }
        hr();
      });
    }

    // ========================================================================
    // JUDGMENTS / LIENS (V6: add interest, costs, attorneys_fees, status)
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
        kv('Interest', l.interest);
        kv('Costs', l.costs);
        kv("Attorney's Fees", l.attorneys_fees);
        kv('Status', l.status);
        hr();
      });
    }

    // ========================================================================
    // MISCELLANEOUS DOCUMENTS (V6: add area_or_width, notes)
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
        kv('Area/Width', m.area_or_width);
        kvTwoCol('Grantor/Assignor', m.grantor_assignor, 'Grantee/Assignee', m.grantee_assignee);
        if (m.notes) {
          doc.moveDown(0.2);
          doc.font('Helvetica-Oblique').fontSize(8).fillColor('#666666').text(`Note: ${m.notes}`, MARGIN + 12, doc.y, { width: CONTENT_W - 18 });
          doc.fillColor('black');
        }
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
    // ADDITIONAL INFORMATION (V6: include document_accounting)
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

    // Document Accounting (V6)
    if (docAccounting.length > 0) {
      checkSpace(60);
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text('PDF DOCUMENT ACCOUNTING', MARGIN + 6);
      doc.moveDown(0.2);
      docAccounting.forEach((item, idx) => {
        checkSpace(20);
        const pageRange = item.page_range || '';
        const label = item.document_label || '';
        bodyText(`${idx + 1}. PAGE(S) ${pageRange}: ${label}`, 8);
      });
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

/**
 * V7 PDF Generator
 * Text-based clean format matching blank.docx layout.
 * Order Info, Tax Information, Chain of Title, Mortgages,
 * Judgments/Liens, Miscellaneous Documents, Legal Description,
 * Additional Information, Names Searched.
 */
async function generateV7Report(jobData, outputPath) {
  const fields = jobData.fieldsJson || {};
  const oi = fields.order_info || {};
  const ti = fields.tax_information || {};
  const chain = fields.chain_of_title || [];
  const mortgages = fields.mortgages || [];
  const liens = fields.judgments_liens || [];
  const misc = fields.misc_documents || [];
  const legal = fields.legal_description;
  const addInfo = fields.additional_information || {};
  const names = fields.names_searched || [];

  const MARGIN = 50;
  const CONTENT_W = 512;
  const SECTION_COLOR = '#1F4E79';
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

    kv('File Number', oi.file_number);
    kv('Client / Order', oi.client_order);
    kv('Effective Date', oi.effective_date);
    kv('Borrower / Owner', oi.borrower_owner);
    kv('Property Address', oi.property_address);
    kvTwoCol('County', oi.county, 'Township / City', oi.township_city);
    kv('Parcel ID / Tax Map', oi.parcel_id_tax_map);
    kv('Account Number', oi.account_number);
    kv('Current Vesting Owner', oi.current_vesting_owner);
    kv('Assessor Owner', oi.assessor_owner);
    kv('Legal / Assessor Description', oi.legal_assessor_description);
    kv('Acreage', oi.acreage);
    kv('Assessment', oi.assessment);
    if (oi.order_verification_notes) {
      hr();
      kv('Order / Verification Notes', oi.order_verification_notes);
    }

    // ========================================================================
    // TAX INFORMATION
    // ========================================================================
    checkSpace(80);
    const taxYear = ti.year || new Date().getFullYear();
    sectionHeader(`${taxYear} TAX INFORMATION`);

    const fh = ti.first_half || {};
    doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text('FIRST HALF');
    doc.moveDown(0.2);
    kv('Due Date', fh.due_date);
    kv('Original Bill', fh.original_bill ? `$${fh.original_bill}` : fh.original_bill);
    kv('Paid Date', fh.paid_date);
    kv('Amount Paid', fh.amount_paid ? `$${fh.amount_paid}` : fh.amount_paid);
    kv('Penalty', fh.penalty ? `$${fh.penalty}` : fh.penalty);
    kv('Interest', fh.interest ? `$${fh.interest}` : fh.interest);
    kv('Balance Due', fh.balance_due ? `$${fh.balance_due}` : fh.balance_due);

    const sh = ti.second_half || {};
    checkSpace(60);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text('SECOND HALF');
    doc.moveDown(0.2);
    kv('Due Date', sh.due_date);
    kv('Original Bill', sh.original_bill ? `$${sh.original_bill}` : sh.original_bill);
    kv('Paid Date', sh.paid_date);
    kv('Amount Paid', sh.amount_paid ? `$${sh.amount_paid}` : sh.amount_paid);
    kv('Penalty', sh.penalty ? `$${sh.penalty}` : sh.penalty);
    kv('Interest', sh.interest ? `$${sh.interest}` : sh.interest);
    kv('Balance Due', sh.balance_due ? `$${sh.balance_due}` : sh.balance_due);

    if (ti.total_tax) {
      checkSpace(20);
      kv(`Total ${taxYear} Tax`, ti.total_tax ? `$${ti.total_tax}` : ti.total_tax);
    }
    if (ti.total_delinquent_amount) {
      kv('Total Delinquent / Open Amount Shown', ti.total_delinquent_amount ? `$${ti.total_delinquent_amount}` : ti.total_delinquent_amount);
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

        kv('Grantor(s)', (entry.grantors || []).join(', '));
        kv('Grantee(s)', (entry.grantees || []).join(', '));
        kvTwoCol('Dated', entry.dated, 'Recorded', entry.recorded);
        kv('Book / Page or Instrument', entry.book_page_instrument);
        kv('Consideration', entry.consideration);
        if (entry.notes) {
          doc.moveDown(0.2);
          doc.font('Helvetica-Oblique').fontSize(8).fillColor('#666666').text(`Notes: ${entry.notes}`, MARGIN + 12, doc.y, { width: CONTENT_W - 18 });
          doc.fillColor('black');
        }

        // Supporting documents
        const sd = entry.supporting_documents || [];
        sd.forEach((s) => {
          checkSpace(50);
          doc.font('Helvetica-Bold').fontSize(8).fillColor(LABEL_COLOR).text(`  * ${s.document_type || 'SUPPORTING DOCUMENT'}`, MARGIN + 12);
          doc.moveDown(0.1);
          if (s.decedent) kv('    Decedent', s.decedent);
          if (s.date_of_death || s.will_date) kvTwoCol('    Date of Death', s.date_of_death, 'Will Date', s.will_date);
          if (s.heirs && s.heirs.length > 0) kv('    Heirs', s.heirs.join(', '));
          if (s.devisees_beneficiaries && s.devisees_beneficiaries.length > 0) kv('    Devisees/Beneficiaries', s.devisees_beneficiaries.join(', '));
        });
        hr();
      });
    }

    // ========================================================================
    // MORTGAGES / DEEDS OF TRUST
    // ========================================================================
    checkSpace(60);
    sectionHeader('MORTGAGES / DEEDS OF TRUST');

    if (mortgages.length === 0) {
      bodyText('NONE — NO OPEN MORTGAGE OR DEED OF TRUST WAS INCLUDED OR CLEARLY IDENTIFIED IN THE PROVIDED DOCUMENTS.');
    } else {
      mortgages.forEach((m, idx) => {
        checkSpace(100);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(SECTION_COLOR).text(`${idx + 1}. ${m.document_title || 'MORTGAGE'}`, MARGIN + 6);
        doc.moveDown(0.2);

        kv('Borrower(s)', (m.borrowers || []).join(', '));
        kvTwoCol('Lender', m.lender, 'Trustee', m.trustee);
        kv('Beneficiary / Nominee', m.beneficiary_nominee);
        kvTwoCol('Dated', m.dated, 'Recorded', m.recorded);
        kv('Book / Page or Instrument', m.book_page_instrument);
        kvTwoCol('Amount', m.amount ? `$${m.amount}` : m.amount, 'Maturity', m.maturity);
        kvTwoCol('Loan Number', m.loan_number, 'MIN', m.min);
        kvTwoCol('Open/Closed Ended', m.open_closed_ended, 'Status', m.status);
        if (m.notes) {
          doc.moveDown(0.2);
          doc.font('Helvetica-Oblique').fontSize(8).fillColor('#666666').text(`Notes: ${m.notes}`, MARGIN + 12, doc.y, { width: CONTENT_W - 18 });
          doc.fillColor('black');
        }

        const ad = m.associated_documents || [];
        if (ad.length > 0) {
          doc.moveDown(0.2);
          doc.font('Helvetica-Bold').fontSize(8).fillColor(LABEL_COLOR).text('  Associated Documents:', MARGIN + 12);
          ad.forEach((a, ai) => {
            doc.font('Helvetica').fontSize(8).fillColor('black').text(`    ${ai + 1}. ${a.document_type || 'Document'} | ${a.book_page_instrument || ''} | ${a.dated || ''}`, MARGIN + 12);
          });
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
      bodyText('NONE — NO OPEN JUDGMENT, LIEN, UCC, STATE TAX LIEN, FEDERAL TAX LIEN, MECHANIC\'S LIEN, LIS PENDENS, BANKRUPTCY, OR FORECLOSURE DOCUMENT WAS INCLUDED OR CLEARLY IDENTIFIED IN THE PROVIDED DOCUMENTS.');
    } else {
      liens.forEach((l, idx) => {
        checkSpace(80);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(SECTION_COLOR).text(`${idx + 1}. ${l.document_title || 'JUDGMENT/LIEN'}`, MARGIN + 6);
        doc.moveDown(0.2);
        kvTwoCol('Plaintiff/Lienholder', l.plaintiff_lienholder, 'Defendant/Debtor', l.defendant_debtor);
        kv('Case Number', l.case_number);
        kvTwoCol('Date of Judgment/Lien', l.date_of_judgment_lien, 'Recorded', l.recorded);
        kv('Book / Page or Instrument', l.book_page_instrument);
        kvTwoCol('Amount', l.amount ? `$${l.amount}` : l.amount, 'Interest', l.interest);
        kvTwoCol('Costs', l.costs ? `$${l.costs}` : l.costs, "Attorney's Fees", l.attorneys_fees ? `$${l.attorneys_fees}` : l.attorneys_fees);
        kv('Status', l.status);
        if (l.notes) {
          doc.moveDown(0.2);
          doc.font('Helvetica-Oblique').fontSize(8).fillColor('#666666').text(`Notes: ${l.notes}`, MARGIN + 12, doc.y, { width: CONTENT_W - 18 });
          doc.fillColor('black');
        }
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
        doc.font('Helvetica-Bold').fontSize(9).fillColor(SECTION_COLOR).text(`${idx + 1}. ${m.document_type || m.document_title || 'DOCUMENT'}`, MARGIN + 6);
        doc.moveDown(0.2);

        if (m.decedent || m.date_of_death || m.will_date) {
          kv('Decedent', m.decedent);
          kvTwoCol('Date of Death', m.date_of_death, 'Will Date', m.will_date);
          if (m.probate_date) kv('Probate Date', m.probate_date);
          if (m.heirs && m.heirs.length > 0) kv('Heirs', m.heirs.join(', '));
          if (m.devisees_beneficiaries && m.devisees_beneficiaries.length > 0) kv('Devisees/Beneficiaries', m.devisees_beneficiaries.join(', '));
        }

        if (m.grantor_assignor) kv('Grantor/Assignor', m.grantor_assignor);
        if (m.grantee_assignee) kv('Grantee/Assignee', m.grantee_assignee);
        if (m.dated) kv('Dated', m.dated);
        if (m.book_page_instrument) kv('Book / Page or Instrument', m.book_page_instrument);
        if (m.consideration) kv('Consideration', m.consideration);
        if (m.area_or_width) kv('Area / Width', m.area_or_width);

        if (m.notes) {
          doc.moveDown(0.2);
          doc.font('Helvetica-Oblique').fontSize(8).fillColor('#666666').text(`Notes: ${m.notes}`, MARGIN + 12, doc.y, { width: CONTENT_W - 18 });
          doc.fillColor('black');
        }
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

    const refs = addInfo.references || [];
    if (refs.length > 0) {
      refs.forEach((r, idx) => {
        checkSpace(30);
        const refStr = typeof r === 'string' ? r : `${r.book_page_instrument || ''} - ${r.document_type || r.label || ''}`;
        bodyText(`${idx + 1}. ${refStr}`, 9);
      });
    }

    const docAccounting = addInfo.document_accounting || [];
    if (docAccounting.length > 0) {
      checkSpace(60);
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text('PDF DOCUMENT ACCOUNTING', MARGIN + 6);
      doc.moveDown(0.2);
      docAccounting.forEach((da, idx) => {
        checkSpace(20);
        bodyText(`${idx + 1}. PAGE(S) ${da.page_range || ''}: ${da.document_label || ''}`, 8);
      });
    }

    if (refs.length === 0 && docAccounting.length === 0) {
      bodyText('No additional information.');
    }

    // ========================================================================
    // NAMES SEARCHED
    // ========================================================================
    checkSpace(60);
    sectionHeader('NAMES SEARCHED');

    if (names.length === 0) {
      bodyText('NONE PROVIDED.');
    } else {
      const namesText = (names || []).join(', ');
      bodyText(namesText, 9);
    }

    checkSpace(20);
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#666666').text('Performed by: Patrick Hazelwood', MARGIN + 6);

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

module.exports = { generateV5Report, generateV6Report, generateV7Report };
