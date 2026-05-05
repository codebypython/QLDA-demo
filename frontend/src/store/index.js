import { create } from 'zustand';
import { authAPI, assetsAPI, reportsAPI } from '../services/api';

// Auth Store
export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await authAPI.login(email, password);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      const profile = await authAPI.getProfile();
      set({ user: profile.data, isAuthenticated: true, loading: false });
      return true;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  loadProfile: async () => {
    try {
      const { data } = await authAPI.getProfile();
      set({ user: data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
  },
}));

// Assets Store
export const useAssetsStore = create((set) => ({
  assets: [],
  stats: null,
  loading: false,

  fetchAssets: async (params) => {
    set({ loading: true });
    try {
      const { data } = await assetsAPI.list(params);
      set({ assets: data.results || data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const { data } = await assetsAPI.stats();
      set({ stats: data });
    } catch { /* ignore */ }
  },
}));

// Reports Store
export const useReportsStore = create((set) => ({
  reports: [],
  stats: null,
  loading: false,

  fetchReports: async (params) => {
    set({ loading: true });
    try {
      const { data } = await reportsAPI.list(params);
      set({ reports: data.results || data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const { data } = await reportsAPI.stats();
      set({ stats: data });
    } catch { /* ignore */ }
  },
}));
