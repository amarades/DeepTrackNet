import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Crowd Analytics ──────────────────────────────────────────────────────────
export const crowdApi = {
  getLive: (cameraId: string) => api.get(`/crowd/live/${cameraId}`),
  getAllLive: () => api.get('/crowd/live'),
  getHistory: (cameraId: string, hours = 24, interval = 5) =>
    api.get(`/crowd/history/${cameraId}`, { params: { hours, interval } }),
  getSummary: () => api.get('/crowd/summary'),
}

// ── Alerts ───────────────────────────────────────────────────────────────────
export const alertsApi = {
  list: (params?: { severity?: string; acknowledged?: boolean; limit?: number; offset?: number }) =>
    api.get('/alerts/', { params }),
  get: (id: number) => api.get(`/alerts/${id}`),
  acknowledge: (id: number) => api.post(`/alerts/${id}/acknowledge`),
  stats: () => api.get('/alerts/stats/summary'),
}

// ── Predictions ──────────────────────────────────────────────────────────────
export const predictionsApi = {
  getForecast: (cameraId: string, horizon = 30) =>
    api.get(`/predictions/${cameraId}`, { params: { horizon } }),
  getAllOverview: () => api.get('/predictions/all/overview'),
}

// ── Heatmaps ─────────────────────────────────────────────────────────────────
export const heatmapApi = {
  getCurrent: (cameraId: string) => api.get(`/heatmaps/${cameraId}/current`),
  getHistory: (cameraId: string, snapshots = 6) =>
    api.get(`/heatmaps/${cameraId}/history`, { params: { snapshots } }),
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  refresh: (refresh_token: string) => api.post('/auth/refresh', { refresh_token }),
}

// ── Cameras ──────────────────────────────────────────────────────────────────
export const camerasApi = {
  list: () => api.get('/stream/cameras'),
}

export default api
