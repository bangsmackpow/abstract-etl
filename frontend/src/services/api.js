import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000  // 2 min — Gemini extraction can be slow on large PDFs
});

// Attach token from localStorage to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('pb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pb_token');
      localStorage.removeItem('pb_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then(r => r.data);

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const getJobs    = (params) => api.get('/jobs', { params }).then(r => r.data);
export const getJob     = (id)     => api.get(`/jobs/${id}`).then(r => r.data);
export const createJob  = (data)   => api.post('/jobs', data).then(r => r.data);
export const updateJob  = (id, data) => api.patch(`/jobs/${id}`, data).then(r => r.data);
export const deleteJob  = (id)     => api.delete(`/jobs/${id}`).then(r => r.data);
export const getAdminUsers = ()    => api.get('/jobs/admin/users').then(r => r.data);

// ── Extract ───────────────────────────────────────────────────────────────────
export const extractPDF = (file, onUploadProgress) => {
  const form = new FormData();
  form.append('pdf', file);
  return api.post('/extract', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  }).then(r => r.data);
};

// ── Generate ──────────────────────────────────────────────────────────────────
export const downloadDocx = async (jobId, propertyAddress) => {
  const response = await api.get(`/generate/${jobId}`, { responseType: 'blob' });
  const url      = URL.createObjectURL(response.data);
  const a        = document.createElement('a');
  a.href         = url;
  const addr     = (propertyAddress || 'abstract').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').toLowerCase();
  a.download     = `abstract_${addr}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
