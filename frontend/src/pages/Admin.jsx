import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getJobs, getUsers, getAdminMetrics,
  createUser, changePassword, deleteUser, deleteJob,
  triggerBackup, getBackups, downloadBackup, restoreBackup,
  getSettings, updateSettings,
  getTenantLogo, uploadTenantLogo, clearTenantLogo,
  exportMetricsCsv,
} from '../services/api';

const STATUS_LABELS = { draft: 'Draft', needs_review: 'Needs Review', complete: 'Complete' };

const s = {
  tableWrapper: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  statCard: { padding: '1.5rem', textAlign: 'center' },
  statLabel: { fontSize: '12px', fontWeight: 700, color: 'var(--gray-mid)', textTransform: 'uppercase', marginBottom: '8px' },
  statValue: { fontSize: '32px', fontWeight: 800, color: 'var(--blue-dark)' },
};

export default function Admin() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [backupList, setBackupList] = useState([]);
  const [settingsMap, setSettingsMap] = useState({});
  const [filters, setFilters] = useState({ search: '', status: '', userId: '' });
  const [metricsFrom, setMetricsFrom] = useState('');
  const [metricsTo, setMetricsTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'abstractor' });
  const [userMsg, setUserMsg] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [backupNotes, setBackupNotes] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');
  const [backingUp, setBackingUp] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [logoInfo, setLogoInfo] = useState(null);
  const [logoMsg, setLogoMsg] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => { refreshData(); }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'metrics') refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricsFrom, metricsTo, activeTab]);

  useEffect(() => {
    if (activeTab === 'jobs') {
      setLoading(true);
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.userId) params.userId = filters.userId;
      getJobs(params)
        .then((data) => setJobs(data.items || []))
        .finally(() => setLoading(false));
    }
  }, [filters, activeTab]);

  const refreshData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') setUsers(await getUsers());
      else if (activeTab === 'metrics') {
        const params = {};
        if (metricsFrom) params.from = metricsFrom;
        if (metricsTo) params.to = metricsTo;
        setMetrics(await getAdminMetrics(params));
      }
      else if (activeTab === 'backups') setBackupList(await getBackups());
      else if (activeTab === 'settings') setSettingsMap(await getSettings());
      else if (activeTab === 'branding') setLogoInfo(await getTenantLogo());
      else if (activeTab === 'jobs') setUsers(await getUsers());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserMsg('');
    try {
      await createUser(newUser);
      setNewUser({ name: '', email: '', password: '', role: 'abstractor' });
      setUserMsg('User created successfully');
      refreshData();
    } catch (err) {
      setUserMsg(`Error: ${err.response?.data?.message || 'Failed to create user'}`);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try { await deleteUser(id); refreshData(); }
    catch (err) { alert(err.response?.data?.message || 'Failed to delete user'); }
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Are you sure you want to delete this abstract? This cannot be undone.')) return;
    try { await deleteJob(id); setJobs(jobs.filter((j) => j.id !== id)); }
    catch (err) { alert(err.response?.data?.message || 'Failed to delete job'); }
  };

  const handleChangePass = async (id) => {
    const pass = window.prompt('Enter new password:');
    if (!pass) return;
    try { await changePassword(id, pass); alert('Password updated'); }
    catch (err) { alert(err.response?.data?.message || 'Failed to update password'); }
  };

  const handleManualBackup = async () => {
    setBackingUp(true);
    setBackupMsg('');
    try {
      const record = await triggerBackup(backupNotes || undefined);
      setBackupMsg(`Backup created: ${record.filename}`);
      setBackupNotes('');
      refreshData();
    } catch (err) {
      setBackupMsg(`Backup failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setBackingUp(false);
    }
  };

  const handleDownloadBackup = async (id, filename) => {
    try {
      const blob = await downloadBackup(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRestoreBackup = async (id) => {
    if (!window.confirm(
      '⚠️ RESTORE DATABASE\n\n' +
      'This will replace the current database with the selected backup.\n' +
      'A safety snapshot will be taken before restoring.\n\n' +
      'Are you sure you want to continue?'
    )) return;
    setRestoringId(id);
    try {
      await restoreBackup(id);
      alert('Database restored successfully. The backup has been applied.');
      refreshData();
    } catch (err) {
      alert('Restore failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setRestoringId(null);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsMsg('');
    try {
      const updated = await updateSettings(settingsMap);
      setSettingsMap(updated);
      setSettingsMsg('Settings saved successfully');
    } catch (err) {
      setSettingsMsg(`Error: ${err.response?.data?.message || 'Failed to save settings'}`);
    }
  };

  const setSetting = (key, value) => setSettingsMap((prev) => ({ ...prev, [key]: value }));

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const handleUploadLogo = async (file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setLogoMsg('Error: Logo must be a PNG or JPG image (max 2MB).');
      return;
    }
    setUploadingLogo(true);
    setLogoMsg('');
    try {
      const result = await uploadTenantLogo(file);
      setLogoInfo(result);
      setLogoMsg('Logo updated successfully. It will appear on new DOCX/PDF reports.');
    } catch (err) {
      setLogoMsg(`Error: ${err.response?.data?.message || 'Failed to upload logo'}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleClearLogo = async () => {
    if (!window.confirm('Remove the tenant logo? Reports will be generated without a logo.')) return;
    setLogoMsg('');
    try {
      const result = await clearTenantLogo();
      setLogoInfo(result);
      setLogoMsg('Logo removed.');
    } catch (err) {
      setLogoMsg(`Error: ${err.response?.data?.message || 'Failed to remove logo'}`);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = {};
      if (metricsFrom) params.from = metricsFrom;
      if (metricsTo) params.to = metricsTo;
      await exportMetricsCsv(params);
    } catch (err) {
      alert('CSV export failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  const formatMs = (ms) => {
    if (!ms) return '—';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const tabs = ['jobs', 'users', 'metrics', 'branding', 'backups', 'settings'];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue-dark)' }}>Admin Panel</h1>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab(tab)}
              style={{ textTransform: 'capitalize' }}
            >
              {tab === 'backups' ? 'Backups' : tab === 'settings' ? 'Settings' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── JOBS TAB ── */}
      {activeTab === 'jobs' && (
        <>
          <div className="card mb-4">
            <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input className="form-input" style={{ flex: 1, minWidth: 200 }}
                placeholder="Search address, borrower..." value={filters.search}
                onChange={(e) => set('search', e.target.value)} />
              <select className="form-select" style={{ width: 180 }} value={filters.status}
                onChange={(e) => set('status', e.target.value)}>
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="needs_review">Needs Review</option>
                <option value="complete">Complete</option>
              </select>
              <select className="form-select" style={{ width: 200 }} value={filters.userId}
                onChange={(e) => set('userId', e.target.value)}>
                <option value="">All Users</option>
                {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
              </select>
            </div>
          </div>
          <div className="card">
            {loading ? (
              <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
                <span className="spinner spinner-dark" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-mid)' }}>
                No jobs found.
              </div>
            ) : (
              <div style={s.tableWrapper}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: 'nowrap' }}>Property Address</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Borrower(s)</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Abstractor</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Created</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id}>
                        <td style={{ fontWeight: 500 }}>{job.propertyAddress || '—'}</td>
                        <td>{job.borrowerNames || '—'}</td>
                        <td>{users.find((u) => u.id === job.createdBy)?.name || '—'}</td>
                        <td><span className={`status-badge status-${job.status}`}>{STATUS_LABELS[job.status]}</span></td>
                        <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="flex gap-2">
                            <Link to={`/jobs/${job.id}`} className="btn btn-ghost btn-sm">View</Link>
                            <button className="btn btn-ghost btn-sm text-error"
                              onClick={() => handleDeleteJob(job.id)} title="Delete Job">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="card">
              <div className="card-header">Existing Users</div>
              <div style={s.tableWrapper}>
                <table className="data-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-ghost btn-sm"
                              onClick={() => handleChangePass(u.id)}>🔑</button>
                            <button className="btn btn-ghost btn-sm text-error"
                              onClick={() => handleDeleteUser(u.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div>
            <div className="card">
              <div className="card-header">Add New User</div>
              <form className="card-body" onSubmit={handleCreateUser}>
                {userMsg && <div className={`alert ${userMsg.startsWith('Error') ? 'alert-error' : 'alert-info'} mb-4`}>{userMsg}</div>}
                <div className="mb-3">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" required value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" required value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Initial Password</label>
                  <input className="form-input" type="password" required value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                </div>
                <div className="mb-4">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                    <option value="abstractor">Abstractor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button className="btn btn-primary w-full" type="submit">Create User</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── METRICS TAB ── */}
      {activeTab === 'metrics' && (
        <div>
          <div className="card mb-4">
            <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label">From</label>
                <input className="form-input" type="date" style={{ width: 170 }} value={metricsFrom}
                  onChange={(e) => setMetricsFrom(e.target.value)} />
              </div>
              <div>
                <label className="form-label">To</label>
                <input className="form-input" type="date" style={{ width: 170 }} value={metricsTo}
                  onChange={(e) => setMetricsTo(e.target.value)} />
              </div>
              <button className="btn btn-outline" onClick={handleExportCsv} disabled={exporting}
                style={{ marginLeft: 'auto' }}>
                {exporting ? 'Exporting...' : '⬇ Export CSV'}
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner spinner-dark" /></div>
          ) : !metrics ? (
            <div className="alert alert-error">Failed to load metrics.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="card">
                  <div style={s.statCard}>
                    <div style={s.statLabel}>Total Abstracts</div>
                    <div style={{ ...s.statValue, color: 'var(--blue-dark)' }}>{metrics.overall?.totalJobs || 0}</div>
                  </div>
                </div>
                <div className="card">
                  <div style={s.statCard}>
                    <div style={s.statLabel}>Avg. AI Time</div>
                    <div style={{ ...s.statValue, color: 'var(--green)' }}>{formatMs(metrics.processing?.avg)}</div>
                  </div>
                </div>
                <div className="card">
                  <div style={s.statCard}>
                    <div style={s.statLabel}>P95 AI Time</div>
                    <div style={{ ...s.statValue, color: 'var(--orange, #d97706)' }}>{formatMs(metrics.processing?.p95)}</div>
                  </div>
                </div>
                <div className="card">
                  <div style={s.statCard}>
                    <div style={s.statLabel}>Max AI Time</div>
                    <div style={{ ...s.statValue, color: 'var(--red, #dc2626)' }}>{formatMs(metrics.processing?.max)}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="card">
                  <div className="card-header">Jobs by Status</div>
                  <div className="card-body">
                    {metrics.statusBreakdown?.map((r) => (
                      <div key={r.status} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{STATUS_LABELS[r.status] || r.status}</span>
                          <span style={{ fontWeight: 700 }}>{r.count}</span>
                        </div>
                        <div style={{ background: '#eee', borderRadius: 4, height: 10 }}>
                          <div style={{
                            background: r.status === 'complete' ? 'var(--green, #16a34a)' : r.status === 'needs_review' ? '#d97706' : 'var(--gray-mid, #6b7280)',
                            height: '100%', borderRadius: 4,
                            width: `${metrics.overall?.totalJobs ? Math.round((r.count / metrics.overall.totalJobs) * 100) : 0}%`,
                          }} />
                        </div>
                      </div>
                    ))}
                    {!metrics.statusBreakdown?.length && <div className="text-muted">No jobs in this range.</div>}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">Volume over Time</div>
                  <div className="card-body">
                    {metrics.volumeOverTime?.length ? (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
                        {metrics.volumeOverTime.map((d) => (
                          <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                            <div style={{ fontSize: 10, marginBottom: 2 }}>{d.count}</div>
                            <div title={`${d.day}: ${d.count}`} style={{
                              width: '100%', background: 'var(--blue-mid, #2563eb)', borderRadius: '3px 3px 0 0',
                              height: `${Math.max(4, Math.round((d.count / Math.max(...metrics.volumeOverTime.map((x) => x.count))) * 90))}%`,
                            }} />
                            <div style={{ fontSize: 9, color: 'var(--gray-mid)', marginTop: 4, transform: 'rotate(-35deg)', whiteSpace: 'nowrap' }}>
                              {String(d.day).slice(5)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted">No jobs in this range.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card mb-6">
                <div className="card-header">Performance by Person</div>
                <div style={s.tableWrapper}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Name</th><th>Jobs</th><th>Avg. Time</th><th>Max Time</th></tr>
                    </thead>
                    <tbody>
                      {metrics.perUser?.map((u) => (
                        <tr key={u.userId}>
                          <td style={{ fontWeight: 600 }}>{u.userName}</td>
                          <td>{u.jobCount}</td>
                          <td>{formatMs(u.avgProcessingTime)}</td>
                          <td>{formatMs(u.maxProcessingTime)}</td>
                        </tr>
                      ))}
                      {!metrics.perUser?.length && (
                        <tr><td colSpan={4} style={{ color: 'var(--gray-mid)' }}>No data in this range.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <div className="card-header">Slowest Extractions</div>
                <div style={s.tableWrapper}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Address</th><th>Borrower</th><th>Status</th><th>AI Time</th></tr>
                    </thead>
                    <tbody>
                      {metrics.slowJobs?.map((j) => (
                        <tr key={j.id}>
                          <td style={{ fontWeight: 500 }}>{j.propertyAddress || '—'}</td>
                          <td>{j.borrowerNames || '—'}</td>
                          <td><span className={`status-badge status-${j.status}`}>{STATUS_LABELS[j.status] || j.status}</span></td>
                          <td>{formatMs(j.processingTimeMs)}</td>
                        </tr>
                      ))}
                      {!metrics.slowJobs?.length && (
                        <tr><td colSpan={4} style={{ color: 'var(--gray-mid)' }}>No data in this range.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── BRANDING TAB ── */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">Current Tenant Logo</div>
            <div className="card-body">
              {logoInfo?.hasLogo ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', background: '#f8f9fb', borderRadius: 8, marginBottom: 16 }}>
                    <img
                      src={logoInfo.dataUri}
                      alt="Tenant logo"
                      style={{ maxWidth: 320, maxHeight: 120, objectFit: 'contain' }}
                    />
                  </div>
                  <div className="text-muted text-sm" style={{ marginBottom: 16 }}>
                    Type: {logoInfo.mime || 'unknown'} · This logo is embedded at the top of new DOCX and PDF reports.
                  </div>
                  <button className="btn btn-ghost btn-sm text-error" onClick={handleClearLogo}>
                    Remove Logo
                  </button>
                </>
              ) : (
                <div className="text-muted" style={{ textAlign: 'center', padding: 24 }}>
                  No logo set. Reports are generated without a logo until you upload one.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">Upload / Replace Logo</div>
            <div className="card-body">
              {logoMsg && <div className={`alert ${logoMsg.startsWith('Error') ? 'alert-error' : 'alert-info'} mb-4`}>{logoMsg}</div>}
              <div className="mb-3">
                <label className="form-label">Logo image</label>
                <input
                  className="form-input"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => handleUploadLogo(e.target.files[0])}
                />
              </div>
              <div className="text-muted text-sm">
                PNG or JPG, up to 2MB. Uploading replaces the current tenant logo immediately.
              </div>
              {uploadingLogo && (
                <div className="text-sm text-muted mt-3">
                  <span className="spinner spinner-dark" style={{ marginRight: 8 }} />
                  Uploading...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BACKUPS TAB ── */}
      {activeTab === 'backups' && (
        <div>
          <div className="card mb-4">
            <div className="card-body">
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Manual Backup</div>
              <div className="text-muted text-sm" style={{ marginBottom: 12 }}>
                Creates a snapshot of the database immediately.
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="Add a note (e.g. reason for backup)..."
                  value={backupNotes}
                  onChange={(e) => setBackupNotes(e.target.value)}
                />
                <button className="btn btn-primary" onClick={handleManualBackup} disabled={backingUp}
                  style={{ whiteSpace: 'nowrap' }}>
                  {backingUp ? 'Backing up...' : 'Create Backup'}
                </button>
              </div>
            </div>
            {backupMsg && <div className="card-body pt-0">
              <div className={`alert ${backupMsg.includes('failed') ? 'alert-error' : 'alert-info'}`}>{backupMsg}</div>
            </div>}
          </div>

          <div className="card">
            <div className="card-header">
              <span>Backup History</span>
              <span className="text-muted text-sm" style={{ marginLeft: 8 }}>
                ({backupList.length} total)
              </span>
            </div>
            {loading ? (
              <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
                <span className="spinner spinner-dark" />
              </div>
            ) : backupList.length === 0 ? (
              <div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-mid)' }}>
                No backups yet.
              </div>
            ) : (
              <div style={s.tableWrapper}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Size</th>
                      <th>Status</th>
                      <th>Notes</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backupList.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {b.filename}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatBytes(b.sizeBytes)}</td>
                        <td>
                          <span className={`status-badge ${b.status === 'completed' ? 'status-complete' : 'status-draft'}`}
                            style={{ textTransform: 'capitalize' }}>
                            {b.status}
                          </span>
                        </td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', color: b.notes === 'auto' ? 'var(--gray-mid)' : 'inherit' }}>
                          {b.notes || '—'}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {b.createdAt ? new Date(b.createdAt).toLocaleString() : '—'}
                        </td>
                        <td>
                          <div className="flex gap-2" style={{ whiteSpace: 'nowrap' }}>
                            {b.status === 'completed' && (
                              <>
                                <button className="btn btn-ghost btn-sm"
                                  onClick={() => handleDownloadBackup(b.id, b.filename)}
                                  title="Download Backup">
                                  ⬇️
                                </button>
                                <button className="btn btn-ghost btn-sm text-error"
                                  onClick={() => handleRestoreBackup(b.id)}
                                  disabled={restoringId === b.id}
                                  title="Restore Database from this backup">
                                  {restoringId === b.id ? '...' : '↩️'}
                                </button>
                              </>
                            )}
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

      {/* ── SETTINGS TAB ── */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">Email Configuration</div>
            <form className="card-body" onSubmit={handleSaveSettings}>
              <div className="mb-3">
                <label className="form-label">SMTP Host</label>
                <input className="form-input" placeholder="smtp.example.com"
                  value={settingsMap.smtp_host || ''} onChange={(e) => setSetting('smtp_host', e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">SMTP Port</label>
                <input className="form-input" placeholder="587"
                  value={settingsMap.smtp_port || ''} onChange={(e) => setSetting('smtp_port', e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">SMTP Username</label>
                <input className="form-input" placeholder="user@example.com"
                  value={settingsMap.smtp_user || ''} onChange={(e) => setSetting('smtp_user', e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">SMTP Password</label>
                <input className="form-input" type="password" placeholder="(hidden, enter to change)"
                  value={settingsMap.smtp_pass || ''} onChange={(e) => setSetting('smtp_pass', e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">From Address</label>
                <input className="form-input" placeholder="noreply@example.com"
                  value={settingsMap.smtp_from || ''} onChange={(e) => setSetting('smtp_from', e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Admin Notification Email</label>
                <input className="form-input" type="email" placeholder="admin@example.com"
                  value={settingsMap.admin_email || ''} onChange={(e) => setSetting('admin_email', e.target.value)} />
              </div>
              {/* spacer for the button at bottom */}
            </form>
          </div>

          <div className="card">
            <div className="card-header">Backup Configuration</div>
            <form className="card-body" onSubmit={handleSaveSettings}>
              <div className="mb-3">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox"
                    checked={settingsMap.backup_enabled === 'true'}
                    onChange={(e) => setSetting('backup_enabled', e.target.checked ? 'true' : 'false')}
                    style={{ width: 18, height: 18 }} />
                  Enable Automated Backups
                </label>
              </div>
              <div className="mb-3">
                <label className="form-label">Backup Interval (minutes)</label>
                <input className="form-input" type="number" min="5" placeholder="60"
                  value={settingsMap.backup_interval_minutes || ''}
                  onChange={(e) => setSetting('backup_interval_minutes', e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Retention (days)</label>
                <input className="form-input" type="number" min="1" placeholder="30"
                  value={settingsMap.backup_retention_days || ''}
                  onChange={(e) => setSetting('backup_retention_days', e.target.value)} />
              </div>
              <div className="mt-4">
                <button className="btn btn-primary w-full" type="submit" onClick={handleSaveSettings}>
                  Save All Settings
                </button>
              </div>
              {settingsMsg && <div className={`alert ${settingsMsg.includes('Error') ? 'alert-error' : 'alert-info'} mt-4`}>{settingsMsg}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
