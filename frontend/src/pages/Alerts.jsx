import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAlert } from '../context/AlertContext'
import { dashboardAPI } from '../services/api'

export default function Alerts() {
  const { alerts, isConnected, markAsRead, acknowledgeAlert, refreshAlerts, unreadCount } = useAlert()
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refreshAlerts()
  }, [refreshAlerts])

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'all') return true
    if (filter === 'unread') return alert.status !== 'read'
    if (filter === 'acknowledged') return alert.status === 'acknowledged'
    return true
  })

  const handleMarkAsRead = async (alertIds) => {
    try {
      await markAsRead(alertIds)
      toast.success('Alert marked as read')
    } catch (error) {
      toast.error('Failed to mark alert as read')
    }
  }

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAlert(alertId)
      toast.success('Alert acknowledged')
    } catch (error) {
      toast.error('Failed to acknowledge alert')
    }
  }

  const handleMarkAllRead = async () => {
    const unreadIds = alerts
      .filter((a) => a.status !== 'read')
      .map((a) => a._id || a.id)
    
    if (unreadIds.length > 0) {
      await handleMarkAsRead(unreadIds)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'border-danger bg-danger/10'
      case 'medium':
        return 'border-warning bg-warning/10'
      default:
        return 'border-accent-green bg-accent-green/10'
    }
  }

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-danger text-white'
      case 'medium':
        return 'bg-warning text-primary'
      default:
        return 'bg-accent-green text-primary'
    }
  }

  const formatTime = (date) => {
    if (!date) return 'Just now'
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-green to-accent-green-dark flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a1 1 0 001-1v-1a1 1 0 00-1-1H9a1 1 0 00-1 1v1a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Alerts</h1>
              <p className="text-gray-400">Real-time fraud alerts and notifications</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-800">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent-green' : 'bg-danger'} pulse-dot`} />
              <span className="text-sm text-gray-400">{isConnected ? 'Live' : 'Offline'}</span>
            </div>

            {/* Mark All Read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2 rounded-lg border border-primary-600 hover:border-accent-green text-sm transition-colors"
              >
                Mark All Read ({unreadCount})
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'unread', 'acknowledged'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === f
                ? 'bg-accent-green text-primary'
                : 'bg-primary-800 text-gray-400 hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert, index) => (
              <motion.div
                key={alert._id || alert.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`glass-card p-4 border-l-4 ${
                  alert.severity === 'high' 
                    ? 'border-danger' 
                    : alert.severity === 'medium'
                    ? 'border-warning'
                    : 'border-accent-green'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      alert.severity === 'high' 
                        ? 'bg-danger/20' 
                        : alert.severity === 'medium'
                        ? 'bg-warning/20'
                        : 'bg-accent-green/20'
                    }`}>
                      {alert.severity === 'high' ? (
                        <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : alert.severity === 'medium' ? (
                        <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{alert.title || 'Alert'}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${getSeverityBadge(alert.severity)}`}>
                          {alert.severity || 'info'}
                        </span>
                        {alert.status === 'acknowledged' && (
                          <span className="px-2 py-0.5 rounded text-xs bg-primary-600">
                            Acknowledged
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{alert.message}</p>
                      <p className="text-gray-500 text-xs mt-2">
                        {formatTime(alert.createdAt || alert.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 md:flex-shrink-0">
                    {alert.status !== 'acknowledged' && (
                      <button
                        onClick={() => handleAcknowledge(alert._id || alert.id)}
                        className="px-3 py-1.5 rounded-lg border border-primary-600 hover:border-accent-green text-sm transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-12 text-center"
            >
              <svg className="w-20 h-20 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="text-xl font-semibold mb-2">No Alerts</h3>
              <p className="text-gray-400">
                {filter === 'all' 
                  ? 'You have no alerts at the moment' 
                  : `No ${filter} alerts found`
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
