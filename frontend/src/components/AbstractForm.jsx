import FieldInput from './FieldInput';
import { DEED_TYPES, VESTING_STATUSES, MORTGAGE_TYPES } from '../services/proTitleConstants';

// Styles object
const s = {
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  entryCard: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' },
  entryNum: { fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '12px' },
  checkbox: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' },
};

// Section helper component
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a365d', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// Field helper component
function Field({ label, path, placeholder, multiline, masterList, ...rest }) {
  const { fields, aiFlags, alternatives, onChange, onFlagChange } = rest;
  const value = getNestedValue(fields, path);
  
  return (
    <FieldInput
      label={label}
      fieldKey={path}
      value={value}
      onChange={onChange}
      onFlagChange={onFlagChange}
      aiFlags={aiFlags}
      alternatives={alternatives}
      textarea={multiline}
      masterList={masterList}
    />
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

export default function AbstractForm({
  fields,
  aiFlags,
  onFieldChange,
  onFlagChange,
  templateVersion = 'v1',
}) {
  const isV2 = templateVersion === 'v2';
  const alternatives = fields?.alternatives || {};
  const fieldProps = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };

  if (isV2) {
    return <V2Form {...fieldProps} />;
  }
  return <V1Form {...fieldProps} />;
}

function V2Form({ fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
  const fieldProps = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
  const mortgages = fields?.mortgages || [];
  const chain = fields?.chain_of_title || [];

  return (
    <div>
      <Section title="Property and Ownership Information">
        <div style={s.grid2}>
          <Field label="ProTitle Order#" path="property_info.order_no" {...fieldProps} />
          <Field label="Completed Date" path="property_info.completed_date" placeholder="MM/DD/YYYY" {...fieldProps} />
        </div>
        <Field label="Property Address" path="property_info.address" {...fieldProps} />
        <div style={s.grid3}>
          <Field label="Current Owner" path="property_info.current_owner" {...fieldProps} />
          <Field label="County" path="property_info.county" {...fieldProps} />
          <Field label="APN / Parcel #" path="property_info.apn_parcel_pin" {...fieldProps} />
        </div>
        <Field label="Misc Info for Examiner" path="property_info.misc_info_to_examiner" multiline {...fieldProps} />
      </Section>

      <Section title="Vesting Information">
        <div style={s.grid2}>
          <Field label="Grantee" path="vesting_info.grantee" {...fieldProps} />
          <Field label="Grantor" path="vesting_info.grantor" {...fieldProps} />
        </div>
        <div style={s.grid3}>
            <Field label="Deed Date" path="vesting_info.deed_date" placeholder="MM/DD/YYYY" {...fieldProps} />
            <Field label="Recorded Date" path="vesting_info.recorded_date" placeholder="MM/DD/YYYY" {...fieldProps} />
            <Field label="Deed Type" path="vesting_info.deed_type" {...fieldProps} masterList={DEED_TYPES} />
        </div>
        <div style={s.grid3}>
            <Field label="Instrument/Book/Page" path="vesting_info.instrument_book_page" {...fieldProps} />
            <Field label="Consideration" path="vesting_info.consideration_amount" {...fieldProps} />
            <Field label="Sale Price" path="vesting_info.sale_price" {...fieldProps} />
        </div>
         <div style={s.grid2}>
          <Field label="Probate Status" path="vesting_info.probate_status" {...fieldProps} />
          <Field label="Divorce Status" path="vesting_info.divorce_status" {...fieldProps} />
        </div>
        <Field label="Notes" path="vesting_info.notes" multiline {...fieldProps} />
      </Section>

      <Section title={`Chain of Title (${chain.length})`}>
        {chain.map((_, i) => (
          <V2ChainEntry key={i} index={i} {...fieldProps} />
        ))}
      </Section>

      <Section title={`Open Mortgages (${mortgages.length})`}>
        {mortgages.map((_, i) => (
          <V2MortgageEntry key={i} index={i} {...fieldProps} />
        ))}
      </Section>

      <Section title="Tax Status">
        <div style={s.grid3}>
            <Field label="Parcel ID" path="tax_status.parcel_id" {...fieldProps} />
            <Field label="Tax Year" path="tax_status.tax_year" {...fieldProps} />
            <Field label="Total Amount" path="tax_status.total_amount" {...fieldProps} />
        </div>
        <div style={s.grid3}>
            <Field label="Status" path="tax_status.status" {...fieldProps} />
            <Field label="Paid Date" path="tax_status.paid_date" placeholder="MM/DD/YYYY" {...fieldProps} />
            <Field label="Delinquent Amount" path="tax_status.delinquent_amount" {...fieldProps} />
        </div>
      </Section>

      <Section title="Legal Description">
        <Field label="Legal Description" path="legal_description" multiline {...fieldProps} />
      </Section>
    </div>
  );
}

function V2ChainEntry({ index, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const base = `chain_of_title.${index}`;
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    return (
        <div style={s.entryCard}>
            <div style={s.entryNum}>Chain Entry {index + 1}</div>
            <div style={s.grid2}>
                <Field label="Grantee" path={`${base}.grantee`} {...fp} />
                <Field label="Grantor" path={`${base}.grantor`} {...fp} />
            </div>
            <div style={s.grid3}>
                <Field label="Deed Date" path={`${base}.deed_date`} placeholder="MM/DD/YYYY" {...fp} />
                <Field label="Recorded Date" path={`${base}.recorded_date`} placeholder="MM/DD/YYYY" {...fp} />
                <Field label="Deed Type" path={`${base}.deed_type`} {...fp} masterList={DEED_TYPES} />
            </div>
            <div style={s.grid2}>
                <Field label="Instrument/Book/Page" path={`${base}.instrument_book_page`} {...fp} />
                <Field label="Consideration" path={`${base}.consideration_amount`} {...fp} />
            </div>
            <Field label="Notes" path={`${base}.notes`} multiline {...fp} />
        </div>
    );
}

function V2MortgageEntry({ index, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const base = `mortgages.${index}`;
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    const assignments = fields?.mortgages?.[index]?.assignments || [];
    return (
        <div style={s.entryCard}>
            <div style={s.entryNum}>Mortgage {index + 1}</div>
            <div style={s.grid2}>
                <Field label="Borrower" path={`${base}.borrower`} {...fp} />
                <Field label="Lender" path={`${base}.lender`} {...fp} />
            </div>
            <div style={s.grid3}>
                <Field label="Mortgage Date" path={`${base}.mortgage_date`} placeholder="MM/DD/YYYY" {...fp} />
                <Field label="Recorded Date" path={`${base}.recorded_date`} placeholder="MM/DD/YYYY" {...fp} />
                <Field label="Mortgage Amount" path={`${base}.mortgage_amount`} {...fp} />
            </div>
            <div style={s.grid3}>
                <Field label="Mortgage Type" path={`${base}.mortgage_type`} {...fp} masterList={MORTGAGE_TYPES} />
                <Field label="Vesting Status" path={`${base}.vesting_status`} {...fp} masterList={VESTING_STATUSES} />
                <Field label="Maturity Date" path={`${base}.maturity_date`} placeholder="MM/DD/YYYY" {...fp} />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <div style={s.entryNum}>Assignments</div>
              {assignments.map((_, a_idx) => {
                const a_base = `${base}.assignments.${a_idx}`;
                return (
                  <div key={a_idx} style={{...s.entryCard, background: '#fff', border: '1px solid #d1d5db'}}>
                    <div style={s.grid2}>
                      <Field label="Assignor" path={`${a_base}.assignor`} {...fp} />
                      <Field label="Assignee" path={`${a_base}.assignee`} {...fp} />
                    </div>
                     <div style={s.grid3}>
                        <Field label="Recorded Date" path={`${a_base}.recorded_date`} placeholder="MM/DD/YYYY" {...fp} />
                        <Field label="Instrument #" path={`${a_base}.instrument`} {...fp} />
                     </div>
                  </div>
                )
              })}
            </div>
        </div>
    );
}


function V1Form({ fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
  const chain = fields?.chain_of_title || [];
  const mortgages = fields?.mortgages || [];
  const assocDocs = fields?.associated_documents || [];
  const judgments = fields?.judgments_liens || [];
  const miscDocs = fields?.misc_documents || [];
  const fieldProps = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };

  return (
    <div>
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

      <Section title={`Chain of Title (${chain.length} entries)`}>
        {chain.map((_, i) => (
          <ChainEntry key={i} index={i} chain={chain} {...fieldProps} />
        ))}
      </Section>

      <Section title={`Mortgages / Deeds of Trust (${mortgages.length})`}>
        {mortgages.map((_, i) => (
          <MortgageEntry key={i} index={i} mortgages={mortgages} {...fieldProps} />
        ))}
      </Section>

      <Section title={`Associated Documents (${assocDocs.length})`}>
        {assocDocs.map((_, i) => (
          <AssocDocEntry key={i} index={i} docs={assocDocs} {...fieldProps} />
        ))}
      </Section>

      <Section title={`Judgments / Liens (${judgments.length})`}>
        {judgments.map((_, i) => (
          <JudgmentEntry key={i} index={i} judgments={judgments} {...fieldProps} />
        ))}
      </Section>

      <Section title={`Miscellaneous Documents (${miscDocs.length})`}>
        {miscDocs.map((_, i) => (
          <MiscEntry key={i} index={i} misc={miscDocs} {...fieldProps} />
        ))}
      </Section>

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

// ... (rest of the file remains the same) ...

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
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#4a5568',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            In/Out Sale?
          </div>
          <label style={s.checkbox}>
            <input
              type="checkbox"
              checked={!!entry.in_out_sale}
              onChange={(e) => onFieldChange(`${base}.in_out_sale`, e.target.checked)}
            />
            Out of Family
          </label>
        </div>
      </div>
      <Field
        label="Grantor(s)"
        path={`${base}.grantors`}
        placeholder="Separate multiple names with semicolons"
        onChange={(k, v) =>
          onFieldChange(
            k,
            v
              .split(';')
              .map((x) => x.trim())
              .filter(Boolean)
          )
        }
        {...fp}
        value={Array.isArray(entry.grantors) ? entry.grantors.join('; ') : entry.grantors}
      />
      <Field
        label="Grantee(s)"
        path={`${base}.grantees`}
        placeholder="Separate multiple names with semicolons"
        onChange={(k, v) =>
          onFieldChange(
            k,
            v
              .split(';')
              .map((x) => x.trim())
              .filter(Boolean)
          )
        }
        {...fp}
        value={Array.isArray(entry.grantees) ? entry.grantees.join('; ') : entry.grantees}
      />
      <Field label="Notes" path={`${base}.notes`} placeholder="*Asterisk notes" {...fp} />
    </div>
  );
}

function MortgageEntry({
  index,
  mortgages,
  fields,
  aiFlags,
  alternatives,
  onFieldChange,
  onFlagChange,
}) {
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
        <Field
          label="Maturity Date"
          path={`${base}.maturity_date`}
          placeholder="MM/DD/YYYY"
          {...fp}
        />
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

function AssocDocEntry({
  index,
  docs,
  fields,
  aiFlags,
  alternatives,
  onFieldChange,
  onFlagChange,
}) {
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

function JudgmentEntry({
  index,
  judgments,
  fields,
  aiFlags,
  alternatives,
  onFieldChange,
  onFlagChange,
}) {
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
