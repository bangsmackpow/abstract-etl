import FieldInput from './FieldInput';

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

// ── V7 Form ────────────────────────────────────────────────────────────────────

const v7Row = { marginBottom: '10px' };

function V7Form({ fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const fieldProps = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    const chain = fields?.chain_of_title || [];
    const mortgages = fields?.mortgages || [];
    const judgments = fields?.judgments_liens || [];
    const miscDocs = fields?.misc_documents || [];
    const namesSearched = fields?.names_searched || [];
    const docAccounting = fields?.additional_information?.document_accounting || [];
    const references = fields?.additional_information?.references || [];

    return (
        <div>
            <Section title="ORDER INFORMATION">
                <div style={v7Row}><Field label="FILE NUMBER" path="order_info.file_number" {...fieldProps} /></div>
                <div style={v7Row}><Field label="CLIENT / ORDER" path="order_info.client_order" {...fieldProps} /></div>
                <div style={v7Row}><Field label="EFFECTIVE DATE" path="order_info.effective_date" placeholder="MM/DD/YYYY" {...fieldProps} /></div>
                <div style={v7Row}><Field label="BORROWER / OWNER" path="order_info.borrower_owner" {...fieldProps} /></div>
                <div style={v7Row}><Field label="PROPERTY ADDRESS" path="order_info.property_address" {...fieldProps} /></div>
                <div style={v7Row}><Field label="COUNTY" path="order_info.county" {...fieldProps} /></div>
                <div style={v7Row}><Field label="TOWNSHIP / CITY" path="order_info.township_city" {...fieldProps} /></div>
                <div style={v7Row}><Field label="PARCEL ID / TAX MAP" path="order_info.parcel_id_tax_map" {...fieldProps} /></div>
                <div style={v7Row}><Field label="ACCOUNT NUMBER" path="order_info.account_number" {...fieldProps} /></div>
                <div style={v7Row}><Field label="CURRENT VESTING OWNER" path="order_info.current_vesting_owner" {...fieldProps} /></div>
                <div style={v7Row}><Field label="ASSESSOR OWNER" path="order_info.assessor_owner" {...fieldProps} /></div>
                <div style={v7Row}><Field label="LEGAL / ASSESSOR DESCRIPTION" path="order_info.legal_assessor_description" {...fieldProps} /></div>
                <div style={v7Row}><Field label="ACREAGE" path="order_info.acreage" {...fieldProps} /></div>
                <div style={v7Row}><Field label="ASSESSMENT" path="order_info.assessment" {...fieldProps} /></div>
                <div style={v7Row}><Field label="ORDER / VERIFICATION NOTES" path="order_info.order_verification_notes" multiline {...fieldProps} /></div>
            </Section>

            <Section title="TAX INFORMATION">
                <div style={v7Row}><Field label="YEAR" path="tax_information.year" {...fieldProps} /></div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#4a5568', marginBottom: 8 }}>FIRST HALF</div>
                <div style={v7Row}><Field label="  DUE DATE" path="tax_information.first_half.due_date" placeholder="MM/DD/YYYY" {...fieldProps} /></div>
                <div style={v7Row}><Field label="  ORIGINAL BILL" path="tax_information.first_half.original_bill" {...fieldProps} /></div>
                <div style={v7Row}><Field label="  PAID DATE" path="tax_information.first_half.paid_date" placeholder="MM/DD/YYYY" {...fieldProps} /></div>
                <div style={v7Row}><Field label="  AMOUNT PAID" path="tax_information.first_half.amount_paid" {...fieldProps} /></div>
                <div style={v7Row}><Field label="  PENALTY" path="tax_information.first_half.penalty" {...fieldProps} /></div>
                <div style={v7Row}><Field label="  INTEREST" path="tax_information.first_half.interest" {...fieldProps} /></div>
                <div style={v7Row}><Field label="  BALANCE DUE" path="tax_information.first_half.balance_due" {...fieldProps} /></div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#4a5568', marginBottom: 8, marginTop: 12 }}>SECOND HALF</div>
                <div style={v7Row}><Field label="  DUE DATE" path="tax_information.second_half.due_date" placeholder="MM/DD/YYYY" {...fieldProps} /></div>
                <div style={v7Row}><Field label="  ORIGINAL BILL" path="tax_information.second_half.original_bill" {...fieldProps} /></div>
                <div style={v7Row}><Field label="  PAID DATE" path="tax_information.second_half.paid_date" placeholder="MM/DD/YYYY" {...fieldProps} /></div>
                <div style={v7Row}><Field label="  AMOUNT PAID" path="tax_information.second_half.amount_paid" {...fieldProps} /></div>
                <div style={v7Row}><Field label="  PENALTY" path="tax_information.second_half.penalty" {...fieldProps} /></div>
                <div style={v7Row}><Field label="  INTEREST" path="tax_information.second_half.interest" {...fieldProps} /></div>
                <div style={v7Row}><Field label="  BALANCE DUE" path="tax_information.second_half.balance_due" {...fieldProps} /></div>
                <div style={v7Row}><Field label="TOTAL TAX" path="tax_information.total_tax" {...fieldProps} /></div>
                <div style={v7Row}><Field label="TOTAL DELINQUENT AMOUNT" path="tax_information.total_delinquent_amount" {...fieldProps} /></div>
            </Section>

            <Section title={`CHAIN OF TITLE (${chain.length})`}>
                {chain.map((_, i) => (
                    <V7ChainEntry key={i} index={i} {...fieldProps} />
                ))}
                {chain.length === 0 && <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No chain of title entries found.</div>}
            </Section>

            <Section title={`MORTGAGES / DEEDS OF TRUST (${mortgages.length})`}>
                {mortgages.map((_, i) => (
                    <V7MortgageEntry key={i} index={i} {...fieldProps} />
                ))}
                {mortgages.length === 0 && <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No mortgages found.</div>}
            </Section>

            <Section title={`JUDGMENTS / LIENS (${judgments.length})`}>
                {judgments.map((_, i) => (
                    <V7JudgmentEntry key={i} index={i} {...fieldProps} />
                ))}
                {judgments.length === 0 && <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No judgments or liens found.</div>}
            </Section>

            <Section title={`MISCELLANEOUS DOCUMENTS (${miscDocs.length})`}>
                {miscDocs.map((_, i) => (
                    <V7MiscDocEntry key={i} index={i} {...fieldProps} />
                ))}
                {miscDocs.length === 0 && <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No miscellaneous documents found.</div>}
            </Section>

            <Section title="LEGAL DESCRIPTION">
                <div style={v7Row}><Field label="LEGAL DESCRIPTION" path="legal_description" multiline {...fieldProps} /></div>
            </Section>

            <Section title="ADDITIONAL INFORMATION">
                <div style={v7Row}><Field label="REFERENCES" path="additional_information.references" multiline {...fieldProps} /></div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#4a5568', marginBottom: 8, marginTop: 12 }}>DOCUMENT ACCOUNTING</div>
                {(docAccounting.length > 0 ? docAccounting : []).map((_, i) => (
                    <V7DocAccountingEntry key={i} index={i} {...fieldProps} />
                ))}
                {docAccounting.length === 0 && <div style={{ color: '#6b7280', fontStyle: 'italic', marginBottom: 8 }}>No document accounting entries.</div>}
            </Section>

            <Section title={`NAMES SEARCHED (${namesSearched.length})`}>
                <Field label="NAMES SEARCHED (comma-separated)" path="names_searched" multiline {...fieldProps} />
            </Section>
        </div>
    );
}

function V7ChainEntry({ index, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const base = `chain_of_title.${index}`;
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    const entry = fields?.chain_of_title?.[index] || {};
    const supportingDocs = entry.supporting_documents || [];

    return (
        <div style={s.entryCard}>
            <div style={s.entryNum}>ENTRY {index + 1}</div>
            <div style={v7Row}><Field label="DEED TYPE" path={`${base}.deed_type`} {...fp} /></div>
            <Field
                label="GRANTOR(S)"
                path={`${base}.grantors`}
                multiline
                {...fp}
                value={Array.isArray(entry.grantors) ? entry.grantors.join('\n') : (entry.grantors || '')}
                onChange={(k, v) => onFieldChange(k, v.split('\n').map(x => x.trim()).filter(Boolean))}
            />
            <Field
                label="GRANTEE(S)"
                path={`${base}.grantees`}
                multiline
                {...fp}
                value={Array.isArray(entry.grantees) ? entry.grantees.join('\n') : (entry.grantees || '')}
                onChange={(k, v) => onFieldChange(k, v.split('\n').map(x => x.trim()).filter(Boolean))}
            />
            <div style={v7Row}><Field label="DATED" path={`${base}.dated`} placeholder="MM/DD/YYYY" {...fp} /></div>
            <div style={v7Row}><Field label="RECORDED" path={`${base}.recorded`} placeholder="MM/DD/YYYY" {...fp} /></div>
            <div style={v7Row}><Field label="BOOK / PAGE OR INSTRUMENT" path={`${base}.book_page_instrument`} {...fp} /></div>
            <div style={v7Row}><Field label="CONSIDERATION" path={`${base}.consideration`} {...fp} /></div>
            <div style={v7Row}><Field label="NOTES" path={`${base}.notes`} multiline {...fp} /></div>
            {supportingDocs.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                    <div style={s.entryNum}>SUPPORTING DOCUMENTS</div>
                    {supportingDocs.map((_, sdIdx) => (
                        <V7ChainSupportingDoc key={sdIdx} parentBase={base} index={sdIdx} {...fp} />
                    ))}
                </div>
            )}
        </div>
    );
}

function V7ChainSupportingDoc({ parentBase, index, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const base = `${parentBase}.supporting_documents.${index}`;
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    const sd = fields?.chain_of_title?.[parentBase.split('.')[2]]?.supporting_documents?.[index] || {};
    return (
        <div style={{ ...s.entryCard, background: '#fff', border: '1px solid #d1d5db' }}>
            <div style={s.entryNum}>DOCUMENT {index + 1}</div>
            <div style={v7Row}><Field label="TYPE" path={`${base}.type`} {...fp} /></div>
            <div style={v7Row}><Field label="DECEDENT" path={`${base}.decedent`} {...fp} /></div>
            <div style={v7Row}><Field label="DATE OF DEATH" path={`${base}.date_of_death`} placeholder="MM/DD/YYYY" {...fp} /></div>
            <div style={v7Row}><Field label="WILL DATE" path={`${base}.will_date`} placeholder="MM/DD/YYYY" {...fp} /></div>
            <div style={v7Row}><Field label="RECORDED" path={`${base}.recorded`} placeholder="MM/DD/YYYY" {...fp} /></div>
            <div style={v7Row}><Field label="BOOK / PAGE OR INSTRUMENT" path={`${base}.book_page_instrument`} {...fp} /></div>
            <Field
                label="HEIRS"
                path={`${base}.heirs`}
                multiline
                {...fp}
                value={Array.isArray(sd.heirs) ? sd.heirs.join('\n') : (sd.heirs || '')}
                onChange={(k, v) => onFieldChange(k, v.split('\n').map(x => x.trim()).filter(Boolean))}
            />
            <Field
                label="DEVISEES / BENEFICIARIES"
                path={`${base}.devisees_beneficiaries`}
                multiline
                {...fp}
                value={Array.isArray(sd.devisees_beneficiaries) ? sd.devisees_beneficiaries.join('\n') : (sd.devisees_beneficiaries || '')}
                onChange={(k, v) => onFieldChange(k, v.split('\n').map(x => x.trim()).filter(Boolean))}
            />
            <div style={v7Row}><Field label="NOTES" path={`${base}.notes`} multiline {...fp} /></div>
        </div>
    );
}

function V7MortgageEntry({ index, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const base = `mortgages.${index}`;
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    const entry = fields?.mortgages?.[index] || {};
    const assocDocs = entry.associated_documents || [];

    return (
        <div style={s.entryCard}>
            <div style={s.entryNum}>MORTGAGE {index + 1}</div>
            <div style={v7Row}><Field label="DOCUMENT TITLE" path={`${base}.document_title`} {...fp} /></div>
            <Field
                label="BORROWER(S)"
                path={`${base}.borrowers`}
                multiline
                {...fp}
                value={Array.isArray(entry.borrowers) ? entry.borrowers.join('\n') : (entry.borrowers || '')}
                onChange={(k, v) => onFieldChange(k, v.split('\n').map(x => x.trim()).filter(Boolean))}
            />
            <div style={v7Row}><Field label="LENDER" path={`${base}.lender`} {...fp} /></div>
            <div style={v7Row}><Field label="TRUSTEE" path={`${base}.trustee`} {...fp} /></div>
            <div style={v7Row}><Field label="BENEFICIARY / NOMINEE" path={`${base}.beneficiary_nominee`} {...fp} /></div>
            <div style={v7Row}><Field label="DATED" path={`${base}.dated`} placeholder="MM/DD/YYYY" {...fp} /></div>
            <div style={v7Row}><Field label="RECORDED" path={`${base}.recorded`} placeholder="MM/DD/YYYY" {...fp} /></div>
            <div style={v7Row}><Field label="BOOK/PAGE OR INSTRUMENT" path={`${base}.book_page_instrument`} {...fp} /></div>
            <div style={v7Row}><Field label="AMOUNT" path={`${base}.amount`} {...fp} /></div>
            <div style={v7Row}><Field label="MATURITY" path={`${base}.maturity`} placeholder="MM/DD/YYYY" {...fp} /></div>
            <div style={v7Row}><Field label="LOAN NUMBER" path={`${base}.loan_number`} {...fp} /></div>
            <div style={v7Row}><Field label="MIN" path={`${base}.min`} {...fp} /></div>
            <div style={v7Row}><Field label="OPEN/CLOSED ENDED" path={`${base}.open_closed_ended`} {...fp} /></div>
            <div style={v7Row}><Field label="STATUS" path={`${base}.status`} {...fp} /></div>
            <div style={v7Row}><Field label="NOTES" path={`${base}.notes`} multiline {...fp} /></div>
            {assocDocs.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                    <div style={s.entryNum}>ASSOCIATED DOCUMENTS</div>
                    {assocDocs.map((_, adIdx) => (
                        <V7MortgageAssocDoc key={adIdx} parentBase={base} index={adIdx} {...fp} />
                    ))}
                </div>
            )}
        </div>
    );
}

function V7MortgageAssocDoc({ parentBase, index, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const base = `${parentBase}.associated_documents.${index}`;
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    return (
        <div style={{ ...s.entryCard, background: '#fff', border: '1px solid #d1d5db' }}>
            <div style={s.entryNum}>DOCUMENT {index + 1}</div>
            <div style={v7Row}><Field label="DOCUMENT TITLE" path={`${base}.document_title`} {...fp} /></div>
            <div style={v7Row}><Field label="DATED" path={`${base}.dated`} placeholder="MM/DD/YYYY" {...fp} /></div>
            <div style={v7Row}><Field label="RECORDED" path={`${base}.recorded`} placeholder="MM/DD/YYYY" {...fp} /></div>
            <div style={v7Row}><Field label="BOOK/PAGE OR INSTRUMENT" path={`${base}.book_page_instrument`} {...fp} /></div>
            <div style={v7Row}><Field label="NOTES" path={`${base}.notes`} multiline {...fp} /></div>
        </div>
    );
}

function V7JudgmentEntry({ index, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const base = `judgments_liens.${index}`;
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    return (
        <div style={s.entryCard}>
            <div style={s.entryNum}>JUDGMENT/LIEN {index + 1}</div>
            <div style={v7Row}><Field label="DOCUMENT TITLE" path={`${base}.document_title`} {...fp} /></div>
            <div style={v7Row}><Field label="PLAINTIFF / LIENHOLDER" path={`${base}.plaintiff_lienholder`} {...fp} /></div>
            <div style={v7Row}><Field label="DEFENDANT / DEBTOR" path={`${base}.defendant_debtor`} {...fp} /></div>
            <div style={v7Row}><Field label="CASE NUMBER" path={`${base}.case_number`} {...fp} /></div>
            <div style={v7Row}><Field label="DATE OF JUDGMENT / LIEN" path={`${base}.date_of_judgment_lien`} placeholder="MM/DD/YYYY" {...fp} /></div>
            <div style={v7Row}><Field label="RECORDED" path={`${base}.recorded`} placeholder="MM/DD/YYYY" {...fp} /></div>
            <div style={v7Row}><Field label="BOOK / PAGE OR INSTRUMENT" path={`${base}.book_page_instrument`} {...fp} /></div>
            <div style={v7Row}><Field label="AMOUNT" path={`${base}.amount`} {...fp} /></div>
            <div style={v7Row}><Field label="INTEREST" path={`${base}.interest`} {...fp} /></div>
            <div style={v7Row}><Field label="COSTS" path={`${base}.costs`} {...fp} /></div>
            <div style={v7Row}><Field label="ATTORNEY'S FEES" path={`${base}.attorneys_fees`} {...fp} /></div>
            <div style={v7Row}><Field label="STATUS" path={`${base}.status`} {...fp} /></div>
            <div style={v7Row}><Field label="NOTES" path={`${base}.notes`} multiline {...fp} /></div>
        </div>
    );
}

function V7MiscDocEntry({ index, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const base = `misc_documents.${index}`;
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    const entry = fields?.misc_documents?.[index] || {};
    const docType = (entry.document_type || '').toLowerCase();
    const isEstate = ['will', 'probate', 'estate', 'death', 'trust'].some(t => docType.includes(t));

    return (
        <div style={s.entryCard}>
            <div style={s.entryNum}>MISCELLANEOUS DOCUMENT {index + 1}</div>
            <div style={v7Row}><Field label="DOCUMENT TYPE" path={`${base}.document_type`} {...fp} /></div>
            {isEstate ? (
                <>
                    <div style={v7Row}><Field label="DECEDENT" path={`${base}.decedent`} {...fp} /></div>
                    <div style={v7Row}><Field label="DATE OF DEATH" path={`${base}.date_of_death`} placeholder="MM/DD/YYYY" {...fp} /></div>
                    <div style={v7Row}><Field label="WILL DATE" path={`${base}.will_date`} placeholder="MM/DD/YYYY" {...fp} /></div>
                    <div style={v7Row}><Field label="PROBATE DATE" path={`${base}.probate_date`} placeholder="MM/DD/YYYY" {...fp} /></div>
                    <Field
                        label="HEIRS"
                        path={`${base}.heirs`}
                        multiline
                        {...fp}
                        value={Array.isArray(entry.heirs) ? entry.heirs.join('\n') : (entry.heirs || '')}
                        onChange={(k, v) => onFieldChange(k, v.split('\n').map(x => x.trim()).filter(Boolean))}
                    />
                    <Field
                        label="DEVISEES / BENEFICIARIES"
                        path={`${base}.devisees_beneficiaries`}
                        multiline
                        {...fp}
                        value={Array.isArray(entry.devisees_beneficiaries) ? entry.devisees_beneficiaries.join('\n') : (entry.devisees_beneficiaries || '')}
                        onChange={(k, v) => onFieldChange(k, v.split('\n').map(x => x.trim()).filter(Boolean))}
                    />
                </>
            ) : (
                <>
                    <div style={v7Row}><Field label="GRANTOR / ASSIGNOR" path={`${base}.grantor_assignor`} {...fp} /></div>
                    <div style={v7Row}><Field label="GRANTEE / ASSIGNEE" path={`${base}.grantee_assignee`} {...fp} /></div>
                    <div style={v7Row}><Field label="DATED" path={`${base}.dated`} placeholder="MM/DD/YYYY" {...fp} /></div>
                    <div style={v7Row}><Field label="CONSIDERATION" path={`${base}.consideration`} {...fp} /></div>
                    <div style={v7Row}><Field label="AREA / WIDTH" path={`${base}.area_or_width`} {...fp} /></div>
                </>
            )}
            <div style={v7Row}><Field label="NOTES" path={`${base}.notes`} multiline {...fp} /></div>
        </div>
    );
}

function V7DocAccountingEntry({ index, fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
    const base = `additional_information.document_accounting.${index}`;
    const fp = { fields, aiFlags, alternatives, onChange: onFieldChange, onFlagChange };
    return (
        <div style={s.entryCard}>
            <div style={s.entryNum}>PAGE ENTRY {index + 1}</div>
            <div style={v7Row}><Field label="PAGE RANGE" path={`${base}.page_range`} placeholder="e.g., 1-3" {...fp} /></div>
            <div style={v7Row}><Field label="DOCUMENT LABEL" path={`${base}.document_label`} {...fp} /></div>
        </div>
    );
}
export default V7Form;
