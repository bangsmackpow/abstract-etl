import { useState, useEffect } from 'react';
import { getDocRules, getDocPrompt, getDocSchema } from '../services/api';

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
        getDocRules(),
        getDocPrompt('v7'),
        getDocPrompt('v9'),
        getDocSchema('v7'),
        getDocSchema('v9'),
      ]);

      setRules(rulesRes.content);
      setPrompts({ v7: v7p.content, v9: v9p.content });
      setSchemas({ v7: JSON.stringify(v7s.schema, null, 2), v9: JSON.stringify(v9s.schema, null, 2) });
    } catch (err) {
      setError(`Failed to load docs: ${err.response?.data?.message || err.message}`);
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