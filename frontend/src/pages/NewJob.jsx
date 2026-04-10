import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractPDF, createJob } from '../services/api';

export default function NewJob() {
  const navigate  = useNavigate();
  const [file, setFile]     = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage]   = useState('upload'); // upload | processing | done
  const [progress, setProgress] = useState(0);
  const [error, setError]   = useState('');

  const handleFile = (f) => {
    if (f?.type !== 'application/pdf') { setError('Please select a PDF file.'); return; }
    setFile(f); setError('');
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    setStage('processing'); setError('');
    try {
      // 1. Upload PDF + run Gemini extraction
      const { fields, aiFlags, filename } = await extractPDF(file, (evt) => {
        setProgress(Math.round((evt.loaded / evt.total) * 40)); // upload = 0-40%
      });
      setProgress(90);

      // 2. Create job record with extracted data
      const job = await createJob({
        property_address: fields.property_address || '',
        borrower_names:   fields.current_vesting_owner || '',
        county:           fields.county || '',
        fields_json:      fields,
        ai_flags_json:    aiFlags,
      });
      setProgress(100);
      setStage('done');

      // 3. Navigate to the edit/review page
      setTimeout(() => navigate(`/jobs/${job.id}`), 600);
    } catch (err) {
      setError(err.response?.data?.message || 'Extraction failed. Please try again.');
      setStage('upload'); setProgress(0);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="flex items-center gap-3 mb-4">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Back</button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue-dark)' }}>New Abstract Job</h1>
      </div>

      <div className="card">
        <div className="card-header">📄 Upload Search Order PDF</div>
        <div className="card-body">
          {error && <div className="alert alert-error">{error}</div>}

          {stage === 'upload' && (
            <>
              <div
                className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => document.getElementById('pdf-input').click()}
              >
                <div className="upload-icon">📋</div>
                {file ? (
                  <>
                    <div style={{ fontWeight: 600, color: 'var(--blue-dark)' }}>{file.name}</div>
                    <div className="upload-text" style={{ marginTop: 4 }}>
                      {(file.size / 1024 / 1024).toFixed(1)} MB — Click to change
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 600 }}>Drop PDF here or click to browse</div>
                    <div className="upload-text">Scanned search order PDFs accepted · Max 50MB</div>
                  </>
                )}
                <input id="pdf-input" type="file" accept="application/pdf" style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])} />
              </div>

              {file && (
                <div className="mt-4">
                  <div className="alert alert-info" style={{ marginBottom: 16 }}>
                    🤖 AI will scan all pages and extract abstract data automatically.
                    You'll review and correct each field before saving.
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}
                    onClick={handleSubmit}>
                    Start Extraction →
                  </button>
                </div>
              )}
            </>
          )}

          {stage === 'processing' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--blue-dark)' }}>
                AI is reading your document...
              </div>
              <div className="text-muted text-sm" style={{ marginBottom: 24 }}>
                Converting pages and extracting data fields. This may take 30–90 seconds for large PDFs.
              </div>
              <div style={{ background: '#eee', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                <div style={{ background: 'var(--blue-mid)', height: '100%', width: `${progress}%`,
                  transition: 'width 0.5s', borderRadius: 8 }} />
              </div>
              <div className="text-sm text-muted mt-2">{progress}%</div>
            </div>
          )}

          {stage === 'done' && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 48 }}>✅</div>
              <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--green)' }}>Extraction complete!</div>
              <div className="text-muted text-sm">Redirecting to review form...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
