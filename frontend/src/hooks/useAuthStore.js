import { create } from 'zustand';
import * as api from '../services/api';

const useAuthStore = create((set, get) => ({
  user: (() => {
    try { 
      const u = localStorage.getItem('auth_user');
      return u ? JSON.parse(u) : null; 
    } catch { return null; }
  })(),
  token: localStorage.getItem('auth_token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await api.login(email, password);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ user: null, token: null });
    window.location.href = '/login';
  },

  isAdmin: () => get().user?.role === 'admin',
}));

export default useAuthStore;
