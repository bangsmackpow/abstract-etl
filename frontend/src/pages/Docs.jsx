import { useState, useEffect } from 'react';

const API = '';

export default function Docs() {
  const [activeTab, setActiveTab] = useState('rules');
  const [rules, setRules] = useState('');
  const [prompts, setPrompts] = useState({ v7: '', v9: '' });
  const [schemas, setSchemas] = useState({ v7: '', v9: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      setError('');
      const [rulesRes, v7p, v9p, v7s, v9s] = await Promise.all([
        fetch(`${API}/api/docs/rules`),
        fetch(`${API}/api/docs/prompts/v7`),
        fetch(`${API}/api/docs/prompts/v9`),
        fetch(`${API}/api/docs/schema/v7`),
        fetch(`${API}/api/docs/schema/v9`),
      ]);

      if (rulesRes.ok) { const d = await rulesRes.json(); setRules(d.content); }
      if (v7p.ok) { const d = await v7p.json(); setPrompts((p) => ({ ...p, v7: d.content })); }
      if (v9p.ok) { const d = await v9p.json(); setPrompts((p) => ({ ...p, v9: d.content })); }
      if (v7s.ok) { const d = await v7s.json(); setSchemas((s) => ({ ...s, v7: JSON.stringify(d.schema, null, 2) })); }
      if (v9s.ok) { const d = await v9s.json(); setSchemas((s) => ({ ...s, v9: JSON.stringify(d.schema, null, 2) })); }
    } catch (err) {
      setError(`Failed to load docs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="docs-page"><p className="loading">Loading docs...</p></div>;
  if (error) return <div className="docs-page"><p className="error">{error}</p></div>;

  const tabs = [
    { key: 'rules', label: 'Extraction Rules' },
    { key: 'prompts', label: 'Prompts' },
    { key: 'schema', label: 'Schemas' },
  ];

  const VersionBadge = ({ version }) => (
    <span className={`docs-badge ${version === 'v9' ? '' : ''}`}>
      {version === 'v9' ? 'Current (V9)' : 'V7 (Legacy)'}
    </span>
  );

  const Panel = ({ title, badge, content, json = false }) => (
    <div className="docs-panel">
      <div className="docs-panel-header">
        <h2>{title}</h2>
        {badge}
      </div>
      <pre className={json ? 'docs-json' : 'docs-markdown'}>{content}</pre>
    </div>
  );

  return (
    <div className="docs-page">
      <div className="docs-header">
        <h1>System Documentation</h1>
        <p className="docs-subtitle">Read-only view of extraction rules, prompts, and schemas — V9 (current) and V7 (legacy) side by side</p>
      </div>

      <div className="docs-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`docs-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="docs-content">
        {activeTab === 'rules' && (
          <Panel
            title="Extraction Rules"
            badge={<span className="docs-badge">Current (V9)</span>}
            content={rules}
          />
        )}

        {activeTab === 'prompts' && (
          <div className="docs-split">
            <Panel
              title="V9 Extraction Prompt"
              badge={<VersionBadge version="v9" />}
              content={prompts.v9 || 'V9 prompt not available.'}
            />
            <Panel
              title="V7 Extraction Prompt"
              badge={<VersionBadge version="v7" />}
              content={prompts.v7 || 'V7 prompt not available.'}
            />
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="docs-split">
            <Panel
              title="V9 JSON Schema"
              badge={<VersionBadge version="v9" />}
              content={schemas.v9 || 'V9 schema not available.'}
              json
            />
            <Panel
              title="V7 JSON Schema"
              badge={<VersionBadge version="v7" />}
              content={schemas.v7 || 'V7 schema not available.'}
              json
            />
          </div>
        )}
      </div>
    </div>
  );
}