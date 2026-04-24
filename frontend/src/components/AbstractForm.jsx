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

function Field({ label, path, fields, aiFlags, alternatives, onChange, onFlagChange, multiline, placeholder }) {
  const value = getNestedValue(fields, path);
  return (
    <FieldInput
      label={label}
      fieldKey={path}
      value={value}
      aiFlags={aiFlags}
      alternatives={alternatives}
      onChange={onChange}
      onFlagChange={onFlagChange}
      textarea={multiline}
      placeholder={placeholder}
    />
  );
}

export default function AbstractForm({ fields, aiFlags, onFieldChange, onFlagChange }) {
  const chain = fields?.chain_of_title || [];
  const mortgages = fields?.mortgages || [];
  const assocDocs = fields?.associated_documents || [];
  const judgments = fields?.judgments_liens || [];
  const miscDocs = fields?.misc_documents || [];
  const alternatives = fields?.alternatives || {};

  const fieldProps = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };

  return (
    <div>
      {/* ORDER INFORMATION */}
      <Section title="Order Information">
        <div style={s.grid3}>
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
        
        <div className="alert alert-info" style={{ marginBottom: 16, fontSize: 13 }}>
          <strong>Tax Installments:</strong> Capture both 1st and 2nd installments if present.
        </div>

        <div style={s.grid4}>
          <Field label="Tax Amount (1st)" path="order_info.tax_amount_1st" placeholder="0.00" {...fieldProps} />
          <Field label="Due Date (1st)" path="order_info.tax_due_1st" placeholder="MM/DD/YYYY" {...fieldProps} />
          <Field label="Tax Amount (2nd)" path="order_info.tax_amount_2nd" placeholder="0.00" {...fieldProps} />
          <Field label="Due Date (2nd)" path="order_info.tax_due_2nd" placeholder="MM/DD/YYYY" {...fieldProps} />
        </div>

        <div style={s.grid3}>
          <Field label="Tax Delinquent" path="order_info.tax_delinquent" {...fieldProps} />
          <Field label="Tax Paid" path="order_info.tax_paid" {...fieldProps} />
          <Field label="Marital Status" path="order_info.marital_status" {...fieldProps} />
        </div>

        <div style={s.grid2}>
          <Field label="Excise Tax" path="order_info.excise_tax" {...fieldProps} />
          <Field label="Search Depth" path="order_info.search_depth" {...fieldProps} />
        </div>
        
        <Field label="Current Vesting Owner" path="order_info.current_vesting_owner" {...fieldProps} />
      </Section>

      {/* CHAIN OF TITLE */}
      <Section title={`Chain of Title (${chain.length} entries)`}>
        {chain.map((_, i) => (
          <ChainEntry key={i} index={i} chain={chain} fields={fields} aiFlags={aiFlags} alternatives={alternatives}
            onFieldChange={onFieldChange} onFlagChange={onFlagChange} />
        ))}
        {chain.length === 0 && <div className="text-muted text-sm italic p-4 border rounded bg-gray-50">No entries detected by AI.</div>}
      </Section>

      {/* MORTGAGES */}
      <Section title={`Mortgages / Deeds of Trust (${mortgages.length})`}>
        {mortgages.map((_, i) => (
          <MortgageEntry key={i} index={i} mortgages={mortgages} fields={fields} aiFlags={aiFlags} alternatives={alternatives}
            onFieldChange={onFieldChange} onFlagChange={onFlagChange} />
        ))}
        {mortgages.length === 0 && <div className="text-muted text-sm italic p-4 border rounded bg-gray-50">No mortgages detected.</div>}
      </Section>

      {/* ASSOCIATED DOCUMENTS */}
      <Section title={`Associated Documents (${assocDocs.length})`}>
        {assocDocs.map((_, i) => (
          <AssocDocEntry key={i} index={i} docs={assocDocs} fields={fields} aiFlags={aiFlags} alternatives={alternatives}
            onFieldChange={onFieldChange} onFlagChange={onFlagChange} />
        ))}
        {assocDocs.length === 0 && <div className="text-muted text-sm italic p-4 border rounded bg-gray-50">No assignments or associated docs.</div>}
      </Section>

      {/* JUDGMENTS/LIENS */}
      <Section title={`Judgments / Liens (${judgments.length})`}>
        {judgments.map((_, i) => (
          <JudgmentEntry key={i} index={i} judgments={judgments} fields={fields} aiFlags={aiFlags} alternatives={alternatives}
            onFieldChange={onFieldChange} onFlagChange={onFlagChange} />
        ))}
        {judgments.length === 0 && <div className="text-muted text-sm italic p-4 border rounded bg-gray-50">No judgments found.</div>}
      </Section>

      {/* MISCELLANEOUS */}
      <Section title={`Miscellaneous Documents (${miscDocs.length})`}>
        {miscDocs.map((_, i) => (
          <MiscEntry key={i} index={i} misc={miscDocs} fields={fields} aiFlags={aiFlags} alternatives={alternatives}
            onFieldChange={onFieldChange} onFlagChange={onFlagChange} />
        ))}
      </Section>

      {/* LEGAL / ADDITIONAL */}
      <Section title="Final Details">
        <Field label="Legal Description" path="legal_description" multiline {...fieldProps} />
        <Field label="Names Searched" path="names_searched" multiline placeholder="Separate names with semicolons" 
          onChange={(k, v) => onFieldChange(k, v.split(';').map(x => x.trim()).filter(Boolean))} 
          {...fieldProps} 
          value={Array.isArray(fields?.names_searched) ? fields.names_searched.join('; ') : fields?.names_searched}
        />
        <Field label="Additional Information" path="additional_information" multiline {...fieldProps} />
      </Section>
    </div>
  );
}

function ChainEntry({ index, chain, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
  const entry = chain[index] || {};
  const base = `chain_of_title.${index}`;
  const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };

  return (
    <div style={s.entryCard}>
      <div style={s.entryNum}>Entry {index + 1}</div>
      <div style={s.grid3}>
        <Field label="Document Title" path={`${base}.document_title`} {...fp} />
        <Field label="Book/Instrument" path={`${base}.book_instrument`} {...fp} />
        <Field label="Page" path={`${base}.page`} {...fp} />
      </div>
      <div style={s.grid4}>
        <Field label="Dated" path={`${base}.dated`} placeholder="MM/DD/YYYY" {...fp} />
        <Field label="Recorded" path={`${base}.recorded`} placeholder="MM/DD/YYYY" {...fp} />
        <Field label="Consideration" path={`${base}.consideration`} placeholder="0.00" {...fp} />
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#4a5568', textTransform: 'uppercase', marginBottom: '8px' }}>In/Out Sale?</div>
          <label style={s.checkbox}>
            <input type="checkbox" checked={!!entry.in_out_sale}
              onChange={e => onFieldChange(`${base}.in_out_sale`, e.target.checked)} />
            Out of Family
          </label>
        </div>
      </div>
      <Field label="Grantor(s)" path={`${base}.grantors`}
        placeholder="Separate multiple names with semicolons"
        onChange={(k, v) => onFieldChange(k, v.split(';').map(x => x.trim()).filter(Boolean))}
        {...fp} 
        value={Array.isArray(entry.grantors) ? entry.grantors.join('; ') : entry.grantors}
      />
      <Field label="Grantee(s)" path={`${base}.grantees`}
        placeholder="Separate multiple names with semicolons"
        onChange={(k, v) => onFieldChange(k, v.split(';').map(x => x.trim()).filter(Boolean))}
        {...fp}
        value={Array.isArray(entry.grantees) ? entry.grantees.join('; ') : entry.grantees}
      />
      <Field label="Notes" path={`${base}.notes`} placeholder="*Asterisk notes" {...fp} />
    </div>
  );
}

function MortgageEntry({ index, mortgages, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
  const entry = mortgages[index] || {};
  const base = `mortgages.${index}`;
  const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };

  return (
    <div style={s.entryCard}>
      <div style={s.entryNum}>Mortgage {index + 1}</div>
      <div style={s.grid3}>
        <Field label="Document Title" path={`${base}.document_title`} {...fp} />
        <Field label="Book/Instrument" path={`${base}.book_instrument`} {...fp} />
        <Field label="Page" path={`${base}.page`} {...fp} />
      </div>
      <div style={s.grid4}>
        <Field label="Dated" path={`${base}.dated`} placeholder="MM/DD/YYYY" {...fp} />
        <Field label="Recorded" path={`${base}.recorded`} placeholder="MM/DD/YYYY" {...fp} />
        <Field label="Consideration" path={`${base}.consideration`} {...fp} />
        <Field label="Maturity Date" path={`${base}.maturity_date`} placeholder="MM/DD/YYYY" {...fp} />
      </div>
      <Field label="Lender (include MERS# if present)" path={`${base}.lender`} {...fp} />
      <div style={s.grid2}>
        <Field label="Borrower" path={`${base}.borrower`} {...fp} />
        <Field label="Trustee" path={`${base}.trustee`} {...fp} />
      </div>
      <Field label="Notes" path={`${base}.notes`} {...fp} />
    </div>
  );
}

function AssocDocEntry({ index, docs, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
  const base = `associated_documents.${index}`;
  const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };

  return (
    <div style={s.entryCard}>
      <div style={s.entryNum}>Associated Document {index + 1}</div>
      <div style={s.grid3}>
        <Field label="Document Title" path={`${base}.document_title`} {...fp} />
        <Field label="Book/Instrument" path={`${base}.book_instrument`} {...fp} />
        <Field label="Page" path={`${base}.page`} {...fp} />
      </div>
      <div style={s.grid3}>
        <Field label="Dated" path={`${base}.dated`} placeholder="MM/DD/YYYY" {...fp} />
        <Field label="Recorded" path={`${base}.recorded`} placeholder="MM/DD/YYYY" {...fp} />
        <Field label="Consideration" path={`${base}.consideration`} {...fp} />
      </div>
      <div style={s.grid2}>
        <Field label="Grantor/Assignor" path={`${base}.grantor_assignor`} {...fp} />
        <Field label="Grantee/Assignee" path={`${base}.grantee_assignee`} {...fp} />
      </div>
      <Field label="Notes" path={`${base}.notes`} {...fp} />
    </div>
  );
}

function JudgmentEntry({ index, judgments, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
  const base = `judgments_liens.${index}`;
  const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };

  return (
    <div style={s.entryCard}>
      <div style={s.entryNum}>Judgment/Lien {index + 1}</div>
      <div style={s.grid3}>
        <Field label="Document Title" path={`${base}.document_title`} {...fp} />
        <Field label="Book/Instrument" path={`${base}.book_instrument`} {...fp} />
        <Field label="Page" path={`${base}.page`} {...fp} />
      </div>
      <div style={s.grid4}>
        <Field label="Dated" path={`${base}.dated`} {...fp} />
        <Field label="Recorded" path={`${base}.recorded`} {...fp} />
        <Field label="Case #" path={`${base}.case_number`} {...fp} />
        <Field label="Amount" path={`${base}.amount`} {...fp} />
      </div>
      <div style={s.grid2}>
        <Field label="Plaintiff" path={`${base}.plaintiff`} {...fp} />
        <Field label="Defendant" path={`${base}.defendant`} {...fp} />
      </div>
    </div>
  );
}

function MiscEntry({ index, misc, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
  const base = `misc_documents.${index}`;
  const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };

  return (
    <div style={s.entryCard}>
      <div style={s.entryNum}>Misc Document {index + 1}</div>
      <div style={s.grid3}>
        <Field label="Document Title" path={`${base}.document_title`} {...fp} />
        <Field label="Book/Instrument" path={`${base}.book_instrument`} {...fp} />
        <Field label="Page" path={`${base}.page`} {...fp} />
      </div>
      <div style={s.grid3}>
        <Field label="Dated" path={`${base}.dated`} {...fp} />
        <Field label="Recorded" path={`${base}.recorded`} {...fp} />
        <Field label="Consideration" path={`${base}.consideration`} {...fp} />
      </div>
      <div style={s.grid2}>
        <Field label="Grantor/Assignor" path={`${base}.grantor_assignor`} {...fp} />
        <Field label="Grantee/Assignee" path={`${base}.grantee_assignee`} {...fp} />
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
