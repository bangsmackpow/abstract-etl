import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getJobs, deleteJob } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const STATUS_LABELS = { draft: 'Draft', needs_review: 'Needs Review', complete: 'Complete' };

const REFRESH_INTERVALS = { 60: 60000, 30: 30000, 5: 5000, off: null };
const REFRESH_STORAGE_KEY = 'printQueueRefreshInterval';

const getInitialRefreshInterval = () => {
  try {
    const stored = localStorage.getItem(REFRESH_STORAGE_KEY);
    if (stored && stored in REFRESH_INTERVALS) return stored;
  } catch {
    return '60';
  }
  return '60';
};

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(getInitialRefreshInterval);
  const [countdown, setCountdown] = useState(() => (REFRESH_INTERVALS[getInitialRefreshInterval()] || 0) / 1000);
  const navigate = useNavigate();

  const fetchJobs = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
        setError('');
      }
      try {
        const data = await getJobs({ search: search || undefined, status: status || undefined });
        setJobs(data.items || []);
      } catch (err) {
        if (!silent) setError('Failed to load jobs.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [search, status]
  );

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this abstract? This cannot be undone.'))
      return;
    try {
      await deleteJob(id);
      setJobs(jobs.filter((j) => j.id !== id));
    } catch (err) {
      alert('Failed to delete job.');
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    localStorage.setItem(REFRESH_STORAGE_KEY, refreshInterval);
  }, [refreshInterval]);

  useEffect(() => {
    const ms = REFRESH_INTERVALS[refreshInterval];
    if (!ms) {
      setCountdown(0);
      return undefined;
    }
    setCountdown(ms / 1000);
    const tick = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [refreshInterval, fetchJobs]);

  useEffect(() => {
    const ms = REFRESH_INTERVALS[refreshInterval];
    if (!ms) return undefined;
    const id = setInterval(() => {
      fetchJobs({ silent: true });
      setCountdown(ms / 1000);
    }, ms);
    return () => clearInterval(id);
  }, [refreshInterval, fetchJobs]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue-dark)' }}>My Jobs</h1>
        <Link to="/jobs/new" className="btn btn-primary">
          + New Job
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div
          className="card-body"
          style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <input
            className="form-input"
            style={{ flex: 1, minWidth: 220 }}
            placeholder="Search by address, borrower, or county..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-select"
            style={{ width: 180 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="needs_review">Needs Review</option>
            <option value="complete">Complete</option>
          </select>
          <div className="flex" style={{ gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
            <select
              className="form-select"
              style={{ width: 165 }}
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(e.target.value)}
              title="Auto-refresh the job list"
            >
              <option value="60">Auto-refresh: 60s</option>
              <option value="30">Auto-refresh: 30s</option>
              <option value="5">Auto-refresh: 5s</option>
              <option value="off">Auto-refresh: Off</option>
            </select>
            {refreshInterval !== 'off' && (
              <span style={{ fontSize: 13, color: 'var(--gray-mid)', whiteSpace: 'nowrap' }}>
                Refresh in {countdown}s
              </span>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fetchJobs({ silent: true })}
              title="Refresh now"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
            <span className="spinner spinner-dark" /> Loading...
          </div>
        ) : jobs.length === 0 ? (
          <div
            className="card-body"
            style={{ textAlign: 'center', padding: 40, color: 'var(--gray-mid)' }}
          >
            {search || status
              ? 'No jobs match your filters.'
              : 'No jobs yet. Click "+ New Job" to get started.'}
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
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <td style={{ fontWeight: 500 }}>{job.propertyAddress || '—'}</td>
                  <td>{job.borrowerNames || '—'}</td>
                  <td>{job.county || '—'}</td>
                  <td>
                    <span className={`status-badge status-${job.status}`}>
                      {STATUS_LABELS[job.status] || job.status}
                    </span>
                  </td>
                  <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <Link to={`/jobs/${job.id}`} className="btn btn-ghost btn-sm">
                        Edit
                      </Link>
                      {isAdmin && (
                        <button
                          className="btn btn-ghost btn-sm text-error"
                          onClick={(e) => handleDelete(job.id, e)}
                          title="Delete Job"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
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
