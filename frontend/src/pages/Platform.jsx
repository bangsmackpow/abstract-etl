import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getTenants, createTenant, setTenantStatus,
  getTenantJobs, moveJobToTenant, getPlatformAudit,
  getTenantSettings, updateTenantSettings,
} from '../services/api';

const STATUS_LABELS = { draft: 'Draft', needs_review: 'Needs Review', complete: 'Complete' };

export default function Platform() {
  const [activeTab, setActiveTab] = useState('tenants');
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', slug: '', adminName: '', adminEmail: '', adminPassword: '' });

  // Job drill-down
  const [viewingTenant, setViewingTenant] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsSearch, setJobsSearch] = useState('');
  const [jobsStatus, setJobsStatus] = useState('');
  const [moveTarget, setMoveTarget] = useState({}); // jobId -> targetTenantId

  // Audit
  const [audit, setAudit] = useState([]);

  // Per-tenant settings editor
  const [settingsTenant, setSettingsTenant] = useState(null);
  const [settingsMap, setSettingsMap] = useState({});
  const [settingsMsg, setSettingsMsg] = useState('');

  const refreshTenants = useCallback(async () => {
    setLoading(true);
    try {
      setTenants(await getTenants());
    } catch (err) {
      setMsg(`Error loading tenants: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTenants();
  }, [refreshTenants]);

  useEffect(() => {
    if (activeTab === 'audit') {
      getPlatformAudit({ limit: 100 })
        .then(setAudit)
        .catch((err) => setMsg(`Error loading audit: ${err.response?.data?.message || err.message}`));
    }
  }, [activeTab]);

  const loadJobs = useCallback(async (tenantId) => {
    setJobsLoading(true);
    try {
      const params = {};
      if (jobsSearch) params.search = jobsSearch;
      if (jobsStatus) params.status = jobsStatus;
      setJobs((await getTenantJobs(tenantId, params)).items || []);
    } catch (err) {
      setMsg(`Error loading jobs: ${err.response?.data?.message || err.message}`);
    } finally {
      setJobsLoading(false);
    }
  }, [jobsSearch, jobsStatus]);

  useEffect(() => {
    if (viewingTenant) loadJobs(viewingTenant.id);
  }, [viewingTenant, loadJobs]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const payload = { name: form.name, slug: form.slug || undefined };
      if (form.adminEmail && form.adminPassword) {
        payload.adminName = form.adminName || undefined;
        payload.adminEmail = form.adminEmail;
        payload.adminPassword = form.adminPassword;
      }
      await createTenant(payload);
      setForm({ name: '', slug: '', adminName: '', adminEmail: '', adminPassword: '' });
      setMsg('Tenant created successfully');
      refreshTenants();
    } catch (err) {
      setMsg(`Error: ${err.response?.data?.message || 'Failed to create tenant'}`);
    }
  };

  const handleToggleStatus = async (tenant) => {
    const next = tenant.status === 'suspended' ? 'active' : 'suspended';
    if (next === 'suspended' && !window.confirm(
      `Suspend "${tenant.name}"?\n\nAll users in this tenant will immediately lose access. This cannot be undone without reactivating.`
    )) return;
    try {
      await setTenantStatus(tenant.id, next);
      refreshTenants();
    } catch (err) {
      setMsg(`Error: ${err.response?.data?.message || 'Failed to update tenant'}`);
    }
  };

  const handleMove = async (job) => {
    const targetId = moveTarget[job.id];
    if (!targetId) {
      setMsg('Error: choose a destination tenant first.');
      return;
    }
    const target = tenants.find((t) => t.id === targetId);
    if (!window.confirm(
      `Move "${job.propertyAddress || 'this job'}" to "${target?.name}"?\n\nThe job's owner will be reassigned to ${target?.name}'s admin.`
    )) return;
    setMsg('');
    try {
      await moveJobToTenant(job.id, targetId);
      setMsg('Job moved successfully');
      loadJobs(viewingTenant.id);
    } catch (err) {
      setMsg(`Error: ${err.response?.data?.message || 'Failed to move job'}`);
    }
  };

  const formatDate = (ts) => (ts ? new Date(ts).toLocaleDateString() : '—');
  const formatDateTime = (ts) => (ts ? new Date(ts).toLocaleString() : '—');

  const openTenantSettings = async (tenant) => {
    setSettingsMsg('');
    try {
      setSettingsMap(await getTenantSettings(tenant.id));
      setSettingsTenant(tenant);
    } catch (err) {
      setMsg(`Error loading settings: ${err.response?.data?.message || err.message}`);
    }
  };

  const saveTenantSettings = async (e) => {
    e.preventDefault();
    if (!settingsTenant) return;
    setSettingsMsg('');
    try {
      const result = await updateTenantSettings(settingsTenant.id, settingsMap);
      setSettingsMap(result);
      setSettingsMsg('Settings saved');
    } catch (err) {
      setSettingsMsg(`Error: ${err.response?.data?.message || 'Failed to save settings'}`);
    }
  };

  const tabs = [
    { key: 'tenants', label: 'Tenants' },
    { key: 'audit', label: 'Audit Log' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue-dark)' }}>Platform Administration</h1>
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => { setActiveTab(tab.key); setViewingTenant(null); }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {msg && <div className={`alert ${msg.startsWith('Error') ? 'alert-error' : 'alert-info'} mb-4`}>{msg}</div>}

      {activeTab === 'tenants' && !viewingTenant && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="card">
              <div className="card-header">Tenants</div>
              {loading ? (
                <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
                  <span className="spinner spinner-dark" />
                </div>
              ) : tenants.length === 0 ? (
                <div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-mid)' }}>
                  No tenants yet. Create the first tenant to get started.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Slug</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map((t) => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600 }}>{t.name}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.slug || '—'}</td>
                          <td>
                            <span className={`status-badge ${t.status === 'active' ? 'status-complete' : 'status-draft'}`}
                              style={{ textTransform: 'capitalize' }}>
                              {t.status}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDate(t.createdAt)}</td>
                          <td>
                            <div className="flex gap-2">
                              <button className="btn btn-ghost btn-sm" onClick={() => setViewingTenant(t)}>
                                View Jobs
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => openTenantSettings(t)}>
                                Settings
                              </button>
                              <button
                                className={`btn btn-ghost btn-sm ${t.status === 'active' ? 'text-error' : ''}`}
                                onClick={() => handleToggleStatus(t)}
                              >
                                {t.status === 'active' ? 'Suspend' : 'Reactivate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card-header">Create Tenant</div>
              <form className="card-body" onSubmit={handleCreate}>
                <div className="mb-3">
                  <label className="form-label">Company Name *</label>
                  <input className="form-input" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Slug (optional, for future subdomain routing)</label>
                  <input className="form-input" placeholder="my-company" value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#4a5568', margin: '12px 0 8px' }}>
                  Initial Admin (optional)
                </div>
                <div className="mb-3">
                  <label className="form-label">Admin Name</label>
                  <input className="form-input" value={form.adminName}
                    onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Admin Email</label>
                  <input className="form-input" type="email" value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
                </div>
                <div className="mb-4">
                  <label className="form-label">Initial Password</label>
                  <input className="form-input" type="password" value={form.adminPassword}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} />
                </div>
                <button className="btn btn-primary w-full" type="submit">Create Tenant</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tenants' && viewingTenant && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button className="btn btn-ghost btn-sm" onClick={() => setViewingTenant(null)}>← Back</button>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue-dark)' }}>
              {viewingTenant.name} — Jobs
            </h2>
          </div>

          <div className="card mb-4">
            <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input className="form-input" style={{ flex: 1, minWidth: 220 }}
                placeholder="Search address, borrower, county..."
                value={jobsSearch} onChange={(e) => setJobsSearch(e.target.value)} />
              <select className="form-select" style={{ width: 180 }} value={jobsStatus}
                onChange={(e) => setJobsStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="needs_review">Needs Review</option>
                <option value="complete">Complete</option>
              </select>
            </div>
          </div>

          <div className="card">
            {jobsLoading ? (
              <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
                <span className="spinner spinner-dark" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-mid)' }}>
                No jobs found for this tenant.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Address</th>
                      <th>Borrower(s)</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th style={{ minWidth: 230 }}>Move to Tenant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id}>
                        <td style={{ fontWeight: 500 }}>
                          <Link to={`/jobs/${job.id}`}>{job.propertyAddress || '—'}</Link>
                        </td>
                        <td>{job.borrowerNames || '—'}</td>
                        <td>
                          <span className={`status-badge status-${job.status}`}>
                            {STATUS_LABELS[job.status] || job.status}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(job.createdAt)}</td>
                        <td>
                          <div className="flex gap-2">
                            <select
                              className="form-select"
                              style={{ width: 150 }}
                              value={moveTarget[job.id] || ''}
                              onChange={(e) => setMoveTarget((m) => ({ ...m, [job.id]: e.target.value }))}
                            >
                              <option value="">Choose tenant…</option>
                              {tenants.filter((t) => t.id !== viewingTenant.id).map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleMove(job)}>Move</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {settingsTenant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 520, width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue-dark)', margin: 0 }}>
                Settings — {settingsTenant.name}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSettingsTenant(null)}>✕</button>
            </div>
            {settingsMsg && <div className={`alert ${settingsMsg.startsWith('Error') ? 'alert-error' : 'alert-info'} mb-4`}>{settingsMsg}</div>}
            <form onSubmit={saveTenantSettings}>
              <div className="mb-3">
                <label className="form-label">Notification Email</label>
                <input className="form-input" type="email" value={settingsMap.notification_email || ''}
                  onChange={(e) => setSettingsMap((m) => ({ ...m, notification_email: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={settingsMap.daily_report_enabled === 'true'}
                    onChange={(e) => setSettingsMap((m) => ({ ...m, daily_report_enabled: e.target.checked ? 'true' : 'false' }))}
                    style={{ width: 18, height: 18 }} />
                  Enable daily usage report
                </label>
              </div>
              <div className="mb-3">
                <label className="form-label">Daily Report Time (UTC, 24h)</label>
                <input className="form-input" type="time" value={settingsMap.daily_report_time || '00:00'}
                  onChange={(e) => setSettingsMap((m) => ({ ...m, daily_report_time: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label">Default Output Format</label>
                <select className="form-select" value={settingsMap.default_output_format || 'docx-table'}
                  onChange={(e) => setSettingsMap((m) => ({ ...m, default_output_format: e.target.value }))}>
                  <option value="docx-text">DOCX (Text)</option>
                  <option value="docx-table">DOCX (Table)</option>
                  <option value="pdf">PDF</option>
                  <option value="markdown">Markdown</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={settingsMap.enable_completion_emails !== 'false'}
                    onChange={(e) => setSettingsMap((m) => ({ ...m, enable_completion_emails: e.target.checked ? 'true' : 'false' }))}
                    style={{ width: 18, height: 18 }} />
                  Send completion emails
                </label>
              </div>
              <div className="mb-4">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={settingsMap.enable_bulk_import_emails !== 'false'}
                    onChange={(e) => setSettingsMap((m) => ({ ...m, enable_bulk_import_emails: e.target.checked ? 'true' : 'false' }))}
                    style={{ width: 18, height: 18 }} />
                  Send bulk-import summary emails
                </label>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary" type="submit">Save Settings</button>
                <button type="button" className="btn btn-ghost" onClick={() => setSettingsTenant(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header">Recent Platform Actions</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>From → To</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(a.createdAt)}</td>
                    <td>{a.actorName || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.action}</td>
                    <td>{a.targetType}:{a.targetId?.slice(0, 8)}</td>
                    <td>
                      {a.fromTenantId
                        ? `${(tenants.find((t) => t.id === a.fromTenantId)?.name || a.fromTenantId?.slice(0, 8))} → ${(tenants.find((t) => t.id === a.toTenantId)?.name || a.toTenantId?.slice(0, 8))}`
                        : '—'}
                    </td>
                  </tr>
                ))}
                {audit.length === 0 && (
                  <tr><td colSpan={5} style={{ color: 'var(--gray-mid)' }}>No platform actions recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}