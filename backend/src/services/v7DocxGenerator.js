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
 * Render the tenant logo (rule 16.9). Passed in per-tenant from the generate
 * route ({ data: Buffer, mime }); when absent, no logo is rendered. No
 * Hazelwood fallback — tenants without an uploaded logo produce no logo.
 */
function logoParagraph(logo) {
  if (!logo || !logo.data) {
    return new Paragraph({ children: [new TextRun({ text: '', size: 14, font: 'Arial' })] });
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
/**
 * V7 Text-based DOCX Generator
 * Matches blank.docx layout - labels on left/bold, values on right,
 * no table borders, clean text-based format.
 */
async function generateV7TextDocx(fields, opts = {}) {
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

  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v) : '');
  const dash = (v) => val(v) || 'ΓÇö';

  const boldPara = (text, size = 20) => new Paragraph({
    spacing: { before: 60, after: 20 },
    children: [new TextRun({ text: String(text).toUpperCase(), bold: true, size, font: 'Arial' })],
  });

  const fieldPara = (label, value) => new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 18, font: 'Arial' }),
      new TextRun({ text: val(value) || 'ΓÇö', size: 18, font: 'Arial' }),
    ],
  });

  const valuePara = (value) => new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [new TextRun({ text: val(value) || 'ΓÇö', size: 18, font: 'Arial' })],
  });

  const spacer = () => new Paragraph({ spacing: { before: 40 } });

  const sectionHeaderPara = (title) => new Paragraph({
    spacing: { before: 200, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1F4E79' } },
    children: [new TextRun({ text: title, bold: true, size: 22, font: 'Arial', color: '1F4E79' })],
  });

  const children = [];

  // Logo (rule 16.9)
  children.push(logoParagraph(logo));

  // ΓöÇΓöÇ ORDER INFORMATION ΓöÇΓöÇ
  children.push(sectionHeaderPara('ORDER INFORMATION'));
  children.push(fieldPara('FILE NUMBER', oi.file_number));
  children.push(fieldPara('CLIENT / ORDER', oi.client_order));
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
  children.push(fieldPara('ORDER / VERIFICATION NOTES', oi.order_verification_notes));

  // Tax information rendered within ORDER INFORMATION (not a standalone section)
  if (ti.year || ti.first_half || ti.second_half || ti.total_tax || ti.total_delinquent_amount) {
    const taxYear = val(ti.year) || new Date().getFullYear();
    children.push(boldPara(`TAX INFORMATION (${taxYear})`));
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
    if (ti.total_delinquent_amount) children.push(fieldPara('TOTAL DELINQUENT / OPEN AMOUNT SHOWN', `$${ti.total_delinquent_amount}`));
  }

  // ΓöÇΓöÇ CHAIN OF TITLE ΓöÇΓöÇ
  children.push(sectionHeaderPara('CHAIN OF TITLE'));
  if (chain.length === 0) {
    children.push(valuePara('NO CHAIN ENTRIES FOUND.'));
  } else {
    chain.forEach((e, i) => {
      children.push(boldPara(`(${i + 1}) ${val(e.deed_type) || 'ΓÇö'}`));
      children.push(fieldPara('GRANTOR(S)', (e.grantors || []).join(', ')));
      children.push(fieldPara('GRANTEE(S)', (e.grantees || []).join(', ')));
      children.push(fieldPara('DATED', e.dated));
      children.push(fieldPara('RECORDED', e.recorded));
      children.push(fieldPara('BOOK / PAGE OR INSTRUMENT', e.book_page_instrument));
      children.push(fieldPara('CONSIDERATION', e.consideration));
      if (e.notes) children.push(fieldPara('NOTES', e.notes));

      // Supporting documents (*-prefixed)
      const sd = e.supporting_documents || [];
      sd.forEach((s) => {
        children.push(boldPara(`* ${val(s.document_type) || 'SUPPORTING DOCUMENT'}`, 18));
        if (s.decedent) children.push(fieldPara('DECEDENT', s.decedent));
        if (s.date_of_death) children.push(fieldPara('DATE OF DEATH', s.date_of_death));
        if (s.will_date) children.push(fieldPara('WILL DATE', s.will_date));
        if (s.recorded) children.push(fieldPara('RECORDED', s.recorded));
        if (s.book_page_instrument) children.push(fieldPara('BOOK / PAGE OR INSTRUMENT', s.book_page_instrument));
        if ((s.heirs || []).length > 0) children.push(fieldPara('HEIRS', s.heirs.join(', ')));
        if ((s.devisees_beneficiaries || []).length > 0) children.push(fieldPara('DEVISEES / BENEFICIARIES', s.devisees_beneficiaries.join(', ')));
        if (s.notes) children.push(fieldPara('NOTES', s.notes));
      });

      if (i < chain.length - 1) children.push(spacer());
    });
  }

  // ΓöÇΓöÇ MORTGAGES / DEEDS OF TRUST ΓöÇΓöÇ
  children.push(sectionHeaderPara('MORTGAGES / DEEDS OF TRUST'));
  if (mortgages.length === 0) {
    children.push(valuePara('NONE ΓÇö NO OPEN MORTGAGE OR DEED OF TRUST WAS INCLUDED OR CLEARLY IDENTIFIED IN THE PROVIDED DOCUMENTS.'));
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
      children.push(fieldPara('MATURITY', m.maturity));
      children.push(fieldPara('LOAN NUMBER', m.loan_number));
      children.push(fieldPara('MIN', m.min));
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

      if (i < mortgages.length - 1) children.push(spacer());
    });
  }

  // ΓöÇΓöÇ JUDGMENTS / LIENS ΓöÇΓöÇ
  children.push(sectionHeaderPara('JUDGMENTS / LIENS'));
  if (liens.length === 0) {
    children.push(valuePara('NONE ΓÇö NO OPEN JUDGMENT, LIEN, UCC, STATE TAX LIEN, FEDERAL TAX LIEN, MECHANIC\'S LIEN, LIS PENDENS, BANKRUPTCY, OR FORECLOSURE DOCUMENT WAS INCLUDED OR CLEARLY IDENTIFIED IN THE PROVIDED DOCUMENTS.'));
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
      children.push(fieldPara('STATUS', l.status));
      if (l.notes) children.push(fieldPara('NOTES', l.notes));
      if (i < liens.length - 1) children.push(spacer());
    });
  }

  // ΓöÇΓöÇ MISCELLANEOUS DOCUMENTS ΓöÇΓöÇ
  children.push(sectionHeaderPara('MISCELLANEOUS DOCUMENTS'));
  if (misc.length === 0) {
    children.push(valuePara('NO MISCELLANEOUS DOCUMENTS FOUND.'));
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
      if (i < misc.length - 1) children.push(spacer());
    });
  }

  // ΓöÇΓöÇ LEGAL DESCRIPTION ΓöÇΓöÇ
  children.push(sectionHeaderPara('LEGAL DESCRIPTION'));
  children.push(new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [new TextRun({ text: dash(legal), size: 18, font: 'Arial' })],
  }));

  // ΓöÇΓöÇ ADDITIONAL INFORMATION ΓöÇΓöÇ
  children.push(sectionHeaderPara('ADDITIONAL INFORMATION'));
  const refs = addInfo.references || [];
  if (refs.length > 0) {
    children.push(boldPara('REFERENCES'));
    refs.forEach((r, ri) => {
      const refText = typeof r === 'string' ? r : `${r.book_page_instrument || ''} - ${r.document_type || r.label || ''}`;
      children.push(new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: `${ri + 1}. ${refText}`, size: 18, font: 'Arial' })],
      }));
    });
  }
  const docAccounting = addInfo.document_accounting || [];
  if (docAccounting.length > 0) {
    children.push(boldPara('PDF DOCUMENT ACCOUNTING'));
    docAccounting.forEach((da) => {
      children.push(new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: `PAGE(S) ${da.page_range || ''}: ${da.document_label || ''}`, size: 18, font: 'Arial' })],
      }));
    });
  }
  if (refs.length === 0 && docAccounting.length === 0) {
    children.push(valuePara('NO ADDITIONAL INFORMATION.'));
  }

  // ΓöÇΓöÇ NAMES SEARCHED ΓöÇΓöÇ
  children.push(sectionHeaderPara('NAMES SEARCHED'));
  children.push(new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [new TextRun({ text: (names || []).join(', ') || 'NONE PROVIDED.', size: 18, font: 'Arial' })],
  }));

  // ΓöÇΓöÇ Build Document ΓöÇΓöÇ
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 18 } } } },
    sections: [{ properties: { margin: { top: 720, right: 720, bottom: 720, left: 720 } }, children }],
  });

  return await Packer.toBuffer(doc);
}

/**
 * V7 Table-based DOCX Generator
 * Uses table-based layout similar to v5/v6 style but with v7 fields.
 */
async function generateV7TableDocx(fields, opts = {}) {
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

  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v) : '');
  const dash = (v) => val(v) || 'ΓÇö';

  const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const borders = { top: border, bottom: border, left: border, right: border };

  function cell(text, opts = {}) {
    const { bold = false, shade = null, span = 1, width = null, align = AlignmentType.LEFT, italics = false } = opts;
    return new TableCell({
      borders,
      columnSpan: span,
      ...(width && { width: { size: width, type: WidthType.DXA } }),
      ...(shade && { shading: { fill: shade, type: ShadingType.CLEAR } }),
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: align,
          children: [new TextRun({ text: val(text), bold, italics, size: 18, font: 'Arial' })],
        }),
      ],
    });
  }

  function labelCell(text, width) {
    return cell(text, { bold: true, shade: 'D9D9D9', width });
  }

  function valueCell(text, width) {
    return cell(text, { width });
  }

  function sectionHeader(title) {
    return new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders,
              shading: { fill: '2c3e50', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: title, bold: true, size: 20, font: 'Arial', color: 'FFFFFF' })],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  const spacerTable = () => new Paragraph({ spacing: { before: 120 } });

  // ΓöÇΓöÇ Order Information ΓöÇΓöÇ
  const orderTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 2400, 1400, 1800, 1200, 1360],
    rows: [
      new TableRow({
        children: [
          labelCell('File Number:', 1400),
          valueCell(dash(oi.file_number), 2400),
          labelCell('Client/Order:', 1400),
          valueCell(dash(oi.client_order), 1800),
          labelCell('Effective Date:', 1200),
          valueCell(dash(oi.effective_date), 1360),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Borrower/Owner:', 1400),
          new TableCell({
            borders,
            columnSpan: 5,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(oi.borrower_owner), size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Address:', 1400),
          new TableCell({
            borders,
            columnSpan: 5,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(oi.property_address), bold: true, size: 20, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('County:', 1400),
          valueCell(dash(oi.county), 2400),
          labelCell('Township/City:', 1400),
          valueCell(dash(oi.township_city), 1800),
          labelCell('Parcel ID/Tax Map:', 1200),
          valueCell(dash(oi.parcel_id_tax_map), 1360),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Account Number:', 1400),
          valueCell(dash(oi.account_number), 2400),
          labelCell('Vesting Owner:', 1400),
          valueCell(dash(oi.current_vesting_owner), 1800),
          labelCell('Assessor Owner:', 1200),
          valueCell(dash(oi.assessor_owner), 1360),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Assessor Desc:', 1400),
          valueCell(dash(oi.legal_assessor_description), 2400),
          labelCell('Acreage:', 1400),
          valueCell(dash(oi.acreage), 1800),
          labelCell('Assessment:', 1200),
          valueCell(dash(oi.assessment), 1360),
        ],
      }),
      ...(oi.order_verification_notes ? [
        new TableRow({
          children: [
            labelCell('Verification Notes:', 1400),
            new TableCell({
              borders,
              columnSpan: 5,
              margins: { top: 40, bottom: 40, left: 80, right: 80 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: dash(oi.order_verification_notes), size: 16, italics: true, font: 'Arial', color: '555555' })],
                }),
              ],
            }),
          ],
        }),
      ] : []),
    ],
  });

  // ΓöÇΓöÇ Tax Information ΓöÇΓöÇ
  const taxYear = val(ti.year) || new Date().getFullYear();
  const fh = ti.first_half || {};
  const sh = ti.second_half || {};

  const taxRows = [
    new TableRow({
      children: [
        labelCell('Tax Year:', 1400),
        valueCell(taxYear, 2400),
        labelCell('Total Tax:', 1400),
        valueCell(ti.total_tax ? `$${ti.total_tax}` : dash(ti.total_tax), 1800),
        labelCell('Delinquent:', 1200),
        valueCell(ti.total_delinquent_amount ? `$${ti.total_delinquent_amount}` : dash(ti.total_delinquent_amount), 1360),
      ],
    }),
  ];

  const installmentFields = [
    { label: 'Due Date:', field: 'due_date' },
    { label: 'Original Bill:', field: 'original_bill', prefix: '$' },
    { label: 'Paid Date:', field: 'paid_date' },
    { label: 'Amount Paid:', field: 'amount_paid', prefix: '$' },
    { label: 'Penalty:', field: 'penalty', prefix: '$' },
    { label: 'Interest:', field: 'interest', prefix: '$' },
    { label: 'Balance Due:', field: 'balance_due', prefix: '$' },
  ];

  // First Half header
  taxRows.push(new TableRow({
    children: [
      new TableCell({
        borders,
        columnSpan: 6,
        shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'FIRST HALF', bold: true, size: 18, font: 'Arial' })],
          }),
        ],
      }),
    ],
  }));
  installmentFields.forEach((fl) => {
    const fhVal = fh[fl.field];
    const display = fhVal !== null && fhVal !== undefined && fhVal !== ''
      ? (fl.prefix ? `${fl.prefix}${fhVal}` : fhVal)
      : 'ΓÇö';
    taxRows.push(new TableRow({
      children: [
        labelCell(fl.label, 1400),
        new TableCell({ borders, columnSpan: 5, margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({
            children: [new TextRun({ text: display, size: 18, font: 'Arial' })],
          })],
        }),
      ],
    }));
  });

  // Second Half header
  taxRows.push(new TableRow({
    children: [
      new TableCell({
        borders,
        columnSpan: 6,
        shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'SECOND HALF', bold: true, size: 18, font: 'Arial' })],
          }),
        ],
      }),
    ],
  }));
  installmentFields.forEach((fl) => {
    const shVal = sh[fl.field];
    const display = shVal !== null && shVal !== undefined && shVal !== ''
      ? (fl.prefix ? `${fl.prefix}${shVal}` : shVal)
      : 'ΓÇö';
    taxRows.push(new TableRow({
      children: [
        labelCell(fl.label, 1400),
        new TableCell({ borders, columnSpan: 5, margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({
            children: [new TextRun({ text: display, size: 18, font: 'Arial' })],
          })],
        }),
      ],
    }));
  });

  const taxTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 2400, 1400, 1800, 1200, 1360],
    rows: taxRows,
  });

  // ΓöÇΓöÇ Chain of Title ΓöÇΓöÇ
  const chainRows = (chain || []).flatMap((e, i) => {
    const rows = [
      new TableRow({
        children: [
          labelCell(`(${i + 1}) Deed Type:`, 2000),
          valueCell(dash(e.deed_type), 3360),
          labelCell('Book/Inst:', 1200),
          valueCell(dash(e.book_page_instrument), 1200),
          labelCell('In/Out:', 600),
          valueCell(e.in_out_sale ? 'YES' : 'NO', 1000),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Dated:', 800),
          valueCell(dash(e.dated), 1400),
          labelCell('Recorded:', 900),
          valueCell(dash(e.recorded), 1400),
          labelCell('Consideration:', 1200),
          valueCell(dash(e.consideration), 1200),
          cell('', { span: 2 }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Grantor(s):', 1200),
          new TableCell({ borders, columnSpan: 7,
            children: [new Paragraph({
              children: [new TextRun({ text: (e.grantors || []).join('; ') || 'ΓÇö', size: 18, font: 'Arial' })],
            })],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Grantee(s):', 1200),
          new TableCell({ borders, columnSpan: 7,
            children: [new Paragraph({
              children: [new TextRun({ text: (e.grantees || []).join('; ') || 'ΓÇö', size: 18, font: 'Arial' })],
            })],
          }),
        ],
      }),
    ];
    if (e.notes) {
      rows.push(new TableRow({
        children: [
          labelCell('Notes:', 1200),
          new TableCell({ borders, columnSpan: 7,
            children: [new Paragraph({
              children: [new TextRun({ text: dash(e.notes), size: 16, italics: true, color: '555555', font: 'Arial' })],
            })],
          }),
        ],
      }));
    }
    // Supporting documents
    (e.supporting_documents || []).forEach((s) => {
      rows.push(new TableRow({
        children: [
          labelCell(`* ${dash(s.document_type)}:`, 2000),
          new TableCell({ borders, columnSpan: 7,
            children: [new Paragraph({
              children: [new TextRun({ text: `DECEDENT: ${dash(s.decedent)}`, size: 16, font: 'Arial' })],
            })],
          }),
        ],
      }));
      if (s.date_of_death || s.will_date) {
        rows.push(new TableRow({
          children: [
            cell('', { span: 2 }),
            labelCell('Date of Death:', 1200),
            valueCell(dash(s.date_of_death), 1400),
            labelCell('Will Date:', 1000),
            valueCell(dash(s.will_date), 1400),
            cell('', { span: 2 }),
          ],
        }));
      }
      if ((s.heirs || []).length > 0) {
        rows.push(new TableRow({
          children: [
            cell('', { span: 2 }),
            labelCell('Heirs:', 1000),
            new TableCell({ borders, columnSpan: 5,
              children: [new Paragraph({
                children: [new TextRun({ text: (s.heirs || []).join('; '), size: 16, font: 'Arial' })],
              })],
            }),
          ],
        }));
      }
    });
    return rows;
  });

  // ΓöÇΓöÇ Mortgages ΓöÇΓöÇ
  const mortgageRows = (mortgages || []).flatMap((m, i) => {
    const rows = [
      new TableRow({
        children: [
          labelCell(`(${i + 1}) Document:`, 2000),
          valueCell(dash(m.document_title), 3360),
          labelCell('Book/Inst:', 1300),
          valueCell(dash(m.book_page_instrument), 1200),
          labelCell('Amount:', 600),
          valueCell(m.amount ? `$${m.amount}` : dash(m.amount), 1000),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Dated:', 800),
          valueCell(dash(m.dated), 1400),
          labelCell('Recorded:', 900),
          valueCell(dash(m.recorded), 1400),
          labelCell('Maturity:', 1000),
          valueCell(dash(m.maturity), 1200),
          cell('', { span: 2 }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Lender:', 1000),
          new TableCell({ borders, columnSpan: 7,
            children: [new Paragraph({
              children: [new TextRun({ text: dash(m.lender), size: 18, font: 'Arial' })],
            })],
          }),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Borrower(s):', 1200),
          valueCell((m.borrowers || []).join('; '), 2760),
          labelCell('Trustee:', 1000),
          valueCell(dash(m.trustee), 3600),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Beneficiary/Nominee:', 1600),
          valueCell(dash(m.beneficiary_nominee), 2400),
          labelCell('Loan Number:', 1200),
          valueCell(dash(m.loan_number), 1800),
          labelCell('MIN:', 600),
          valueCell(dash(m.min), 1160),
        ],
      }),
      new TableRow({
        children: [
          labelCell('Open/Closed:', 1200),
          valueCell(dash(m.open_closed_ended), 2000),
          labelCell('Status:', 800),
          new TableCell({ borders, columnSpan: 5,
            children: [new Paragraph({
              children: [new TextRun({ text: dash(m.status), size: 18, font: 'Arial' })],
            })],
          }),
        ],
      }),
    ];
    if (m.notes) {
      rows.push(new TableRow({
        children: [
          labelCell('Notes:', 1200),
          new TableCell({ borders, columnSpan: 7,
            children: [new Paragraph({
              children: [new TextRun({ text: dash(m.notes), size: 16, font: 'Arial' })],
            })],
          }),
        ],
      }));
    }
    (m.associated_documents || []).forEach((a) => {
      rows.push(new TableRow({
        children: [
          labelCell('  Assoc Doc:', 1200),
          new TableCell({ borders, columnSpan: 7,
            children: [new Paragraph({
              children: [new TextRun({ text: `${dash(a.document_type)} | ${dash(a.book_page_instrument)} | ${dash(a.dated)} | ${dash(a.recorded)}`, size: 16, font: 'Arial' })],
            })],
          }),
        ],
      }));
    });
    return rows;
  });

  // ΓöÇΓöÇ Judgments/Liens ΓöÇΓöÇ
  const lienRows = (liens || []).flatMap((l, i) => [
    new TableRow({
      children: [
        labelCell(`(${i + 1}) Document:`, 2000),
        valueCell(dash(l.document_title), 3360),
        labelCell('Case #:', 1200),
        valueCell(dash(l.case_number), 2800),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Dated:', 800),
        valueCell(dash(l.date_of_judgment_lien), 1400),
        labelCell('Amount:', 1200),
        valueCell(l.amount ? `$${l.amount}` : dash(l.amount), 1200),
        labelCell('Recorded:', 1000),
        valueCell(dash(l.recorded), 3760),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Plaintiff/Lienholder:', 1600),
        valueCell(dash(l.plaintiff_lienholder), 3000),
        labelCell('Defendant/Debtor:', 1600),
        valueCell(dash(l.defendant_debtor), 3160),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Interest:', 1200),
        valueCell(dash(l.interest), 2400),
        labelCell('Costs:', 1200),
        valueCell(l.costs ? `$${l.costs}` : dash(l.costs), 1800),
        labelCell("Atty's Fees:", 1200),
        valueCell(l.attorneys_fees ? `$${l.attorneys_fees}` : dash(l.attorneys_fees), 1560),
      ],
    }),
    new TableRow({
      children: [
        labelCell('Status:', 1200),
        new TableCell({ borders, columnSpan: 5,
          children: [new Paragraph({
            children: [new TextRun({ text: dash(l.status), size: 18, font: 'Arial' })],
          })],
        }),
      ],
    }),
    ...(l.notes ? [new TableRow({
      children: [
        labelCell('Notes:', 1200),
        new TableCell({ borders, columnSpan: 5,
          children: [new Paragraph({
            children: [new TextRun({ text: dash(l.notes), size: 16, font: 'Arial' })],
          })],
        }),
      ],
    })] : []),
  ]);

  // ΓöÇΓöÇ Miscellaneous Documents ΓöÇΓöÇ
  const miscRows = (misc || []).flatMap((m, i) => {
    const rows = [
      new TableRow({
        children: [
          labelCell(`(${i + 1}) Type:`, 2000),
          valueCell(dash(m.document_type || m.document_title), 3360),
          labelCell('Book/Inst:', 1200),
          valueCell(dash(m.book_page_instrument), 1200),
          cell('', { span: 2 }),
        ],
      }),
    ];
    if (m.decedent || m.date_of_death || m.will_date) {
      rows.push(new TableRow({
        children: [
          labelCell('Decedent:', 1200),
          valueCell(dash(m.decedent), 2400),
          labelCell('Date of Death:', 1400),
          valueCell(dash(m.date_of_death), 1400),
          labelCell('Will Date:', 1000),
          valueCell(dash(m.will_date), 1360),
        ],
      }));
    }
    if ((m.heirs || []).length > 0) {
      rows.push(new TableRow({
        children: [
          labelCell('Heirs:', 1000),
          new TableCell({ borders, columnSpan: 5,
            children: [new Paragraph({
              children: [new TextRun({ text: (m.heirs || []).join('; '), size: 16, font: 'Arial' })],
            })],
          }),
        ],
      }));
    }
    if (m.grantor_assignor || m.grantee_assignee) {
      rows.push(new TableRow({
        children: [
          labelCell('Grantor/Assignor:', 1600),
          valueCell(dash(m.grantor_assignor), 2400),
          labelCell('Grantee/Assignee:', 1600),
          valueCell(dash(m.grantee_assignee), 2400),
          labelCell('Area/Width:', 1000),
          valueCell(dash(m.area_or_width), 1160),
        ],
      }));
    }
    if (m.dated) {
      rows.push(new TableRow({
        children: [
          labelCell('Dated:', 800),
          valueCell(dash(m.dated), 1400),
          labelCell('Consideration:', 1200),
          valueCell(dash(m.consideration), 1200),
          cell('', { span: 4 }),
        ],
      }));
    }
    if (m.notes) {
      rows.push(new TableRow({
        children: [
          labelCell('Notes:', 1200),
          new TableCell({ borders, columnSpan: 5,
            children: [new Paragraph({
              children: [new TextRun({ text: dash(m.notes), size: 16, font: 'Arial' })],
            })],
          }),
        ],
      }));
    }
    return rows;
  });

  // ΓöÇΓöÇ Legal Description ΓöÇΓöÇ
  const legalPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: dash(legal), size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ΓöÇΓöÇ Additional Information ΓöÇΓöÇ
  let addInfoText = '';
  const refs = addInfo.references || [];
  if (refs.length > 0) {
    addInfoText += 'REFERENCES:\n';
    refs.forEach((r, idx) => {
      const refStr = typeof r === 'string' ? r : `${r.book_page_instrument || ''} - ${r.document_type || r.label || ''}`;
      addInfoText += `${idx + 1}. ${refStr}\n`;
    });
  }
  const docAccounting = addInfo.document_accounting || [];
  if (docAccounting.length > 0) {
    addInfoText += '\nPDF DOCUMENT ACCOUNTING:\n';
    docAccounting.forEach((da, idx) => {
      addInfoText += `${idx + 1}. PAGE(S) ${da.page_range || ''}: ${da.document_label || ''}\n`;
    });
  }
  if (!addInfoText) addInfoText = 'No additional information.';

  const additionalPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: addInfoText, size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ΓöÇΓöÇ Names Searched ΓöÇΓöÇ
  const namesText = (names || []).join(', ') || 'NONE PROVIDED.';
  const namesPara = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: namesText, size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // ΓöÇΓöÇ Build Document ΓöÇΓöÇ
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 18 } } } },
    sections: [
      {
        properties: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        children: [
          logoParagraph(logo),
          sectionHeader('ORDER INFORMATION'),
          orderTable,
          spacerTable(),
          taxTable,
          spacerTable(),
          sectionHeader('CHAIN OF TITLE'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: chainRows.length
              ? chainRows
              : [new TableRow({ children: [cell('NO CHAIN ENTRIES FOUND.', { span: 8, italics: true })] })],
          }),
          spacerTable(),
          sectionHeader('MORTGAGES / DEEDS OF TRUST'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: mortgageRows.length
              ? mortgageRows
              : [new TableRow({ children: [cell('NONE ΓÇö NO OPEN MORTGAGE OR DEED OF TRUST.', { span: 8, italics: true })] })],
          }),
          spacerTable(),
          sectionHeader('JUDGMENTS / LIENS'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: lienRows.length
              ? lienRows
              : [new TableRow({ children: [cell('NONE ΓÇö NO OPEN JUDGMENT OR LIEN.', { span: 6, italics: true })] })],
          }),
          spacerTable(),
          sectionHeader('MISCELLANEOUS DOCUMENTS'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: miscRows.length
              ? miscRows
              : [new TableRow({ children: [cell('NO MISCELLANEOUS DOCUMENTS FOUND.', { span: 6, italics: true })] })],
          }),
          spacerTable(),
          sectionHeader('LEGAL DESCRIPTION'),
          legalPara,
          spacerTable(),
          sectionHeader('ADDITIONAL INFORMATION'),
          additionalPara,
          spacerTable(),
          sectionHeader('NAMES SEARCHED'),
          namesPara,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

module.exports = { generateV7TextDocx, generateV7TableDocx };
