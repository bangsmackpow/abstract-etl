import { create } from 'zustand';
import { authApi } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })(),
  token: localStorage.getItem('authToken'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await authApi.login(email, password);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    await authApi.logout().catch(() => {});
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  refreshUser: async () => {
    try {
      const { data } = await authApi.me();
      localStorage.setItem('user', JSON.stringify(data));
      set({ user: data });
    } catch {
      get().logout();
    }
  },

  isAdmin: () => get().user?.role === 'admin',
}));

export default useAuthStore;
