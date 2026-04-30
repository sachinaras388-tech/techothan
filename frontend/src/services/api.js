import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 401:
          localStorage.removeItem('token')
          window.location.href = '/login'
          break
        case 403:
          console.error('Access denied')
          break
        case 404:
          console.error('Resource not found')
          break
        case 500:
          console.error('Server error')
          break
        default:
          console.error(data?.message || 'An error occurred')
      }

      return Promise.reject(new Error(data?.message || 'An error occurred'))
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timeout'))
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) =>
    api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  resendOTP: (email) => api.post('/auth/resend-otp', { email }),
  // Google OAuth
  getGoogleAuthUrl: () => api.get('/auth/google/url'),
  googleAuthCallback: (code, state) => api.post('/auth/google/callback', { code, state }),
  disconnectGoogle: () => api.post('/auth/google/disconnect'),
  refreshGoogleToken: () => api.post('/auth/google/refresh'),
}

// Analysis API
export const analysisAPI = {
  analyzeText: (text) => api.post('/analyze/text', { text }),
  analyzeUrl: (url) => api.post('/analyze/url', { url }),
  analyzeUpi: (upiId, amount, merchantName, transactionNote) =>
    api.post('/analyze/upi', { upiId, amount, merchantName, transactionNote }),
  analyzePhone: (phoneNumber, context) =>
    api.post('/analyze/phone', { phoneNumber, context }),
  // New scam detection API methods
  analyzeTextScam: (text) => api.post('/analyze/analyze-text', { text }),
  analyzePhoneScam: (phone) => api.post('/analyze/analyze-phone', { phone }),
  analyzeEmailScam: (email) => api.post('/analyze/analyze-email', { email }),
  detectScam: (data) => api.post('/analyze/detect-scam', data),
  // Real-time link check (NEW)
  checkUrl: (url) => api.post('/analyze/check-url', { url }),
  // Gmail analysis
  getGmailStats: () => api.get('/analyze/gmail/stats'),
  analyzeGmail: (params) => api.post('/analyze/gmail', {}, { params }),
  analyzeGmailMessage: (messageId) => api.post('/analyze/gmail/message', { messageId }),
}

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getUserDashboard: () => api.get('/dashboard/user'),
  getScanHistory: (params) => api.get('/dashboard/scans', { params }),
  getAlerts: (params) => api.get('/dashboard/alerts', { params }),
  markAlertsAsRead: (alertIds) =>
    api.put('/dashboard/alerts/read', { alertIds }),
  acknowledgeAlert: (id) => api.put(`/dashboard/alerts/${id}/acknowledge`),
}

// Admin API
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getReports: (params) => api.get('/admin/reports', { params }),
  updateReport: (id, data) => api.put(`/admin/reports/${id}`, data),
  getLogs: (params) => api.get('/admin/logs', { params }),
  getSystemStats: () => api.get('/admin/stats'),
}

export default api
