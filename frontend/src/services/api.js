import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 600000, // 10 min — Gemini extraction can be slow on large PDFs
});

// Attach token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const getJobs = (params) => api.get('/jobs', { params }).then((r) => r.data);
export const getJob = (id) => api.get(`/jobs/${id}`).then((r) => r.data);
export const createJob = (data) => api.post('/jobs', data).then((r) => r.data);
export const updateJob = (id, data) => api.patch(`/jobs/${id}`, data).then((r) => r.data);
export const deleteJob = (id) => api.delete(`/jobs/${id}`).then((r) => r.data);

// ── Admin ─────────────────────────────────────────────────────────────────────
export const getAdminMetrics = () => api.get('/admin/metrics').then((r) => r.data);
export const getUsers = () => api.get('/admin/users').then((r) => r.data);
export const createUser = (data) => api.post('/admin/users', data).then((r) => r.data);
export const changePassword = (id, password) =>
  api.patch(`/admin/users/${id}/password`, { password }).then((r) => r.data);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`).then((r) => r.data);

// ── Extract ───────────────────────────────────────────────────────────────────
export const extractPDF = (file, onUploadProgress, version = 'v1') => {
  const form = new FormData();
  form.append('pdf', file);
  form.append('version', version);
  return api
    .post('/extract', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
    .then((r) => r.data);
};

export const extractBulkPDFs = (files, version = 'v2', onUploadProgress) => {
  const form = new FormData();
  files.forEach((f) => form.append('pdfs', f));
  form.append('version', version);
  return api
    .post('/extract/bulk', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
    .then((r) => r.data);
};

// ── Generate ──────────────────────────────────────────────────────────────────
export const downloadDocx = async (jobId, propertyAddress) => {
  const response = await api.get(`/generate/${jobId}`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  const addr = (propertyAddress || 'abstract')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
  a.download = `abstract_${addr}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadMarkdown = async (jobId, propertyAddress) => {
  const response = await api.get(`/generate/${jobId}/markdown`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  const addr = (propertyAddress || 'abstract')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
  a.download = `abstract_${addr}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── Admin: Backups ────────────────────────────────────────────────────────────
export const triggerBackup = (notes) => api.post('/admin/backup', { notes }).then((r) => r.data);
export const getBackups = () => api.get('/admin/backups').then((r) => r.data);
export const downloadBackup = (id) => api.get(`/admin/backups/${id}/download`, { responseType: 'blob' }).then((r) => r.data);
export const restoreBackup = (id) => api.post(`/admin/backups/${id}/restore`).then((r) => r.data);

// ── Admin: Settings ───────────────────────────────────────────────────────────
export const getSettings = () => api.get('/admin/settings').then((r) => r.data);
export const updateSettings = (data) => api.patch('/admin/settings', data).then((r) => r.data);

export const downloadPdf = async (jobId, propertyAddress) => {
  const response = await api.get(`/generate/${jobId}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  const addr = (propertyAddress || 'abstract')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
  a.download = `abstract_report_${addr}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
