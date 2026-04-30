import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import StatCard from '../components/StatCard'
import { FraudTrendChart, DetectionPieChart } from '../components/Charts'
import { dashboardAPI } from '../services/api'
import { useAlert } from '../context/AlertContext'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentScans, setRecentScans] = useState([])
  const { alerts } = useAlert()
  const { user } = useAuth()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await dashboardAPI.getUserDashboard()
      setStats(response.data.data)
      setRecentScans(response.data.data.recentScans || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (score) => {
    if (score < 30) return 'text-accent-green'
    if (score < 60) return 'text-warning'
    if (score < 80) return 'text-orange-500'
    return 'text-danger'
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get user stats
  const userStats = stats?.user?.stats || {}
  const emailStats = stats?.emailStats || {}
  const totalScans = userStats.totalScans || 0
  const fraudDetected = userStats.fraudDetected || 0
  const emailScans = emailStats.totalScans || 0
  const emailFraud = emailStats.fraudDetected || 0

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, <span className="gradient-text">{user?.firstName}</span>!
            </h1>
            <p className="text-gray-400 mt-1">
              Here's what's happening with your fraud protection today.
            </p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-sm text-gray-400">{new Date().toLocaleDateString()}</p>
            <p className="text-accent-green text-sm">Protected</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Scans"
          value={totalScans}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
          color="green"
          delay={0.1}
        />
        <StatCard
          title="Fraud Detected"
          value={fraudDetected}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          color="red"
          delay={0.2}
        />
        <StatCard
          title="Emails Scanned"
          value={emailScans}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          color="blue"
          delay={0.3}
        />
        <StatCard
          title="Email Threats"
          value={emailFraud}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
            </svg>
          }
          color="orange"
          delay={0.4}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Fraud Trends</h3>
          <FraudTrendChart data={stats?.monthlyScans} />
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Detection Statistics</h3>
          <DetectionPieChart
            data={[
              totalScans - fraudDetected, // Safe
              Math.floor(fraudDetected * 0.5), // Suspicious
              Math.floor(fraudDetected * 0.3), // High Risk
              Math.floor(fraudDetected * 0.2), // Threat
            ]}
          />
        </motion.div>
      </div>

      {/* Recent Scans & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Scans</h3>
            <button className="text-sm text-accent-green hover:underline">View All</button>
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-primary-800 skeleton" style={{ height: '60px' }} />
              ))}
            </div>
          ) : recentScans.length > 0 ? (
            <div className="space-y-3">
              {recentScans.slice(0, 5).map((scan) => (
                <div
                  key={scan._id}
                  className="flex items-center justify-between p-3 rounded-lg bg-primary-800/50 hover:bg-primary-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      scan.result === 'safe' ? 'bg-accent-green/20' : 'bg-danger/20'
                    }`}>
                      {scan.type === 'text' ? (
                        <svg className={`w-5 h-5 ${scan.result === 'safe' ? 'text-accent-green' : 'text-danger'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : (
                        <svg className={`w-5 h-5 ${scan.result === 'safe' ? 'text-accent-green' : 'text-danger'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium capitalize">{scan.type} Analysis</p>
                      <p className="text-sm text-gray-400">{formatDate(scan.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={getRiskColor(scan.riskScore)}>{scan.riskScore}%</p>
                    <p className="text-sm text-gray-400 capitalize">{scan.result}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-gray-400">No scans yet</p>
              <p className="text-sm text-gray-500">Start analyzing messages to see results here</p>
            </div>
          )}
        </motion.div>

        {/* Recent Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Alerts</h3>
            <button className="text-sm text-accent-green hover:underline">View All</button>
          </div>
          
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert._id || alert.id}
                  className={`p-3 rounded-lg ${
                    alert.severity === 'high' 
                      ? 'bg-danger/10 border-l-4 border-danger' 
                      : alert.severity === 'medium'
                      ? 'bg-warning/10 border-l-4 border-warning'
                      : 'bg-primary-800/50 border-l-4 border-accent-green'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{alert.title || 'Alert'}</p>
                      <p className="text-sm text-gray-400">{alert.message}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      alert.severity === 'high' 
                        ? 'bg-danger text-white' 
                        : alert.severity === 'medium'
                        ? 'bg-warning text-primary'
                        : 'bg-accent-green text-primary'
                    }`}>
                      {alert.severity || 'low'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-gray-400">No alerts</p>
              <p className="text-sm text-gray-500">You're all safe!</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
