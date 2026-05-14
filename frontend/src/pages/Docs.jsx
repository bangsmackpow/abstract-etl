import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const API = '';

export default function Docs() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('rules');
  const [rules, setRules] = useState('');
  const [v1Prompt, setV1Prompt] = useState('');
  const [v4Prompt, setV4Prompt] = useState('');
  const [v4Schema, setV4Schema] = useState('');
  const [revisions, setRevisions] = useState([]);
  const [activeRev, setActiveRev] = useState(null);
  const [revDetail, setRevDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      setError('');
      const [rulesRes, v1Res, v4Res, schemaRes, revsRes] = await Promise.all([
        fetch(`${API}/api/docs/rules`),
        fetch(`${API}/api/docs/prompts/v1`),
        fetch(`${API}/api/docs/prompts/v4`),
        fetch(`${API}/api/docs/schema/v4`),
        fetch(`${API}/api/docs/revisions`),
      ]);

      if (rulesRes.ok) { const d = await rulesRes.json(); setRules(d.content); }
      if (v1Res.ok) { const d = await v1Res.json(); setV1Prompt(d.content); }
      if (v4Res.ok) { const d = await v4Res.json(); setV4Prompt(d.content); }
      if (schemaRes.ok) { const d = await schemaRes.json(); setV4Schema(JSON.stringify(d.schema, null, 2)); }
      if (revsRes.ok) { const d = await revsRes.json(); setRevisions(d.revisions || []); setActiveRev(d.active); }
    } catch (err) {
      setError(`Failed to load docs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadRevision(id) {
    try {
      const res = await fetch(`${API}/api/docs/revisions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setRevDetail(data);
      }
    } catch (err) {
      console.error('Failed to load revision:', err);
    }
  }

  function downloadRevision(revId, fileType) {
    window.open(`${API}/api/docs/revisions/${revId}/download/${fileType}`, '_blank');
  }

  if (loading) return <div className="docs-page"><p className="loading">Loading docs...</p></div>;
  if (error) return <div className="docs-page"><p className="error">{error}</p></div>;

  const tabs = [
    { key: 'rules', label: 'Extraction Rules' },
    { key: 'prompts', label: 'AI Prompts' },
    { key: 'schema', label: 'V4 Schema' },
    { key: 'revisions', label: 'Revision History' },
  ];

  return (
    <div className="docs-page">
      <div className="docs-header">
        <h1>System Documentation</h1>
        <p className="docs-subtitle">Read-only view of active extraction rules, prompts, and revision history</p>
      </div>

      <div className="docs-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`docs-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.key); setRevDetail(null); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="docs-content">
        {activeTab === 'rules' && (
          <div className="docs-panel">
            <div className="docs-panel-header">
              <h2>Extraction Rules</h2>
              <span className="docs-badge">Current</span>
            </div>
            <pre className="docs-markdown">{rules}</pre>
          </div>
        )}

        {activeTab === 'prompts' && (
          <div className="docs-panel">
            <div className="docs-panel-header">
              <h2>V4 Hazelwood Prompt</h2>
              <span className="docs-badge">Active</span>
            </div>
            <pre className="docs-markdown">{v4Prompt}</pre>

            <div className="docs-panel" style={{ marginTop: '2rem' }}>
              <div className="docs-panel-header">
                <h2>V1 Legacy Prompt</h2>
                <span className="docs-badge docs-badge--info">Note</span>
              </div>
              <pre className="docs-markdown">{v1Prompt}</pre>
            </div>
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="docs-panel">
            <div className="docs-panel-header">
              <h2>V4 JSON Schema</h2>
              <span className="docs-badge">Current</span>
            </div>
            <pre className="docs-json">{v4Schema}</pre>
          </div>
        )}

        {activeTab === 'revisions' && !revDetail && (
          <div className="docs-panel">
            <h2>Revision History</h2>
            <p className="docs-rev-intro">Each revision captures a snapshot of the rules and prompts active at that time. Use the timeframe to correlate extraction quality with rule changes.</p>
            {revisions.length === 0 ? (
              <p className="docs-empty">No revisions recorded yet.</p>
            ) : (
              <div className="docs-rev-list">
                {revisions.map((rev) => (
                  <div key={rev.id} className={`docs-rev-card ${rev.id === activeRev ? 'docs-rev-card--active' : ''}`}>
                    <div className="docs-rev-card-header">
                      <div>
                        <h3>{rev.label}</h3>
                        <span className="docs-rev-id">{rev.id}</span>
                        {rev.id === activeRev && <span className="docs-badge docs-badge--active">Active</span>}
                        {rev.status === 'superseded' && <span className="docs-badge docs-badge--old">Superseded</span>}
                      </div>
                      <span className="docs-rev-date">{new Date(rev.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <p className="docs-rev-notes">{rev.notes}</p>
                    <div className="docs-rev-actions">
                      <button className="docs-btn docs-btn--sm" onClick={() => loadRevision(rev.id)}>
                        View Content
                      </button>
                      {Object.keys(rev.files).map((ft) => (
                        <button
                          key={ft}
                          className="docs-btn docs-btn--sm docs-btn--outline"
                          onClick={() => downloadRevision(rev.id, ft)}
                        >
                          Download {ft.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'revisions' && revDetail && (
          <div className="docs-panel">
            <div className="docs-panel-header">
              <button className="docs-btn docs-btn--sm" onClick={() => setRevDetail(null)}>
                ← Back to Revisions
              </button>
              <h2>{revDetail.revision.label}</h2>
              <span className="docs-rev-date">{new Date(revDetail.revision.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <p className="docs-rev-notes">{revDetail.revision.notes}</p>
            {Object.entries(revDetail.files).map(([key, content]) => (
              <div key={key} className="docs-rev-file">
                <h3>{key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</h3>
                <pre className={key.includes('schema') ? 'docs-json' : 'docs-markdown'}>{content}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
