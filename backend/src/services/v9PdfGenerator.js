const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Hazelwood & Associates, LLC logo (rule 16.9). PNG chosen for transparency +
// sufficient resolution at report size. Rendered on the first page; report
// still renders if the asset is missing. Resolved via DOCS_DIR (same
// convention as googleAiService) so it works both locally and inside the
// Docker image (/app/docs).
const DOCS_DIR = process.env.DOCS_DIR || path.join(__dirname, '..', '..', '..', 'docs');
const LOGO_PATH = path.join(DOCS_DIR, 'HazelwoodLogo', 'HazelwoodLogoFinal.png');

/**
 * V9 (REVISION 9 rules) PDF Generator
 * Implements docs/v9/v9_rules.md formatting rules:
 *  - ALL CAPS report content (Legal Description preserves recorded case)
 *  - Red C00000 only for warning / review items; routine notes black (16.3)
 *  - Chain of Title follows PDF packet order; only deeds numbered; supporting starred (6.1-6.2A)
 *  - Mandatory visible CONSIDERATION + RECORDED fields on every deed
 *  - Mandatory visible MIN + MATURITY (NOT SHOWN when absent) on every deed of trust
 *  - VERIFICATION NOTES block after ORDER INFORMATION (16.11)
 *  - Foreclosure sequence consolidated inside Trustee's Deed block (6.17)
 *  - Single "Performed by: Patrick Hazelwood" line once at the bottom (19.x)
 */
async function generateV9Report(jobData, outputPath) {
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
  const update = fields.update_report || {};

  const MARGIN = 50;
  const CONTENT_W = 512;
  const SECTION_COLOR = '#1F4E79';
  const LABEL_COLOR = '#333333';
  const WARNING_RED = 'C00000';

  const up = (v) => (v !== null && v !== undefined && v !== '' ? String(v).toUpperCase() : '');
  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v) : '');
  const dash = (v) => val(v) || '—';

  const WARN_TOKENS = [
    'COPY NOT INCLUDED',
    'NOT SHOWN',
    'UNABLE TO DETERMINE',
    'STATUS UNCLEAR',
    'NO WILL OR LIST OF HEIRS',
    'REFERENCE ONLY',
    'CONFLICT',
    'VERIFY',
    'MISSING',
    'FORECLOSED',
  ];
  const isWarning = (v) => {
    const text = up(v);
    return WARN_TOKENS.some((t) => text.includes(t));
  };

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
      doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text(up(title), MARGIN + 6, y + 3);
      doc.fillColor('black');
      doc.moveDown(1.3);
    };

    const kv = (label, value, opts = {}) => {
      const { warn = null } = opts;
      const isWarn = warn !== null ? Boolean(warn) : isWarning(value);
      const labelText = up(label) || '';
      const valText = up(dash(value));
      doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text(`${labelText}: `, { continued: true });
      doc.font('Helvetica').fontSize(9).fillColor(isWarn ? WARNING_RED : 'black').text(valText);
    };

    const kvTwoCol = (label1, value1, label2, value2) => {
      const x1 = MARGIN + 6;
      const x2 = 290;
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text(up(label1 || '') + ': ', x1, y, { continued: true });
      doc.font('Helvetica').fontSize(9).fillColor('black').text(up(dash(value1)), { continued: false });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(LABEL_COLOR).text(up(label2 || '') + ': ', x2, y, { continued: true });
      doc.font('Helvetica').fontSize(9).fillColor('black').text(up(dash(value2)));
    };

    const hr = () => {
      const yy = doc.y + 2;
      doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(MARGIN, yy).lineTo(MARGIN + CONTENT_W, yy).stroke();
      doc.moveDown(0.4);
    };

    const bodyText = (text, size = 9, opts = {}) => {
      const { warn = false, preserveCase = false } = opts;
      doc.font('Helvetica').fontSize(size).fillColor(warn ? WARNING_RED : 'black').text(
        preserveCase ? (text || '') : up(text || ''),
        MARGIN + 6, doc.y, { width: CONTENT_W - 12, lineGap: 1.5 }
      );
    };

    const boldText = (text, size = 9, opts = {}) => {
      const { warn = false, color = LABEL_COLOR } = opts;
      doc.font('Helvetica-Bold').fontSize(size).fillColor(warn ? WARNING_RED : color).text(up(text || ''), MARGIN + 6, doc.y, { width: CONTENT_W - 12 });
    };

    const checkSpace = (needed = 60) => {
      if (doc.y + needed > doc.page.height - 60) addPage();
    };

    const renderSupporting = (sd) => {
      (Array.isArray(sd) ? sd : []).forEach((s) => {
        checkSpace(50);
        boldText(`* ${dash(s.document_type) || 'SUPPORTING DOCUMENT'}`, 8, { color: LABEL_COLOR });
        doc.moveDown(0.1);
        if (val(s.decedent)) kv('Decedent', s.decedent);
        if (val(s.date_of_death) || val(s.will_date)) kvTwoCol('Date of Death', s.date_of_death, 'Will Date', s.will_date);
        if (val(s.recorded)) kv('Recorded', s.recorded);
        if (val(s.book_page_instrument)) kv('Book / Page or Instrument', s.book_page_instrument);
        if (s.heirs && s.heirs.length > 0) kv('Heirs', s.heirs.join(', '));
        if (s.devisees_beneficiaries && s.devisees_beneficiaries.length > 0) kv('Devisees/Beneficiaries', s.devisees_beneficiaries.join(', '));
        if (val(s.notes)) kv('Notes', s.notes);
      });
    };

    const renderForeclosure = (seq) => {
      const docs = Array.isArray(seq) ? seq : [];
      if (docs.length === 0) return;
      checkSpace(60);
      boldText('Foreclosure Sequence (in packet order)', 8, { color: LABEL_COLOR });
      docs.forEach((d, i) => {
        const ref = [d.book_page_instrument, d.dated, d.recorded].filter(Boolean).join(' | ');
        const isFdot = up(d.document_type || '').includes('FORECLOSED DEED OF TRUST');
        doc.font('Helvetica').fontSize(8).fillColor(isFdot ? WARNING_RED : 'black').text(
          up(`  (${i + 1}) ${dash(d.document_type)}${ref ? ` — ${ref}` : ''}`),
          MARGIN + 6, doc.y, { width: CONTENT_W - 12 }
        );
      });
    };

    // ========================================================================
    // ORDER INFORMATION
    // ========================================================================
    doc.addPage();
    pageTotal++;

    // Logo (rule 16.9) — centered at top of first page
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, MARGIN + CONTENT_W / 2 - 60, doc.y, { width: 120 });
      doc.moveDown(3);
    }

    sectionHeader('ORDER INFORMATION');

    kv('File Number', oi.file_number);
    kv('Client / Order', oi.client_order);
    kv('Company Name', oi.company_name);
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
    if (val(oi.land_value)) kv('Land Value', oi.land_value);
    if (val(oi.improvement_value)) kv('Improvement Value', oi.improvement_value);
    if (val(oi.total_value)) kv('Total Value', oi.total_value);
    if (val(oi.order_verification_notes)) {
      checkSpace(60);
      hr();
      boldText('Verification Notes', 9, { color: LABEL_COLOR });
      kv('', oi.order_verification_notes, { warn: true });
    }

    // Tax information rendered within ORDER INFORMATION (not a standalone section)
    if (ti.year || ti.first_half || ti.second_half || ti.total_tax || ti.total_delinquent_amount || ti.status) {
      hr();
      boldText(`TAX INFORMATION (${up(ti.year) || new Date().getFullYear()})`, 9, { color: LABEL_COLOR });
      doc.moveDown(0.2);

      if (val(ti.status)) kv('Status', ti.status, { warn: isWarning(ti.status) });

      const fh = ti.first_half || {};
      if (fh.due_date || fh.original_bill || fh.paid_date || fh.amount_paid || fh.penalty || fh.interest || fh.balance_due) {
        boldText('FIRST HALF', 9, { color: LABEL_COLOR });
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
        boldText('SECOND HALF', 9, { color: LABEL_COLOR });
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
        kv('Total Delinquent / Open Amount Shown', `$${ti.total_delinquent_amount}`, { warn: true });
      }
    }

    // ========================================================================
    // CHAIN OF TITLE (packet order; only deeds numbered; supporting starred)
    // ========================================================================
    if (chain.length > 0) {
      checkSpace(80);
      sectionHeader('CHAIN OF TITLE');

      let deedNo = 0;
      chain.forEach((entry) => {
        const isSupporting = up(entry.entry_type || '') === 'SUPPORTING';
        checkSpace(100);

        if (isSupporting) {
          const typeLabel = val(entry.supporting_documents?.[0]?.document_type) || val(entry.deed_type) || val(entry.document_title) || 'SUPPORTING DOCUMENT';
          const decedent = val(entry.supporting_documents?.[0]?.decedent) || val(entry.deceased_person);
          doc.font('Helvetica-Bold').fontSize(10).fillColor(SECTION_COLOR).text(`* ${up(typeLabel)}${decedent ? ` — ${decedent}` : ''}`, MARGIN + 6);
          doc.moveDown(0.2);
          renderSupporting(entry.supporting_documents && entry.supporting_documents.length ? entry.supporting_documents : (entry.deed_type ? [entry] : []));
          if (val(entry.recorded)) kv('Recorded', entry.recorded);
          if (val(entry.book_page_instrument)) kv('Book / Page or Instrument', entry.book_page_instrument);
          if (val(entry.notes)) kv('Notes', entry.notes);
        } else {
          deedNo += 1;
          const title = val(entry.document_title) || val(entry.deed_type) || 'DEED';
          doc.font('Helvetica-Bold').fontSize(10).fillColor(SECTION_COLOR).text(`${deedNo}. ${up(title)}`, MARGIN + 6);
          doc.moveDown(0.2);

          kv('Grantor(s)', (entry.grantors || []).join(', '));
          kv('Grantee(s)', (entry.grantees || []).join(', '));
          kvTwoCol('Dated', entry.dated, 'Recorded / Recording Date', entry.recorded);
          if (val(entry.recording_time)) kv('Recording Time', entry.recording_time);
          kv('Book / Page or Instrument', entry.book_page_instrument);
          kv('Consideration', entry.consideration);
          if (val(entry.deceased_person)) {
            kv('Deceased Person', entry.deceased_person, { warn: true });
            if (val(entry.deceased_note)) kv('Note', entry.deceased_note, { warn: true });
          }
          if (val(entry.third_party_party)) {
            kv('Party of the Third Part', entry.third_party_party);
            if (val(entry.third_party_reason)) kv('Participation Reason', entry.third_party_reason);
          }
          if (val(entry.partition_deed_notes)) kv('Partition Deed Notes', entry.partition_deed_notes);
          if (val(entry.notes)) {
            doc.moveDown(0.2);
            doc.font('Helvetica-Oblique').fontSize(8).fillColor(isWarning(entry.notes) ? WARNING_RED : '#666666').text(`Notes: ${up(entry.notes)}`, MARGIN + 12, doc.y, { width: CONTENT_W - 18 });
            doc.fillColor('black');
          }
          renderForeclosure(entry.foreclosure_sequence);
          renderSupporting(entry.supporting_documents);
        }
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
        doc.font('Helvetica-Bold').fontSize(10).fillColor(SECTION_COLOR).text(`${idx + 1}. ${up(m.document_title || 'MORTGAGE')}`, MARGIN + 6);
        doc.moveDown(0.2);

        kv('Borrower(s)', (m.borrowers || []).join(', '));
        kvTwoCol('Lender', m.lender, 'Trustee', m.trustee);
        kv('Beneficiary / Nominee', m.beneficiary_nominee);
        kvTwoCol('Dated', m.dated, 'Recorded', m.recorded);
        kv('Book / Page or Instrument', m.book_page_instrument);
        kvTwoCol('Amount', m.amount ? `$${m.amount}` : m.amount, 'Maturity', m.maturity || 'NOT SHOWN');
        kvTwoCol('Loan Number', m.loan_number, 'MIN', m.min || 'NOT SHOWN');
        kvTwoCol('Open/Closed Ended', m.open_closed_ended, 'Status', m.status);
        if (val(m.notes)) {
          doc.moveDown(0.2);
          doc.font('Helvetica-Oblique').fontSize(8).fillColor(isWarning(m.notes) ? WARNING_RED : '#666666').text(`Notes: ${up(m.notes)}`, MARGIN + 12, doc.y, { width: CONTENT_W - 18 });
          doc.fillColor('black');
        }

        const ad = m.associated_documents || [];
        if (ad.length > 0) {
          doc.moveDown(0.2);
          boldText('Associated Documents', 8, { color: LABEL_COLOR });
          ad.forEach((a, ai) => {
            const ref = [a.book_page_instrument, a.dated, a.recorded].filter(Boolean).join(' | ');
            doc.font('Helvetica').fontSize(8).fillColor('black').text(
              up(`  ${ai + 1}. ${dash(a.document_type)}${ref ? ` | ${ref}` : ''}`),
              MARGIN + 12
            );
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
        doc.font('Helvetica-Bold').fontSize(9).fillColor(SECTION_COLOR).text(`${idx + 1}. ${up(l.document_title || 'JUDGMENT/LIEN')}`, MARGIN + 6);
        doc.moveDown(0.2);
        kvTwoCol('Plaintiff/Lienholder', l.plaintiff_lienholder, 'Defendant/Debtor', l.defendant_debtor);
        kv('Case Number', l.case_number);
        kvTwoCol('Date of Judgment/Lien', l.date_of_judgment_lien, 'Recorded', l.recorded);
        kv('Book / Page or Instrument', l.book_page_instrument);
        kvTwoCol('Amount', l.amount ? `$${l.amount}` : l.amount, 'Interest', l.interest);
        kvTwoCol('Costs', l.costs ? `$${l.costs}` : l.costs, "Attorney's Fees", l.attorneys_fees ? `$${l.attorneys_fees}` : l.attorneys_fees);
        kv('Status', l.status, { warn: isWarning(l.status) });
        if (l.notes) {
          doc.moveDown(0.2);
          doc.font('Helvetica-Oblique').fontSize(8).fillColor(isWarning(l.notes) ? WARNING_RED : '#666666').text(`Notes: ${up(l.notes)}`, MARGIN + 12, doc.y, { width: CONTENT_W - 18 });
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
      bodyText('NO MISCELLANEOUS DOCUMENTS WERE PROVIDED OR CLEARLY IDENTIFIED.');
    } else {
      misc.forEach((m, idx) => {
        checkSpace(80);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(SECTION_COLOR).text(`${idx + 1}. ${up(m.document_type || m.document_title || 'DOCUMENT')}`, MARGIN + 6);
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
          doc.font('Helvetica-Oblique').fontSize(8).fillColor(isWarning(m.notes) ? WARNING_RED : '#666666').text(`Notes: ${up(m.notes)}`, MARGIN + 12, doc.y, { width: CONTENT_W - 18 });
          doc.fillColor('black');
        }
        hr();
      });
    }

    // ========================================================================
    // LEGAL DESCRIPTION (preserve recorded case)
    // ========================================================================
    checkSpace(60);
    sectionHeader('LEGAL DESCRIPTION');

    if (legal) {
      bodyText(legal, 8, { preserveCase: true });
    } else {
      bodyText('No legal description available.', 8);
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
      boldText('PDF DOCUMENT ACCOUNTING', 9, { color: LABEL_COLOR });
      doc.moveDown(0.2);
      docAccounting.forEach((da, idx) => {
        checkSpace(20);
        bodyText(`${idx + 1}. PAGE(S) ${up(da.page_range || '')}: ${up(da.document_label || '')}`, 8);
      });
    }

    if (update.is_update) {
      checkSpace(60);
      doc.moveDown(0.5);
      boldText('UPDATE / CONTINUATION SUMMARY', 9, { color: LABEL_COLOR });
      doc.moveDown(0.2);
      if (val(update.prior_effective_date)) kv('Prior Effective Date', update.prior_effective_date);
      if (val(update.current_effective_date)) kv('Current Effective Date', update.current_effective_date);
      if ((update.actual_documents_recorded || []).length > 0) kv('Actual Documents Recorded', (update.actual_documents_recorded || []).join(', '));
      if ((update.carried_forward_open_matters || []).length > 0) kv('Carried-Forward Open Matters', (update.carried_forward_open_matters || []).join(', '), { warn: true });
      if ((update.proposed_unrecorded_items || []).length > 0) kv('Proposed / Unrecorded Items', (update.proposed_unrecorded_items || []).join(', '));
      if (val(update.summary_notes)) kv('Summary', update.summary_notes);
    }

    if (refs.length === 0 && docAccounting.length === 0 && !update.is_update) {
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
      bodyText((names || []).join(', '), 9);
    }

    // ── Performed by (rule 19.x) — once, at the bottom ──
    // PDF uses standard fonts (Segoe Script is not embeddable in pdfkit);
    // DOCX output honors the Segoe Script signature font.
    checkSpace(40);
    doc.moveDown(1);
    doc.font('Helvetica').fontSize(12).fillColor('black').text('Performed by: ', MARGIN + 6, doc.y, { continued: true });
    doc.font('Helvetica-Bold').fontSize(12).text('Patrick Hazelwood');

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

module.exports = { generateV9Report };