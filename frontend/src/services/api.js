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
export const verifyOtp = (email, otp) =>
  api.post('/auth/verify-otp', { email, otp }).then((r) => r.data);
export const enableMfa = () => api.post('/auth/mfa/enable').then((r) => r.data);
export const disableMfa = (password) => api.post('/auth/mfa/disable', { password }).then((r) => r.data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data);
export const resetPassword = (token, password) => api.post('/auth/reset-password', { token, password }).then((r) => r.data);
export const changeMyPassword = (currentPassword, newPassword) =>
  api.patch('/auth/password', { current_password: currentPassword, new_password: newPassword }).then((r) => r.data);

export const apiSignup = (data) => api.post('/auth/signup', data).then((r) => r.data);

// ── Billing / subscription status ─────────────────────────────────────────────
export const getBillingStatus = () => api.get('/billing/status').then((r) => r.data);
export const createCheckoutSession = (plan) => api.post('/billing/checkout', { plan }).then((r) => r.data);
export const openBillingPortal = () => api.post('/billing/portal').then((r) => r.data);

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const getJobs = (params) => api.get('/jobs', { params }).then((r) => r.data);
export const getJob = (id) => api.get(`/jobs/${id}`).then((r) => r.data);
export const createJob = (data) => api.post('/jobs', data).then((r) => r.data);
export const updateJob = (id, data) => api.patch(`/jobs/${id}`, data).then((r) => r.data);
export const deleteJob = (id) => api.delete(`/jobs/${id}`).then((r) => r.data);

// ── Admin ─────────────────────────────────────────────────────────────────────
export const getAdminMetrics = (params) => api.get('/admin/metrics', { params }).then((r) => r.data);
export const exportMetricsCsv = async (params) => {
  const response = await api.get('/admin/metrics/export', { params, responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `abstract-jobs-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportReportsZip = async (params) => {
  const response = await api.get('/admin/export', { params, responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `abstract-reports-${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
export const getUsers = () => api.get('/admin/users').then((r) => r.data);
export const createUser = (data) => api.post('/admin/users', data).then((r) => r.data);
export const changePassword = (id, password) =>
  api.patch(`/admin/users/${id}/password`, { password }).then((r) => r.data);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`).then((r) => r.data);

// ── Extract ───────────────────────────────────────────────────────────────────
export const extractPDF = (file, onUploadProgress, templateVersion = 'v9') => {
  const form = new FormData();
  form.append('pdf', file);
  form.append('template_version', templateVersion);
  return api
    .post('/extract', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
    .then((r) => r.data);
};

export const extractBulkPDFs = (files, onUploadProgress, templateVersion = 'v9') => {
  const form = new FormData();
  files.forEach((f) => form.append('pdfs', f));
  form.append('template_version', templateVersion);
  return api
    .post('/extract/bulk', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
    .then((r) => r.data);
};

// ── Generate ──────────────────────────────────────────────────────────────────
export const downloadDocxText = async (jobId, propertyAddress) => {
  const response = await api.get(`/generate/${jobId}/docx-text`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  const addr = (propertyAddress || 'abstract')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
  a.download = `abstract_text_${addr}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadDocxTable = async (jobId, propertyAddress) => {
  const response = await api.get(`/generate/${jobId}/docx-table`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  const addr = (propertyAddress || 'abstract')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
  a.download = `abstract_table_${addr}.docx`;
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
export const getBackups = () => api.get('/admin/backups', { params: { _t: Date.now() } }).then((r) => r.data);
export const downloadBackup = (id) => api.get(`/admin/backups/${id}/download`, { responseType: 'blob' }).then((r) => r.data);
export const restoreBackup = (id) => api.post(`/admin/backups/${id}/restore`).then((r) => r.data);

// ── Admin: Settings ───────────────────────────────────────────────────────────
// Tenant settings (tenant admin)
export const getSettings = () => api.get('/admin/settings').then((r) => r.data);
export const updateSettings = (data) => api.patch('/admin/settings', data).then((r) => r.data);
// System settings (platform admin only)
export const getSystemSettings = () => api.get('/admin/system/settings').then((r) => r.data);
export const updateSystemSettings = (data) => api.patch('/admin/system/settings', data).then((r) => r.data);

// ── Admin: Tenant Logo (tenant admin, own tenant only) ────────────────────────
export const getTenantLogo = () => api.get('/admin/logo').then((r) => r.data);
export const uploadTenantLogo = (file) => {
  const form = new FormData();
  form.append('logo', file);
  return api
    .put('/admin/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
};
export const clearTenantLogo = () => api.delete('/admin/logo').then((r) => r.data);

// ── Platform: Tenants (platform admin only) ───────────────────────────────────
export const getTenants = () => api.get('/platform/tenants').then((r) => r.data);
export const createTenant = (data) => api.post('/platform/tenants', data).then((r) => r.data);
export const setTenantStatus = (id, status) =>
  api.patch(`/platform/tenants/${id}/status`, { status }).then((r) => r.data);

// ── Platform: Tenant jobs + move + audit ──────────────────────────────────────
export const getTenantJobs = (tenantId, params) =>
  api.get(`/platform/tenants/${tenantId}/jobs`, { params }).then((r) => r.data);
export const getTenantSettings = (tenantId) =>
  api.get(`/platform/tenants/${tenantId}/settings`).then((r) => r.data);
export const updateTenantSettings = (tenantId, data) =>
  api.patch(`/platform/tenants/${tenantId}/settings`, data).then((r) => r.data);
export const moveJobToTenant = (jobId, toTenantId) =>
  api.post(`/platform/jobs/${jobId}/move`, { toTenantId }).then((r) => r.data);
export const getPlatformAudit = (params) => api.get('/platform/audit', { params }).then((r) => r.data);

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
