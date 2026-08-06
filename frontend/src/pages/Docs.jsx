import { useState, useEffect } from 'react';

const API = '';

export default function Docs() {
  const [activeTab, setActiveTab] = useState('rules');
  const [rules, setRules] = useState('');
  const [v7Prompt, setV7Prompt] = useState('');
  const [v7Schema, setV7Schema] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      setError('');
      const [rulesRes, promptRes, schemaRes] = await Promise.all([
        fetch(`${API}/api/docs/rules`),
        fetch(`${API}/api/docs/prompts/v7`),
        fetch(`${API}/api/docs/schema/v7`),
      ]);

      if (rulesRes.ok) { const d = await rulesRes.json(); setRules(d.content); }
      if (promptRes.ok) { const d = await promptRes.json(); setV7Prompt(d.content); }
      if (schemaRes.ok) { const d = await schemaRes.json(); setV7Schema(JSON.stringify(d.schema, null, 2)); }
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
    { key: 'prompts', label: 'V7 Prompt' },
    { key: 'schema', label: 'V7 Schema' },
  ];

  return (
    <div className="docs-page">
      <div className="docs-header">
        <h1>System Documentation</h1>
        <p className="docs-subtitle">Read-only view of active extraction rules, prompts, and schema</p>
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
              <h2>V7 Extraction Prompt</h2>
              <span className="docs-badge">Active</span>
            </div>
            <pre className="docs-markdown">{v7Prompt}</pre>
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="docs-panel">
            <div className="docs-panel-header">
              <h2>V7 JSON Schema</h2>
              <span className="docs-badge">Current</span>
            </div>
            <pre className="docs-json">{v7Schema}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
