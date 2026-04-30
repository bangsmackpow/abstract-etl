import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJob, updateJob, downloadDocx, downloadMarkdown, deleteJob } from '../services/api';
import AbstractForm from '../components/AbstractForm';
import { useAuth } from '../hooks/useAuth';

export default function EditJob() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [job, setJob] = useState(null);
  const [fields, setFields] = useState({});
  const [aiFlags, setAiFlags] = useState({});
  const [status, setStatus] = useState('draft');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingMd, setDownloadingMd] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getJob(id)
      .then((j) => {
        setJob(j);
        setFields(j.fieldsJson || {});
        setAiFlags(j.aiFlagsJson || {});
        setStatus(j.status || 'draft');
        setNotes(j.notes || '');
      })
      .catch(() => setError('Failed to load job.'));
  }, [id]);

  const handleFieldChange = (path, value) => {
    setFields((prev) => {
      const newFields = { ...prev };
      const parts = path.split('.');
      let current = newFields;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          // If it's an array index (e.g., chain_of_title[0])
          const arrayMatch = part.match(/(.+)\[(\d+)\]/);
          if (arrayMatch) {
            const [, name, index] = arrayMatch;
            if (!current[name]) current[name] = [];
            if (!current[name][index]) current[name][index] = {};
            current = current[name][index];
          } else {
            current[part] = {};
            current = current[part];
          }
        } else {
          current = current[part];
        }
      }
      current[parts[parts.length - 1]] = value;
      return newFields;
    });
  };

  const handleFlagChange = (path, flag) => {
    setAiFlags((prev) => ({ ...prev, [path]: flag }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateJob(id, {
        fields_json: fields,
        ai_flags_json: aiFlags,
        status,
        notes,
        property_address: fields.order_info?.property_address || job.propertyAddress,
        county: fields.order_info?.county || job.county,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    try {
      await updateJob(id, { fields_json: fields, ai_flags_json: aiFlags, status, notes });
      await downloadDocx(id, fields.order_info?.property_address || job.propertyAddress);
    } catch {
      setError('Word download failed.');
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleDownloadMd = async () => {
    setDownloadingMd(true);
    try {
      await updateJob(id, { fields_json: fields, ai_flags_json: aiFlags, status, notes });
      await downloadMarkdown(id, fields.order_info?.property_address || job.propertyAddress);
    } catch {
      setError('Markdown download failed.');
    } finally {
      setDownloadingMd(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this abstract? This cannot be undone.'))
      return;
    try {
      await deleteJob(id);
      navigate('/');
    } catch {
      setError('Delete failed.');
    }
  };

  if (!job && !error)
    return (
      <div className="card card-body" style={{ marginTop: 20, textAlign: 'center' }}>
        <span className="spinner spinner-dark" /> Loading job...
      </div>
    );

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
            ← Dashboard
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue-dark)' }}>
            {fields.order_info?.property_address || job?.propertyAddress || 'Edit Job'}
          </h1>
        </div>
        <div className="flex gap-2 items-center">
          <select
            className="form-select"
            style={{ width: 160 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="needs_review">Needs Review</option>
            <option value="complete">Complete</option>
          </select>
          {saved && (
            <span className="text-sm" style={{ color: 'var(--green)' }}>
              ✓ Saved
            </span>
          )}
          {error && (
            <span className="text-sm" style={{ color: 'var(--red)' }}>
              {error}
            </span>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {isAdmin && (
            <button className="btn btn-ghost text-error" onClick={handleDelete} title="Delete Job">
              🗑️ Delete
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button className="btn btn-success" onClick={handleDownloadDocx} disabled={downloadingDocx}>
          {downloadingDocx ? 'Generating...' : '⬇ Download Word (.docx)'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={handleDownloadMd}
          disabled={downloadingMd}
          style={{ border: '1px solid #ddd' }}
        >
          {downloadingMd ? 'Generating...' : '⬇ Download Markdown (.md)'}
        </button>
      </div>

      <div className="alert alert-info text-sm mb-6">
        🤖 <strong>AI-extracted</strong> fields are marked. You can choose{' '}
        <strong>Alternatives ▼</strong> if the detection was ambiguous.
      </div>

      <div className="card mb-6">
        <div className="card-body">
          <AbstractForm
            fields={fields}
            aiFlags={aiFlags}
            onFieldChange={handleFieldChange}
            onFlagChange={handleFlagChange}
            templateVersion={job?.templateVersion}
          />
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="flex justify-between items-center" style={{ paddingBottom: 60 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <div className="flex gap-2">
          {isAdmin && (
            <button className="btn btn-ghost text-error" onClick={handleDelete}>
              Delete Abstract
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save and Exit'}
          </button>
        </div>
      </div>
    </div>
  );
}
