import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { analysisAPI } from '../services/api'
import { RiskScoreGauge } from '../components/Charts'
import { playScamWarningAlert } from '../utils/voiceAlert'

export default function UrlScanner() {
  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)

  const handleScan = async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL')
      return
    }

    // Basic URL validation
    let validUrl = url.trim()
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl
    }

    try {
      new URL(validUrl)
    } catch {
      toast.error('Please enter a valid URL')
      return
    }

    setScanning(true)

    try {
      const response = await analysisAPI.analyzeUrl(validUrl)
      setResult(response.data.data)
      
if (response.data.data.analysis.isScam) {
        toast.error('⚠️ Dangerous URL detected!')
        playScamWarningAlert()
      } else {
        toast.success('✅ URL appears safe')
      }
    } catch (error) {
      toast.error(error.message || 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const handleClear = () => {
    setUrl('')
    setResult(null)
  }

  const getRiskLevel = (score) => {
    if (score < 30) return { label: 'Low Risk', color: 'text-accent-green', bg: 'bg-accent-green' }
    if (score < 60) return { label: 'Medium Risk', color: 'text-warning', bg: 'bg-warning' }
    if (score < 80) return { label: 'High Risk', color: 'text-orange-500', bg: 'bg-orange-500' }
    return { label: 'Critical', color: 'text-danger', bg: 'bg-danger' }
  }

  const riskInfo = result?.analysis?.riskScore 
    ? getRiskLevel(result.analysis.riskScore) 
    : getRiskLevel(0)

  const urlObj = result ? (() => {
    try {
      return new URL(url)
    } catch {
      return null
    }
  })() : null

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-green to-accent-green-dark flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">URL Scanner</h1>
            <p className="text-gray-400">Scan URLs for phishing and scam detection</p>
          </div>
        </div>
      </motion.div>

      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <label className="block text-sm text-gray-400 mb-2">Enter URL to Scan</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL (e.g., example.com, https://fake-bank-login.com)"
            className="input-field flex-1"
            disabled={scanning}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          />
          <button
            onClick={handleClear}
            disabled={scanning || !url}
            className="px-6 py-3 rounded-lg border border-primary-600 text-gray-400 hover:text-white hover:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            onClick={handleScan}
            disabled={scanning || !url.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanning ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Scanning...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Scan URL
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Risk Score */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Risk Assessment</h3>
              <div className="flex flex-col items-center">
                <RiskScoreGauge score={result.analysis.riskScore || 0} />
                <div className={`mt-4 px-4 py-2 rounded-lg ${riskInfo.bg} bg-opacity-20 ${riskInfo.color}`}>
                  <span className="font-semibold">{riskInfo.label}</span>
                </div>
              </div>
            </div>

            {/* Analysis Details */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Analysis Details</h3>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-primary-700">
                  <span className="text-gray-400">Status</span>
                  <span className={result.analysis.isScam ? 'text-danger' : 'text-accent-green'}>
                    {result.analysis.isScam ? '⚠️ Scam Detected' : '✅ Safe'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-primary-700">
                  <span className="text-gray-400">Type</span>
                  <span className="capitalize">{result.analysis.type || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-primary-700">
                  <span className="text-gray-400">Reason</span>
                  <span>{result.analysis.reason || 'N/A'}</span>
                </div>
                
                {result.analysis.details && (
                  <div className="pt-2">
                    <span className="text-gray-400">Details</span>
                    <p className="mt-1 text-sm">{result.analysis.details?.patterns?.join(', ') || 'No patterns detected'}</p>
                  </div>
                )}

                {result.analysis.recommendations && result.analysis.recommendations.length > 0 && (
                  <div className="pt-2">
                    <span className="text-gray-400">Recommendations</span>
                    <ul className="mt-2 space-y-1">
                      {result.analysis.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-accent-green">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* URL Info */}
            <div className="lg:col-span-2 glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">URL Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 text-sm">Scanned URL</span>
                  <p className="font-mono text-sm break-all">{url}</p>
                </div>
                {urlObj && (
                  <>
                    <div>
                      <span className="text-gray-400 text-sm">Protocol</span>
                      <p className="capitalize">{urlObj.protocol.replace(':', '')}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Domain</span>
                      <p className="font-mono text-sm">{urlObj.hostname}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Path</span>
                      <p className="font-mono text-sm">{urlObj.pathname || '/'}</p>
                    </div>
                  </>
                )}
                {result.scan && (
                  <div>
                    <span className="text-gray-400 text-sm">Scan ID</span>
                    <p className="font-mono text-sm truncate">{result.scan.id}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning Banner */}
      {!result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4">⚠️ Common Phishing URL Patterns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { pattern: 'URL Shorteners', example: 'bit.ly, tinyurl.com', risk: 'High' },
              { pattern: 'Fake Login Pages', example: 'secure-bank-login.com', risk: 'Critical' },
              { pattern: 'Typosquatting', example: 'amaz0n.com, gooogle.com', risk: 'High' },
              { pattern: 'Suspicious Domains', example: 'free-gift-claim.com', risk: 'High' },
            ].map((item, index) => (
              <div key={index} className="p-4 rounded-lg bg-primary-800/50 flex items-center justify-between">
                <div>
                  <h4 className="font-medium mb-1">{item.pattern}</h4>
                  <p className="text-sm text-gray-400">Example: {item.example}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs ${
                  item.risk === 'Critical' ? 'bg-danger text-white' : 'bg-warning text-primary'
                }`}>
                  {item.risk}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
