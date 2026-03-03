import FieldInput from './FieldInput';

const s = {
  section: { marginBottom: '28px' },
  sectionHeader: {
    fontSize: '13px', fontWeight: '700', color: '#1a365d', textTransform: 'uppercase',
    letterSpacing: '0.08em', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' },
  grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 16px' },
  entryCard: { border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '12px', background: '#fafbfc' },
  entryNum: { fontSize: '12px', fontWeight: '700', color: '#4a5568', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  checkbox: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#2d3748', marginTop: '4px', cursor: 'pointer' },
};

function Section({ title, children }) {
  return (
    <div style={s.section}>
      <div style={s.sectionHeader}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, path, fields, aiFlags, onChange, onFlagChange, multiline, placeholder }) {
  // Resolve nested path like "order_info.property_address"
  const value = getNestedValue(fields, path);
  return (
    <FieldInput
      label={label}
      fieldKey={path}
      value={value}
      aiFlags={aiFlags}
      onChange={(key, val) => onChange(key, val)}
      onFlagChange={onFlagChange}
      multiline={multiline}
      placeholder={placeholder}
    />
  );
}

export default function AbstractForm({ fields, aiFlags, onFieldChange, onFlagChange }) {
  const oi = fields?.order_info || {};
  const chain = fields?.chain_of_title || [];
  const mortgages = fields?.mortgages || [];
  const assocDocs = fields?.associated_documents || [];
  const judgments = fields?.judgments_liens || [];
  const miscDocs = fields?.misc_documents || [];

  const fieldProps = { fields, aiFlags, onChange: onFieldChange, onFlagChange };

  return (
    <div>
      {/* ORDER INFORMATION */}
      <Section title="Order Information">
        <div style={s.grid4}>
          <Field label="File Number" path="order_info.file_number" {...fieldProps} />
          <Field label="Effective Date" path="order_info.effective_date" placeholder="MM/DD/YYYY" {...fieldProps} />
          <Field label="Completed Date" path="order_info.completed_date" placeholder="MM/DD/YYYY" {...fieldProps} />
        </div>
        <Field label="Property Address" path="order_info.property_address" {...fieldProps} />
        <div style={s.grid3}>
          <Field label="County" path="order_info.county" {...fieldProps} />
          <Field label="Township" path="order_info.township" {...fieldProps} />
          <Field label="Parcel ID" path="order_info.parcel_id" {...fieldProps} />
        </div>
        <div style={s.grid4}>
          <Field label="Assessed Value" path="order_info.assessed_value" placeholder="0.00" {...fieldProps} />
          <Field label="Land Value" path="order_info.land_value" placeholder="0.00" {...fieldProps} />
          <Field label="Improvement Value" path="order_info.improvement_value" placeholder="0.00" {...fieldProps} />
          <Field label="Tax ID" path="order_info.tax_id" {...fieldProps} />
        </div>
        <div style={s.grid4}>
          <Field label="Tax Amount" path="order_info.tax_amount" {...fieldProps} />
          <Field label="Due Date(s)" path="order_info.tax_due" {...fieldProps} />
          <Field label="Delinquent" path="order_info.tax_delinquent" {...fieldProps} />
          <Field label="Paid" path="order_info.tax_paid" {...fieldProps} />
        </div>
        <Field label="Current Vesting Owner" path="order_info.current_vesting_owner" {...fieldProps} />
      </Section>

      {/* CHAIN OF TITLE */}
      <Section title={`Chain of Title (${chain.length} entries)`}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <ChainEntry key={i} index={i} chain={chain} fields={fields} aiFlags={aiFlags}
            onFieldChange={onFieldChange} onFlagChange={onFlagChange} />
        ))}
      </Section>

      {/* MORTGAGES */}
      <Section title="Mortgages / Deeds of Trust">
        {(mortgages.length > 0 ? mortgages : [{}]).map((_, i) => (
          <MortgageEntry key={i} index={i} mortgages={mortgages} fields={fields} aiFlags={aiFlags}
            onFieldChange={onFieldChange} onFlagChange={onFlagChange} />
        ))}
      </Section>

      {/* ASSOCIATED DOCUMENTS */}
      <Section title="Associated Documents">
        {[0, 1, 2].map(i => (
          <AssocDocEntry key={i} index={i} docs={assocDocs} fields={fields} aiFlags={aiFlags}
            onFieldChange={onFieldChange} onFlagChange={onFlagChange} />
        ))}
      </Section>

      {/* JUDGMENTS/LIENS */}
      <Section title="Judgments / Liens">
        {[0, 1, 2].map(i => (
          <JudgmentEntry key={i} index={i} judgments={judgments} fields={fields} aiFlags={aiFlags}
            onFieldChange={onFieldChange} onFlagChange={onFlagChange} />
        ))}
      </Section>

      {/* MISCELLANEOUS */}
      <Section title="Miscellaneous Documents">
        {[0, 1, 2].map(i => (
          <MiscEntry key={i} index={i} misc={miscDocs} fields={fields} aiFlags={aiFlags}
            onFieldChange={onFieldChange} onFlagChange={onFlagChange} />
        ))}
      </Section>

      {/* LEGAL / ADDITIONAL */}
      <Section title="Additional Information">
        <Field label="Legal Description" path="legal_description" multiline {...fieldProps} />
        <Field label="Names Searched" path="names_searched" multiline {...fieldProps} />
        <Field label="Additional Information" path="additional_information" multiline {...fieldProps} />
      </Section>
    </div>
  );
}

function ChainEntry({ index, chain, fields, aiFlags, onFieldChange, onFlagChange }) {
  const entry = chain[index] || {};
  const base = `chain_of_title.${index}`;
  const fp = { fields: { [base]: entry, ...fields }, aiFlags, onChange: (path, val) => onFieldChange(`chain_of_title.${index}.${path.split('.').pop()}`, val), onFlagChange };

  return (
    <div style={s.entryCard}>
      <div style={s.entryNum}>Entry {index + 1}</div>
      <div style={s.grid3}>
        <FieldInput label="Document Title" fieldKey={`${base}.document_title`} value={entry.document_title} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`chain_of_title.${index}.document_title`, v)}
          onFlagChange={onFlagChange} />
        <FieldInput label="Book/Instrument" fieldKey={`${base}.book_instrument`} value={entry.book_instrument} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`chain_of_title.${index}.book_instrument`, v)}
          onFlagChange={onFlagChange} />
        <FieldInput label="Page" fieldKey={`${base}.page`} value={entry.page} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`chain_of_title.${index}.page`, v)}
          onFlagChange={onFlagChange} />
      </div>
      <div style={s.grid4}>
        <FieldInput label="Dated" fieldKey={`${base}.dated`} value={entry.dated} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`chain_of_title.${index}.dated`, v)}
          onFlagChange={onFlagChange} placeholder="MM/DD/YYYY" />
        <FieldInput label="Recorded" fieldKey={`${base}.recorded`} value={entry.recorded} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`chain_of_title.${index}.recorded`, v)}
          onFlagChange={onFlagChange} placeholder="MM/DD/YYYY" />
        <FieldInput label="Consideration" fieldKey={`${base}.consideration`} value={entry.consideration} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`chain_of_title.${index}.consideration`, v)}
          onFlagChange={onFlagChange} placeholder="0.00" />
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#4a5568', textTransform: 'uppercase', marginBottom: '8px' }}>In/Out Sale?</div>
          <label style={s.checkbox}>
            <input type="checkbox" checked={!!entry.in_out_sale}
              onChange={e => onFieldChange(`chain_of_title.${index}.in_out_sale`, e.target.checked)} />
            Out of Family
          </label>
        </div>
      </div>
      <FieldInput label="Grantor(s)" fieldKey={`${base}.grantors`}
        value={Array.isArray(entry.grantors) ? entry.grantors.join('; ') : entry.grantors || ''}
        aiFlags={aiFlags}
        onChange={(k, v) => onFieldChange(`chain_of_title.${index}.grantors`, v.split(';').map(x => x.trim()).filter(Boolean))}
        onFlagChange={onFlagChange} placeholder="Separate multiple names with semicolons" />
      <FieldInput label="Grantee(s)" fieldKey={`${base}.grantees`}
        value={Array.isArray(entry.grantees) ? entry.grantees.join('; ') : entry.grantees || ''}
        aiFlags={aiFlags}
        onChange={(k, v) => onFieldChange(`chain_of_title.${index}.grantees`, v.split(';').map(x => x.trim()).filter(Boolean))}
        onFlagChange={onFlagChange} placeholder="Separate multiple names with semicolons" />
      <FieldInput label="Notes" fieldKey={`${base}.notes`} value={entry.notes} aiFlags={aiFlags}
        onChange={(k, v) => onFieldChange(`chain_of_title.${index}.notes`, v)}
        onFlagChange={onFlagChange} placeholder="*Asterisk notes, e.g. *FORECLOSED DOT 501/450" />
    </div>
  );
}

function MortgageEntry({ index, mortgages, aiFlags, onFieldChange, onFlagChange }) {
  const entry = mortgages[index] || {};
  const base = `mortgages.${index}`;
  return (
    <div style={s.entryCard}>
      <div style={s.entryNum}>Mortgage {index + 1}</div>
      <div style={s.grid3}>
        <FieldInput label="Document Title" fieldKey={`${base}.document_title`} value={entry.document_title} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`mortgages.${index}.document_title`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Book/Instrument" fieldKey={`${base}.book_instrument`} value={entry.book_instrument} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`mortgages.${index}.book_instrument`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Page" fieldKey={`${base}.page`} value={entry.page} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`mortgages.${index}.page`, v)} onFlagChange={onFlagChange} />
      </div>
      <div style={s.grid4}>
        <FieldInput label="Dated" fieldKey={`${base}.dated`} value={entry.dated} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`mortgages.${index}.dated`, v)} onFlagChange={onFlagChange} placeholder="MM/DD/YYYY" />
        <FieldInput label="Recorded" fieldKey={`${base}.recorded`} value={entry.recorded} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`mortgages.${index}.recorded`, v)} onFlagChange={onFlagChange} placeholder="MM/DD/YYYY" />
        <FieldInput label="Consideration" fieldKey={`${base}.consideration`} value={entry.consideration} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`mortgages.${index}.consideration`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Maturity Date" fieldKey={`${base}.maturity_date`} value={entry.maturity_date} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`mortgages.${index}.maturity_date`, v)} onFlagChange={onFlagChange} placeholder="MM/DD/YYYY" />
      </div>
      <FieldInput label="Lender (include MERS# if present)" fieldKey={`${base}.lender`} value={entry.lender} aiFlags={aiFlags}
        onChange={(k, v) => onFieldChange(`mortgages.${index}.lender`, v)} onFlagChange={onFlagChange} />
      <div style={s.grid2}>
        <FieldInput label="Borrower" fieldKey={`${base}.borrower`} value={entry.borrower} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`mortgages.${index}.borrower`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Trustee" fieldKey={`${base}.trustee`} value={entry.trustee} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`mortgages.${index}.trustee`, v)} onFlagChange={onFlagChange} />
      </div>
    </div>
  );
}

function AssocDocEntry({ index, docs, aiFlags, onFieldChange, onFlagChange }) {
  const entry = docs[index] || {};
  const base = `associated_documents.${index}`;
  return (
    <div style={s.entryCard}>
      <div style={s.entryNum}>Document {index + 1}</div>
      <div style={s.grid3}>
        <FieldInput label="Document Title" fieldKey={`${base}.document_title`} value={entry.document_title} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`associated_documents.${index}.document_title`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Book/Instrument" fieldKey={`${base}.book_instrument`} value={entry.book_instrument} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`associated_documents.${index}.book_instrument`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Page" fieldKey={`${base}.page`} value={entry.page} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`associated_documents.${index}.page`, v)} onFlagChange={onFlagChange} />
      </div>
      <div style={s.grid3}>
        <FieldInput label="Dated" fieldKey={`${base}.dated`} value={entry.dated} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`associated_documents.${index}.dated`, v)} onFlagChange={onFlagChange} placeholder="MM/DD/YYYY" />
        <FieldInput label="Recorded" fieldKey={`${base}.recorded`} value={entry.recorded} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`associated_documents.${index}.recorded`, v)} onFlagChange={onFlagChange} placeholder="MM/DD/YYYY" />
        <FieldInput label="Consideration" fieldKey={`${base}.consideration`} value={entry.consideration} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`associated_documents.${index}.consideration`, v)} onFlagChange={onFlagChange} />
      </div>
      <div style={s.grid2}>
        <FieldInput label="Grantor/Assignor" fieldKey={`${base}.grantor_assignor`} value={entry.grantor_assignor} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`associated_documents.${index}.grantor_assignor`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Grantee/Assignee" fieldKey={`${base}.grantee_assignee`} value={entry.grantee_assignee} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`associated_documents.${index}.grantee_assignee`, v)} onFlagChange={onFlagChange} />
      </div>
    </div>
  );
}

function JudgmentEntry({ index, judgments, aiFlags, onFieldChange, onFlagChange }) {
  const entry = judgments[index] || {};
  const base = `judgments_liens.${index}`;
  return (
    <div style={s.entryCard}>
      <div style={s.entryNum}>Judgment/Lien {index + 1}</div>
      <div style={s.grid3}>
        <FieldInput label="Document Title" fieldKey={`${base}.document_title`} value={entry.document_title} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`judgments_liens.${index}.document_title`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Book/Instrument" fieldKey={`${base}.book_instrument`} value={entry.book_instrument} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`judgments_liens.${index}.book_instrument`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Page" fieldKey={`${base}.page`} value={entry.page} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`judgments_liens.${index}.page`, v)} onFlagChange={onFlagChange} />
      </div>
      <div style={s.grid4}>
        <FieldInput label="Dated" fieldKey={`${base}.dated`} value={entry.dated} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`judgments_liens.${index}.dated`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Recorded" fieldKey={`${base}.recorded`} value={entry.recorded} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`judgments_liens.${index}.recorded`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Case #" fieldKey={`${base}.case_number`} value={entry.case_number} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`judgments_liens.${index}.case_number`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Amount" fieldKey={`${base}.amount`} value={entry.amount} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`judgments_liens.${index}.amount`, v)} onFlagChange={onFlagChange} />
      </div>
      <div style={s.grid2}>
        <FieldInput label="Plaintiff" fieldKey={`${base}.plaintiff`} value={entry.plaintiff} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`judgments_liens.${index}.plaintiff`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Defendant" fieldKey={`${base}.defendant`} value={entry.defendant} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`judgments_liens.${index}.defendant`, v)} onFlagChange={onFlagChange} />
      </div>
    </div>
  );
}

function MiscEntry({ index, misc, aiFlags, onFieldChange, onFlagChange }) {
  const entry = misc[index] || {};
  const base = `misc_documents.${index}`;
  return (
    <div style={s.entryCard}>
      <div style={s.entryNum}>Document {index + 1}</div>
      <div style={s.grid3}>
        <FieldInput label="Document Title" fieldKey={`${base}.document_title`} value={entry.document_title} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`misc_documents.${index}.document_title`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Book/Instrument" fieldKey={`${base}.book_instrument`} value={entry.book_instrument} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`misc_documents.${index}.book_instrument`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Page" fieldKey={`${base}.page`} value={entry.page} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`misc_documents.${index}.page`, v)} onFlagChange={onFlagChange} />
      </div>
      <div style={s.grid3}>
        <FieldInput label="Dated" fieldKey={`${base}.dated`} value={entry.dated} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`misc_documents.${index}.dated`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Recorded" fieldKey={`${base}.recorded`} value={entry.recorded} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`misc_documents.${index}.recorded`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Consideration" fieldKey={`${base}.consideration`} value={entry.consideration} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`misc_documents.${index}.consideration`, v)} onFlagChange={onFlagChange} />
      </div>
      <div style={s.grid2}>
        <FieldInput label="Grantor/Assignor" fieldKey={`${base}.grantor_assignor`} value={entry.grantor_assignor} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`misc_documents.${index}.grantor_assignor`, v)} onFlagChange={onFlagChange} />
        <FieldInput label="Grantee/Assignee" fieldKey={`${base}.grantee_assignee`} value={entry.grantee_assignee} aiFlags={aiFlags}
          onChange={(k, v) => onFieldChange(`misc_documents.${index}.grantee_assignee`, v)} onFlagChange={onFlagChange} />
      </div>
    </div>
  );
}

function getNestedValue(obj, path) {
  if (!obj || !path) return '';
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return '';
    current = current[part];
  }
  return current ?? '';
}
