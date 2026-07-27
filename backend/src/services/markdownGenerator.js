/**
 * Given a filled fields object, produce a Markdown string.
 * Supports V1 (Legacy), V2 (ProTitleUSA), V4 (Hazelwood), V5 (Standard), and V6 (Enhanced) schemas.
 */
function generateMarkdown(fields, templateVersion = 'v1') {
  if (templateVersion === 'v7') return generateV7Markdown(fields);
  if (templateVersion === 'v6') return generateV6Markdown(fields);
  if (templateVersion === 'v5') return generateV5Markdown(fields);
  if (templateVersion === 'v4') return generateV4Markdown(fields);
  const isV2 = templateVersion === 'v2';
  return isV2 ? generateV2Markdown(fields) : generateV1Markdown(fields);
}

function generateV1Markdown(f) {
  const oi = f.order_info || {};
  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v).toUpperCase() : '');
  const dash = (v) => val(v) || '—';

  let md = '# PROPERTY ABSTRACT REPORT\n\n';

  // Order Information
  md += '## ORDER INFORMATION\n';
  md += '| Field | Value |\n';
  md += '| :--- | :--- |\n';
  md += `| File Number | ${dash(oi.file_number)} |\n`;
  md += `| Effective Date | ${dash(oi.effective_date)} |\n`;
  md += `| Completed Date | ${dash(oi.completed_date)} |\n`;
  md += `| Property Address | **${dash(oi.property_address)}** |\n`;
  md += `| County | ${dash(oi.county)} |\n`;
  md += `| Township | ${dash(oi.township)} |\n`;
  md += `| Parcel ID | ${dash(oi.parcel_id)} |\n`;
  md += `| Assessed Value | ${dash(oi.assessed_value)} |\n`;
  md += `| Land Value | ${dash(oi.land_value)} |\n`;
  md += `| Impr. Value | ${dash(oi.improvement_value)} |\n`;
  md += `| Tax ID | ${dash(oi.tax_id)} |\n`;
  md += `| Tax Amount 1st | ${dash(oi.tax_amount_1st)} |\n`;
  md += `| Tax Amount 2nd | ${dash(oi.tax_amount_2nd)} |\n`;
  md += `| Tax Due 1st | ${dash(oi.tax_due_1st)} |\n`;
  md += `| Tax Due 2nd | ${dash(oi.tax_due_2nd)} |\n`;
  md += `| Tax Delinquent | ${dash(oi.tax_delinquent)} |\n`;
  md += `| Tax Paid | ${dash(oi.tax_paid)} |\n`;
  md += `| Current Vesting Owner | ${dash(oi.current_vesting_owner)} |\n\n`;

  // Legal Description
  md += '## LEGAL DESCRIPTION\n';
  md += `${dash(f.legal_description)}\n\n`;

  // Chain of Title
  md += '## CHAIN OF TITLE\n';
  if (!f.chain_of_title || f.chain_of_title.length === 0) {
    md += '*No chain entries found.*\n\n';
  } else {
    f.chain_of_title.forEach((e, i) => {
      md += `### Entry ${i + 1}: ${dash(e.document_title)}\n`;
      md += `- **Book/Inst/Page**: ${dash(e.book_instrument)} / ${dash(e.page)}\n`;
      md += `- **Dated/Recorded**: ${dash(e.dated)} / ${dash(e.recorded)}\n`;
      md += `- **Consideration**: ${dash(e.consideration)}\n`;
      md += `- **In/Out Sale**: ${e.in_out_sale === true ? 'YES' : e.in_out_sale === false ? 'NO' : '—'}\n`;
      md += `- **Grantor(s)**: ${(e.grantors || []).map((g) => g.toUpperCase()).join('; ') || '—'}\n`;
      md += `- **Grantee(s)**: ${(e.grantees || []).map((g) => g.toUpperCase()).join('; ') || '—'}\n`;
      if (e.notes)
        md += `- **Notes**: ${e.notes.startsWith('*') ? val(e.notes) : `NOTES: ${val(e.notes)}`}\n`;
      md += '\n';
    });
  }

  // Mortgages
  md += '## MORTGAGES / DEEDS OF TRUST\n';
  if (!f.mortgages || f.mortgages.length === 0) {
    md += '*No open mortgages found.*\n\n';
  } else {
    f.mortgages.forEach((m, i) => {
      md += `### Mortgage ${i + 1}: ${dash(m.document_title)}\n`;
      md += `- **Book/Inst/Page**: ${dash(m.book_instrument)} / ${dash(m.page)}\n`;
      md += `- **Dated/Recorded**: ${dash(m.dated)} / ${dash(m.recorded)}\n`;
      md += `- **Consideration**: ${dash(m.consideration)}\n`;
      md += `- **Maturity Date**: ${dash(m.maturity_date)}\n`;
      md += `- **Lender**: ${dash(m.lender)} ${m.mers_number ? `(MERS# ${val(m.mers_number)})` : ''}\n`;
      md += `- **Borrower**: ${dash(m.borrower)}\n`;
      md += `- **Trustee**: ${dash(m.trustee)}\n`;
      if (m.notes) md += `- **Notes**: ${val(m.notes)}\n`;
      md += '\n';
    });
  }

  // Associated Documents
  md += '## ASSOCIATED DOCUMENTS\n';
  if (!f.associated_documents || f.associated_documents.length === 0) {
    md += '*No associated documents found.*\n\n';
  } else {
    f.associated_documents.forEach((a, i) => {
      md += `### Document ${i + 1}: ${dash(a.document_title)}\n`;
      md += `- **Book/Inst/Page**: ${dash(a.book_instrument)} / ${dash(a.page)}\n`;
      md += `- **Dated/Recorded**: ${dash(a.dated)} / ${dash(a.recorded)}\n`;
      md += `- **Consideration**: ${dash(a.consideration)}\n`;
      md += `- **Grantor/Assignor**: ${dash(a.grantor_assignor)}\n`;
      md += `- **Grantee/Assignee**: ${dash(a.grantee_assignee)}\n`;
      if (a.notes) md += `- **Notes**: ${val(a.notes)}\n`;
      md += '\n';
    });
  }

  // Judgments/Liens
  md += '## JUDGMENTS / LIENS\n';
  if (!f.judgments_liens || f.judgments_liens.length === 0) {
    md += '*No judgments or liens found.*\n\n';
  } else {
    f.judgments_liens.forEach((l, i) => {
      md += `### Judgment/Lien ${i + 1}: ${dash(l.document_title)}\n`;
      md += `- **Case #**: ${dash(l.case_number)}\n`;
      md += `- **Dated/Recorded**: ${dash(l.dated)} / ${dash(l.recorded)}\n`;
      md += `- **Amount**: ${dash(l.amount)}\n`;
      md += `- **Plaintiff**: ${dash(l.plaintiff)}\n`;
      md += `- **Defendant**: ${dash(l.defendant)}\n`;
      md += '\n';
    });
  }

  // Miscellaneous
  md += '## MISCELLANEOUS DOCUMENTS\n';
  if (!f.misc_documents || f.misc_documents.length === 0) {
    md += '*No miscellaneous documents found.*\n\n';
  } else {
    f.misc_documents.forEach((m, i) => {
      md += `### Document ${i + 1}: ${dash(m.document_title)}\n`;
      md += `- **Book/Inst/Page**: ${dash(m.book_instrument)} / ${dash(m.page)}\n`;
      md += `- **Dated/Recorded**: ${dash(m.dated)} / ${dash(m.recorded)}\n`;
      md += `- **Consideration**: ${dash(m.consideration)}\n`;
      md += `- **Grantor/Assignor**: ${dash(m.grantor_assignor)}\n`;
      md += `- **Grantee/Assignee**: ${dash(m.grantee_assignee)}\n`;
      md += '\n';
    });
  }

  // Names Searched
  md += '## NAMES SEARCHED\n';
  md += `${(f.names_searched || []).map((n) => n.toUpperCase()).join('; ') || 'NONE PROVIDED.'}\n\n`;

  // Additional Info
  md += '## ADDITIONAL INFORMATION\n';
  md += `${dash(f.additional_information)}\n`;

  return md;
}

function generateV2Markdown(f) {
  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v).toUpperCase() : '');
  const dash = (v) => val(v) || '—';

  let md = '# PROPERTY ABSTRACT REPORT (ProTitleUSA V2)\n\n';

  // Property Information
  const prop = f.property_info || {};
  md += '## PROPERTY INFORMATION\n';
  md += '| Field | Value |\n';
  md += '| :--- | :--- |\n';
  md += `| ProTitle Order# | ${dash(prop.order_no)} |\n`;
  md += `| Property Address | **${dash(prop.address)}** |\n`;
  md += `| County | ${dash(prop.county)} |\n`;
  md += `| APN / Parcel # | ${dash(prop.apn_parcel_pin)} |\n`;
  md += `| Current Owner | ${dash(prop.current_owner)} |\n`;
  md += `| Completed Date | ${dash(prop.completed_date)} |\n`;
  md += `| Index Date | ${dash(prop.index_date)} |\n\n`;

  // Vesting Information
  const vest = f.vesting_info || {};
  md += '## VESTING INFORMATION\n';
  md += '| Field | Value |\n';
  md += '| :--- | :--- |\n';
  md += `| Grantee | ${dash(vest.grantee)} |\n`;
  md += `| Grantor | ${dash(vest.grantor)} |\n`;
  md += `| Deed Date | ${dash(vest.deed_date)} |\n`;
  md += `| Recorded Date | ${dash(vest.recorded_date)} |\n`;
  md += `| Instrument/Book/Page | ${dash(vest.instrument_book_page)} |\n`;
  md += `| Consideration | ${dash(vest.consideration_amount)} |\n`;
  md += `| Sale Price | ${dash(vest.sale_price)} |\n`;
  md += `| Deed Type | ${dash(vest.deed_type)} |\n`;
  md += `| Probate Status | ${dash(vest.probate_status)} |\n`;
  md += `| Divorce Status | ${dash(vest.divorce_status)} |\n`;
  if (vest.notes) md += `| Notes | ${val(vest.notes)} |\n`;
  md += '\n';

  // Chain of Title
  md += '## CHAIN OF TITLE\n';
  const chain = f.chain_of_title || [];
  if (chain.length === 0) {
    md += '*No chain entries found.*\n\n';
  } else {
    chain.forEach((e, i) => {
      md += `### Entry ${i + 1}\n`;
      md += `- **Grantee**: ${dash(e.grantee)}\n`;
      md += `- **Grantor**: ${dash(e.grantor)}\n`;
      md += `- **Deed Date**: ${dash(e.deed_date)}\n`;
      md += `- **Recorded Date**: ${dash(e.recorded_date)}\n`;
      md += `- **Instrument/Book/Page**: ${dash(e.instrument_book_page)}\n`;
      md += `- **Consideration**: ${dash(e.consideration_amount)}\n`;
      md += `- **Deed Type**: ${dash(e.deed_type)}\n`;
      if (e.notes) md += `- **Notes**: ${val(e.notes)}\n`;
      md += '\n';
    });
  }

  // Mortgages
  md += '## MORTGAGES\n';
  const mortgages = f.mortgages || [];
  if (mortgages.length === 0) {
    md += '*No mortgages found.*\n\n';
  } else {
    mortgages.forEach((m, i) => {
      md += `### Mortgage ${i + 1}\n`;
      md += `- **Borrower**: ${dash(m.borrower)}\n`;
      md += `- **Lender**: ${dash(m.lender)}\n`;
      md += `- **Mortgage Amount**: ${dash(m.mortgage_amount)}\n`;
      md += `- **Mortgage Date**: ${dash(m.mortgage_date)}\n`;
      md += `- **Recorded Date**: ${dash(m.recorded_date)}\n`;
      md += `- **Book/Page/Instrument**: ${dash(m.book)} / ${dash(m.page)} / ${dash(m.instrument)}\n`;
      md += `- **Maturity Date**: ${dash(m.maturity_date)}\n`;
      md += `- **Mortgage Type**: ${dash(m.mortgage_type)}\n`;
      md += `- **Vesting Status**: ${dash(m.vesting_status)}\n`;
      md += `- **MERS**: ${m.mers === 'Yes' ? 'YES' : 'NO'}\n`;
      
      // Assignments
      const assignments = m.assignments || [];
      if (assignments.length > 0) {
        md += `#### Assignments (${assignments.length})\n`;
        assignments.forEach((a, ai) => {
          md += `- **Assignment ${ai + 1}**: ${dash(a.assignor)} → ${dash(a.assignee)} | Recorded: ${dash(a.recorded_date)} | Instrument: ${dash(a.instrument)}\n`;
        });
      }
      md += '\n';
    });
  }

  // Tax Status
  const tax = f.tax_status || {};
  md += '## TAX STATUS\n';
  md += '| Field | Value |\n';
  md += '| :--- | :--- |\n';
  md += `| Parcel ID | ${dash(tax.parcel_id)} |\n`;
  md += `| Tax Year | ${dash(tax.tax_year)} |\n`;
  md += `| Total Amount | ${dash(tax.total_amount)} |\n`;
  md += `| Status | ${dash(tax.status)} |\n`;
  md += `| Paid Date | ${dash(tax.paid_date)} |\n`;
  md += `| Delinquent Amount | ${dash(tax.delinquent_amount)} |\n\n`;

  // Associated Documents
  md += '## ASSOCIATED DOCUMENTS\n';
  const assoc = f.associated_documents || [];
  if (assoc.length === 0) {
    md += '*No associated documents found.*\n\n';
  } else {
    assoc.forEach((a, i) => {
      md += `### Document ${i + 1}: ${dash(a.document_title)}\n`;
      md += `- **Book/Inst/Page**: ${dash(a.book_instrument)} / ${dash(a.page)}\n`;
      md += `- **Dated/Recorded**: ${dash(a.dated)} / ${dash(a.recorded)}\n`;
      md += `- **Consideration**: ${dash(a.consideration)}\n`;
      md += `- **Grantor/Assignor**: ${dash(a.grantor_assignor)}\n`;
      md += `- **Grantee/Assignee**: ${dash(a.grantee_assignee)}\n`;
      if (a.notes) md += `- **Notes**: ${val(a.notes)}\n`;
      md += '\n';
    });
  }

  // Judgments/Liens
  md += '## JUDGMENTS / LIENS\n';
  const liens = f.judgments_liens || [];
  if (liens.length === 0) {
    md += '*No judgments or liens found.*\n\n';
  } else {
    liens.forEach((l, i) => {
      md += `### Judgment/Lien ${i + 1}: ${dash(l.document_title)}\n`;
      md += `- **Case #**: ${dash(l.case_number)}\n`;
      md += `- **Dated/Recorded**: ${dash(l.dated)} / ${dash(l.recorded)}\n`;
      md += `- **Amount**: ${dash(l.amount)}\n`;
      md += `- **Plaintiff**: ${dash(l.plaintiff)}\n`;
      md += `- **Defendant**: ${dash(l.defendant)}\n`;
      md += '\n';
    });
  }

  // Miscellaneous Documents
  md += '## MISCELLANEOUS DOCUMENTS\n';
  const misc = f.misc_documents || [];
  if (misc.length === 0) {
    md += '*No miscellaneous documents found.*\n\n';
  } else {
    misc.forEach((m, i) => {
      md += `### Document ${i + 1}: ${dash(m.document_title)}\n`;
      md += `- **Book/Inst/Page**: ${dash(m.book_instrument)} / ${dash(m.page)}\n`;
      md += `- **Dated/Recorded**: ${dash(m.dated)} / ${dash(m.recorded)}\n`;
      md += `- **Consideration**: ${dash(m.consideration)}\n`;
      md += `- **Grantor/Assignor**: ${dash(m.grantor_assignor)}\n`;
      md += `- **Grantee/Assignee**: ${dash(m.grantee_assignee)}\n`;
      md += '\n';
    });
  }

  // Legal Description
  md += '## LEGAL DESCRIPTION\n';
  md += `${dash(f.legal_description)}\n\n`;

  // Examiner Instructions
  if (prop.misc_info_to_examiner) {
    md += '## EXAMINER INSTRUCTIONS\n';
    md += `${val(prop.misc_info_to_examiner)}\n\n`;
  }

  // Names Searched
  md += '## NAMES SEARCHED\n';
  md += `${(f.names_searched || []).map((n) => n.toUpperCase()).join('; ') || 'NONE PROVIDED.'}\n\n`;

  // Additional Information
  const addInfo = f.additional_information || f.additional_info;
  if (addInfo) {
    md += '## ADDITIONAL INFORMATION\n';
    md += `${dash(addInfo)}\n`;
  }

  return md;
}

function generateV5Markdown(f) {
  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v).toUpperCase() : '');
  const dash = (v) => val(v) || '—';
  const formatTax = (td) => {
    if (!td || typeof td !== 'object') return '—';
    const parts = [];
    if (td.original_amount && td.original_amount !== '') parts.push(`ORIG: ${val(td.original_amount)}`);
    if (td.due_date && td.due_date !== '') parts.push(`DUE: ${val(td.due_date)}`);
    if (td.full_delinquent_amount && td.full_delinquent_amount !== '') parts.push(`DELINQ: ${val(td.full_delinquent_amount)}`);
    return parts.length > 0 ? parts.join(' | ') : '—';
  };

  let md = '# PROPERTY ABSTRACT REPORT (V5)\n\n';

  // Order Information
  const oi = f.order_info || {};
  md += '## ORDER INFORMATION\n';
  md += '| Field | Value |\n';
  md += '| :--- | :--- |\n';
  md += `| File Number | ${dash(oi.file_number)} |\n`;
  md += `| Effective Date | ${dash(oi.effective_date)} |\n`;
  md += `| Completed Date | ${dash(oi.completed_date)} |\n`;
  md += `| Property Address | **${dash(oi.property_address)}** |\n`;
  md += `| County | ${dash(oi.county)} |\n`;
  md += `| Township | ${dash(oi.township)} |\n`;
  md += `| Parcel ID(s) | ${(oi.parcel_ids || []).length > 0 ? (oi.parcel_ids || []).map((p) => dash(p)).join('; ') : '—'} |\n`;
  md += `| Assessed Value | ${dash(oi.assessed_value)} |\n`;
  md += `| Land Value | ${dash(oi.land_value)} |\n`;
  md += `| Impr. Value | ${dash(oi.improvement_value)} |\n`;
  md += `| Tax ID | ${dash(oi.tax_id)} |\n`;
  md += `| Tax Amount 1st | ${dash(oi.tax_amount_1st)} |\n`;
  md += `| Tax Amount 2nd | ${dash(oi.tax_amount_2nd)} |\n`;
  md += `| Tax Due 1st | ${dash(oi.tax_due_1st)} |\n`;
  md += `| Tax Due 2nd | ${dash(oi.tax_due_2nd)} |\n`;
  md += `| Tax Delinquent | ${formatTax(oi.tax_delinquent)} |\n`;
  md += `| Tax Paid | ${dash(oi.tax_paid)} |\n`;
  md += `| Current Vesting Owner | ${dash(oi.current_vesting_owner)} |\n\n`;

  // Chain of Title (newest to oldest)
  md += '## CHAIN OF TITLE\n';
  const chain = f.chain_of_title || [];
  if (chain.length === 0) {
    md += '*No chain entries found.*\n\n';
  } else {
    chain.forEach((e, i) => {
      md += `### Entry ${i + 1}: ${dash(e.deed_type || e.document_title)}\n`;
      md += `- **Instrument/Book/Page**: ${dash(e.instrument_book_page)}\n`;
      md += `- **Deed Date/Recorded Date**: ${dash(e.deed_date)} / ${dash(e.recorded_date)}\n`;
      md += `- **Consideration**: ${dash(e.consideration)}\n`;
      md += `- **In/Out Sale**: ${e.in_out_sale === true ? 'YES' : e.in_out_sale === false ? 'NO' : '—'}\n`;
      md += `- **Grantor(s)**: ${(e.grantors || []).map((g) => g.toUpperCase()).join('; ') || '—'}\n`;
      md += `- **Grantee(s)**: ${(e.grantees || []).map((g) => g.toUpperCase()).join('; ') || '—'}\n`;
      if (e.notes)
        md += `- **Notes**: ${e.notes.startsWith('*') ? val(e.notes) : `NOTES: ${val(e.notes)}`}\n`;
      md += '\n';
    });
  }

  // Mortgages / Deeds of Trust (oldest to newest)
  md += '## MORTGAGES / DEEDS OF TRUST\n';
  const mortgages = f.mortgages || [];
  if (mortgages.length === 0) {
    md += '*No open mortgages found.*\n\n';
  } else {
    mortgages.forEach((m, i) => {
      md += `### Mortgage ${i + 1}: ${dash(m.document_title)}\n`;
      md += `- **Book/Inst/Page**: ${dash(m.book_instrument)} / ${dash(m.page)}\n`;
      md += `- **Dated/Recorded**: ${dash(m.dated)} / ${dash(m.recorded)}\n`;
      md += `- **Consideration**: ${dash(m.consideration)}\n`;
      md += `- **Maturity Date**: ${dash(m.maturity_date)}\n`;
      md += `- **Lender**: ${dash(m.lender)} ${m.mers_number ? `(MERS# ${val(m.mers_number)})` : ''}\n`;
      md += `- **Borrower**: ${dash(m.borrower)}\n`;
      md += `- **Trustee**: ${dash(m.trustee)}\n`;
      if (m.notes) md += `- **Notes**: ${val(m.notes)}\n`;
      md += '\n';
    });
  }

  // Judgments / Liens
  md += '## JUDGMENTS / LIENS\n';
  const liens = f.judgments_liens || [];
  if (liens.length === 0) {
    md += '*No judgments or liens found.*\n\n';
  } else {
    liens.forEach((l, i) => {
      md += `### Judgment/Lien ${i + 1}: ${dash(l.document_title)}\n`;
      md += `- **Case #**: ${dash(l.case_number)}\n`;
      md += `- **Dated/Recorded**: ${dash(l.dated)} / ${dash(l.recorded)}\n`;
      md += `- **Amount**: ${dash(l.amount)}\n`;
      md += `- **Plaintiff**: ${dash(l.plaintiff)}\n`;
      md += `- **Defendant**: ${dash(l.defendant)}\n`;
      md += '\n';
    });
  }

  // Miscellaneous Documents
  md += '## MISCELLANEOUS DOCUMENTS\n';
  const misc = f.misc_documents || [];
  if (misc.length === 0) {
    md += '*No miscellaneous documents found.*\n\n';
  } else {
    misc.forEach((m, i) => {
      md += `### Document ${i + 1}: ${dash(m.document_title)}\n`;
      md += `- **Book/Inst/Page**: ${dash(m.book_instrument)} / ${dash(m.page)}\n`;
      md += `- **Dated/Recorded**: ${dash(m.dated)} / ${dash(m.recorded)}\n`;
      md += `- **Consideration**: ${dash(m.consideration)}\n`;
      md += `- **Grantor/Assignor**: ${dash(m.grantor_assignor)}\n`;
      md += `- **Grantee/Assignee**: ${dash(m.grantee_assignee)}\n`;
      if (m.notes) md += `- **Notes**: ${val(m.notes)}\n`;
      md += '\n';
    });
  }

  // Legal Description
  md += '## LEGAL DESCRIPTION\n';
  md += `${dash(f.legal_description)}\n\n`;

  // Additional Information
  if (f.additional_information) {
    md += '## ADDITIONAL INFORMATION\n';
    md += `${dash(f.additional_information)}\n\n`;
  }

  // Names Searched
  md += '## NAMES SEARCHED\n';
  md += `${(f.names_searched || []).map((n) => n.toUpperCase()).join('; ') || 'NONE PROVIDED.'}\n`;

  return md;
}

function generateV4Markdown(f) {
  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v).toUpperCase() : '');
  const dash = (v) => val(v) || '—';

  let md = '# PROPERTY ABSTRACT REPORT (HAZELWOOD V4)\n\n';

  // Order Information
  const oi = f.order_info || {};
  md += '## ORDER INFORMATION\n';
  md += '| Field | Value |\n';
  md += '| :--- | :--- |\n';
  md += `| Order Number | ${dash(oi.order_number)} |\n`;
  md += `| Effective Date | ${dash(oi.effective_date)} |\n`;
  md += `| Completed Date | ${dash(oi.completed_date)} |\n`;
  md += `| Property Address | **${dash(oi.property_address)}** |\n`;
  md += `| County | ${dash(oi.county)} |\n`;
  md += `| Township | ${dash(oi.township)} |\n`;
  md += `| Parcel ID(s) | ${(oi.parcel_ids || []).length > 0 ? (oi.parcel_ids || []).map((p) => dash(p)).join('; ') : '—'} |\n`;
  md += `| Assessed Value | ${dash(oi.assessed_value)} |\n`;
  md += `| Land Value | ${dash(oi.land_value)} |\n`;
  md += `| Impr. Value | ${dash(oi.improvement_value)} |\n`;
  md += `| Tax ID | ${dash(oi.tax_id)} |\n`;
  md += `| Tax Amount | ${dash(oi.tax_amount)} |\n`;
  md += `| Tax Due | ${dash(oi.tax_due)} |\n`;
  md += `| Tax Delinquent | ${dash(oi.tax_delinquent)} |\n`;
  md += `| Tax Paid | ${dash(oi.tax_paid)} |\n`;
  md += `| Current Vesting Owner | ${dash(oi.current_vesting_owner)} |\n\n`;

  // Vesting Information
  const vi = f.vesting_info || {};
  md += '## VESTING INFORMATION\n';
  md += '| Field | Value |\n';
  md += '| :--- | :--- |\n';
  md += `| Grantee | ${dash(vi.grantee)} |\n`;
  md += `| Grantor | ${dash(vi.grantor)} |\n`;
  md += `| Deed Date | ${dash(vi.deed_date)} |\n`;
  md += `| Recorded Date | ${dash(vi.recorded_date)} |\n`;
  md += `| Instrument/Book/Page | ${dash(vi.instrument_book_page)} |\n`;
  md += `| Deed Type | ${dash(vi.deed_type)} |\n`;
  md += `| Consideration | ${dash(vi.consideration)} |\n`;
  md += `| In/Out Sale | ${vi.in_out_sale === true ? 'YES' : vi.in_out_sale === false ? 'NO' : '—'} |\n`;
  if (vi.notes) md += `| Notes | ${val(vi.notes)} |\n`;
  md += '\n';

  // Chain of Title
  md += '## CHAIN OF TITLE\n';
  const chain = f.chain_of_title || [];
  if (chain.length === 0) {
    md += '*No chain entries found.*\n\n';
  } else {
    chain.forEach((e, i) => {
      md += `### (${i + 1}) ${dash(e.deed_type)}\n`;
      md += `- **Book/Inst/Page**: ${dash(e.instrument_book_page)} / ${dash(e.page)}\n`;
      md += `- **Dated/Recorded**: ${dash(e.deed_date)} / ${dash(e.recorded_date)}\n`;
      md += `- **Consideration**: ${dash(e.consideration)}\n`;
      md += `- **Grantor(s)**: ${(e.grantors || []).map((g) => g.toUpperCase()).join('; ') || '—'}\n`;
      md += `- **Grantee(s)**: ${(e.grantees || []).map((g) => g.toUpperCase()).join('; ') || '—'}\n`;
      if (e.notes)
        md += `- **Notes**: ${e.notes.startsWith('*') ? val(e.notes) : `NOTES: ${val(e.notes)}`}\n`;
      if (e.related_documents && e.related_documents.length > 0) {
        md += '- **Related Documents**:\n';
        e.related_documents.forEach((rd, ri) => {
          md += `  ${ri + 1}. ${dash(rd.document_type || rd)} | ${dash(rd.book_instrument || rd.book || '')} / ${dash(rd.page || '')} | ${dash(rd.recorded_date || rd.recorded || '')}\n`;
        });
      }
      md += '\n';
    });
  }

  // Mortgages
  md += '## MORTGAGES / DEEDS OF TRUST\n';
  const mortgages = f.mortgages || [];
  if (mortgages.length === 0) {
    md += '*No open mortgages found.*\n\n';
  } else {
    mortgages.forEach((m, i) => {
      md += `### Mortgage ${i + 1}: ${dash(m.document_title || m.mortgage_type)}\n`;
      md += `- **Borrower**: ${dash(m.borrower)}\n`;
      md += `- **Lender**: ${dash(m.lender)} ${m.mers === 'Yes' ? '(MERS)' : ''}\n`;
      md += `- **Amount**: ${dash(m.mortgage_amount)}\n`;
      md += `- **Mortgage Date**: ${dash(m.mortgage_date)}\n`;
      md += `- **Recorded Date**: ${dash(m.recorded_date)}\n`;
      md += `- **Book/Page/Instrument**: ${dash(m.book)} / ${dash(m.page)} / ${dash(m.instrument)}\n`;
      md += `- **Maturity Date**: ${dash(m.maturity_date)}\n`;
      md += `- **Mortgage Type**: ${dash(m.mortgage_type)}\n`;
      if (m.subordination_notes) md += `- **Subordination**: ${val(m.subordination_notes)}\n`;
      
      // Assignments
      const assignments = m.assignments || [];
      if (assignments.length > 0) {
        md += `#### Assignments (${assignments.length})\n`;
        assignments.forEach((a, ai) => {
          md += `- **${ai + 1}**: ${dash(a.assignor)} → ${dash(a.assignee)} | ${dash(a.document_type)} | ${dash(a.book)}/${dash(a.page)}/${dash(a.instrument)} | ${dash(a.recorded_date)}\n`;
        });
      }
      md += '\n';
    });
  }

  // Tax Status
  const tax = f.tax_status || {};
  md += '## TAX STATUS\n';
  md += '| Field | Value |\n';
  md += '| :--- | :--- |\n';
  md += `| Parcel ID | ${dash(tax.parcel_id)} |\n`;
  md += `| Tax Year | ${dash(tax.tax_year)} |\n`;
  md += `| Total Amount | ${dash(tax.total_amount)} |\n`;
  md += `| Status | ${dash(tax.status)} |\n`;
  md += `| Paid Date | ${dash(tax.paid_date)} |\n`;
  md += `| Delinquent Amount | ${dash(tax.delinquent_amount)} |\n`;
  
  const installments = tax.installments || [];
  if (installments.length > 0) {
    md += '\n### Installments\n';
    installments.forEach((inst, ii) => {
      md += `#### Installment ${ii + 1}\n`;
      md += `- **Number**: ${dash(inst.installment_number)}\n`;
      md += `- **Amount**: ${dash(inst.amount)}\n`;
      md += `- **Due Date**: ${dash(inst.due_date)}\n`;
      md += `- **Status**: ${dash(inst.status)}\n`;
      md += `- **Paid Date**: ${dash(inst.paid_date)}\n`;
      md += `- **Delinquent**: ${dash(inst.delinquent_amount)}\n`;
      md += `- **Penalties/Fees**: ${dash(inst.penalties_fees)}\n`;
      md += '\n';
    });
  } else {
    md += '\n';
  }

  // Associated Documents
  md += '## ASSOCIATED DOCUMENTS\n';
  const assoc = f.associated_documents || [];
  if (assoc.length === 0) {
    md += '*No associated documents found.*\n\n';
  } else {
    assoc.forEach((a, i) => {
      md += `### Document ${i + 1}: ${dash(a.document_type)}\n`;
      md += `- **Book/Inst/Page**: ${dash(a.book_instrument)} / ${dash(a.page)}\n`;
      md += `- **Dated/Recorded**: ${dash(a.dated)} / ${dash(a.recorded)}\n`;
      md += `- **Grantor/Assignor**: ${dash(a.grantor_assignor)}\n`;
      md += `- **Grantee/Assignee**: ${dash(a.grantee_assignee)}\n`;
      if (a.notes) md += `- **Notes**: ${val(a.notes)}\n`;
      md += '\n';
    });
  }

  // Judgments/Liens
  md += '## JUDGMENTS / LIENS\n';
  const liens = f.judgments_liens || [];
  if (liens.length === 0) {
    md += '*No judgments or liens found.*\n\n';
  } else {
    liens.forEach((l, i) => {
      md += `### Judgment/Lien ${i + 1}: ${dash(l.document_title)}\n`;
      md += `- **Case #**: ${dash(l.case_number)}\n`;
      md += `- **Dated/Recorded**: ${dash(l.dated)} / ${dash(l.recorded)}\n`;
      md += `- **Amount**: ${dash(l.amount)}\n`;
      md += `- **Plaintiff**: ${dash(l.plaintiff)}\n`;
      md += `- **Defendant**: ${dash(l.defendant)}\n`;
      md += '\n';
    });
  }

  // Miscellaneous Documents
  md += '## MISCELLANEOUS DOCUMENTS\n';
  const misc = f.misc_documents || [];
  if (misc.length === 0) {
    md += '*No miscellaneous documents found.*\n\n';
  } else {
    misc.forEach((m, i) => {
      md += `### Document ${i + 1}: ${dash(m.document_title)}\n`;
      md += `- **Book/Inst/Page**: ${dash(m.book_instrument)} / ${dash(m.page)}\n`;
      md += `- **Dated/Recorded**: ${dash(m.dated)} / ${dash(m.recorded)}\n`;
      md += `- **Consideration**: ${dash(m.consideration)}\n`;
      md += `- **Grantor/Assignor**: ${dash(m.grantor_assignor)}\n`;
      md += `- **Grantee/Assignee**: ${dash(m.grantee_assignee)}\n`;
      md += '\n';
    });
  }

  // Legal Description
  md += '## LEGAL DESCRIPTION\n';
  md += `${dash(f.legal_description)}\n\n`;

  // Names Searched
  md += '## NAMES SEARCHED\n';
  md += `${(f.names_searched || []).map((n) => n.toUpperCase()).join('; ') || 'NONE PROVIDED.'}\n\n`;

  // Additional Information
  if (f.additional_information) {
    md += '## ADDITIONAL INFORMATION\n';
    md += `${dash(f.additional_information)}\n`;
  }

  return md;
}

function generateV6Markdown(f) {
  const val = (v) => (v !== null && v !== undefined && v !== '' ? String(v).toUpperCase() : '');
  const dash = (v) => val(v) || '—';
  const formatTax = (td) => {
    if (!td || typeof td !== 'object') return '—';
    const parts = [];
    if (td.original_amount && td.original_amount !== '') parts.push(`ORIG: ${val(td.original_amount)}`);
    if (td.due_date && td.due_date !== '') parts.push(`DUE: ${val(td.due_date)}`);
    if (td.full_delinquent_amount && td.full_delinquent_amount !== '') parts.push(`DELINQ: ${val(td.full_delinquent_amount)}`);
    return parts.length > 0 ? parts.join(' | ') : '—';
  };

  let md = '# PROPERTY ABSTRACT REPORT (V6)\n\n';

  // Order Information (V6: no completed_date, add assessor_owner, assessor_description, acreage)
  const oi = f.order_info || {};
  md += '## ORDER INFORMATION\n';
  md += '| Field | Value |\n';
  md += '| :--- | :--- |\n';
  md += `| File Number | ${dash(oi.file_number)} |\n`;
  md += `| Effective Date | ${dash(oi.effective_date)} |\n`;
  md += `| Property Address | **${dash(oi.property_address)}** |\n`;
  md += `| County | ${dash(oi.county)} |\n`;
  md += `| Township | ${dash(oi.township)} |\n`;
  md += `| Parcel ID(s) | ${(oi.parcel_ids || []).length > 0 ? (oi.parcel_ids || []).map((p) => dash(p)).join('; ') : '—'} |\n`;
  md += `| Assessed Value | ${dash(oi.assessed_value)} |\n`;
  md += `| Land Value | ${dash(oi.land_value)} |\n`;
  md += `| Impr. Value | ${dash(oi.improvement_value)} |\n`;
  md += `| Tax ID | ${dash(oi.tax_id)} |\n`;
  md += `| Tax Amount | ${dash(oi.tax_amount)} |\n`;
  md += `| Tax Due | ${dash(oi.tax_due)} |\n`;
  md += `| Tax Delinquent | ${formatTax(oi.tax_delinquent)} |\n`;
  md += `| Tax Paid | ${dash(oi.tax_paid)} |\n`;
  md += `| Acreage | ${dash(oi.acreage)} |\n`;
  md += `| Current Vesting Owner | ${dash(oi.current_vesting_owner)} |\n`;
  md += `| Assessor Owner | ${dash(oi.assessor_owner)} |\n`;
  md += `| Assessor Description | ${dash(oi.assessor_description)} |\n\n`;

  // Chain of Title (newest to oldest)
  md += '## CHAIN OF TITLE\n';
  const chain = f.chain_of_title || [];
  if (chain.length === 0) {
    md += '*No chain entries found.*\n\n';
  } else {
    chain.forEach((e, i) => {
      md += `### Entry ${i + 1}: ${dash(e.deed_type || e.document_title)}\n`;
      md += `- **Book/Inst/Page**: ${dash(e.instrument_book_page)} / ${dash(e.page)}\n`;
      md += `- **Dated/Recorded**: ${dash(e.deed_date)} / ${dash(e.recorded_date)}\n`;
      md += `- **Consideration**: ${dash(e.consideration)}\n`;
      md += `- **In/Out Sale**: ${e.in_out_sale === true ? 'YES' : e.in_out_sale === false ? 'NO' : '—'}\n`;
      md += `- **Grantor(s)**: ${(e.grantors || []).map((g) => g.toUpperCase()).join('; ') || '—'}\n`;
      md += `- **Grantee(s)**: ${(e.grantees || []).map((g) => g.toUpperCase()).join('; ') || '—'}\n`;
      if (e.notes)
        md += `- **Notes**: ${e.notes.startsWith('*') ? val(e.notes) : `NOTES: ${val(e.notes)}`}\n`;
      md += '\n';
    });
  }

  // Mortgages / Deeds of Trust (V6: add loan_number, min, status)
  md += '## MORTGAGES / DEEDS OF TRUST\n';
  const mortgages = f.mortgages || [];
  if (mortgages.length === 0) {
    md += '*No open mortgages found.*\n\n';
  } else {
    mortgages.forEach((m, i) => {
      md += `### Mortgage ${i + 1}: ${dash(m.document_title)}\n`;
      md += `- **Book/Inst/Page**: ${dash(m.book_instrument)} / ${dash(m.page)}\n`;
      md += `- **Dated/Recorded**: ${dash(m.dated)} / ${dash(m.recorded)}\n`;
      md += `- **Consideration**: ${dash(m.consideration)}\n`;
      md += `- **Maturity Date**: ${dash(m.maturity_date)}\n`;
      md += `- **Lender**: ${dash(m.lender)}\n`;
      md += `- **Borrower**: ${dash(m.borrower)}\n`;
      md += `- **Trustee**: ${dash(m.trustee)}\n`;
      md += `- **Loan Number**: ${dash(m.loan_number)}\n`;
      md += `- **MIN**: ${dash(m.min)}\n`;
      md += `- **Open/Closed Ended**: ${dash(m.open_closed_ended)}\n`;
      md += `- **Status**: ${dash(m.status)}\n`;
      md += '\n';
    });
  }

  // Judgments / Liens (V6: add interest, costs, attorneys_fees, status)
  md += '## JUDGMENTS / LIENS\n';
  const liens = f.judgments_liens || [];
  if (liens.length === 0) {
    md += '*No judgments or liens found.*\n\n';
  } else {
    liens.forEach((l, i) => {
      md += `### Judgment/Lien ${i + 1}: ${dash(l.document_title)}\n`;
      md += `- **Case #**: ${dash(l.case_number)}\n`;
      md += `- **Dated/Recorded**: ${dash(l.dated)} / ${dash(l.recorded)}\n`;
      md += `- **Amount**: ${dash(l.amount)}\n`;
      md += `- **Interest**: ${dash(l.interest)}\n`;
      md += `- **Costs**: ${dash(l.costs)}\n`;
      md += `- **Attorney's Fees**: ${dash(l.attorneys_fees)}\n`;
      md += `- **Status**: ${dash(l.status)}\n`;
      md += `- **Plaintiff**: ${dash(l.plaintiff)}\n`;
      md += `- **Defendant**: ${dash(l.defendant)}\n`;
      md += '\n';
    });
  }

  // Miscellaneous Documents (V6: add area_or_width, notes)
  md += '## MISCELLANEOUS DOCUMENTS\n';
  const misc = f.misc_documents || [];
  if (misc.length === 0) {
    md += '*No miscellaneous documents found.*\n\n';
  } else {
    misc.forEach((m, i) => {
      md += `### Document ${i + 1}: ${dash(m.document_title)}\n`;
      md += `- **Book/Inst/Page**: ${dash(m.book_instrument)} / ${dash(m.page)}\n`;
      md += `- **Dated/Recorded**: ${dash(m.dated)} / ${dash(m.recorded)}\n`;
      md += `- **Consideration**: ${dash(m.consideration)}\n`;
      md += `- **Area/Width**: ${dash(m.area_or_width)}\n`;
      md += `- **Grantor/Assignor**: ${dash(m.grantor_assignor)}\n`;
      md += `- **Grantee/Assignee**: ${dash(m.grantee_assignee)}\n`;
      if (m.notes) md += `- **Notes**: ${val(m.notes)}\n`;
      md += '\n';
    });
  }

  // Legal Description
  md += '## LEGAL DESCRIPTION\n';
  md += `${dash(f.legal_description)}\n\n`;

  // Additional Information (V6: include document_accounting)
  md += '## ADDITIONAL INFORMATION\n';
  const addInfo = f.additional_information;
  if (Array.isArray(addInfo) && addInfo.length > 0) {
    addInfo.forEach((item, idx) => {
      if (typeof item === 'string') {
        md += `${idx + 1}. ${val(item)}\n`;
      } else {
        md += `${idx + 1}. ${dash(item.book_instrument)} ${dash(item.label || item.document_type)}\n`;
      }
    });
  } else if (addInfo) {
    md += `${dash(addInfo)}\n`;
  } else {
    md += '*No additional information.*\n';
  }

  const docAccounting = f.document_accounting || [];
  if (docAccounting.length > 0) {
    md += '\n### PDF DOCUMENT ACCOUNTING\n';
    docAccounting.forEach((item, idx) => {
      md += `${idx + 1}. PAGE(S) ${dash(item.page_range)}: ${dash(item.document_label)}\n`;
    });
  }
  md += '\n';

  // Names Searched
  md += '## NAMES SEARCHED\n';
  md += `${(f.names_searched || []).map((n) => n.toUpperCase()).join('; ') || 'NONE PROVIDED.'}\n`;

  return md;
}

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

module.exports = { generateMarkdown };
