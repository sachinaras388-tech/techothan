import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const response = await api.get('/auth/me')
      // Backend returns { success: true, data: { user: req.user } }
      // So response.data.data.user is the actual user object
      setUser(response.data.data.user)
      setIsAuthenticated(true)
    } catch (error) {
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    const { token, user: userData } = response.data.data
    
    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(userData)
    setIsAuthenticated(true)
    
    return response.data
  }

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  const updateProfile = async (data) => {
    const response = await api.put('/auth/update-profile', data)
    setUser(response.data.data)
    return response.data
  }

  const changePassword = async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    })
    return response.data
  }

  const forgotPassword = async (email) => {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  }

  const resetPassword = async (token, password) => {
    const response = await api.post('/auth/reset-password', { token, password })
    return response.data
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    refreshUser: checkAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
