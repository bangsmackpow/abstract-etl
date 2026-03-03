import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getJobs, getAdminUsers } from '../services/api';

const STATUS_LABELS = { draft: 'Draft', needs_review: 'Needs Review', complete: 'Complete' };

export default function Admin() {
  const [jobs, setJobs]       = useState([]);
  const [users, setUsers]     = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', userId: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminUsers().then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.search)  params.search  = filters.search;
    if (filters.status)  params.status  = filters.status;
    if (filters.userId)  params.userId  = filters.userId;
    getJobs(params)
      .then(data => setJobs(data.items || []))
      .finally(() => setLoading(false));
  }, [filters]);

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue-dark)', marginBottom: 16 }}>
        Admin — All Jobs
      </h1>

      <div className="card mb-4">
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input className="form-input" style={{ flex: 1, minWidth: 200 }} placeholder="Search address, borrower..."
            value={filters.search} onChange={e => set('search', e.target.value)} />
          <select className="form-select" style={{ width: 180 }} value={filters.status} onChange={e => set('status', e.target.value)}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="needs_review">Needs Review</option>
            <option value="complete">Complete</option>
          </select>
          <select className="form-select" style={{ width: 200 }} value={filters.userId} onChange={e => set('userId', e.target.value)}>
            <option value="">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
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
          <table className="data-table">
            <thead>
              <tr>
                <th>Property Address</th>
                <th>Borrower(s)</th>
                <th>County</th>
                <th>Abstractor</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id}>
                  <td style={{ fontWeight: 500 }}>{job.property_address || '—'}</td>
                  <td>{job.borrower_names || '—'}</td>
                  <td>{job.county || '—'}</td>
                  <td>{job.expand?.created_by?.name || job.expand?.created_by?.email || '—'}</td>
                  <td><span className={`status-badge status-${job.status}`}>{STATUS_LABELS[job.status]}</span></td>
                  <td>{new Date(job.created).toLocaleDateString()}</td>
                  <td><Link to={`/jobs/${job.id}`} className="btn btn-ghost btn-sm">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
