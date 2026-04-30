import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { analysisAPI, authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import LoadingScreen from '../components/LoadingScreen'

export default function GmailAnalyzer() {
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [stats, setStats] = useState(null)
  const [emails, setEmails] = useState([])
  const [googleConnected, setGoogleConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    checkGoogleConnection()
    fetchGmailStats()
  }, [])

  const checkGoogleConnection = async () => {
    try {
      const response = await authAPI.getMe()
      setGoogleConnected(!!response.data.data.user.googleAccessToken)
    } catch (error) {
      console.error('Failed to check Google connection:', error)
    }
  }

  const fetchGmailStats = async () => {
    try {
      setLoading(true)
      const response = await analysisAPI.getGmailStats()
      setStats(response.data.data.stats)
    } catch (error) {
      console.error('Failed to fetch Gmail stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const connectGoogle = async () => {
    try {
      setConnecting(true)
      const response = await authAPI.getGoogleAuthUrl()
      const authUrl = response.data.data.authUrl

      // Open Google OAuth in a popup
      const popup = window.open(
        authUrl,
        'google-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      // Listen for popup messages
      const handleMessage = async (event) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
          popup.close()
          setGoogleConnected(true)
          toast.success('Google account connected successfully!')
          await fetchGmailStats()
        } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
          popup.close()
          toast.error('Failed to connect Google account')
        }
      }

      window.addEventListener('message', handleMessage)

      // Check if popup is closed
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          setConnecting(false)
        }
      }, 1000)

    } catch (error) {
      console.error('Failed to get Google auth URL:', error)
      toast.error('Failed to connect Google account')
      setConnecting(false)
    }
  }

  const disconnectGoogle = async () => {
    try {
      await authAPI.disconnectGoogle()
      setGoogleConnected(false)
      setStats(null)
      setEmails([])
      toast.success('Google account disconnected')
    } catch (error) {
      console.error('Failed to disconnect Google:', error)
      toast.error('Failed to disconnect Google account')
    }
  }

  const analyzeEmails = async () => {
    if (!googleConnected) {
      toast.error('Please connect your Google account first')
      return
    }

    try {
      setAnalyzing(true)
      const response = await analysisAPI.analyzeGmail({ maxResults: 30, daysBack: 90 })
      setEmails(response.data.data.messages)
      setStats(response.data.data.summary)
      toast.success(`Analyzed ${response.data.data.summary.totalEmails} emails`)
    } catch (error) {
      console.error('Failed to analyze emails:', error)
      toast.error('Failed to analyze emails')
    } finally {
      setAnalyzing(false)
    }
  }

  const getRiskColor = (score) => {
    if (score < 30) return 'text-accent-green'
    if (score < 60) return 'text-warning'
    if (score < 80) return 'text-orange-500'
    return 'text-danger'
  }

  const getRiskLabel = (score) => {
    if (score < 30) return 'Safe'
    if (score < 60) return 'Suspicious'
    if (score < 80) return 'High Risk'
    return 'Dangerous'
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Gmail Fraud Analysis</h1>
            <p className="text-gray-400 mt-1">
              Scan your emails for phishing and scam attempts
            </p>
          </div>
          <div className="text-right">
            {googleConnected ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-accent-green">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Connected
                </div>
                <button
                  onClick={disconnectGoogle}
                  className="px-4 py-2 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectGoogle}
                disabled={connecting}
                className="px-4 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors disabled:opacity-50"
              >
                {connecting ? 'Connecting...' : 'Connect Gmail'}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Emails Scanned</p>
                <p className="text-2xl font-bold">{stats.totalEmails || 0}</p>
              </div>
              <svg className="w-8 h-8 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Safe Emails</p>
                <p className="text-2xl font-bold text-accent-green">{stats.safeCount || 0}</p>
              </div>
              <svg className="w-8 h-8 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Suspicious</p>
                <p className="text-2xl font-bold text-warning">{stats.fraudCount || 0}</p>
              </div>
              <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">High Risk</p>
                <p className="text-2xl font-bold text-danger">{stats.highRiskCount || 0}</p>
              </div>
              <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </motion.div>
        </div>
      )}

      {/* Action Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6"
      >
        <div className="text-center">
          <button
            onClick={analyzeEmails}
            disabled={analyzing || !googleConnected}
            className="px-8 py-3 bg-gradient-to-r from-accent-blue to-accent-purple text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing Emails...
              </div>
            ) : (
              'Scan My Emails'
            )}
          </button>
          <p className="text-sm text-gray-400 mt-2">
            We'll analyze your recent emails for potential fraud and scams
          </p>
        </div>
      </motion.div>

      {/* Email Results */}
      {emails.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Recent Email Analysis</h3>
          <div className="space-y-3">
            {emails.slice(0, 10).map((email, index) => (
              <div
                key={email.id || index}
                className="flex items-center justify-between p-4 rounded-lg bg-primary-800/50 hover:bg-primary-800 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      email.riskScore >= 70 ? 'bg-danger' :
                      email.riskScore >= 40 ? 'bg-warning' : 'bg-accent-green'
                    }`} />
                    <div>
                      <p className="font-medium truncate">{email.subject}</p>
                      <p className="text-sm text-gray-400">From: {email.from}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${getRiskColor(email.riskScore)}`}>
                    {getRiskLabel(email.riskScore)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {email.links?.length || 0} links
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Privacy Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass-card p-6"
      >
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-accent-blue mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <h4 className="font-semibold text-accent-blue">Privacy & Security</h4>
            <p className="text-sm text-gray-400 mt-1">
              Your email content is analyzed locally and never stored permanently. We only access metadata and content needed for fraud detection. You can disconnect your Gmail account anytime.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}