import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getJobs } from '../services/api';

const STATUS_LABELS = { draft: 'Draft', needs_review: 'Needs Review', complete: 'Complete' };

export default function Dashboard() {
  const [jobs, setJobs]     = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const navigate = useNavigate();

  const fetchJobs = async () => {
    setLoading(true); setError('');
    try {
      const data = await getJobs({ search: search || undefined, status: status || undefined });
      setJobs(data.items || []);
    } catch (err) {
      setError('Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, [search, status]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue-dark)' }}>My Jobs</h1>
        <Link to="/jobs/new" className="btn btn-primary">+ New Job</Link>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{ display: 'flex', gap: 12 }}>
          <input className="form-input" style={{ flex: 1 }} placeholder="Search by address, borrower, or county..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-select" style={{ width: 180 }} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="needs_review">Needs Review</option>
            <option value="complete">Complete</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
            <span className="spinner spinner-dark" /> Loading...
          </div>
        ) : jobs.length === 0 ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-mid)' }}>
            {search || status ? 'No jobs match your filters.' : 'No jobs yet. Click "+ New Job" to get started.'}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Property Address</th>
                <th>Borrower(s)</th>
                <th>County</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/jobs/${job.id}`)}>
                  <td style={{ fontWeight: 500 }}>{job.property_address || '—'}</td>
                  <td>{job.borrower_names || '—'}</td>
                  <td>{job.county || '—'}</td>
                  <td><span className={`status-badge status-${job.status}`}>{STATUS_LABELS[job.status] || job.status}</span></td>
                  <td>{new Date(job.created).toLocaleDateString()}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <Link to={`/jobs/${job.id}`} className="btn btn-ghost btn-sm">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
