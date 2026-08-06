// V7 (Enhanced Report) Markdown Generator
// Renders the v7 schema (docs/schemas/v7-schema.json) as Markdown.

function generateV7Markdown(f) {
  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v).toUpperCase() : '');
  const dash = (v) => val(v) || '—';

  let md = '# V7 PROPERTY ABSTRACT REPORT\n\n';

  // ── ORDER INFORMATION ──
  const oi = f.order_info || {};
  md += '## ORDER INFORMATION\n';
  md += `**FILE NUMBER:** ${dash(oi.file_number)}\n`;
  md += `**CLIENT / ORDER:** ${dash(oi.client_order)}\n`;
  md += `**COMPANY NAME:** ${dash(oi.company_name)}\n`;
  md += `**EFFECTIVE DATE:** ${dash(oi.effective_date)}\n`;
  md += `**BORROWER / OWNER:** ${dash(oi.borrower_owner)}\n`;
  md += `**PROPERTY ADDRESS:** ${dash(oi.property_address)}\n`;
  md += `**COUNTY:** ${dash(oi.county)}\n`;
  md += `**TOWNSHIP / CITY:** ${dash(oi.township_city)}\n`;
  md += `**PARCEL ID / TAX MAP:** ${dash(oi.parcel_id_tax_map)}\n`;
  md += `**ACCOUNT NUMBER:** ${dash(oi.account_number)}\n`;
  md += `**CURRENT VESTING OWNER:** ${dash(oi.current_vesting_owner)}\n`;
  md += `**ASSESSOR OWNER:** ${dash(oi.assessor_owner)}\n`;
  md += `**LEGAL / ASSESSOR DESCRIPTION:** ${dash(oi.legal_assessor_description)}\n`;
  md += `**ACREAGE:** ${dash(oi.acreage)}\n`;
  md += `**ASSESSMENT:** ${dash(oi.assessment)}\n`;
  md += `**ORDER / VERIFICATION NOTES:** ${dash(oi.order_verification_notes)}\n\n`;

  // ── TAX INFORMATION (rendered within ORDER INFORMATION) ──
  const ti = f.tax_information || {};
  if (ti.year || ti.first_half || ti.second_half || ti.total_tax || ti.total_delinquent_amount) {
    const taxYear = val(ti.year) || '—';
    md += `**TAX INFORMATION (${taxYear})**\n\n`;
    const fh = ti.first_half || {};
    if (fh.due_date || fh.original_bill || fh.paid_date || fh.amount_paid || fh.penalty || fh.interest || fh.balance_due) {
      md += '**FIRST HALF**\n';
      if (fh.due_date) md += `**DUE DATE:** ${dash(fh.due_date)}\n`;
      if (fh.original_bill) md += `**ORIGINAL BILL:** $${dash(fh.original_bill)}\n`;
      if (fh.paid_date) md += `**PAID DATE:** ${dash(fh.paid_date)}\n`;
      if (fh.amount_paid) md += `**AMOUNT PAID:** $${dash(fh.amount_paid)}\n`;
      if (fh.penalty) md += `**PENALTY:** $${dash(fh.penalty)}\n`;
      if (fh.interest) md += `**INTEREST:** $${dash(fh.interest)}\n`;
      if (fh.balance_due) md += `**BALANCE DUE:** $${dash(fh.balance_due)}\n`;
      md += '\n';
    }
    const sh = ti.second_half || {};
    if (sh.due_date || sh.original_bill || sh.paid_date || sh.amount_paid || sh.penalty || sh.interest || sh.balance_due) {
      md += '**SECOND HALF**\n';
      if (sh.due_date) md += `**DUE DATE:** ${dash(sh.due_date)}\n`;
      if (sh.original_bill) md += `**ORIGINAL BILL:** $${dash(sh.original_bill)}\n`;
      if (sh.paid_date) md += `**PAID DATE:** ${dash(sh.paid_date)}\n`;
      if (sh.amount_paid) md += `**AMOUNT PAID:** $${dash(sh.amount_paid)}\n`;
      if (sh.penalty) md += `**PENALTY:** $${dash(sh.penalty)}\n`;
      if (sh.interest) md += `**INTEREST:** $${dash(sh.interest)}\n`;
      if (sh.balance_due) md += `**BALANCE DUE:** $${dash(sh.balance_due)}\n`;
      md += '\n';
    }
    if (ti.total_tax) md += `**TOTAL ${taxYear} TAX:** $${dash(ti.total_tax)}\n`;
    if (ti.total_delinquent_amount) md += `**TOTAL DELINQUENT / OPEN AMOUNT SHOWN:** $${dash(ti.total_delinquent_amount)}\n`;
    md += '\n';
  }

  // ── CHAIN OF TITLE ──
  md += '## CHAIN OF TITLE\n';
  const chain = f.chain_of_title || [];
  if (chain.length === 0) {
    md += 'NO CHAIN ENTRIES FOUND.\n\n';
  } else {
    chain.forEach((e, i) => {
      md += `**(${i + 1}) ${dash(e.deed_type)}**\n`;
      md += `**GRANTOR(S):** ${(e.grantors || []).map((g) => val(g)).join(', ') || '—'}\n`;
      md += `**GRANTEE(S):** ${(e.grantees || []).map((g) => val(g)).join(', ') || '—'}\n`;
      md += `**DATED:** ${dash(e.dated)}\n`;
      md += `**RECORDED:** ${dash(e.recorded)}\n`;
      md += `**BOOK / PAGE OR INSTRUMENT:** ${dash(e.book_page_instrument)}\n`;
      md += `**CONSIDERATION:** ${dash(e.consideration)}\n`;
      if (e.notes) md += `**NOTES:** ${val(e.notes)}\n`;
      const sd = e.supporting_documents || [];
      sd.forEach((s) => {
        md += `* **${dash(s.document_type) || '* SUPPORTING DOCUMENT'}**\n`;
        if (s.decedent) md += `  **DECEDENT:** ${val(s.decedent)}\n`;
        if (s.date_of_death) md += `  **DATE OF DEATH:** ${val(s.date_of_death)}\n`;
        if (s.will_date) md += `  **WILL DATE:** ${val(s.will_date)}\n`;
        if (s.recorded) md += `  **RECORDED:** ${val(s.recorded)}\n`;
        if (s.book_page_instrument) md += `  **BOOK / PAGE OR INSTRUMENT:** ${val(s.book_page_instrument)}\n`;
        if ((s.heirs || []).length > 0) md += `  **HEIRS:** ${(s.heirs || []).map((h) => val(h)).join(', ')}\n`;
        if ((s.devisees_beneficiaries || []).length > 0) md += `  **DEVISEES / BENEFICIARIES:** ${(s.devisees_beneficiaries || []).map((d) => val(d)).join(', ')}\n`;
        if (s.notes) md += `  **NOTES:** ${val(s.notes)}\n`;
      });
      if (i < chain.length - 1) md += '\n';
    });
    md += '\n';
  }

  // ── MORTGAGES / DEEDS OF TRUST ──
  md += '## MORTGAGES / DEEDS OF TRUST\n';
  const mortgages = f.mortgages || [];
  if (mortgages.length === 0) {
    md += 'NONE — NO OPEN MORTGAGE OR DEED OF TRUST WAS INCLUDED OR CLEARLY IDENTIFIED IN THE PROVIDED DOCUMENTS.\n\n';
  } else {
    mortgages.forEach((m, i) => {
      md += `**(${i + 1}) ${dash(m.document_title)}**\n`;
      md += `**BORROWER(S):** ${(m.borrowers || []).map((b) => val(b)).join(', ') || '—'}\n`;
      md += `**LENDER:** ${dash(m.lender)}\n`;
      md += `**TRUSTEE:** ${dash(m.trustee)}\n`;
      md += `**BENEFICIARY / NOMINEE:** ${dash(m.beneficiary_nominee)}\n`;
      md += `**DATED:** ${dash(m.dated)}\n`;
      md += `**RECORDED:** ${dash(m.recorded)}\n`;
      md += `**BOOK / PAGE OR INSTRUMENT:** ${dash(m.book_page_instrument)}\n`;
      md += `**AMOUNT:** ${m.amount ? `$${dash(m.amount)}` : dash(m.amount)}\n`;
      md += `**MATURITY:** ${dash(m.maturity)}\n`;
      md += `**LOAN NUMBER:** ${dash(m.loan_number)}\n`;
      md += `**MIN:** ${dash(m.min)}\n`;
      md += `**OPEN / CLOSED ENDED:** ${dash(m.open_closed_ended)}\n`;
      md += `**STATUS:** ${dash(m.status)}\n`;
      if (m.notes) md += `**NOTES:** ${val(m.notes)}\n`;
      const ad = m.associated_documents || [];
      ad.forEach((a, ai) => {
        md += `* **ASSOCIATED DOCUMENT ${ai + 1}: ${dash(a.document_type)}**\n`;
        if (a.book_page_instrument) md += `  **BOOK / PAGE OR INSTRUMENT:** ${val(a.book_page_instrument)}\n`;
        if (a.dated) md += `  **DATED:** ${val(a.dated)}\n`;
        if (a.recorded) md += `  **RECORDED:** ${val(a.recorded)}\n`;
        if (a.notes) md += `  **NOTES:** ${val(a.notes)}\n`;
      });
      if (i < mortgages.length - 1) md += '\n';
    });
    md += '\n';
  }

  // ── JUDGMENTS / LIENS ──
  md += '## JUDGMENTS / LIENS\n';
  const liens = f.judgments_liens || [];
  if (liens.length === 0) {
    md += "NONE — NO OPEN JUDGMENT, LIEN, UCC, STATE TAX LIEN, FEDERAL TAX LIEN, MECHANIC'S LIEN, LIS PENDENS, BANKRUPTCY, OR FORECLOSURE DOCUMENT WAS INCLUDED OR CLEARLY IDENTIFIED IN THE PROVIDED DOCUMENTS.\n\n";
  } else {
    liens.forEach((l, i) => {
      md += `**(${i + 1}) ${dash(l.document_title)}**\n`;
      md += `**PLAINTIFF / LIENHOLDER:** ${dash(l.plaintiff_lienholder)}\n`;
      md += `**DEFENDANT / DEBTOR:** ${dash(l.defendant_debtor)}\n`;
      md += `**CASE NUMBER:** ${dash(l.case_number)}\n`;
      md += `**DATE OF JUDGMENT / LIEN:** ${dash(l.date_of_judgment_lien)}\n`;
      md += `**RECORDED:** ${dash(l.recorded)}\n`;
      md += `**BOOK / PAGE OR INSTRUMENT:** ${dash(l.book_page_instrument)}\n`;
      md += `**AMOUNT:** ${l.amount ? `$${dash(l.amount)}` : dash(l.amount)}\n`;
      md += `**INTEREST:** ${dash(l.interest)}\n`;
      md += `**COSTS:** ${l.costs ? `$${dash(l.costs)}` : dash(l.costs)}\n`;
      md += `**ATTORNEY'S FEES:** ${l.attorneys_fees ? `$${dash(l.attorneys_fees)}` : dash(l.attorneys_fees)}\n`;
      md += `**STATUS:** ${dash(l.status)}\n`;
      if (l.notes) md += `**NOTES:** ${val(l.notes)}\n`;
      if (i < liens.length - 1) md += '\n';
    });
    md += '\n';
  }

  // ── MISCELLANEOUS DOCUMENTS ──
  md += '## MISCELLANEOUS DOCUMENTS\n';
  const misc = f.misc_documents || [];
  if (misc.length === 0) {
    md += 'NO MISCELLANEOUS DOCUMENTS FOUND.\n\n';
  } else {
    misc.forEach((m, i) => {
      const typeLabel = dash(m.document_type || m.document_title);
      md += `**(${i + 1}) ${typeLabel}**\n`;
      if (m.decedent) md += `**DECEDENT:** ${val(m.decedent)}\n`;
      if (m.date_of_death) md += `**DATE OF DEATH:** ${val(m.date_of_death)}\n`;
      if (m.will_date) md += `**WILL DATE:** ${val(m.will_date)}\n`;
      if (m.probate_date) md += `**PROBATE DATE:** ${val(m.probate_date)}\n`;
      if (m.recorded) md += `**RECORDED:** ${val(m.recorded)}\n`;
      if (m.book_page_instrument) md += `**BOOK / PAGE OR INSTRUMENT:** ${val(m.book_page_instrument)}\n`;
      if ((m.heirs || []).length > 0) md += `**HEIRS:** ${(m.heirs || []).map((h) => val(h)).join(', ')}\n`;
      if ((m.devisees_beneficiaries || []).length > 0) md += `**DEVISEES / BENEFICIARIES:** ${(m.devisees_beneficiaries || []).map((d) => val(d)).join(', ')}\n`;
      if (m.grantor_assignor) md += `**GRANTOR / ASSIGNOR:** ${val(m.grantor_assignor)}\n`;
      if (m.grantee_assignee) md += `**GRANTEE / ASSIGNEE:** ${val(m.grantee_assignee)}\n`;
      if (m.dated) md += `**DATED:** ${val(m.dated)}\n`;
      if (m.consideration) md += `**CONSIDERATION:** ${val(m.consideration)}\n`;
      if (m.area_or_width) md += `**AREA / WIDTH:** ${val(m.area_or_width)}\n`;
      if (m.notes) md += `**NOTES:** ${val(m.notes)}\n`;
      if (i < misc.length - 1) md += '\n';
    });
    md += '\n';
  }

  // ── LEGAL DESCRIPTION ──
  md += '## LEGAL DESCRIPTION\n';
  md += `${dash(f.legal_description)}\n\n`;

  // ── ADDITIONAL INFORMATION ──
  md += '## ADDITIONAL INFORMATION\n';
  const addInfo = f.additional_information || {};
  const refs = addInfo.references || [];
  if (refs.length > 0 && typeof refs[0] !== 'string') {
    refs.forEach((r, ri) => {
      const refText = `${r.book_page_instrument || ''} - ${r.document_type || r.label || ''}`;
      md += `${ri + 1}. ${val(refText)}\n`;
    });
  } else if (refs.length > 0) {
    refs.forEach((r, ri) => {
      md += `${ri + 1}. ${val(r)}\n`;
    });
  }
  const docAccounting = addInfo.document_accounting || [];
  if (docAccounting.length > 0) {
    md += '\n**PDF DOCUMENT ACCOUNTING**\n';
    docAccounting.forEach((da, di) => {
      md += `${di + 1}. PAGE(S) ${dash(da.page_range)}: ${dash(da.document_label)}\n`;
    });
  }
  if (refs.length === 0 && docAccounting.length === 0) {
    md += 'NO ADDITIONAL INFORMATION.\n';
  }
  md += '\n';

  // ── NAMES SEARCHED ──
  md += '## NAMES SEARCHED\n';
  md += `${(f.names_searched || []).join(', ') || 'NONE PROVIDED.'}\n`;

  return md;
}

module.exports = { generateV7Markdown };
