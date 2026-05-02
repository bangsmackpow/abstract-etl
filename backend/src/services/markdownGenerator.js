/**
 * Given a filled fields object, produce a Markdown string.
 * Supports both V1 (Legacy) and V2 (ProTitleUSA) schemas.
 */
function generateMarkdown(fields, templateVersion = 'v1') {
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

module.exports = { generateMarkdown };
