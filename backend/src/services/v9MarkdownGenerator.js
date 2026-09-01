// V9 (REVISION 9 rules) Markdown Generator
// Renders the v9 schema (docs/schemas/v9-schema.json) as Markdown per
// docs/v9/v9_rules.md. ALL CAPS content (Legal Description preserves case),
// packet-order chain with numbered deeds and starred supporting entries,
// mandatory CONSIDERATION/RECORDED/MIN/MATURITY fields, verification notes.

function generateV9Markdown(f) {
  const up = (v) => (v !== null && v !== undefined && v !== '' ? String(v).toUpperCase() : '');
  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v) : '');
  const dash = (v) => up(v) || '—';

  let md = '# V9 PROPERTY ABSTRACT REPORT\n\n';

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
  if (val(oi.land_value)) md += `**LAND VALUE:** ${dash(oi.land_value)}\n`;
  if (val(oi.improvement_value)) md += `**IMPROVEMENT VALUE:** ${dash(oi.improvement_value)}\n`;
  if (val(oi.total_value)) md += `**TOTAL VALUE:** ${dash(oi.total_value)}\n`;
  if (val(oi.order_verification_notes)) md += `**VERIFICATION NOTES:** ${dash(oi.order_verification_notes)}\n\n`;
  else md += '\n';

  // ── TAX INFORMATION (rendered within ORDER INFORMATION) ──
  const ti = f.tax_information || {};
  if (ti.year || ti.first_half || ti.second_half || ti.total_tax || ti.total_delinquent_amount || ti.status) {
    const taxYear = up(ti.year) || '—';
    md += `**TAX INFORMATION (${taxYear})**\n\n`;
    if (val(ti.status)) md += `**STATUS:** ${dash(ti.status)}\n`;
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

  // ── CHAIN OF TITLE (packet order; only deeds numbered; supporting starred) ──
  md += '## CHAIN OF TITLE\n';
  const chain = f.chain_of_title || [];
  if (chain.length === 0) {
    md += 'NONE — NO CHAIN INSTRUMENTS WERE PROVIDED OR CLEARLY IDENTIFIED.\n\n';
  } else {
    let deedNo = 0;
    chain.forEach((e) => {
      const isSupporting = up(e.entry_type) === 'SUPPORTING';
      if (isSupporting) {
        const typeLabel = up(e.supporting_documents?.[0]?.document_type) || dash(e.deed_type) || dash(e.document_title) || 'SUPPORTING DOCUMENT';
        const decedent = up(e.supporting_documents?.[0]?.decedent) || dash(e.deceased_person);
        md += `* ${typeLabel}${decedent ? ` — ${decedent}` : ''}\n`;
        const sd = e.supporting_documents && e.supporting_documents.length ? e.supporting_documents : (e.deed_type ? [e] : []);
        sd.forEach((s) => {
          if (val(s.decedent)) md += `  **DECEDENT:** ${dash(s.decedent)}\n`;
          if (val(s.date_of_death)) md += `  **DATE OF DEATH:** ${dash(s.date_of_death)}\n`;
          if (val(s.will_date)) md += `  **WILL DATE:** ${dash(s.will_date)}\n`;
          if (val(s.recorded)) md += `  **RECORDED:** ${dash(s.recorded)}\n`;
          if (val(s.book_page_instrument)) md += `  **BOOK / PAGE OR INSTRUMENT:** ${dash(s.book_page_instrument)}\n`;
          if ((s.heirs || []).length > 0) md += `  **HEIRS:** ${(s.heirs || []).map((h) => up(h)).join(', ')}\n`;
          if ((s.devisees_beneficiaries || []).length > 0) md += `  **DEVISEES / BENEFICIARIES:** ${(s.devisees_beneficiaries || []).map((d) => up(d)).join(', ')}\n`;
          if (val(s.notes)) md += `  **NOTES:** ${dash(s.notes)}\n`;
        });
        if (val(e.recorded)) md += `**RECORDED:** ${dash(e.recorded)}\n`;
        if (val(e.book_page_instrument)) md += `**BOOK / PAGE OR INSTRUMENT:** ${dash(e.book_page_instrument)}\n`;
        if (val(e.notes)) md += `**NOTES:** ${dash(e.notes)}\n`;
      } else {
        deedNo += 1;
        const title = dash(e.document_title) || dash(e.deed_type) || 'DEED';
        md += `**(${deedNo}) ${title}**\n`;
        md += `**GRANTOR(S):** ${(e.grantors || []).map((g) => up(g)).join(', ') || '—'}\n`;
        md += `**GRANTEE(S):** ${(e.grantees || []).map((g) => up(g)).join(', ') || '—'}\n`;
        md += `**DATED:** ${dash(e.dated)}\n`;
        md += `**RECORDED / RECORDING DATE:** ${dash(e.recorded)}\n`;
        if (val(e.recording_time)) md += `**RECORDING TIME:** ${dash(e.recording_time)}\n`;
        md += `**BOOK / PAGE OR INSTRUMENT:** ${dash(e.book_page_instrument)}\n`;
        md += `**CONSIDERATION:** ${dash(e.consideration)}\n`;
        if (val(e.deceased_person)) {
          md += `**DECEASED PERSON:** ${dash(e.deceased_person)}\n`;
          if (val(e.deceased_note)) md += `**NOTE:** ${dash(e.deceased_note)}\n`;
        }
        if (val(e.third_party_party)) {
          md += `**PARTY OF THE THIRD PART:** ${dash(e.third_party_party)}\n`;
          if (val(e.third_party_reason)) md += `**PARTICIPATION REASON:** ${dash(e.third_party_reason)}\n`;
        }
        if (val(e.partition_deed_notes)) md += `**PARTITION DEED NOTES:** ${dash(e.partition_deed_notes)}\n`;
        if (val(e.notes)) md += `**NOTES:** ${dash(e.notes)}\n`;
        (e.foreclosure_sequence || []).forEach((d, di) => {
          const ref = [d.book_page_instrument, d.dated, d.recorded].filter(Boolean).join(' | ');
          md += `**FORECLOSURE (${di + 1}): ${dash(d.document_type)}${ref ? ` — ${ref}` : ''}**\n`;
        });
        (e.supporting_documents || []).forEach((s) => {
          md += `* **${dash(s.document_type) || '* SUPPORTING DOCUMENT'}**\n`;
          if (val(s.decedent)) md += `  **DECEDENT:** ${dash(s.decedent)}\n`;
          if (val(s.date_of_death)) md += `  **DATE OF DEATH:** ${dash(s.date_of_death)}\n`;
          if (val(s.will_date)) md += `  **WILL DATE:** ${dash(s.will_date)}\n`;
          if (val(s.recorded)) md += `  **RECORDED:** ${dash(s.recorded)}\n`;
          if (val(s.book_page_instrument)) md += `  **BOOK / PAGE OR INSTRUMENT:** ${dash(s.book_page_instrument)}\n`;
          if ((s.heirs || []).length > 0) md += `  **HEIRS:** ${(s.heirs || []).map((h) => up(h)).join(', ')}\n`;
          if ((s.devisees_beneficiaries || []).length > 0) md += `  **DEVISEES / BENEFICIARIES:** ${(s.devisees_beneficiaries || []).map((d) => up(d)).join(', ')}\n`;
          if (val(s.notes)) md += `  **NOTES:** ${dash(s.notes)}\n`;
        });
      }
      md += '\n';
    });
  }

  // ── MORTGAGES / DEEDS OF TRUST ──
  md += '## MORTGAGES / DEEDS OF TRUST\n';
  const mortgages = f.mortgages || [];
  if (mortgages.length === 0) {
    md += 'NONE — NO OPEN MORTGAGE OR DEED OF TRUST WAS INCLUDED OR CLEARLY IDENTIFIED IN THE PROVIDED DOCUMENTS.\n\n';
  } else {
    mortgages.forEach((m, i) => {
      md += `**(${i + 1}) ${dash(m.document_title)}**\n`;
      md += `**BORROWER(S):** ${(m.borrowers || []).map((b) => up(b)).join(', ') || '—'}\n`;
      md += `**LENDER:** ${dash(m.lender)}\n`;
      md += `**TRUSTEE:** ${dash(m.trustee)}\n`;
      md += `**BENEFICIARY / NOMINEE:** ${dash(m.beneficiary_nominee)}\n`;
      md += `**DATED:** ${dash(m.dated)}\n`;
      md += `**RECORDED:** ${dash(m.recorded)}\n`;
      md += `**BOOK / PAGE OR INSTRUMENT:** ${dash(m.book_page_instrument)}\n`;
      md += `**AMOUNT:** ${m.amount ? `$${dash(m.amount)}` : dash(m.amount)}\n`;
      md += `**MATURITY:** ${dash(m.maturity || 'NOT SHOWN')}\n`;
      md += `**LOAN NUMBER:** ${dash(m.loan_number)}\n`;
      md += `**MIN:** ${dash(m.min || 'NOT SHOWN')}\n`;
      md += `**OPEN / CLOSED ENDED:** ${dash(m.open_closed_ended)}\n`;
      md += `**STATUS:** ${dash(m.status)}\n`;
      if (m.notes) md += `**NOTES:** ${dash(m.notes)}\n`;
      const ad = m.associated_documents || [];
      ad.forEach((a, ai) => {
        const ref = [a.book_page_instrument, a.dated, a.recorded].filter(Boolean).join(' | ');
        md += `* **ASSOCIATED DOCUMENT ${ai + 1}: ${dash(a.document_type)}${ref ? ` — ${ref}` : ''}**\n`;
        if (a.notes) md += `  **NOTES:** ${dash(a.notes)}\n`;
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
      if (l.notes) md += `**NOTES:** ${dash(l.notes)}\n`;
      if (i < liens.length - 1) md += '\n';
    });
    md += '\n';
  }

  // ── MISCELLANEOUS DOCUMENTS ──
  md += '## MISCELLANEOUS DOCUMENTS\n';
  const misc = f.misc_documents || [];
  if (misc.length === 0) {
    md += 'NO MISCELLANEOUS DOCUMENTS WERE PROVIDED OR CLEARLY IDENTIFIED.\n\n';
  } else {
    misc.forEach((m, i) => {
      const typeLabel = dash(m.document_type || m.document_title);
      md += `**(${i + 1}) ${typeLabel}**\n`;
      if (m.decedent) md += `**DECEDENT:** ${dash(m.decedent)}\n`;
      if (m.date_of_death) md += `**DATE OF DEATH:** ${dash(m.date_of_death)}\n`;
      if (m.will_date) md += `**WILL DATE:** ${dash(m.will_date)}\n`;
      if (m.probate_date) md += `**PROBATE DATE:** ${dash(m.probate_date)}\n`;
      if (m.recorded) md += `**RECORDED:** ${dash(m.recorded)}\n`;
      if (m.book_page_instrument) md += `**BOOK / PAGE OR INSTRUMENT:** ${dash(m.book_page_instrument)}\n`;
      if ((m.heirs || []).length > 0) md += `**HEIRS:** ${(m.heirs || []).map((h) => up(h)).join(', ')}\n`;
      if ((m.devisees_beneficiaries || []).length > 0) md += `**DEVISEES / BENEFICIARIES:** ${(m.devisees_beneficiaries || []).map((d) => up(d)).join(', ')}\n`;
      if (m.grantor_assignor) md += `**GRANTOR / ASSIGNOR:** ${dash(m.grantor_assignor)}\n`;
      if (m.grantee_assignee) md += `**GRANTEE / ASSIGNEE:** ${dash(m.grantee_assignee)}\n`;
      if (m.dated) md += `**DATED:** ${dash(m.dated)}\n`;
      if (m.consideration) md += `**CONSIDERATION:** ${dash(m.consideration)}\n`;
      if (m.area_or_width) md += `**AREA / WIDTH:** ${dash(m.area_or_width)}\n`;
      if (m.notes) md += `**NOTES:** ${dash(m.notes)}\n`;
      if (i < misc.length - 1) md += '\n';
    });
    md += '\n';
  }

  // ── LEGAL DESCRIPTION (preserve recorded case) ──
  md += '## LEGAL DESCRIPTION\n';
  md += `${val(f.legal_description) || '—'}\n\n`;

  // ── ADDITIONAL INFORMATION ──
  md += '## ADDITIONAL INFORMATION\n';
  const addInfo = f.additional_information || {};
  const refs = addInfo.references || [];
  if (refs.length > 0 && typeof refs[0] !== 'string') {
    refs.forEach((r, ri) => {
      const refText = `${r.book_page_instrument || ''} - ${r.document_type || r.label || ''}`;
      md += `${ri + 1}. ${up(refText)}\n`;
    });
  } else if (refs.length > 0) {
    refs.forEach((r, ri) => {
      md += `${ri + 1}. ${up(r)}\n`;
    });
  }
  const docAccounting = addInfo.document_accounting || [];
  if (docAccounting.length > 0) {
    md += '\n**PDF DOCUMENT ACCOUNTING**\n';
    docAccounting.forEach((da, di) => {
      md += `${di + 1}. PAGE(S) ${dash(da.page_range)}: ${dash(da.document_label)}\n`;
    });
  }
  const update = f.update_report || {};
  if (update.is_update) {
    md += '\n**UPDATE / CONTINUATION SUMMARY**\n';
    if (val(update.prior_effective_date)) md += `PRIOR EFFECTIVE DATE: ${dash(update.prior_effective_date)}\n`;
    if (val(update.current_effective_date)) md += `CURRENT EFFECTIVE DATE: ${dash(update.current_effective_date)}\n`;
    if ((update.actual_documents_recorded || []).length > 0) md += `ACTUAL DOCUMENTS RECORDED: ${(update.actual_documents_recorded || []).map((x) => up(x)).join(', ')}\n`;
    if ((update.carried_forward_open_matters || []).length > 0) md += `CARRIED-FORWARD OPEN MATTERS: ${(update.carried_forward_open_matters || []).map((x) => up(x)).join(', ')}\n`;
    if ((update.proposed_unrecorded_items || []).length > 0) md += `PROPOSED / UNRECORDED ITEMS: ${(update.proposed_unrecorded_items || []).map((x) => up(x)).join(', ')}\n`;
    if (val(update.summary_notes)) md += `SUMMARY: ${dash(update.summary_notes)}\n`;
  }
  if (refs.length === 0 && docAccounting.length === 0 && !update.is_update) {
    md += 'NO ADDITIONAL INFORMATION.\n';
  }
  md += '\n';

  // ── NAMES SEARCHED ──
  md += '## NAMES SEARCHED\n';
  md += `${(f.names_searched || []).join(', ') || 'NONE PROVIDED.'}\n`;

  // ── Performed by (rule 19.x) ──
  md += '\nPerformed by: Patrick Hazelwood\n';

  return md;
}

module.exports = { generateV9Markdown };