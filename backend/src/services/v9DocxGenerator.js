const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  ImageRun,
} = require('docx');
/**
 * V7 (v9 rules) DOCX Generator
 * Implements docs/v9/v9_rules.md REVISION 9 formatting rules:
 *  - ALL CAPS report content (Legal Description preserves recorded case)
 *  - Red color C00000 ONLY for warning / review items (rule 16.3); routine notes black
 *  - 30/70 label:value split, full-page-width instrument tables (rules 18.3-18.5)
 *  - 7-pt editable blank spacer paragraph between every instrument table (18.9)
 *  - No repeated section headings inside a section's first block (18.10)
 *  - Mandatory visible CONSIDERATION + RECORDED fields on every deed
 *  - Mandatory visible MIN field on every deed of trust (NOT SHOWN when absent)
 *  - MATURITY immediately after AMOUNT (NOT SHOWN when absent)
 *  - Starred supporting entries as full-width merged rows (18.8)
 *  - Single "Performed by: Patrick Hazelwood" line, Segoe Script, once at bottom (19.x)
 *  - VERIFICATION NOTES block after ORDER INFORMATION (16.11)
 *  - Foreclosure sequence consolidated inside Trustee's Deed block (6.17)
 */

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const REPORT_FONT = 'Arial';
const WARNING_RED = 'C00000';
const LABEL_SHADE = 'D9D9D9'; // light gray label cells
const HEADER_SHADE = 'E8E8E8'; // light gray section-header rows
const REPORT_WIDTH = 9360; // full-page table width in DXA
const LABEL_WIDTH = 2810; // ~30% of 9360
const VALUE_WIDTH = 6550; // ~70% of 9360

/**
 * Render the tenant logo (rule 16.9). The logo is passed in per-tenant from the
 * generate route ({ data: Buffer, mime }); when absent, no logo is rendered.
 * No Hazelwood fallback — tenants without an uploaded logo produce no logo.
 */
function logoParagraph(logo) {
  if (!logo || !logo.data) {
    return new Paragraph({ children: [new TextRun({ text: '', size: 14, font: REPORT_FONT })] });
  }
  const isPng = /png/i.test(logo.mime || '');
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 120 },
    children: [
      new ImageRun({
        type: isPng ? 'png' : 'jpg',
        data: logo.data,
        transformation: { width: 240, height: 115 },
      }),
    ],
  });
}

function val(v) {
  return v !== null && v !== undefined && v !== '' ? String(v) : '';
}

function upper(v) {
  return val(v).toUpperCase();
}

function dash(v) {
  return val(v) || '—';
}

function isWarning(value) {
  const text = upper(value);
  const warnTokens = [
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
  return warnTokens.some((t) => text.includes(t));
}

/**
 * Build the run for a value cell. Warning items render in C00000; ordinary
 * content stays black. Legal Description content is passed in exactly as
 * recorded (never uppercased).
 */
function contentRun(text, opts = {}) {
  const {
    bold = false,
    italics = false,
    size = 18,
    preserveCase = false,
    warn = null,
    font = REPORT_FONT,
  } = opts;
  const raw = val(text);
  const display = preserveCase ? raw : upper(raw);
  const isWarn = warn !== null ? Boolean(warn) : isWarning(raw);
  return new TextRun({
    text: display || '',
    bold,
    italics,
    size,
    font,
    ...(isWarn ? { color: WARNING_RED } : {}),
  });
}

const fieldPara = (label, value, opts = {}) =>
  new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [
      new TextRun({ text: `${upper(label)}: `, bold: true, size: 18, font: REPORT_FONT }),
      contentRun(value, opts),
    ],
  });

const valuePara = (value, opts = {}) =>
  new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [contentRun(value, opts)],
  });

const sectionHeaderPara = (title) =>
  new Paragraph({
    spacing: { before: 200, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1F4E79' } },
    children: [new TextRun({ text: upper(title), bold: true, size: 22, font: REPORT_FONT, color: '1F4E79' })],
  });

const boldPara = (text, size = 20) =>
  new Paragraph({
    spacing: { before: 60, after: 20 },
    children: [new TextRun({ text: upper(text), bold: true, size, font: REPORT_FONT })],
  });

// Rule 18.9: one ordinary editable blank paragraph between every instrument
// table, set to the standard 7-pt report font with normal single-line spacing.
const instrumentSpacer = () =>
  new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: ' ', size: 14, font: REPORT_FONT })],
  });

// Rule 19.x: performed-by line, once, at bottom of the final page.
const performedByPara = () =>
  new Paragraph({
    spacing: { before: 240, after: 0 },
    children: [
      new TextRun({ text: 'Performed by: ', size: 24, font: REPORT_FONT }),
      new TextRun({ text: 'Patrick Hazelwood', size: 24, font: 'Segoe Script' }),
    ],
  });

/**
 * Render the foreclosure sequence for a Trustee's Deed inside the deed block
 * (rule 6.17): list each document on its own line, in exact packet order,
 * identifying the FORECLOSED DEED OF TRUST. Returns paragraphs.
 */
function foreclosureParagraphs(seq) {
  const paras = [];
  const docs = Array.isArray(seq) ? seq : [];
  if (docs.length === 0) return paras;
  paras.push(boldPara('FORECLOSURE SEQUENCE (IN PACKET ORDER)', 18));
  docs.forEach((d, i) => {
    const label = dash(d.document_type) || 'DOCUMENT';
    const ref = [d.book_page_instrument, d.dated, d.recorded].filter(Boolean).join(' | ');
    paras.push(
      new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [
          contentRun(`(${i + 1}) ${label}${ref ? ` — ${ref}` : ''}`, { warn: upper(label).includes('FORECLOSED DEED OF TRUST') }),
        ],
      })
    );
  });
  return paras;
}

function supportingParagraphs(sd, indent = '') {
  const paras = [];
  (Array.isArray(sd) ? sd : []).forEach((s) => {
    const typeLabel = val(s.document_type) || 'SUPPORTING DOCUMENT';
    const starLine = `* ${typeLabel}`;
    paras.push(boldPara(`${indent}${starLine}`, 18));
    if (val(s.decedent)) paras.push(fieldPara(`${indent}DECEDENT`, s.decedent));
    if (val(s.date_of_death)) paras.push(fieldPara(`${indent}DATE OF DEATH`, s.date_of_death));
    if (val(s.will_date)) paras.push(fieldPara(`${indent}WILL DATE`, s.will_date));
    if (val(s.recorded)) paras.push(fieldPara(`${indent}RECORDED`, s.recorded));
    if (val(s.book_page_instrument)) paras.push(fieldPara(`${indent}BOOK / PAGE OR INSTRUMENT`, s.book_page_instrument));
    if ((s.heirs || []).length > 0) paras.push(fieldPara(`${indent}HEIRS`, (s.heirs || []).join(', ')));
    if ((s.devisees_beneficiaries || []).length > 0) paras.push(fieldPara(`${indent}DEVISEES / BENEFICIARIES`, (s.devisees_beneficiaries || []).join(', ')));
    if (val(s.notes)) paras.push(fieldPara(`${indent}NOTES`, s.notes));
  });
  return paras;
}

function verificationNotesParas(oi) {
  const paras = [];
  const vnotes = val(oi.order_verification_notes);
  if (vnotes) {
    paras.push(boldPara('VERIFICATION NOTES', 18));
    paras.push(valuePara(vnotes, { warn: true }));
  }
  return paras;
}

// ---------------------------------------------------------------------------
// generateV9TextDocx — text layout matching blank.docx
// ---------------------------------------------------------------------------
async function generateV9TextDocx(fields, opts = {}) {
  const logo = opts.logo || null;
  const f = fields;
  const oi = f.order_info || {};
  const ti = f.tax_information || {};
  const chain = f.chain_of_title || [];
  const mortgages = f.mortgages || [];
  const liens = f.judgments_liens || [];
  const misc = f.misc_documents || [];
  const legal = f.legal_description;
  const addInfo = f.additional_information || {};
  const names = f.names_searched || [];
  const update = f.update_report || {};

  const children = [];

  // ── Logo (rule 16.9) — per-tenant, optional ──
  children.push(logoParagraph(logo));

  // ── ORDER INFORMATION ──
  children.push(sectionHeaderPara('ORDER INFORMATION'));
  children.push(fieldPara('FILE NUMBER', oi.file_number));
  children.push(fieldPara('CLIENT / ORDER', oi.client_order));
  children.push(fieldPara('COMPANY NAME', oi.company_name));
  children.push(fieldPara('EFFECTIVE DATE', oi.effective_date));
  children.push(fieldPara('BORROWER / OWNER', oi.borrower_owner));
  children.push(fieldPara('PROPERTY ADDRESS', oi.property_address));
  children.push(fieldPara('COUNTY', oi.county));
  children.push(fieldPara('TOWNSHIP / CITY', oi.township_city));
  children.push(fieldPara('PARCEL ID / TAX MAP', oi.parcel_id_tax_map));
  children.push(fieldPara('ACCOUNT NUMBER', oi.account_number));
  children.push(fieldPara('CURRENT VESTING OWNER', oi.current_vesting_owner));
  children.push(fieldPara('ASSESSOR OWNER', oi.assessor_owner));
  children.push(fieldPara('LEGAL / ASSESSOR DESCRIPTION', oi.legal_assessor_description));
  children.push(fieldPara('ACREAGE', oi.acreage));
  children.push(fieldPara('ASSESSMENT', oi.assessment));
  children.push(fieldPara('LAND VALUE', oi.land_value));
  children.push(fieldPara('IMPROVEMENT VALUE', oi.improvement_value));
  children.push(fieldPara('TOTAL VALUE', oi.total_value));
  children.push(...verificationNotesParas(oi));

  // Tax information rendered within ORDER INFORMATION (not a standalone section)
  if (ti.year || ti.first_half || ti.second_half || ti.total_tax || ti.total_delinquent_amount || ti.status) {
    const taxYear = val(ti.year) || new Date().getFullYear();
    children.push(boldPara(`TAX INFORMATION (${taxYear})`));
    if (val(ti.status)) children.push(fieldPara('STATUS', ti.status, { warn: isWarning(ti.status) }));
    const fh = ti.first_half || {};
    if (fh.due_date || fh.original_bill || fh.paid_date || fh.amount_paid || fh.penalty || fh.interest || fh.balance_due) {
      children.push(boldPara('FIRST HALF', 18));
      if (fh.due_date) children.push(fieldPara('DUE DATE', fh.due_date));
      if (fh.original_bill) children.push(fieldPara('ORIGINAL BILL', `$${fh.original_bill}`));
      if (fh.paid_date) children.push(fieldPara('PAID DATE', fh.paid_date));
      if (fh.amount_paid) children.push(fieldPara('AMOUNT PAID', `$${fh.amount_paid}`));
      if (fh.penalty) children.push(fieldPara('PENALTY', `$${fh.penalty}`));
      if (fh.interest) children.push(fieldPara('INTEREST', `$${fh.interest}`));
      if (fh.balance_due) children.push(fieldPara('BALANCE DUE', `$${fh.balance_due}`));
    }
    const sh = ti.second_half || {};
    if (sh.due_date || sh.original_bill || sh.paid_date || sh.amount_paid || sh.penalty || sh.interest || sh.balance_due) {
      children.push(boldPara('SECOND HALF', 18));
      if (sh.due_date) children.push(fieldPara('DUE DATE', sh.due_date));
      if (sh.original_bill) children.push(fieldPara('ORIGINAL BILL', `$${sh.original_bill}`));
      if (sh.paid_date) children.push(fieldPara('PAID DATE', sh.paid_date));
      if (sh.amount_paid) children.push(fieldPara('AMOUNT PAID', `$${sh.amount_paid}`));
      if (sh.penalty) children.push(fieldPara('PENALTY', `$${sh.penalty}`));
      if (sh.interest) children.push(fieldPara('INTEREST', `$${sh.interest}`));
      if (sh.balance_due) children.push(fieldPara('BALANCE DUE', `$${sh.balance_due}`));
    }
    if (ti.total_tax) children.push(fieldPara(`TOTAL ${taxYear} TAX`, `$${ti.total_tax}`));
    if (ti.total_delinquent_amount) children.push(fieldPara('TOTAL DELINQUENT / OPEN AMOUNT SHOWN', `$${ti.total_delinquent_amount}`, { warn: true }));
  }

  // ── CHAIN OF TITLE ──
  children.push(sectionHeaderPara('CHAIN OF TITLE'));
  if (chain.length === 0) {
    children.push(valuePara('NONE — NO CHAIN INSTRUMENTS WERE PROVIDED OR CLEARLY IDENTIFIED.'));
  } else {
    let deedNo = 0;
    chain.forEach((e, i) => {
      const isSupporting = upper(val(e.entry_type)) === 'SUPPORTING';
      if (isSupporting) {
        // Starred full-width supporting entry (rule 6.2A / 18.8)
        const typeLabel = val(e.supporting_documents?.[0]?.document_type) || val(e.deed_type) || val(e.document_title) || 'SUPPORTING DOCUMENT';
        const decedent = val(e.supporting_documents?.[0]?.decedent) || val(e.deceased_person);
        children.push(boldPara(`* ${typeLabel}${decedent ? ` — ${decedent}` : ''}`, 18));
        children.push(...supportingParagraphs(e.supporting_documents || (e.deed_type ? [e] : [])));
        if (val(e.recorded)) children.push(fieldPara('RECORDED', e.recorded));
        if (val(e.book_page_instrument)) children.push(fieldPara('BOOK / PAGE OR INSTRUMENT', e.book_page_instrument));
        if (val(e.notes)) children.push(fieldPara('NOTES', e.notes));
      } else {
        deedNo += 1;
        const title = val(e.document_title) || val(e.deed_type) || 'DEED';
        children.push(boldPara(`(${deedNo}) ${title}`));
        children.push(fieldPara('GRANTOR(S)', (e.grantors || []).join(', ')));
        children.push(fieldPara('GRANTEE(S)', (e.grantees || []).join(', ')));
        children.push(fieldPara('DATED', e.dated));
        children.push(fieldPara('RECORDED / RECORDING DATE', e.recorded));
        if (val(e.recording_time)) children.push(fieldPara('RECORDING TIME', e.recording_time));
        children.push(fieldPara('BOOK / PAGE OR INSTRUMENT', e.book_page_instrument));
        children.push(fieldPara('CONSIDERATION', e.consideration));
        if (val(e.deceased_person)) {
          children.push(fieldPara('DECEASED PERSON', e.deceased_person, { warn: true }));
          if (val(e.deceased_note)) children.push(fieldPara('NOTE', e.deceased_note, { warn: true }));
        }
        if (val(e.third_party_party)) {
          children.push(fieldPara('PARTY OF THE THIRD PART', e.third_party_party));
          if (val(e.third_party_reason)) children.push(fieldPara('PARTICIPATION REASON', e.third_party_reason));
        }
        if (val(e.partition_deed_notes)) children.push(fieldPara('PARTITION DEED NOTES', e.partition_deed_notes));
        if (val(e.notes)) children.push(fieldPara('NOTES', e.notes));
        children.push(...foreclosureParagraphs(e.foreclosure_sequence));
        children.push(...supportingParagraphs(e.supporting_documents));
      }
      if (i < chain.length - 1) children.push(instrumentSpacer());
    });
  }

  // ── MORTGAGES / DEEDS OF TRUST ──
  children.push(sectionHeaderPara('MORTGAGES / DEEDS OF TRUST'));
  if (mortgages.length === 0) {
    children.push(valuePara('NONE — NO OPEN MORTGAGE OR DEED OF TRUST WAS INCLUDED OR CLEARLY IDENTIFIED IN THE PROVIDED DOCUMENTS.'));
  } else {
    mortgages.forEach((m, i) => {
      children.push(boldPara(`(${i + 1}) ${val(m.document_title) || 'DOT / RFDT / DTCL'}`));
      children.push(fieldPara('BORROWER(S)', (m.borrowers || []).join(', ')));
      children.push(fieldPara('LENDER', m.lender));
      children.push(fieldPara('TRUSTEE', m.trustee));
      children.push(fieldPara('BENEFICIARY / NOMINEE', m.beneficiary_nominee));
      children.push(fieldPara('DATED', m.dated));
      children.push(fieldPara('RECORDED', m.recorded));
      children.push(fieldPara('BOOK / PAGE OR INSTRUMENT', m.book_page_instrument));
      children.push(fieldPara('AMOUNT', m.amount ? `$${m.amount}` : m.amount));
      children.push(fieldPara('MATURITY', m.maturity || 'NOT SHOWN', { warn: !val(m.maturity) }));
      children.push(fieldPara('LOAN NUMBER', m.loan_number));
      children.push(fieldPara('MIN', m.min || 'NOT SHOWN', { warn: !val(m.min) }));
      children.push(fieldPara('OPEN / CLOSED ENDED', m.open_closed_ended));
      children.push(fieldPara('STATUS', m.status));
      if (m.notes) children.push(fieldPara('NOTES', m.notes));

      const ad = m.associated_documents || [];
      ad.forEach((a, ai) => {
        children.push(boldPara(`ASSOCIATED DOCUMENT ${ai + 1}: ${val(a.document_type) || 'DOCUMENT'}`, 18));
        if (a.book_page_instrument) children.push(fieldPara('BOOK / PAGE OR INSTRUMENT', a.book_page_instrument));
        if (a.dated) children.push(fieldPara('DATED', a.dated));
        if (a.recorded) children.push(fieldPara('RECORDED', a.recorded));
        if (a.notes) children.push(fieldPara('NOTES', a.notes));
      });

      if (i < mortgages.length - 1) children.push(instrumentSpacer());
    });
  }

  // ── JUDGMENTS / LIENS ──
  children.push(sectionHeaderPara('JUDGMENTS / LIENS'));
  if (liens.length === 0) {
    children.push(valuePara('NONE — NO OPEN JUDGMENT, LIEN, UCC, STATE TAX LIEN, FEDERAL TAX LIEN, MECHANIC\'S LIEN, LIS PENDENS, BANKRUPTCY, OR FORECLOSURE DOCUMENT WAS INCLUDED OR CLEARLY IDENTIFIED IN THE PROVIDED DOCUMENTS.'));
  } else {
    liens.forEach((l, i) => {
      children.push(boldPara(`(${i + 1}) ${val(l.document_title) || 'JUDGMENT / LIEN'}`));
      children.push(fieldPara('PLAINTIFF / LIENHOLDER', l.plaintiff_lienholder));
      children.push(fieldPara('DEFENDANT / DEBTOR', l.defendant_debtor));
      children.push(fieldPara('CASE NUMBER', l.case_number));
      children.push(fieldPara('DATE OF JUDGMENT / LIEN', l.date_of_judgment_lien));
      children.push(fieldPara('RECORDED', l.recorded));
      children.push(fieldPara('BOOK / PAGE OR INSTRUMENT', l.book_page_instrument));
      children.push(fieldPara('AMOUNT', l.amount ? `$${l.amount}` : l.amount));
      children.push(fieldPara('INTEREST', l.interest));
      children.push(fieldPara('COSTS', l.costs ? `$${l.costs}` : l.costs));
      children.push(fieldPara("ATTORNEY'S FEES", l.attorneys_fees ? `$${l.attorneys_fees}` : l.attorneys_fees));
      children.push(fieldPara('STATUS', l.status, { warn: isWarning(l.status) }));
      if (l.notes) children.push(fieldPara('NOTES', l.notes));
      if (i < liens.length - 1) children.push(instrumentSpacer());
    });
  }

  // ── MISCELLANEOUS DOCUMENTS ──
  children.push(sectionHeaderPara('MISCELLANEOUS DOCUMENTS'));
  if (misc.length === 0) {
    children.push(valuePara('NO MISCELLANEOUS DOCUMENTS WERE PROVIDED OR CLEARLY IDENTIFIED.'));
  } else {
    misc.forEach((m, i) => {
      children.push(boldPara(`(${i + 1}) ${val(m.document_type || m.document_title) || 'DOCUMENT'}`));
      if (m.decedent) children.push(fieldPara('DECEDENT', m.decedent));
      if (m.date_of_death) children.push(fieldPara('DATE OF DEATH', m.date_of_death));
      if (m.will_date) children.push(fieldPara('WILL DATE', m.will_date));
      if (m.probate_date) children.push(fieldPara('PROBATE DATE', m.probate_date));
      if ((m.heirs || []).length > 0) children.push(fieldPara('HEIRS', m.heirs.join(', ')));
      if ((m.devisees_beneficiaries || []).length > 0) children.push(fieldPara('DEVISEES / BENEFICIARIES', m.devisees_beneficiaries.join(', ')));
      if (m.grantor_assignor) children.push(fieldPara('GRANTOR / ASSIGNOR', m.grantor_assignor));
      if (m.grantee_assignee) children.push(fieldPara('GRANTEE / ASSIGNEE', m.grantee_assignee));
      if (m.dated) children.push(fieldPara('DATED', m.dated));
      if (m.recorded) children.push(fieldPara('RECORDED', m.recorded));
      if (m.book_page_instrument) children.push(fieldPara('BOOK / PAGE OR INSTRUMENT', m.book_page_instrument));
      if (m.consideration) children.push(fieldPara('CONSIDERATION', m.consideration));
      if (m.area_or_width) children.push(fieldPara('AREA / WIDTH', m.area_or_width));
      if (m.notes) children.push(fieldPara('NOTES', m.notes));
      if (i < misc.length - 1) children.push(instrumentSpacer());
    });
  }

  // ── LEGAL DESCRIPTION ──
  children.push(sectionHeaderPara('LEGAL DESCRIPTION'));
  children.push(new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [contentRun(dash(legal), { preserveCase: true })],
  }));

  // ── ADDITIONAL INFORMATION ──
  children.push(sectionHeaderPara('ADDITIONAL INFORMATION'));
  const refs = addInfo.references || [];
  if (refs.length > 0) {
    children.push(boldPara('REFERENCES'));
    refs.forEach((r, ri) => {
      const refText = typeof r === 'string' ? r : `${r.book_page_instrument || ''} - ${r.document_type || r.label || ''}`;
      children.push(new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [contentRun(`${ri + 1}. ${refText}`)],
      }));
    });
  }
  const docAccounting = addInfo.document_accounting || [];
  if (docAccounting.length > 0) {
    children.push(boldPara('PDF DOCUMENT ACCOUNTING'));
    docAccounting.forEach((da) => {
      children.push(new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [contentRun(`PAGE(S) ${da.page_range || ''}: ${da.document_label || ''}`)],
      }));
    });
  }
  if (update.is_update) {
    children.push(boldPara('UPDATE / CONTINUATION SUMMARY', 18));
    if (val(update.prior_effective_date)) children.push(fieldPara('PRIOR EFFECTIVE DATE', update.prior_effective_date));
    if (val(update.current_effective_date)) children.push(fieldPara('CURRENT EFFECTIVE DATE', update.current_effective_date));
    if ((update.actual_documents_recorded || []).length > 0) children.push(fieldPara('ACTUAL DOCUMENTS RECORDED', (update.actual_documents_recorded || []).join(', ')));
    if ((update.carried_forward_open_matters || []).length > 0) children.push(fieldPara('CARRIED-FORWARD OPEN MATTERS', (update.carried_forward_open_matters || []).join(', '), { warn: true }));
    if ((update.proposed_unrecorded_items || []).length > 0) children.push(fieldPara('PROPOSED / UNRECORDED ITEMS', (update.proposed_unrecorded_items || []).join(', ')));
    if (val(update.summary_notes)) children.push(fieldPara('SUMMARY', update.summary_notes));
  }
  if (refs.length === 0 && docAccounting.length === 0 && !update.is_update) {
    children.push(valuePara('NO ADDITIONAL INFORMATION.'));
  }

  // ── NAMES SEARCHED ──
  children.push(sectionHeaderPara('NAMES SEARCHED'));
  children.push(new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [contentRun((names || []).join(', ') || 'NONE PROVIDED.')],
  }));

  // ── Performed by (rule 19.x) ──
  children.push(performedByPara());

  // ── Build Document ──
  const doc = new Document({
    styles: { default: { document: { run: { font: REPORT_FONT, size: 18 } } } },
    sections: [{ properties: { margin: { top: 720, right: 720, bottom: 720, left: 720 } }, children }],
  });

  return await Packer.toBuffer(doc);
}

// ---------------------------------------------------------------------------
// generateV9TableDocx — table-based layout (30/70 split, rules 18.x)
// ---------------------------------------------------------------------------
async function generateV9TableDocx(fields, opts = {}) {
  const logo = opts.logo || null;
  const f = fields;
  const oi = f.order_info || {};
  const ti = f.tax_information || {};
  const chain = f.chain_of_title || [];
  const mortgages = f.mortgages || [];
  const liens = f.judgments_liens || [];
  const misc = f.misc_documents || [];
  const legal = f.legal_description;
  const addInfo = f.additional_information || {};
  const names = f.names_searched || [];
  const update = f.update_report || {};

  const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const borders = { top: border, bottom: border, left: border, right: border };

  function cell(text, opts = {}) {
    const {
      bold = false,
      shade = null,
      span = 1,
      width = null,
      align = AlignmentType.LEFT,
      italics = false,
      preserveCase = false,
      warn = null,
      color = null,
    } = opts;
    const isWarn = warn !== null ? Boolean(warn) : isWarning(val(text));
    return new TableCell({
      borders,
      columnSpan: span,
      ...(width && { width: { size: width, type: WidthType.DXA } }),
      ...(shade && { shading: { fill: shade, type: ShadingType.CLEAR } }),
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: align,
          children: [
            new TextRun({
              text: preserveCase ? val(text) : upper(val(text)),
              bold,
              italics,
              size: 18,
              font: REPORT_FONT,
              ...(isWarn || color ? { color: color || WARNING_RED } : {}),
            }),
          ],
        }),
      ],
    });
  }

  function labelCell(text, width = LABEL_WIDTH) {
    return cell(text, { bold: true, shade: LABEL_SHADE, width });
  }

  function valueCell(text, width = VALUE_WIDTH, opts = {}) {
    return cell(text, { width, ...opts });
  }

  function sectionHeader(title) {
    return new Table({
      width: { size: REPORT_WIDTH, type: WidthType.DXA },
      columnWidths: [REPORT_WIDTH],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders,
              shading: { fill: HEADER_SHADE, type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: upper(title), bold: true, size: 20, font: REPORT_FONT })],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  function fullWidthRow(text, opts = {}) {
    const { bold = false, italics = false, preserveCase = false, warn = null } = opts;
    return new TableRow({
      children: [
        new TableCell({
          borders,
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: preserveCase ? val(text) : upper(val(text)),
                  bold,
                  italics,
                  size: 18,
                  font: REPORT_FONT,
                  ...(warn ? { color: WARNING_RED } : {}),
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  function kvRow(label, value, opts = {}) {
    const { warn = null, preserveCase = false } = opts;
    return new TableRow({
      children: [
        labelCell(label, LABEL_WIDTH),
        valueCell(value, VALUE_WIDTH, { warn, preserveCase }),
      ],
    });
  }

  // ── Order Information (30/70) ──
  const orderRows = [
    kvRow('FILE NUMBER', oi.file_number),
    kvRow('CLIENT / ORDER', oi.client_order),
    kvRow('COMPANY NAME', oi.company_name),
    kvRow('EFFECTIVE DATE', oi.effective_date),
    kvRow('BORROWER / OWNER', oi.borrower_owner),
    kvRow('PROPERTY ADDRESS', oi.property_address),
    kvRow('COUNTY', oi.county),
    kvRow('TOWNSHIP / CITY', oi.township_city),
    kvRow('PARCEL ID / TAX MAP', oi.parcel_id_tax_map),
    kvRow('ACCOUNT NUMBER', oi.account_number),
    kvRow('CURRENT VESTING OWNER', oi.current_vesting_owner),
    kvRow('ASSESSOR OWNER', oi.assessor_owner),
    kvRow('LEGAL / ASSESSOR DESCRIPTION', oi.legal_assessor_description),
    kvRow('ACREAGE', oi.acreage),
    kvRow('ASSESSMENT', oi.assessment),
    kvRow('LAND VALUE', oi.land_value),
    kvRow('IMPROVEMENT VALUE', oi.improvement_value),
    kvRow('TOTAL VALUE', oi.total_value),
  ];
  if (val(oi.order_verification_notes)) {
    orderRows.push(fullWidthRow(`VERIFICATION NOTES: ${oi.order_verification_notes}`, { warn: true }));
  }

  const orderTable = new Table({
    width: { size: REPORT_WIDTH, type: WidthType.DXA },
    columnWidths: [LABEL_WIDTH, VALUE_WIDTH],
    rows: orderRows,
  });

  // ── Tax Information (rendered inside ORDER INFORMATION) ──
  const taxYear = val(ti.year) || new Date().getFullYear();
  const fh = ti.first_half || {};
  const sh = ti.second_half || {};
  const taxRows = [
    kvRow('TAX YEAR', taxYear),
  ];
  if (val(ti.status)) taxRows.push(kvRow('STATUS', ti.status, { warn: isWarning(ti.status) }));
  const installmentFields = [
    { label: 'DUE DATE', field: 'due_date' },
    { label: 'ORIGINAL BILL', field: 'original_bill', prefix: '$' },
    { label: 'PAID DATE', field: 'paid_date' },
    { label: 'AMOUNT PAID', field: 'amount_paid', prefix: '$' },
    { label: 'PENALTY', field: 'penalty', prefix: '$' },
    { label: 'INTEREST', field: 'interest', prefix: '$' },
    { label: 'BALANCE DUE', field: 'balance_due', prefix: '$' },
  ];
  const taxBlock = (label, obj) => {
    const rows = [fullWidthRow(label, { bold: true })];
    installmentFields.forEach((fl) => {
      const v = obj[fl.field];
      const display = v !== null && v !== undefined && v !== '' ? (fl.prefix ? `${fl.prefix}${v}` : v) : '—';
      rows.push(kvRow(fl.label, display));
    });
    return rows;
  };
  taxRows.push(...taxBlock('FIRST HALF', fh));
  taxRows.push(...taxBlock('SECOND HALF', sh));
  if (ti.total_tax) taxRows.push(kvRow(`TOTAL ${taxYear} TAX`, `$${ti.total_tax}`));
  if (ti.total_delinquent_amount) taxRows.push(kvRow('TOTAL DELINQUENT / OPEN AMOUNT SHOWN', `$${ti.total_delinquent_amount}`, { warn: true }));

  const taxTable = new Table({
    width: { size: REPORT_WIDTH, type: WidthType.DXA },
    columnWidths: [LABEL_WIDTH, VALUE_WIDTH],
    rows: taxRows,
  });

  // ── Chain of Title (packet order; only deeds numbered; supporting starred) ──
  const chainRows = [];
  let deedNo = 0;
  (chain || []).forEach((e) => {
    const isSupporting = upper(val(e.entry_type)) === 'SUPPORTING';
    if (isSupporting) {
      const typeLabel = val(e.supporting_documents?.[0]?.document_type) || val(e.deed_type) || val(e.document_title) || 'SUPPORTING DOCUMENT';
      const decedent = val(e.supporting_documents?.[0]?.decedent) || val(e.deceased_person);
      chainRows.push(fullWidthRow(`* ${typeLabel}${decedent ? ` — ${decedent}` : ''}`, { bold: true }));
      const sd = e.supporting_documents && e.supporting_documents.length ? e.supporting_documents : (e.deed_type ? [e] : []);
      sd.forEach((s) => {
        if (val(s.decedent)) chainRows.push(kvRow('DECEDENT', s.decedent));
        if (val(s.date_of_death)) chainRows.push(kvRow('DATE OF DEATH', s.date_of_death));
        if (val(s.will_date)) chainRows.push(kvRow('WILL DATE', s.will_date));
        if (val(s.recorded)) chainRows.push(kvRow('RECORDED', s.recorded));
        if (val(s.book_page_instrument)) chainRows.push(kvRow('BOOK / PAGE OR INSTRUMENT', s.book_page_instrument));
        if ((s.heirs || []).length > 0) chainRows.push(kvRow('HEIRS', s.heirs.join(', ')));
        if ((s.devisees_beneficiaries || []).length > 0) chainRows.push(kvRow('DEVISEES / BENEFICIARIES', s.devisees_beneficiaries.join(', ')));
        if (val(s.notes)) chainRows.push(kvRow('NOTES', s.notes));
      });
      if (val(e.recorded)) chainRows.push(kvRow('RECORDED', e.recorded));
      if (val(e.book_page_instrument)) chainRows.push(kvRow('BOOK / PAGE OR INSTRUMENT', e.book_page_instrument));
      if (val(e.notes)) chainRows.push(kvRow('NOTES', e.notes));
    } else {
      deedNo += 1;
      const title = val(e.document_title) || val(e.deed_type) || 'DEED';
      chainRows.push(fullWidthRow(`(${deedNo}) ${title}`, { bold: true }));
      chainRows.push(kvRow('GRANTOR(S)', (e.grantors || []).join(', ')));
      chainRows.push(kvRow('GRANTEE(S)', (e.grantees || []).join(', ')));
      chainRows.push(kvRow('DATED', e.dated));
      chainRows.push(kvRow('RECORDED / RECORDING DATE', e.recorded));
      if (val(e.recording_time)) chainRows.push(kvRow('RECORDING TIME', e.recording_time));
      chainRows.push(kvRow('BOOK / PAGE OR INSTRUMENT', e.book_page_instrument));
      chainRows.push(kvRow('CONSIDERATION', e.consideration));
      if (val(e.deceased_person)) {
        chainRows.push(kvRow('DECEASED PERSON', e.deceased_person, { warn: true }));
        if (val(e.deceased_note)) chainRows.push(kvRow('NOTE', e.deceased_note, { warn: true }));
      }
      if (val(e.third_party_party)) {
        chainRows.push(kvRow('PARTY OF THE THIRD PART', e.third_party_party));
        if (val(e.third_party_reason)) chainRows.push(kvRow('PARTICIPATION REASON', e.third_party_reason));
      }
      if (val(e.partition_deed_notes)) chainRows.push(kvRow('PARTITION DEED NOTES', e.partition_deed_notes));
      if (val(e.notes)) chainRows.push(kvRow('NOTES', e.notes));
      (e.foreclosure_sequence || []).forEach((d, di) => {
        const label = dash(d.document_type) || 'DOCUMENT';
        const ref = [d.book_page_instrument, d.dated, d.recorded].filter(Boolean).join(' | ');
        chainRows.push(fullWidthRow(`FORECLOSURE (${di + 1}): ${label}${ref ? ` — ${ref}` : ''}`, { warn: upper(label).includes('FORECLOSED DEED OF TRUST') }));
      });
      (e.supporting_documents || []).forEach((s) => {
        const typeLabel = val(s.document_type) || 'SUPPORTING DOCUMENT';
        chainRows.push(fullWidthRow(`* ${typeLabel}`, { bold: true }));
        if (val(s.decedent)) chainRows.push(kvRow('DECEDENT', s.decedent));
        if (val(s.date_of_death)) chainRows.push(kvRow('DATE OF DEATH', s.date_of_death));
        if (val(s.will_date)) chainRows.push(kvRow('WILL DATE', s.will_date));
        if (val(s.recorded)) chainRows.push(kvRow('RECORDED', s.recorded));
        if (val(s.book_page_instrument)) chainRows.push(kvRow('BOOK / PAGE OR INSTRUMENT', s.book_page_instrument));
        if ((s.heirs || []).length > 0) chainRows.push(kvRow('HEIRS', s.heirs.join(', ')));
        if ((s.devisees_beneficiaries || []).length > 0) chainRows.push(kvRow('DEVISEES / BENEFICIARIES', s.devisees_beneficiaries.join(', ')));
        if (val(s.notes)) chainRows.push(kvRow('NOTES', s.notes));
      });
    }
    chainRows.push(fullWidthRow(' ', {}));
  });

  // ── Mortgages / Deeds of Trust ──
  const mortgageRows = [];
  (mortgages || []).forEach((m, i) => {
    mortgageRows.push(fullWidthRow(`(${i + 1}) ${val(m.document_title) || 'DOT / RFDT / DTCL'}`, { bold: true }));
    mortgageRows.push(kvRow('BORROWER(S)', (m.borrowers || []).join(', ')));
    mortgageRows.push(kvRow('LENDER', m.lender));
    mortgageRows.push(kvRow('TRUSTEE', m.trustee));
    mortgageRows.push(kvRow('BENEFICIARY / NOMINEE', m.beneficiary_nominee));
    mortgageRows.push(kvRow('DATED', m.dated));
    mortgageRows.push(kvRow('RECORDED', m.recorded));
    mortgageRows.push(kvRow('BOOK / PAGE OR INSTRUMENT', m.book_page_instrument));
    mortgageRows.push(kvRow('AMOUNT', m.amount ? `$${m.amount}` : m.amount));
    mortgageRows.push(kvRow('MATURITY', m.maturity || 'NOT SHOWN', { warn: !val(m.maturity) }));
    mortgageRows.push(kvRow('LOAN NUMBER', m.loan_number));
    mortgageRows.push(kvRow('MIN', m.min || 'NOT SHOWN', { warn: !val(m.min) }));
    mortgageRows.push(kvRow('OPEN / CLOSED ENDED', m.open_closed_ended));
    mortgageRows.push(kvRow('STATUS', m.status));
    if (val(m.notes)) mortgageRows.push(kvRow('NOTES', m.notes));
    (m.associated_documents || []).forEach((a) => {
      const ref = [a.book_page_instrument, a.dated, a.recorded].filter(Boolean).join(' | ');
      mortgageRows.push(fullWidthRow(`ASSOCIATED DOCUMENT: ${dash(a.document_type)}${ref ? ` — ${ref}` : ''}`));
    });
    mortgageRows.push(fullWidthRow(' ', {}));
  });

  // ── Judgments / Liens ──
  const lienRows = [];
  (liens || []).forEach((l, i) => {
    lienRows.push(fullWidthRow(`(${i + 1}) ${val(l.document_title) || 'JUDGMENT / LIEN'}`, { bold: true }));
    lienRows.push(kvRow('PLAINTIFF / LIENHOLDER', l.plaintiff_lienholder));
    lienRows.push(kvRow('DEFENDANT / DEBTOR', l.defendant_debtor));
    lienRows.push(kvRow('CASE NUMBER', l.case_number));
    lienRows.push(kvRow('DATE OF JUDGMENT / LIEN', l.date_of_judgment_lien));
    lienRows.push(kvRow('RECORDED', l.recorded));
    lienRows.push(kvRow('BOOK / PAGE OR INSTRUMENT', l.book_page_instrument));
    lienRows.push(kvRow('AMOUNT', l.amount ? `$${l.amount}` : l.amount));
    lienRows.push(kvRow('INTEREST', l.interest));
    lienRows.push(kvRow('COSTS', l.costs ? `$${l.costs}` : l.costs));
    lienRows.push(kvRow("ATTORNEY'S FEES", l.attorneys_fees ? `$${l.attorneys_fees}` : l.attorneys_fees));
    lienRows.push(kvRow('STATUS', l.status, { warn: isWarning(l.status) }));
    if (val(l.notes)) lienRows.push(kvRow('NOTES', l.notes));
    lienRows.push(fullWidthRow(' ', {}));
  });

  // ── Miscellaneous Documents ──
  const miscRows = [];
  (misc || []).forEach((m, i) => {
    miscRows.push(fullWidthRow(`(${i + 1}) ${val(m.document_type || m.document_title) || 'DOCUMENT'}`, { bold: true }));
    if (val(m.decedent)) miscRows.push(kvRow('DECEDENT', m.decedent));
    if (val(m.date_of_death)) miscRows.push(kvRow('DATE OF DEATH', m.date_of_death));
    if (val(m.will_date)) miscRows.push(kvRow('WILL DATE', m.will_date));
    if (val(m.probate_date)) miscRows.push(kvRow('PROBATE DATE', m.probate_date));
    if ((m.heirs || []).length > 0) miscRows.push(kvRow('HEIRS', m.heirs.join(', ')));
    if ((m.devisees_beneficiaries || []).length > 0) miscRows.push(kvRow('DEVISEES / BENEFICIARIES', m.devisees_beneficiaries.join(', ')));
    if (val(m.grantor_assignor)) miscRows.push(kvRow('GRANTOR / ASSIGNOR', m.grantor_assignor));
    if (val(m.grantee_assignee)) miscRows.push(kvRow('GRANTEE / ASSIGNEE', m.grantee_assignee));
    if (val(m.dated)) miscRows.push(kvRow('DATED', m.dated));
    if (val(m.recorded)) miscRows.push(kvRow('RECORDED', m.recorded));
    if (val(m.book_page_instrument)) miscRows.push(kvRow('BOOK / PAGE OR INSTRUMENT', m.book_page_instrument));
    if (val(m.consideration)) miscRows.push(kvRow('CONSIDERATION', m.consideration));
    if (val(m.area_or_width)) miscRows.push(kvRow('AREA / WIDTH', m.area_or_width));
    if (val(m.notes)) miscRows.push(kvRow('NOTES', m.notes));
    miscRows.push(fullWidthRow(' ', {}));
  });

  // ── Legal Description (preserve recorded case) ──
  const legalTable = new Table({
    width: { size: REPORT_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [contentRun(dash(legal), { preserveCase: true })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Additional Information ──
  let addInfoText = '';
  const refs = addInfo.references || [];
  if (refs.length > 0) {
    addInfoText += 'REFERENCES:\n';
    refs.forEach((r, idx) => {
      const refStr = typeof r === 'string' ? r : `${r.book_page_instrument || ''} - ${r.document_type || r.label || ''}`;
      addInfoText += `${idx + 1}. ${upper(refStr)}\n`;
    });
  }
  const docAccounting = addInfo.document_accounting || [];
  if (docAccounting.length > 0) {
    addInfoText += '\nPDF DOCUMENT ACCOUNTING:\n';
    docAccounting.forEach((da, idx) => {
      addInfoText += `${idx + 1}. PAGE(S) ${upper(da.page_range || '')}: ${upper(da.document_label || '')}\n`;
    });
  }
  if (update.is_update) {
    addInfoText += '\nUPDATE / CONTINUATION SUMMARY:\n';
    if (val(update.prior_effective_date)) addInfoText += `PRIOR EFFECTIVE DATE: ${upper(update.prior_effective_date)}\n`;
    if (val(update.current_effective_date)) addInfoText += `CURRENT EFFECTIVE DATE: ${upper(update.current_effective_date)}\n`;
    if ((update.actual_documents_recorded || []).length > 0) addInfoText += `ACTUAL DOCUMENTS RECORDED: ${upper((update.actual_documents_recorded || []).join(', '))}\n`;
    if ((update.carried_forward_open_matters || []).length > 0) addInfoText += `CARRIED-FORWARD OPEN MATTERS: ${upper((update.carried_forward_open_matters || []).join(', '))}\n`;
    if ((update.proposed_unrecorded_items || []).length > 0) addInfoText += `PROPOSED / UNRECORDED ITEMS: ${upper((update.proposed_unrecorded_items || []).join(', '))}\n`;
    if (val(update.summary_notes)) addInfoText += `SUMMARY: ${upper(update.summary_notes)}\n`;
  }
  if (!addInfoText) addInfoText = 'NO ADDITIONAL INFORMATION.';

  const additionalTable = new Table({
    width: { size: REPORT_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [contentRun(addInfoText)],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Names Searched ──
  const namesText = (names || []).join(', ') || 'NONE PROVIDED.';
  const namesTable = new Table({
    width: { size: REPORT_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [contentRun(namesText)],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ── Build Document ──
  const doc = new Document({
    styles: { default: { document: { run: { font: REPORT_FONT, size: 18 } } } },
    sections: [
      {
        properties: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        children: [
          logoParagraph(logo),
          sectionHeader('ORDER INFORMATION'),
          orderTable,
          instrumentSpacer(),
          taxTable,
          instrumentSpacer(),
          sectionHeader('CHAIN OF TITLE'),
          new Table({
            width: { size: REPORT_WIDTH, type: WidthType.DXA },
            columnWidths: [LABEL_WIDTH, VALUE_WIDTH],
            rows: chainRows.length
              ? chainRows
              : [fullWidthRow('NONE — NO CHAIN INSTRUMENTS WERE PROVIDED OR CLEARLY IDENTIFIED.', { italics: true })],
          }),
          instrumentSpacer(),
          sectionHeader('MORTGAGES / DEEDS OF TRUST'),
          new Table({
            width: { size: REPORT_WIDTH, type: WidthType.DXA },
            columnWidths: [LABEL_WIDTH, VALUE_WIDTH],
            rows: mortgageRows.length
              ? mortgageRows
              : [fullWidthRow('NONE — NO OPEN MORTGAGE OR DEED OF TRUST.', { italics: true })],
          }),
          instrumentSpacer(),
          sectionHeader('JUDGMENTS / LIENS'),
          new Table({
            width: { size: REPORT_WIDTH, type: WidthType.DXA },
            columnWidths: [LABEL_WIDTH, VALUE_WIDTH],
            rows: lienRows.length
              ? lienRows
              : [fullWidthRow('NONE — NO OPEN JUDGMENT OR LIEN.', { italics: true })],
          }),
          instrumentSpacer(),
          sectionHeader('MISCELLANEOUS DOCUMENTS'),
          new Table({
            width: { size: REPORT_WIDTH, type: WidthType.DXA },
            columnWidths: [LABEL_WIDTH, VALUE_WIDTH],
            rows: miscRows.length
              ? miscRows
              : [fullWidthRow('NO MISCELLANEOUS DOCUMENTS WERE PROVIDED OR CLEARLY IDENTIFIED.', { italics: true })],
          }),
          instrumentSpacer(),
          sectionHeader('LEGAL DESCRIPTION'),
          legalTable,
          instrumentSpacer(),
          sectionHeader('ADDITIONAL INFORMATION'),
          additionalTable,
          instrumentSpacer(),
          sectionHeader('NAMES SEARCHED'),
          namesTable,
          performedByPara(),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

module.exports = { generateV9TextDocx, generateV9TableDocx };