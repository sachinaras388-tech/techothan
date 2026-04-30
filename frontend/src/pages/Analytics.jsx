import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { dashboardAPI } from '../services/api'
import { FraudTrendChart, DetectionPieChart, ActivityBarChart } from '../components/Charts'

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7d')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await dashboardAPI.getStats()
      setStats(response.data.data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const scanData = stats?.scans || {}
  const alertData = stats?.alerts || {}
  const userData = stats?.users || {}
  const scanByType = stats?.scanByType || []

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Analytics</h1>
              <p className="text-gray-400">View fraud detection statistics and trends</p>
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex gap-2">
            {['24h', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  dateRange === range
                    ? 'bg-accent-green text-primary'
                    : 'bg-primary-800 text-gray-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <p className="text-gray-400 text-sm">Total Scans</p>
          <p className="text-3xl font-bold mt-1">{scanData.total || 0}</p>
          <p className="text-sm text-accent-green mt-2">All time</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <p className="text-gray-400 text-sm">Fraud Detected</p>
          <p className="text-3xl font-bold mt-1 text-danger">{scanData.fraud || 0}</p>
          <p className="text-sm text-danger mt-2">{scanData.total > 0 ? Math.round((scanData.fraud / scanData.total) * 100) : 0}% of total</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <p className="text-gray-400 text-sm">Active Alerts</p>
          <p className="text-3xl font-bold mt-1 text-warning">{alertData.total || 0}</p>
          <p className="text-sm text-warning mt-2">{alertData.new || 0} new</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <p className="text-gray-400 text-sm">Total Users</p>
          <p className="text-3xl font-bold mt-1">{userData.total || 0}</p>
          <p className="text-sm text-accent-green mt-2">{userData.active || 0} active</p>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fraud Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Fraud Trends</h3>
          <FraudTrendChart />
        </motion.div>

        {/* Detection Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Detection Statistics</h3>
          <DetectionPieChart
            data={[
              scanData.safe || 70,
              scanData.suspicious || 15,
              scanData.fraud || 10,
              scanData.threat || 5,
            ]}
          />
        </motion.div>
      </div>

      {/* Activity Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-semibold mb-4">User Activity</h3>
        <ActivityBarChart />
      </motion.div>

      {/* Scan by Type */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Scans by Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { type: 'Text', count: scanByType.find(s => s._id === 'text')?.count || 0 },
            { type: 'URL', count: scanByType.find(s => s._id === 'url')?.count || 0 },
            { type: 'UPI', count: scanByType.find(s => s._id === 'upi')?.count || 0 },
            { type: 'Phone', count: scanByType.find(s => s._id === 'phone')?.count || 0 },
          ].map((item) => (
            <div key={item.type} className="p-4 rounded-lg bg-primary-800/50 text-center">
              <p className="text-2xl font-bold">{item.count}</p>
              <p className="text-sm text-gray-400">{item.type} Scans</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
