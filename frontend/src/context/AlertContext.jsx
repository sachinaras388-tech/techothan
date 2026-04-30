import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const AlertContext = createContext(null)

// Socket.io connection URL - change to your backend URL in production
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const { isAuthenticated } = useAuth()

  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated) return

    const newSocket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token'),
      },
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
      newSocket.emit('join_alerts')
    })

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
    })

    newSocket.on('fraud_detected', (data) => {
      console.log('Fraud detected:', data)
      setAlerts((prev) => [data, ...prev])
      setUnreadCount((prev) => prev + 1)
      
      toast.error(`🚨 Fraud Detected: ${data.result.category || 'Suspicious activity'}`, {
        duration: 5000,
        icon: '🚨',
      })
    })

    newSocket.on('suspicious_activity', (data) => {
      console.log('Suspicious activity:', data)
      setAlerts((prev) => [data, ...prev])
      setUnreadCount((prev) => prev + 1)
      
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } bg-primary-800 border border-warning text-white px-4 py-3 rounded-lg shadow-lg`}
        >
          <div className="flex items-center gap-3">
            <span className="text-warning">⚠️</span>
            <div>
              <p className="font-semibold">Suspicious Activity</p>
              <p className="text-sm text-gray-300">{data.message}</p>
            </div>
          </div>
        </div>
      ))
    })

    newSocket.on('new_alert', (data) => {
      setAlerts((prev) => [data, ...prev])
      setUnreadCount((prev) => prev + 1)
      
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } bg-primary-800 border border-accent-green text-white px-4 py-3 rounded-lg shadow-lg`}
        >
          <div className="flex items-center gap-3">
            <span className="text-accent-green">🔔</span>
            <div>
              <p className="font-semibold">New Alert</p>
              <p className="text-sm text-gray-300">{data.title}</p>
            </div>
          </div>
        </div>
      ))
    })

    newSocket.on('broadcast_alert', (data) => {
      setAlerts((prev) => [data, ...prev])
      setUnreadCount((prev) => prev + 1)
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message)
    })

    setSocket(newSocket)

    return () => {
      newSocket.emit('leave_alerts')
      newSocket.disconnect()
    }
  }, [isAuthenticated])

  // Fetch initial alerts
  const fetchAlerts = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      const response = await fetch(`/api/dashboard/alerts?limit=20`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      const data = await response.json()
      
      if (data.success) {
        setAlerts(data.data.alerts)
        setUnreadCount(data.data.unreadCount)
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && isConnected) {
      fetchAlerts()
    }
  }, [isAuthenticated, isConnected, fetchAlerts])

  const markAsRead = async (alertIds) => {
    try {
      await fetch(`/api/dashboard/alerts/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ alertIds }),
      })
      
      setUnreadCount((prev) => Math.max(0, prev - alertIds.length))
    } catch (error) {
      console.error('Failed to mark alerts as read:', error)
    }
  }

  const acknowledgeAlert = async (alertId) => {
    try {
      await fetch(`/api/dashboard/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      
      setAlerts((prev) =>
        prev.map((alert) =>
          alert._id === alertId ? { ...alert, status: 'acknowledged' } : alert
        )
      )
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const clearAlert = (alertId) => {
    setAlerts((prev) => prev.filter((alert) => alert._id !== alertId))
  }

  const value = {
    alerts,
    unreadCount,
    isConnected,
    markAsRead,
    acknowledgeAlert,
    clearAlert,
    refreshAlerts: fetchAlerts,
  }

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider')
  }
  return context
}
