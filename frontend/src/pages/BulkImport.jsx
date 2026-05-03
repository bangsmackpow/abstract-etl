import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractBulkPDFs } from '../services/api';

export default function BulkImport() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState('upload');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [version, setVersion] = useState('v2');
  const [results, setResults] = useState(null);

  const addFiles = (newFiles) => {
    const pdfs = Array.from(newFiles).filter((f) => f.type === 'application/pdf');
    if (pdfs.length === 0) {
      setError('Please select PDF files only.');
      return;
    }
    setFiles((prev) => [...prev, ...pdfs]);
    setError('');
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const removeFile = (i) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setStage('processing');
    setError('');

    try {
      const result = await extractBulkPDFs(files, version);
      setResults(result);
      setProgress(100);
      setStage('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk import failed. Please try again.');
      setStage('upload');
      setProgress(0);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="flex items-center gap-3 mb-4">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue-dark)' }}>
          Bulk Import
        </h1>
      </div>

      <div className="card">
        <div className="card-header">Upload Multiple PDFs</div>
        <div className="card-body">
          {error && <div className="alert alert-error">{error}</div>}

          {stage === 'upload' && (
            <>
              <div className="mb-4">
                <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>
                  Extraction Standard:
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    className={`btn ${version === 'v1' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setVersion('v1')}
                    style={{ flex: 1 }}
                  >
                    V1 (Legacy)
                  </button>
                  <button
                    className={`btn ${version === 'v2' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setVersion('v2')}
                    style={{ flex: 1 }}
                  >
                    V2 (ProTitleUSA)
                  </button>
                </div>
              </div>

              <div
                className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => document.getElementById('bulk-pdf-input').click()}
              >
                <div style={{ fontSize: 48, marginBottom: 8 }}>📂</div>
                <div style={{ fontWeight: 600 }}>Drop PDFs here or click to browse</div>
                <div className="upload-text">Multiple files accepted · Max 50MB each</div>
                <input
                  id="bulk-pdf-input"
                  type="file"
                  multiple
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {files.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2" style={{ fontWeight: 600, color: 'var(--blue-dark)' }}>
                    {files.length} file(s) selected:
                  </div>
                  <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
                    {files.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 12px', background: '#f8f9fa', borderRadius: 6, marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {f.name}
                        </span>
                        <span className="text-muted text-sm" style={{ margin: '0 12px', whiteSpace: 'nowrap' }}>
                          {(f.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                        <button className="btn btn-ghost btn-sm" onClick={() => removeFile(i)}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: 12 }}
                    onClick={handleSubmit}
                  >
                    Process {files.length} File(s) →
                  </button>
                </div>
              )}
            </>
          )}

          {stage === 'processing' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--blue-dark)' }}>
                Processing {files.length} file(s)...
              </div>
              <div className="text-muted text-sm" style={{ marginBottom: 24 }}>
                Each file is extracted and saved as a draft. A summary email will be sent when complete.
              </div>
              <div style={{ background: '#eee', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                <div
                  style={{
                    background: 'var(--blue-mid)', height: '100%',
                    width: `${progress}%`, transition: 'width 0.5s', borderRadius: 8,
                  }}
                />
              </div>
              <div className="text-sm text-muted mt-2">{progress}%</div>
            </div>
          )}

          {stage === 'done' && results && (
            <div>
              <div style={{ textAlign: 'center', padding: '20px 20px 10px' }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--green)' }}>
                  Import Complete
                </div>
                <div className="text-muted text-sm mb-4">
                  {results.notificationSent
                    ? 'A summary email has been sent.'
                    : 'Email notification not sent (SMTP not configured).'}
                </div>
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {results.results.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', background: r.status === 'created' ? '#f0faf0' : '#fef0ef',
                      borderRadius: 6, marginBottom: 4,
                    }}
                  >
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.filename}
                      </div>
                      <div className="text-muted text-sm">
                        {r.status === 'created' ? r.propertyAddress || 'PENDING ADDRESS' : r.error}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 10,
                      background: r.status === 'created' ? '#d4edda' : '#f8d7da',
                      color: r.status === 'created' ? '#155724' : '#721c24',
                      whiteSpace: 'nowrap', marginLeft: 12,
                    }}>
                      {r.status === 'created' ? 'Imported' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-3">
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/')}>
                  Back to Dashboard
                </button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => {
                  setFiles([]); setResults(null); setStage('upload'); setProgress(0);
                }}>
                  Import More
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
