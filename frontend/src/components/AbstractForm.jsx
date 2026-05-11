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
function Field({ label, path, placeholder, multiline, masterList, value: overrideValue, onChange: overrideOnChange, ...rest }) {
    const { fields, aiFlags, alternatives, onChange, onFlagChange } = rest;
    const value = overrideValue !== undefined ? overrideValue : getNestedValue(fields, path);
    const handleChange = overrideOnChange || onChange;
    
    return (
        <FieldInput
            label={label}
            fieldKey={path}
            value={value}
            onChange={handleChange}
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
  const isV4 = templateVersion === 'v4';
  const alternatives = fields?.alternatives || {};
  const fieldProps = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };

  if (isV4) {
    return <V4Form {...fieldProps} />;
  }
  if (isV2) {
    return <V2Form {...fieldProps} />;
  }
  return <V1Form {...fieldProps} />;
}

function V4Form({ fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const fieldProps = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    const chain = fields?.chain_of_title || [];
    const mortgages = fields?.mortgages || [];
    const assocDocs = fields?.associated_documents || [];
    const judgments = fields?.judgments_liens || [];
    const miscDocs = fields?.misc_documents || [];
    const namesSearched = fields?.names_searched || [];
    const parcelIds = fields?.order_info?.parcel_ids || [];

    return (
        <div>
            <Section title="ORDER INFORMATION">
                <div style={s.grid2}>
                    <Field label="ORDER NUMBER" path="order_info.order_number" {...fieldProps} />
                    <Field label="COMPLETED DATE" path="order_info.completed_date" placeholder="MM/DD/YYYY" {...fieldProps} />
                </div>
                <div style={s.grid2}>
                    <Field label="COMPANY NAME" path="order_info.company_name" {...fieldProps} />
                    <Field label="EFFECTIVE DATE" path="order_info.effective_date" placeholder="MM/DD/YYYY" {...fieldProps} />
                </div>
                <Field label="PROPERTY ADDRESS" path="order_info.property_address" {...fieldProps} />
                <div style={s.grid3}>
                    <Field label="COUNTY" path="order_info.county" {...fieldProps} />
                    <Field label="TOWNSHIP" path="order_info.township" {...fieldProps} />
                    <Field label="CURRENT VESTING OWNER" path="order_info.current_vesting_owner" {...fieldProps} />
                </div>
                <ArrayField label="PARCEL IDS (one per line)" path="order_info.parcel_ids" {...fieldProps} />
                <div style={s.grid3}>
                    <Field label="ASSESSED VALUE" path="order_info.assessed_value" placeholder="0.00" {...fieldProps} />
                    <Field label="LAND VALUE" path="order_info.land_value" placeholder="0.00" {...fieldProps} />
                    <Field label="IMPROVEMENT VALUE" path="order_info.improvement_value" placeholder="0.00" {...fieldProps} />
                </div>
                <div style={s.grid2}>
                    <Field label="TAX ID" path="order_info.tax_id" {...fieldProps} />
                    <Field label="TAX AMOUNT" path="order_info.tax_amount" {...fieldProps} />
                </div>
                <div style={s.grid2}>
                    <Field label="TAX DUE" path="order_info.tax_due" {...fieldProps} />
                    <Field label="TAX DELINQUENT" path="order_info.tax_delinquent" {...fieldProps} />
                </div>
                <div style={s.grid2}>
                    <Field label="TAX PAID" path="order_info.tax_paid" {...fieldProps} />
                </div>
            </Section>

            <Section title="VESTING INFORMATION">
                <div style={s.grid2}>
                    <Field label="GRANTEE" path="vesting_info.grantee" {...fieldProps} />
                    <Field label="GRANTOR" path="vesting_info.grantor" {...fieldProps} />
                </div>
                <div style={s.grid3}>
                    <Field label="DEED DATE" path="vesting_info.deed_date" placeholder="MM/DD/YYYY" {...fieldProps} />
                    <Field label="RECORDED DATE" path="vesting_info.recorded_date" placeholder="MM/DD/YYYY" {...fieldProps} />
                    <Field label="DEED TYPE" path="vesting_info.deed_type" {...fieldProps} masterList={DEED_TYPES} />
                </div>
                <div style={s.grid3}>
                    <Field label="INSTRUMENT/BOOK/PAGE" path="vesting_info.instrument_book_page" {...fieldProps} />
                    <Field label="CONSIDERATION" path="vesting_info.consideration" {...fieldProps} />
                    <Field label="IN/OUT SALE" path="vesting_info.in_out_sale" {...fieldProps} />
                </div>
                <Field label="NOTES" path="vesting_info.notes" multiline {...fieldProps} />
            </Section>

            <Section title={`CHAIN OF TITLE (${chain.length})`}>
                {chain.map((_, i) => (
                    <V4ChainEntry key={i} index={i} {...fieldProps} />
                ))}
                {chain.length === 0 && <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No chain of title entries found.</div>}
            </Section>

            <Section title={`MORTGAGES / DEEDS OF TRUST (${mortgages.length})`}>
                {mortgages.map((_, i) => (
                    <V4MortgageEntry key={i} index={i} {...fieldProps} />
                ))}
                {mortgages.length === 0 && <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No mortgages found.</div>}
            </Section>

            <Section title={`ASSOCIATED DOCUMENTS (${assocDocs.length})`}>
                {assocDocs.map((_, i) => (
                    <V4AssocDocEntry key={i} index={i} {...fieldProps} />
                ))}
                {assocDocs.length === 0 && <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No associated documents found.</div>}
            </Section>

            <Section title={`JUDGMENTS & LIENS (${judgments.length})`}>
                {judgments.map((_, i) => (
                    <V4JudgmentEntry key={i} index={i} {...fieldProps} />
                ))}
                {judgments.length === 0 && <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No judgments or liens found.</div>}
            </Section>

            <Section title={`MISCELLANEOUS DOCUMENTS (${miscDocs.length})`}>
                {miscDocs.map((_, i) => (
                    <V4MiscDocEntry key={i} index={i} {...fieldProps} />
                ))}
                {miscDocs.length === 0 && <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No miscellaneous documents found.</div>}
            </Section>

            <Section title="TAX STATUS">
                <div style={s.grid3}>
                    <Field label="PARCEL ID" path="tax_status.parcel_id" {...fieldProps} />
                    <Field label="TAX YEAR" path="tax_status.tax_year" {...fieldProps} />
                    <Field label="TOTAL AMOUNT" path="tax_status.total_amount" {...fieldProps} />
                </div>
                <div style={s.grid3}>
                    <Field label="STATUS" path="tax_status.status" {...fieldProps} />
                    <Field label="PAID DATE" path="tax_status.paid_date" placeholder="MM/DD/YYYY" {...fieldProps} />
                    <Field label="DELINQUENT AMOUNT" path="tax_status.delinquent_amount" {...fieldProps} />
                </div>
                <TaxInstallments fields={fields} onFieldChange={onFieldChange} onFlagChange={onFlagChange} aiFlags={aiFlags} alternatives={alternatives} />
            </Section>

            <Section title="LEGAL DESCRIPTION">
                <Field label="LEGAL DESCRIPTION" path="legal_description" multiline {...fieldProps} />
            </Section>

            <Section title="ADDITIONAL INFORMATION">
                <Field label="ADDITIONAL INFORMATION" path="additional_information" multiline {...fieldProps} />
            </Section>

            <Section title={`NAMES SEARCHED (${namesSearched.length})`}>
                <ArrayField label="NAMES SEARCHED (one per line)" path="names_searched" {...fieldProps} />
            </Section>
        </div>
    );
}

function ArrayField({ label, path, fields, onChange, aiFlags, alternatives, onFlagChange }) {
    const arr = getNestedValue(fields, path);
    const value = Array.isArray(arr) ? arr.join('\n') : '';

    const handleChange = (e) => {
        const lines = e.target.value.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
        onChange(path, lines);
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px', textTransform: 'uppercase' }}>
                {label}
            </label>
            <textarea
                value={value}
                onChange={handleChange}
                rows={Math.max(2, (arr?.length || 0) + 1)}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    resize: 'vertical',
                }}
            />
        </div>
    );
}

function TaxInstallments({ fields, onFieldChange, onFlagChange, aiFlags, alternatives }) {
    const installments = fields?.tax_status?.installments || [];
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };

    return (
        <div style={{ marginTop: '1rem' }}>
            <div style={s.entryNum}>INSTALLMENTS</div>
            {installments.map((_, i) => {
                const base = `tax_status.installments.${i}`;
                return (
                    <div key={i} style={{...s.entryCard, background: '#fff', border: '1px solid #d1d5db'}}>
                        <div style={s.entryNum}>INSTALLMENT {i + 1}</div>
                        <div style={s.grid3}>
                            <Field label="NUMBER" path={`${base}.installment_number`} {...fp} />
                            <Field label="AMOUNT" path={`${base}.amount`} {...fp} />
                            <Field label="DUE DATE" path={`${base}.due_date`} placeholder="MM/DD/YYYY" {...fp} />
                        </div>
                        <div style={s.grid3}>
                            <Field label="PAID DATE" path={`${base}.paid_date`} placeholder="MM/DD/YYYY" {...fp} />
                            <Field label="STATUS" path={`${base}.status`} {...fp} />
                            <Field label="DELINQUENT AMOUNT" path={`${base}.delinquent_amount`} {...fp} />
                        </div>
                        <Field label="PENALTIES/FEES" path={`${base}.penalties_fees`} {...fp} />
                    </div>
                );
            })}
            {installments.length === 0 && <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No tax installments found.</div>}
        </div>
    );
}

function V4ChainEntry({ index, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const base = `chain_of_title.${index}`;
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    const entry = fields?.chain_of_title?.[index] || {};
    return (
        <div style={s.entryCard}>
            <div style={s.entryNum}>ENTRY {index + 1}</div>
            <div style={s.grid2}>
                <Field label="DEED TYPE" path={`${base}.deed_type`} {...fp} masterList={DEED_TYPES} />
                <Field label="INSTRUMENT/BOOK/PAGE" path={`${base}.instrument_book_page`} {...fp} />
            </div>
            <div style={s.grid3}>
                <Field label="DEED DATE" path={`${base}.deed_date`} placeholder="MM/DD/YYYY" {...fp} />
                <Field label="RECORDED DATE" path={`${base}.recorded_date`} placeholder="MM/DD/YYYY" {...fp} />
                <Field label="CONSIDERATION" path={`${base}.consideration`} {...fp} />
            </div>
            <Field
                label="GRANTORS (one per line)"
                path={`${base}.grantors`}
                multiline
                {...fp}
                value={Array.isArray(entry.grantors) ? entry.grantors.join('\n') : (entry.grantors || '')}
                onChange={(k, v) => onFieldChange(k, v.split('\n').map(x => x.trim()).filter(Boolean))}
            />
            <Field
                label="GRANTEES (one per line)"
                path={`${base}.grantees`}
                multiline
                {...fp}
                value={Array.isArray(entry.grantees) ? entry.grantees.join('\n') : (entry.grantees || '')}
                onChange={(k, v) => onFieldChange(k, v.split('\n').map(x => x.trim()).filter(Boolean))}
            />
            <Field
                label="RELATED DOCUMENTS (one per line)"
                path={`${base}.related_documents`}
                multiline
                {...fp}
                value={Array.isArray(entry.related_documents) ? entry.related_documents.join('\n') : (entry.related_documents || '')}
                onChange={(k, v) => onFieldChange(k, v.split('\n').map(x => x.trim()).filter(Boolean))}
            />
            <Field label="NOTES" path={`${base}.notes`} multiline {...fp} />
        </div>
    );
}

function V4MortgageEntry({ index, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const base = `mortgages.${index}`;
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    const assignments = fields?.mortgages?.[index]?.assignments || [];
    return (
        <div style={s.entryCard}>
            <div style={s.entryNum}>MORTGAGE {index + 1}</div>
            <div style={s.grid2}>
                <Field label="BORROWER" path={`${base}.borrower`} {...fp} />
                <Field label="LENDER" path={`${base}.lender`} {...fp} />
            </div>
            <div style={s.grid3}>
                <Field label="MORTGAGE DATE" path={`${base}.mortgage_date`} placeholder="MM/DD/YYYY" {...fp} />
                <Field label="RECORDED DATE" path={`${base}.recorded_date`} placeholder="MM/DD/YYYY" {...fp} />
                <Field label="MORTGAGE AMOUNT" path={`${base}.mortgage_amount`} {...fp} />
            </div>
            <div style={s.grid3}>
                <Field label="MORTGAGE TYPE" path={`${base}.mortgage_type`} {...fp} masterList={MORTGAGE_TYPES} />
                <Field label="VESTING STATUS" path={`${base}.vesting_status`} {...fp} masterList={VESTING_STATUSES} />
                <Field label="MATURITY DATE" path={`${base}.maturity_date`} placeholder="MM/DD/YYYY" {...fp} />
            </div>
            <div style={s.grid3}>
                <Field label="BOOK" path={`${base}.book`} {...fp} />
                <Field label="PAGE" path={`${base}.page`} {...fp} />
                <Field label="INSTRUMENT" path={`${base}.instrument`} {...fp} />
            </div>
            <div style={s.grid2}>
                <Field label="MERS" path={`${base}.mers`} {...fp} />
            </div>
            <Field label="SUBORDINATION NOTES" path={`${base}.subordination_notes`} multiline {...fp} />
            {assignments.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                    <div style={s.entryNum}>ASSIGNMENTS</div>
                    {assignments.map((_, a_idx) => {
                        const a_base = `${base}.assignments.${a_idx}`;
                        return (
                            <div key={a_idx} style={{...s.entryCard, background: '#fff', border: '1px solid #d1d5db'}}>
                                <div style={s.grid2}>
                                    <Field label="ASSIGNOR" path={`${a_base}.assignor`} {...fp} />
                                    <Field label="ASSIGNEE" path={`${a_base}.assignee`} {...fp} />
                                </div>
                                <div style={s.grid3}>
                                    <Field label="DOCUMENT TYPE" path={`${a_base}.document_type`} {...fp} />
                                    <Field label="RECORDED DATE" path={`${a_base}.recorded_date`} placeholder="MM/DD/YYYY" {...fp} />
                                    <Field label="INSTRUMENT #" path={`${a_base}.instrument`} {...fp} />
                                </div>
                                <div style={s.grid2}>
                                    <Field label="BOOK" path={`${a_base}.book`} {...fp} />
                                    <Field label="PAGE" path={`${a_base}.page`} {...fp} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function V4AssocDocEntry({ index, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const base = `associated_documents.${index}`;
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    return (
        <div style={s.entryCard}>
            <div style={s.entryNum}>ASSOCIATED DOCUMENT {index + 1}</div>
            <div style={s.grid2}>
                <Field label="DOCUMENT TYPE" path={`${base}.document_type`} {...fp} />
                <Field label="BOOK/INSTRUMENT" path={`${base}.book_instrument`} {...fp} />
            </div>
            <div style={s.grid3}>
                <Field label="PAGE" path={`${base}.page`} {...fp} />
                <Field label="DATED" path={`${base}.dated`} placeholder="MM/DD/YYYY" {...fp} />
                <Field label="RECORDED" path={`${base}.recorded`} placeholder="MM/DD/YYYY" {...fp} />
            </div>
            <div style={s.grid2}>
                <Field label="GRANTOR/ASSIGNOR" path={`${base}.grantor_assignor`} {...fp} />
                <Field label="GRANTEE/ASSIGNEE" path={`${base}.grantee_assignee`} {...fp} />
            </div>
            <Field label="NOTES" path={`${base}.notes`} multiline {...fp} />
        </div>
    );
}

function V4JudgmentEntry({ index, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const base = `judgments_liens.${index}`;
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    return (
        <div style={s.entryCard}>
            <div style={s.entryNum}>JUDGMENT/LIEN {index + 1}</div>
            <Field label="DOCUMENT TITLE" path={`${base}.document_title`} {...fp} />
            <div style={s.grid3}>
                <Field label="BOOK/INSTRUMENT" path={`${base}.book_instrument`} {...fp} />
                <Field label="PAGE" path={`${base}.page`} {...fp} />
                <Field label="AMOUNT" path={`${base}.amount`} {...fp} />
            </div>
            <div style={s.grid3}>
                <Field label="DATED" path={`${base}.dated`} placeholder="MM/DD/YYYY" {...fp} />
                <Field label="RECORDED" path={`${base}.recorded`} placeholder="MM/DD/YYYY" {...fp} />
                <Field label="CASE NUMBER" path={`${base}.case_number`} {...fp} />
            </div>
            <div style={s.grid2}>
                <Field label="PLAINTIFF" path={`${base}.plaintiff`} {...fp} />
                <Field label="DEFENDANT" path={`${base}.defendant`} {...fp} />
            </div>
        </div>
    );
}

function V4MiscDocEntry({ index, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const base = `misc_documents.${index}`;
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    return (
        <div style={s.entryCard}>
            <div style={s.entryNum}>MISCELLANEOUS DOCUMENT {index + 1}</div>
            <Field label="DOCUMENT TITLE" path={`${base}.document_title`} {...fp} />
            <div style={s.grid3}>
                <Field label="BOOK/INSTRUMENT" path={`${base}.book_instrument`} {...fp} />
                <Field label="PAGE" path={`${base}.page`} {...fp} />
                <Field label="DATED" path={`${base}.dated`} placeholder="MM/DD/YYYY" {...fp} />
            </div>
            <div style={s.grid3}>
                <Field label="RECORDED" path={`${base}.recorded`} placeholder="MM/DD/YYYY" {...fp} />
                <Field label="GRANTOR/ASSIGNOR" path={`${base}.grantor_assignor`} {...fp} />
                <Field label="GRANTEE/ASSIGNEE" path={`${base}.grantee_assignee`} {...fp} />
            </div>
        </div>
    );
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
