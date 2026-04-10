import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJob, updateJob, downloadDocx } from '../services/api';
import FieldInput from '../components/FieldInput';

const CHAIN_TEMPLATE = () => ({
  document_title: null, book_instrument: null, page: null,
  dated: null, recorded: null, consideration: null,
  in_out_sale: null, grantors: [], grantees: [], notes: null
});

const MORT_TEMPLATE = () => ({
  document_title: null, book_instrument: null, page: null,
  dated: null, recorded: null, consideration: null,
  maturity_date: null, lender: null, mers_number: null,
  borrower: null, trustee: null, open_mortgages_to_report: null
});

const ASSOC_TEMPLATE = () => ({
  document_title: null, consideration: null, dated: null,
  book_instrument: null, page: null, recorded: null,
  grantor_assignor: null, grantee_assignee: null, open_closed: null
});

const LIEN_TEMPLATE = () => ({
  document_title: null, book_instrument: null, page: null,
  dated: null, recorded: null, case_number: null,
  amount: null, plaintiff: null, defendant: null
});

export default function EditJob() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [job, setJob]       = useState(null);
  const [fields, setFields] = useState({});
  const [aiFlags, setAiFlags] = useState({});
  const [status, setStatus] = useState('draft');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    getJob(id).then(j => {
      setJob(j);
      setFields(j.fieldsJson || {});
      setAiFlags(j.aiFlagsJson || {});
      setStatus(j.status || 'draft');
      setNotes(j.notes || '');
    }).catch(() => setError('Failed to load job.'));
  }, [id]);

  const setField  = (key, value) => setFields(f => ({ ...f, [key]: value }));
  const setFlag   = (key, val)   => setAiFlags(f => ({ ...f, [key]: val }));

  // Helpers for nested fields
  const setNestedField = (listKey, i, key, value, template) => {
    setFields(f => {
      const list = [...(f[listKey] || [])];
      if (!list[i]) list[i] = template();
      list[i] = { ...list[i], [key]: value };
      return { ...f, [listKey]: list };
    });
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      await updateJob(id, { 
        fields_json: fields, 
        ai_flags_json: aiFlags, 
        status, 
        notes,
        property_address: fields.property_address || job.propertyAddress,
        county: fields.county || job.county 
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Save failed. Please try again.');
    } finally { setSaving(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await updateJob(id, { fields_json: fields, ai_flags_json: aiFlags, status, notes });
      await downloadDocx(id, fields.property_address);
    } catch { setError('Download failed.'); }
    finally { setDownloading(false); }
  };

  const addListEntry = (key, template) => setFields(f => ({ ...f, [key]: [...(f[key] || []), template()] }));

  if (!job && !error) return <div className="card card-body" style={{ marginTop: 20, textAlign: 'center' }}>
    <span className="spinner spinner-dark" /> Loading job...
  </div>;

  const chain     = fields.chain      || [];
  const mortgages = fields.mortgages  || [];
  const assocDocs = fields.assoc_docs || [];
  const liens     = fields.judgments_liens || [];

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Dashboard</button>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue-dark)' }}>
            {fields.property_address || job?.propertyAddress || 'Edit Job'}
          </h1>
        </div>
        <div className="flex gap-2 items-center">
          <select className="form-select" style={{ width: 160 }} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="draft">Draft</option>
            <option value="needs_review">Needs Review</option>
            <option value="complete">Complete</option>
          </select>
          {saved && <span className="text-sm" style={{ color: 'var(--green)' }}>✓ Saved</span>}
          {error && <span className="text-sm" style={{ color: 'var(--red)' }}>{error}</span>}
          <button className="btn btn-ghost" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" style={{ borderTopColor: 'var(--blue-mid)' }} /> Saving...</> : 'Save'}
          </button>
          <button className="btn btn-success" onClick={handleDownload} disabled={downloading}>
            {downloading ? <><span className="spinner" /> Generating...</> : '⬇ Download .docx'}
          </button>
        </div>
      </div>

      <div className="alert alert-info text-sm mb-4">
        🤖 <strong>AI-extracted</strong> fields are marked. Edit any field to confirm it.
      </div>

      {/* ORDER INFORMATION */}
      <div className="section-divider">Order Information</div>
      <div className="card mb-4">
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldInput label="Property Address" fieldKey="property_address" value={fields.property_address}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="File Number" fieldKey="file_number" value={fields.file_number}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="County" fieldKey="county" value={fields.county}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="Township" fieldKey="township" value={fields.township}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="Parcel ID" fieldKey="parcel_id" value={fields.parcel_id}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="Tax ID / Account #" fieldKey="tax_id" value={fields.tax_id}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="Effective Date" fieldKey="effective_date" value={fields.effective_date}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="Completed Date" fieldKey="completed_date" value={fields.completed_date}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="Assessed Value" fieldKey="assessed_value" value={fields.assessed_value}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="Land Value" fieldKey="land_value" value={fields.land_value}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="Improvement Value" fieldKey="improvement_value" value={fields.improvement_value}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <div />
          <FieldInput label="Tax Amount (1st)" fieldKey="tax_amount_1st" value={fields.tax_amount_1st}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="Tax Due (1st)" fieldKey="tax_due_1st" value={fields.tax_due_1st}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="Tax Amount (2nd)" fieldKey="tax_amount_2nd" value={fields.tax_amount_2nd}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="Tax Due (2nd)" fieldKey="tax_due_2nd" value={fields.tax_due_2nd}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="Tax Delinquent" fieldKey="tax_delinquent" value={fields.tax_delinquent}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <FieldInput label="Tax Paid" fieldKey="tax_paid" value={fields.tax_paid}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          <div style={{ gridColumn: 'span 2' }}>
            <FieldInput label="Current Vesting Owner" fieldKey="current_vesting_owner" value={fields.current_vesting_owner}
              onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} />
          </div>
        </div>
      </div>

      {/* LEGAL DESCRIPTION */}
      <div className="section-divider">Legal Description</div>
      <div className="card mb-4">
        <div className="card-body">
          <FieldInput label="Full Legal Text" fieldKey="legal_description" value={fields.legal_description}
            onChange={setField} onFlagChange={setFlag} aiFlags={aiFlags} textarea />
        </div>
      </div>

      {/* CHAIN OF TITLE */}
      <div className="section-divider">Chain of Title</div>
      {chain.map((entry, i) => (
        <div className="card mb-3" key={i}>
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <span>Entry {i + 1}</span>
            <button className="btn btn-danger btn-sm" onClick={() => setFields(f => ({ ...f, chain: f.chain.filter((_, idx) => idx !== i) }))}>Remove</button>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <FieldInput label="Document Title" fieldKey={`chain[${i}].document_title`} value={entry.document_title}
                onChange={(_, v) => setNestedField('chain', i, 'document_title', v, CHAIN_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            </div>
            <FieldInput label="Book / Instrument" fieldKey={`chain[${i}].book_instrument`} value={entry.book_instrument}
              onChange={(_, v) => setNestedField('chain', i, 'book_instrument', v, CHAIN_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Page" fieldKey={`chain[${i}].page`} value={entry.page}
              onChange={(_, v) => setNestedField('chain', i, 'page', v, CHAIN_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Dated" fieldKey={`chain[${i}].dated`} value={entry.dated}
              onChange={(_, v) => setNestedField('chain', i, 'dated', v, CHAIN_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Recorded" fieldKey={`chain[${i}].recorded`} value={entry.recorded}
              onChange={(_, v) => setNestedField('chain', i, 'recorded', v, CHAIN_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Consideration" fieldKey={`chain[${i}].consideration`} value={entry.consideration}
              onChange={(_, v) => setNestedField('chain', i, 'consideration', v, CHAIN_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <div className="form-group">
              <label className="form-label">In/Out Sale?</label>
              <select className="form-select" value={entry.in_out_sale === true ? 'yes' : entry.in_out_sale === false ? 'no' : ''}
                onChange={e => setNestedField('chain', i, 'in_out_sale', e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null, CHAIN_TEMPLATE)}>
                <option value="">Unknown</option>
                <option value="yes">Yes (Arm's Length Sale)</option>
                <option value="no">No (Not a Sale)</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <FieldInput label="Grantor(s) — semicolon separated" fieldKey={`chain[${i}].grantors`}
                value={Array.isArray(entry.grantors) ? entry.grantors.join('; ') : entry.grantors}
                onChange={(_, v) => setNestedField('chain', i, 'grantors', v.split(';').map(s => s.trim()).filter(Boolean), CHAIN_TEMPLATE)}
                onFlagChange={setFlag} aiFlags={aiFlags} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <FieldInput label="Grantee(s) — semicolon separated" fieldKey={`chain[${i}].grantees`}
                value={Array.isArray(entry.grantees) ? entry.grantees.join('; ') : entry.grantees}
                onChange={(_, v) => setNestedField('chain', i, 'grantees', v.split(';').map(s => s.trim()).filter(Boolean), CHAIN_TEMPLATE)}
                onFlagChange={setFlag} aiFlags={aiFlags} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <FieldInput label="Notes (asterisk references)" fieldKey={`chain[${i}].notes`} value={entry.notes}
                onChange={(_, v) => setNestedField('chain', i, 'notes', v, CHAIN_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} textarea />
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => addListEntry('chain', CHAIN_TEMPLATE)}>+ Add Chain Entry</button>

      {/* MORTGAGES */}
      <div className="section-divider">Mortgages / Deeds of Trust</div>
      {mortgages.map((m, i) => (
        <div className="card mb-3" key={i}>
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <span>Mortgage / DOT {i + 1}</span>
            <button className="btn btn-danger btn-sm" onClick={() => setFields(f => ({ ...f, mortgages: f.mortgages.filter((_, idx) => idx !== i) }))}>Remove</button>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <FieldInput label="Document Title" fieldKey={`mortgage[${i}].document_title`} value={m.document_title}
                onChange={(_, v) => setNestedField('mortgages', i, 'document_title', v, MORT_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            </div>
            <FieldInput label="Book / Instrument" fieldKey={`mortgage[${i}].book_instrument`} value={m.book_instrument}
              onChange={(_, v) => setNestedField('mortgages', i, 'book_instrument', v, MORT_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Page" fieldKey={`mortgage[${i}].page`} value={m.page}
              onChange={(_, v) => setNestedField('mortgages', i, 'page', v, MORT_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Dated" fieldKey={`mortgage[${i}].dated`} value={m.dated}
              onChange={(_, v) => setNestedField('mortgages', i, 'dated', v, MORT_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Recorded" fieldKey={`mortgage[${i}].recorded`} value={m.recorded}
              onChange={(_, v) => setNestedField('mortgages', i, 'recorded', v, MORT_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Consideration" fieldKey={`mortgage[${i}].consideration`} value={m.consideration}
              onChange={(_, v) => setNestedField('mortgages', i, 'consideration', v, MORT_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Maturity Date" fieldKey={`mortgage[${i}].maturity_date`} value={m.maturity_date}
              onChange={(_, v) => setNestedField('mortgages', i, 'maturity_date', v, MORT_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <div style={{ gridColumn: 'span 2' }}>
              <FieldInput label="Lender" fieldKey={`mortgage[${i}].lender`} value={m.lender}
                onChange={(_, v) => setNestedField('mortgages', i, 'lender', v, MORT_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            </div>
            <FieldInput label="MERS Number" fieldKey={`mortgage[${i}].mers_number`} value={m.mers_number}
              onChange={(_, v) => setNestedField('mortgages', i, 'mers_number', v, MORT_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <div />
            <FieldInput label="Borrower" fieldKey={`mortgage[${i}].borrower`} value={m.borrower}
              onChange={(_, v) => setNestedField('mortgages', i, 'borrower', v, MORT_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Trustee" fieldKey={`mortgage[${i}].trustee`} value={m.trustee}
              onChange={(_, v) => setNestedField('mortgages', i, 'trustee', v, MORT_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => addListEntry('mortgages', MORT_TEMPLATE)}>+ Add Mortgage / DOT</button>

      {/* JUDGMENTS / LIENS */}
      <div className="section-divider">Judgments / Liens</div>
      {liens.map((l, i) => (
        <div className="card mb-3" key={i}>
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <span>Lien {i + 1}</span>
            <button className="btn btn-danger btn-sm" onClick={() => setFields(f => ({ ...f, judgments_liens: f.judgments_liens.filter((_, idx) => idx !== i) }))}>Remove</button>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FieldInput label="Document Title" fieldKey={`lien[${i}].document_title`} value={l.document_title}
              onChange={(_, v) => setNestedField('judgments_liens', i, 'document_title', v, LIEN_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Case #" fieldKey={`lien[${i}].case_number`} value={l.case_number}
              onChange={(_, v) => setNestedField('judgments_liens', i, 'case_number', v, LIEN_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Amount" fieldKey={`lien[${i}].amount`} value={l.amount}
              onChange={(_, v) => setNestedField('judgments_liens', i, 'amount', v, LIEN_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Dated" fieldKey={`lien[${i}].dated`} value={l.dated}
              onChange={(_, v) => setNestedField('judgments_liens', i, 'dated', v, LIEN_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Plaintiff" fieldKey={`lien[${i}].plaintiff`} value={l.plaintiff}
              onChange={(_, v) => setNestedField('judgments_liens', i, 'plaintiff', v, LIEN_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
            <FieldInput label="Defendant" fieldKey={`lien[${i}].defendant`} value={l.defendant}
              onChange={(_, v) => setNestedField('judgments_liens', i, 'defendant', v, LIEN_TEMPLATE)} onFlagChange={setFlag} aiFlags={aiFlags} />
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => addListEntry('judgments_liens', LIEN_TEMPLATE)}>+ Add Judgment / Lien</button>

      {/* NAMES SEARCHED */}
      <div className="section-divider">Names Searched</div>
      <div className="card mb-4">
        <div className="card-body">
          <FieldInput label="Search Names (semicolon separated)" fieldKey="names_searched" 
            value={Array.isArray(fields.names_searched) ? fields.names_searched.join('; ') : fields.names_searched}
            onChange={(k, v) => setField(k, v.split(';').map(s => s.trim()).filter(Boolean))} 
            onFlagChange={setFlag} aiFlags={aiFlags} />
        </div>
      </div>

      {/* NOTES */}
      <div className="section-divider">Abstractor Notes</div>
      <div className="card mb-4">
        <div className="card-body">
          <textarea className="form-textarea" rows={4} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Add any notes, exceptions, or items to flag..." />
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="flex justify-between items-center" style={{ paddingBottom: 40 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>← Back to Dashboard</button>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner spinner-dark" /> Saving...</> : 'Save Draft'}
          </button>
          <button className="btn btn-success" onClick={handleDownload} disabled={downloading}>
            {downloading ? <><span className="spinner" /> Generating...</> : '⬇ Download .docx'}
          </button>
        </div>
      </div>
    </div>
  );
}
