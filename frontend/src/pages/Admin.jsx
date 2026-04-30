import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getJobs,
  getUsers,
  getAdminMetrics,
  createUser,
  changePassword,
  deleteUser,
  deleteJob,
} from '../services/api';

const STATUS_LABELS = { draft: 'Draft', needs_review: 'Needs Review', complete: 'Complete' };

export default function Admin() {
  const [activeTab, setActiveTab] = useState('jobs'); // jobs | users | metrics
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', userId: '' });
  const [loading, setLoading] = useState(true);

  // New User Form
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'abstractor' });
  const [userMsg, setUserMsg] = useState('');

  useEffect(() => {
    refreshData();
  }, [activeTab]);

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
      if (activeTab === 'users') {
        const data = await getUsers();
        setUsers(data);
      } else if (activeTab === 'metrics') {
        const data = await getAdminMetrics();
        setMetrics(data);
      } else if (activeTab === 'jobs') {
        const data = await getUsers();
        setUsers(data);
      }
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
      setUserMsg('✅ User created successfully');
      refreshData();
    } catch (err) {
      setUserMsg(`❌ Error: ${err.response?.data?.message || 'Failed to create user'}`);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(id);
      refreshData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Are you sure you want to delete this abstract? This cannot be undone.'))
      return;
    try {
      await deleteJob(id);
      setJobs(jobs.filter((j) => j.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete job');
    }
  };

  const handleChangePass = async (id) => {
    const pass = window.prompt('Enter new password:');
    if (!pass) return;
    try {
      await changePassword(id, pass);
      alert('✅ Password updated');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update password');
    }
  };

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const formatMs = (ms) => {
    if (!ms) return '—';
    const sec = (ms / 1000).toFixed(1);
    return `${sec}s`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue-dark)' }}>Admin Panel</h1>
        <div className="flex gap-2">
          <button
            className={`btn ${activeTab === 'jobs' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('jobs')}
          >
            Jobs
          </button>
          <button
            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={`btn ${activeTab === 'metrics' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('metrics')}
          >
            Metrics
          </button>
        </div>
      </div>

      {activeTab === 'jobs' && (
        <>
          <div className="card mb-4">
            <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                className="form-input"
                style={{ flex: 1, minWidth: 200 }}
                placeholder="Search address, borrower..."
                value={filters.search}
                onChange={(e) => set('search', e.target.value)}
              />
              <select
                className="form-select"
                style={{ width: 180 }}
                value={filters.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="needs_review">Needs Review</option>
                <option value="complete">Complete</option>
              </select>
              <select
                className="form-select"
                style={{ width: 200 }}
                value={filters.userId}
                onChange={(e) => set('userId', e.target.value)}
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
                <span className="spinner spinner-dark" />
              </div>
            ) : jobs.length === 0 ? (
              <div
                className="card-body"
                style={{ textAlign: 'center', padding: 40, color: 'var(--gray-mid)' }}
              >
                No jobs found.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Property Address</th>
                    <th>Borrower(s)</th>
                    <th>Abstractor</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td style={{ fontWeight: 500 }}>{job.propertyAddress || '—'}</td>
                      <td>{job.borrowerNames || '—'}</td>
                      <td>{users.find((u) => u.id === job.createdBy)?.name || '—'}</td>
                      <td>
                        <span className={`status-badge status-${job.status}`}>
                          {STATUS_LABELS[job.status]}
                        </span>
                      </td>
                      <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-2">
                          <Link to={`/jobs/${job.id}`} className="btn btn-ghost btn-sm">
                            View
                          </Link>
                          <button
                            className="btn btn-ghost btn-sm text-error"
                            onClick={() => handleDeleteJob(job.id)}
                            title="Delete Job"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="card">
              <div className="card-header">Existing Users</div>
              <div className="card-body p-0">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleChangePass(u.id)}
                            >
                              🔑
                            </button>
                            <button
                              className="btn btn-ghost btn-sm text-error"
                              onClick={() => handleDeleteUser(u.id)}
                            >
                              🗑️
                            </button>
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
                {userMsg && (
                  <div
                    className={`alert ${userMsg.startsWith('✅') ? 'alert-info' : 'alert-error'} mb-4`}
                  >
                    {userMsg}
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Initial Password</label>
                  <input
                    className="form-input"
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="abstractor">Abstractor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button className="btn btn-primary w-full" type="submit">
                  Create User
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <span className="spinner spinner-dark" />
            </div>
          ) : !metrics ? (
            <div className="alert alert-error">Failed to load metrics.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="card">
                  <div className="card-body text-center">
                    <div className="text-muted text-sm uppercase font-bold mb-1">
                      Total Abstracts
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--blue-dark)' }}>
                      {metrics.overall?.totalJobs || 0}
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <div className="text-muted text-sm uppercase font-bold mb-1">
                      Avg. AI Processing Time
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--green)' }}>
                      {formatMs(metrics.overall?.avgProcessingTime)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">Performance by Person</div>
                <div className="card-body p-0">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Total Completed</th>
                        <th>Avg. Time / Abstract</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.perUser?.map((u) => (
                        <tr key={u.userId}>
                          <td style={{ fontWeight: 600 }}>{u.userName}</td>
                          <td>{u.jobCount}</td>
                          <td>{formatMs(u.avgProcessingTime)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
