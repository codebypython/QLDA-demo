import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          if (data.refresh) {
            localStorage.setItem('refresh_token', data.refresh);
          }
          error.config.headers.Authorization = `Bearer ${data.access}`;
          return api(error.config);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

const buildExportUrl = (resource, params = {}) => {
  const usp = new URLSearchParams(params);
  return `${API_URL}/api/v1/${resource}/actions/export-csv/?${usp.toString()}`;
};

const downloadExport = async (resource, params = {}) => {
  const token = localStorage.getItem('access_token');
  const r = await fetch(buildExportUrl(resource, params), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error('Export failed');
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ext = (params.format || 'csv');
  a.download = `${resource}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
};

export const authAPI = {
  login: (email, password) => api.post('/auth/login/', { email, password }),
  register: (data) => api.post('/auth/register/', data),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== null && v !== undefined) fd.append(k, v);
    });
    return api.patch('/auth/profile/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  changePassword: (old_password, new_password) =>
    api.post('/auth/change_password/', { old_password, new_password }),
};

export const usersAPI = {
  listByRole: (role = 'taskforce') => api.get('/users/', { params: { role } }),
  adminList: (params) => api.get('/admin/users/', { params }),
  adminCreate: (data) => api.post('/admin/users/', data),
  adminUpdate: (id, data) => api.patch(`/admin/users/${id}/`, data),
  adminDelete: (id) => api.delete(`/admin/users/${id}/`),
  deactivate: (id) => api.patch(`/admin/users/${id}/deactivate/`),
  activate: (id) => api.patch(`/admin/users/${id}/activate/`),
};

export const assetsAPI = {
  list: (params) => api.get('/assets/', { params }),
  get: (id) => api.get(`/assets/${id}/`),
  create: (data) => api.post('/assets/', data),
  update: (id, data) => api.patch(`/assets/${id}/`, data),
  delete: (id) => api.delete(`/assets/${id}/`),
  heatmap: () => api.get('/assets/heatmap/'),
  stats: () => api.get('/assets/stats/'),
  export: (params) => downloadExport('assets', params),
};

export const reportsAPI = {
  list: (params) => api.get('/reports/', { params }),
  get: (id) => api.get(`/reports/${id}/`),
  create: (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, val]) => {
      if (val !== null && val !== undefined) formData.append(key, val);
    });
    return api.post('/reports/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id, data) => {
    const fd = new FormData();
    Object.entries(data).forEach(([key, val]) => {
      if (val !== null && val !== undefined) fd.append(key, val);
    });
    return api.patch(`/reports/${id}/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id) => api.delete(`/reports/${id}/`),
  updateStatus: (id, payload) => {
    const body = typeof payload === 'string' ? { status: payload } : payload;
    return api.patch(`/reports/${id}/update_status/`, body);
  },
  stats: () => api.get('/reports/stats/'),
  comments: (id) => api.get(`/reports/${id}/comments/`),
  addComment: (id, bodyText) => api.post(`/reports/${id}/comments/`, { body: bodyText }),
  patchComment: (reportId, commentId, bodyText) =>
    api.patch(`/reports/${reportId}/comments/${commentId}/`, { body: bodyText }),
  deleteComment: (reportId, commentId) => api.delete(`/reports/${reportId}/comments/${commentId}/`),
  timeline: (id) => api.get(`/reports/${id}/timeline/`),
  analytics: {
    timeline: (bucket = 'day') => api.get('/reports/analytics/timeline/', { params: { bucket } }),
    responseTime: () => api.get('/reports/analytics/response_time/'),
    hourHeatmap: () => api.get('/reports/analytics/hour_heatmap/'),
    topAreas: () => api.get('/reports/analytics/top_areas/'),
    aiAccuracy: () => api.get('/reports/analytics/ai_accuracy/'),
  },
  export: (params) => downloadExport('reports', params),
};

export const tasksAPI = {
  list: (params) => api.get('/tasks/', { params }),
  get: (id) => api.get(`/tasks/${id}/`),
  create: (data) => api.post('/tasks/', data),
  update: (id, data) => api.patch(`/tasks/${id}/`, data),
  delete: (id) => api.delete(`/tasks/${id}/`),
  complete: (id, payload) => {
    if (payload instanceof FormData) {
      return api.patch(`/tasks/${id}/complete/`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.patch(`/tasks/${id}/complete/`, payload || {});
  },
  export: (params) => downloadExport('tasks', params),
};

export const maintenanceAPI = {
  list: (params) => api.get('/maintenance/', { params }),
  get: (id) => api.get(`/maintenance/${id}/`),
  create: (data) => api.post('/maintenance/', data),
  update: (id, data) => api.patch(`/maintenance/${id}/`, data),
  delete: (id) => api.delete(`/maintenance/${id}/`),
  export: (params) => downloadExport('maintenance', params),
};

export const notificationsAPI = {
  list: () => api.get('/notifications/'),
  markRead: (id) => api.patch(`/notifications/${id}/read/`),
  markAllRead: () => api.post('/notifications/mark_all_read/'),
  unreadCount: () => api.get('/notifications/unread_count/'),
};

export const auditAPI = {
  list: (params) => api.get('/audit/', { params }),
};

export const areasAPI = {
  list: () => api.get('/areas/'),
  create: (data) => api.post('/areas/', data),
  update: (id, data) => api.patch(`/areas/${id}/`, data),
  delete: (id) => api.delete(`/areas/${id}/`),
};

export const systemAPI = {
  getSettings: () => api.get('/system/settings/'),
  updateSettings: (data) => api.patch('/system/settings/', data),
};

export const aiAPI = {
  classify: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${AI_API_URL}/classify`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  classifyBatch: (files) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return axios.post(`${AI_API_URL}/classify_batch`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  health: () => axios.get(`${AI_API_URL}/health`),
};

export const getErrorMessage = (error, defaultMsg = 'Đã có lỗi xảy ra') => {
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'object') {
      if (data.detail) return data.detail;
      if (data.message) return data.message;
      // Flatten array or single fields validation errors
      return Object.entries(data)
        .map(([key, val]) => {
          const label = key === 'non_field_errors' ? '' : `${key}: `;
          const detail = Array.isArray(val) ? val.join(', ') : String(val);
          return `${label}${detail}`;
        })
        .join('; ');
    }
    if (typeof data === 'string' && data.length < 150) {
      return data;
    }
  }
  return error.message || defaultMsg;
};

export default api;
