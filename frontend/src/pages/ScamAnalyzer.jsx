import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { analysisAPI } from '../services/api'
import { playScamWarningAlert } from '../utils/voiceAlert'

export default function ScamAnalyzer() {
  const [text, setText] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)

  const handleAnalyze = async () => {
    if (!text.trim() && !phone.trim() && !email.trim()) {
      toast.error('Please enter at least one field to analyze')
      return
    }

    setAnalyzing(true)

    try {
      const response = await analysisAPI.detectScam({
        text: text || undefined,
        phone: phone || undefined,
        email: email || undefined
      })
      setResult(response.data.data)
      
if (response.data.data.finalRisk === 'High') {
        toast.error('⚠️ High risk scam detected!')
        playScamWarningAlert()
      } else if (response.data.data.finalRisk === 'Medium') {
        toast.warning('⚠️ Medium risk - be cautious!')
      } else {
        toast.success('✅ Appears to be safe')
      }
    } catch (error) {
      toast.error(error.message || 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleClear = () => {
    setText('')
    setPhone('')
    setEmail('')
    setResult(null)
  }

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'High':
        return { bg: 'bg-danger/20', border: 'border-danger', text: 'text-danger', label: 'High Risk' }
      case 'Medium':
        return { bg: 'bg-warning/20', border: 'border-warning', text: 'text-warning', label: 'Medium Risk' }
      case 'Low':
        return { bg: 'bg-accent-green/20', border: 'border-accent-green', text: 'text-accent-green', label: 'Low Risk' }
      default:
        return { bg: 'bg-gray-500/20', border: 'border-gray-500', text: 'text-gray-400', label: 'Unknown' }
    }
  }

  const riskInfo = result ? getRiskColor(result.finalRisk) : getRiskColor('Low')

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-danger to-orange-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Scam Analyzer</h1>
            <p className="text-gray-400">Detect phishing, scam calls, and fake emails</p>
          </div>
        </div>
      </motion.div>

      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 space-y-4"
      >
        {/* Text Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Text / Message to Analyze</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste suspicious message, email content, or text...
            
Example: 'Congratulations! You won a lottery prize of $1,000,000. To claim your prize, click here and share your OTP!'"
            className="input-field h-28 resize-none"
            disabled={analyzing}
          />
        </div>

        {/* Phone Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+919876543210"
            className="input-field"
            disabled={analyzing}
          />
        </div>

        {/* Email Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="support@paytm-secure-login.xyz"
            className="input-field"
            disabled={analyzing}
          />
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            {text.length + phone.length + email.length} characters
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleClear}
              disabled={analyzing || (!text && !phone && !email)}
              className="px-6 py-2 rounded-lg border border-primary-600 text-gray-400 hover:text-white hover:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || (!text.trim() && !phone.trim() && !email.trim())}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Analyze All
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Main Result */}
            <div className={`glass-card p-6 border-2 ${riskInfo.border}`}>
              <div className="flex flex-col items-center">
                <div className={`w-32 h-32 rounded-full ${riskInfo.bg} flex items-center justify-center mb-4`}>
                  <span className={`text-4xl font-bold ${riskInfo.text}`}>
                    {result.confidence}%
                  </span>
                </div>
                <div className={`px-6 py-3 rounded-xl ${riskInfo.bg} ${riskInfo.text} border ${riskInfo.border}`}>
                  <span className="text-xl font-bold">{riskInfo.label}</span>
                </div>
                <p className="mt-4 text-center text-lg">{result.advice}</p>
              </div>
            </div>

            {/* Individual Results */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Text Analysis */}
              {result.details?.text && (
                <div className="glass-card p-4">
                  <h4 className="font-semibold mb-2 text-gray-300">Text Analysis</h4>
                  <div className={`text-lg font-bold mb-1 ${getRiskColor(result.details.text.risk).text}`}>
                    {result.details.text.risk} Risk
                  </div>
                  <p className="text-sm text-gray-400 mb-2">Score: {result.details.text.score}</p>
                  {result.details.text.matchedKeywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.details.text.matchedKeywords.map((kw, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded bg-danger/30 text-danger">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Phone Analysis */}
              {result.details?.phone && (
                <div className="glass-card p-4">
                  <h4 className="font-semibold mb-2 text-gray-300">Phone Analysis</h4>
                  <div className={`text-lg font-bold mb-1 ${getRiskColor(result.details.phone.risk).text}`}>
                    {result.details.phone.risk} Risk
                  </div>
                  <p className="text-sm text-gray-400 mb-1">{result.details.phone.country}</p>
                  <p className="text-xs text-gray-500">{result.details.phone.reason}</p>
                </div>
              )}

              {/* Email Analysis */}
              {result.details?.email && (
                <div className="glass-card p-4">
                  <h4 className="font-semibold mb-2 text-gray-300">Email Analysis</h4>
                  <div className={`text-lg font-bold mb-1 ${getRiskColor(result.details.email.risk).text}`}>
                    {result.details.email.risk} Risk
                  </div>
                  <p className="text-sm text-gray-400 mb-1">{result.details.email.domain}</p>
                  <p className="text-xs text-gray-500">{result.details.email.reason}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      {!result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4">💡 Scam Detection Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-primary-800/50">
              <h4 className="font-medium mb-1">Text Scams</h4>
              <p className="text-sm text-gray-400">Watch for lottery, prize claims, urgent requests for OTP or bank details</p>
            </div>
            <div className="p-4 rounded-lg bg-primary-800/50">
              <h4 className="font-medium mb-1">Phone Scams</h4>
              <p className="text-sm text-gray-400">Be wary of unknown callers asking for personal info or OTPs</p>
            </div>
            <div className="p-4 rounded-lg bg-primary-800/50">
              <h4 className="font-medium mb-1">Email Scams</h4>
              <p className="text-sm text-gray-400">Check sender domain carefully - watch for misspellings</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
