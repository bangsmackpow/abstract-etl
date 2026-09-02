const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * V7 PDF Generator
 * Text-based clean format matching blank.docx layout.
 * Order Info, Tax Information, Chain of Title, Mortgages,
 * Judgments/Liens, Miscellaneous Documents, Legal Description,
 * Additional Information, Names Searched.
 *
 * opts.logo ({ data: Buffer, mime }) is the per-tenant logo (optional). When
 * absent, no logo is rendered — no Hazelwood fallback.
 */
async function generateV7Report(jobData, outputPath, opts = {}) {
  const fields = jobData.fieldsJson || {};
  const logo = opts.logo || null;
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
      const valText = (value != null && value !== '') ? value.toString() : 'ΓÇö';
      doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text(`${labelText}: `, { continued: true });
      doc.font('Helvetica').fontSize(9).fillColor('black').text(valText);
    };

    const kvTwoCol = (label1, value1, label2, value2) => {
      const x1 = MARGIN + 6;
      const x2 = 290;
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text((label1 || '') + ': ', x1, y, { continued: true });
      doc.font('Helvetica').fontSize(9).fillColor('black').text((value1 != null && value1 !== '') ? value1.toString() : 'ΓÇö', { continued: false });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text((label2 || '') + ': ', x2, y, { continued: true });
      doc.font('Helvetica').fontSize(9).fillColor('black').text((value2 != null && value2 !== '') ? value2.toString() : 'ΓÇö');
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

    // Logo (rule 16.9) — centered at top of first page
    // Logo (rule 16.9) — centered at top of first page; per-tenant, optional
    if (logo && logo.data) {
      doc.image(logo.data, MARGIN + CONTENT_W / 2 - 60, doc.y, { width: 120 });
      doc.moveDown(3);
    }

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

    // Tax information rendered within ORDER INFORMATION (not a standalone section)
    if (ti.year || ti.first_half || ti.second_half || ti.total_tax || ti.total_delinquent_amount) {
      hr();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text(`TAX INFORMATION (${ti.year || new Date().getFullYear()})`);
      doc.moveDown(0.2);

      const fh = ti.first_half || {};
      if (fh.due_date || fh.original_bill || fh.paid_date || fh.amount_paid || fh.penalty || fh.interest || fh.balance_due) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text('FIRST HALF');
        if (fh.due_date) kv('Due Date', fh.due_date);
        if (fh.original_bill) kv('Original Bill', `$${fh.original_bill}`);
        if (fh.paid_date) kv('Paid Date', fh.paid_date);
        if (fh.amount_paid) kv('Amount Paid', `$${fh.amount_paid}`);
        if (fh.penalty) kv('Penalty', `$${fh.penalty}`);
        if (fh.interest) kv('Interest', `$${fh.interest}`);
        if (fh.balance_due) kv('Balance Due', `$${fh.balance_due}`);
      }

      const sh = ti.second_half || {};
      if (sh.due_date || sh.original_bill || sh.paid_date || sh.amount_paid || sh.penalty || sh.interest || sh.balance_due) {
        checkSpace(40);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text('SECOND HALF');
        if (sh.due_date) kv('Due Date', sh.due_date);
        if (sh.original_bill) kv('Original Bill', `$${sh.original_bill}`);
        if (sh.paid_date) kv('Paid Date', sh.paid_date);
        if (sh.amount_paid) kv('Amount Paid', `$${sh.amount_paid}`);
        if (sh.penalty) kv('Penalty', `$${sh.penalty}`);
        if (sh.interest) kv('Interest', `$${sh.interest}`);
        if (sh.balance_due) kv('Balance Due', `$${sh.balance_due}`);
      }

      if (ti.total_tax) {
        checkSpace(20);
        kv(`Total ${ti.year || ''} Tax`, `$${ti.total_tax}`);
      }
      if (ti.total_delinquent_amount) {
        kv('Total Delinquent / Open Amount Shown', `$${ti.total_delinquent_amount}`);
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
      bodyText('NONE ΓÇö NO OPEN MORTGAGE OR DEED OF TRUST WAS INCLUDED OR CLEARLY IDENTIFIED IN THE PROVIDED DOCUMENTS.');
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
      bodyText('NONE ΓÇö NO OPEN JUDGMENT, LIEN, UCC, STATE TAX LIEN, FEDERAL TAX LIEN, MECHANIC\'S LIEN, LIS PENDENS, BANKRUPTCY, OR FORECLOSURE DOCUMENT WAS INCLUDED OR CLEARLY IDENTIFIED IN THE PROVIDED DOCUMENTS.');
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

module.exports = { generateV7Report };
