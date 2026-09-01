import { useState, useEffect } from 'react';
import { getTenants, createTenant, setTenantStatus } from '../services/api';

export default function Platform() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  useEffect(() => {
    refreshTenants();
  }, []);

  const refreshTenants = async () => {
    setLoading(true);
    try {
      setTenants(await getTenants());
    } catch (err) {
      setMsg(`Error loading tenants: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

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

  const formatDate = (ts) => (ts ? new Date(ts).toLocaleDateString() : '—');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue-dark)' }}>Platform Administration</h1>
        <span className="text-muted text-sm">Provision and manage tenants</span>
      </div>

      {msg && <div className={`alert ${msg.startsWith('Error') ? 'alert-error' : 'alert-info'} mb-4`}>{msg}</div>}

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
                          <button
                            className={`btn btn-ghost btn-sm ${t.status === 'active' ? 'text-error' : ''}`}
                            onClick={() => handleToggleStatus(t)}
                          >
                            {t.status === 'active' ? 'Suspend' : 'Reactivate'}
                          </button>
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
    </div>
  );
}