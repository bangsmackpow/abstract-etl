import FieldInput from './FieldInput';
import { DEED_TYPES, VESTING_STATUSES, MORTGAGE_TYPES } from '../services/proTitleConstants'; // Assuming constants are exposed

// ... (styles and helper components remain the same) ...

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
  return (
    <div>
      <Section title="Property and Ownership Information">
        <div style={s.grid2}>
          <Field label="ProTitle Order#" path="property_info.order_no" {...fieldProps} />
          <Field
            label="Completed Date"
            path="property_info.completed_date"
            placeholder="MM/DD/YYYY"
            {...fieldProps}
          />
        </div>
        <Field label="Property Address" path="property_info.address" {...fieldProps} />
        <div style={s.grid3}>
          <Field label="Current Owner" path="property_info.current_owner" {...fieldProps} />
          <Field label="County" path="property_info.county" {...fieldProps} />
          <Field label="APN / Parcel #" path="property_info.apn_parcel_pin" {...fieldProps} />
        </div>
        <Field
          label="Misc Info for Examiner"
          path="property_info.misc_info_to_examiner"
          multiline
          {...fieldProps}
        />
      </Section>
      <Section title="Vesting Information">
        <div style={s.grid2}>
          <Field label="Grantee" path="vesting_info.grantee" {...fieldProps} />
          <Field label="Grantor" path="vesting_info.grantor" {...fieldProps} />
        </div>
        <div style={s.grid3}>
          <Field label="Deed Date" path="vesting_info.deed_date" {...fieldProps} />
          <Field label="Recorded Date" path="vesting_info.recorded_date" {...fieldProps} />
          <Field
            label="Deed Type"
            path="vesting_info.deed_type"
            {...fieldProps}
            masterList={DEED_TYPES}
          />
        </div>
        <div style={s.grid2}>
          <Field label="Probate Status" path="vesting_info.probate_status" {...fieldProps} />
          <Field label="Divorce Status" path="vesting_info.divorce_status" {...fieldProps} />
        </div>
        <Field label="Notes" path="vesting_info.notes" multiline {...fieldProps} />
      </Section>
      <Section title="Legal Description">
        <Field label="Legal Description" path="legal_description" multiline {...fieldProps} />
      </Section>
    </div>
  );
}

function V1Form({ fields, aiFlags, alternatives, onFieldChange, onFlagChange }) {
  // ... (existing V1 form structure) ...
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
