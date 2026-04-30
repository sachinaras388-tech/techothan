import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { analysisAPI } from '../services/api'
import { RiskScoreGauge } from '../components/Charts'
import { playScamWarningAlert } from '../utils/voiceAlert'

export default function TextAnalysis() {
  const [text, setText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)

const handleAnalyze = async () => {
    if (!text.trim() || text.length < 10) {
      toast.error('Please enter at least 10 characters')
      return
    }

    setAnalyzing(true)

    try {
      const response = await analysisAPI.analyzeText(text)
      setResult(response.data.data)
      
      // Check prediction or isFraud for color determination
      const isFraudResult = response.data.data.analysis.isFraud || 
                       response.data.data.analysis.prediction === 'SCAM'
      
if (isFraudResult) {
        toast.error('⚠️ Potential fraud detected!')
        playScamWarningAlert()
      } else {
        toast.success('✅ Content appears safe')
      }
    } catch (error) {
      toast.error(error.message || 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleClear = () => {
    setText('')
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Text Analysis</h1>
            <p className="text-gray-400">Analyze messages for potential fraud</p>
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
        <label className="block text-sm text-gray-400 mb-2">Enter Text to Analyze</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the message, email, or text content you want to analyze for potential fraud...

Example: 'Congratulations! You've won a lottery prize of $1,000,000. To claim your prize, please send your bank details and pay a small processing fee of $100.'"
          className="input-field h-48 resize-none"
          disabled={analyzing}
        />
        
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">{text.length} / 5000 characters</p>
          <div className="flex gap-3">
            <button
              onClick={handleClear}
              disabled={analyzing || !text}
              className="px-6 py-2 rounded-lg border border-primary-600 text-gray-400 hover:text-white hover:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !text.trim()}
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
                  Analyze Text
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
                  <span className={(result.analysis.isFraud || result.analysis.prediction === 'SCAM') ? 'text-danger' : 'text-accent-green'}>
                    {(result.analysis.isFraud || result.analysis.prediction === 'SCAM') ? '⚠️ Potential Fraud' : '✅ Safe'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-primary-700">
                  <span className="text-gray-400">Category</span>
                  <span className="capitalize">{result.analysis.category || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-primary-700">
                  <span className="text-gray-400">Type</span>
                  <span className="capitalize">{result.analysis.type || 'N/A'}</span>
                </div>
<div className="flex justify-between py-2 border-b border-primary-700">
                  <span className="text-gray-400">Confidence</span>
                  <span>{result.analysis.confidence ? Math.round(result.analysis.confidence * 100) : 0}%</span>
                </div>
                
                {result.analysis.details && (
                  <div className="pt-2">
                    <span className="text-gray-400">Details</span>
                    <div className="mt-1 text-sm space-y-1">
                      {result.analysis.details.matched_keywords && (
                        <p>Keywords: {Object.keys(result.analysis.details.matched_keywords).join(', ') || 'None'}</p>
                      )}
                      {result.analysis.details.pattern_matches !== undefined && (
                        <p>Pattern matches: {result.analysis.details.pattern_matches}</p>
                      )}
                      {result.analysis.details.text_length !== undefined && (
                        <p>Text length: {result.analysis.details.text_length} characters</p>
                      )}
                    </div>
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

            {/* Scan Info */}
            <div className="lg:col-span-2 glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Scan Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-gray-400 text-sm">Scan ID</span>
                  <p className="font-mono text-sm truncate">{result.scan?.id}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Type</span>
                  <p className="capitalize">{result.scan?.type}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Result</span>
                  <p className="capitalize">{result.scan?.result}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Risk Score</span>
                  <p className={riskInfo.color}>{result.scan?.riskScore}%</p>
                </div>
              </div>
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
          <h3 className="text-lg font-semibold mb-4">💡 Tips for Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Common Scams', description: 'Lottery, prize claims, urgent requests' },
              { title: 'Red Flags', description: 'Requests for money, personal info' },
              { title: 'Best Practice', description: 'When in doubt, verify independently' },
            ].map((tip, index) => (
              <div key={index} className="p-4 rounded-lg bg-primary-800/50">
                <h4 className="font-medium mb-1">{tip.title}</h4>
                <p className="text-sm text-gray-400">{tip.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
