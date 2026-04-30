import { useEffect, useState } from 'react'

/**
 * ScamWarningModal Component
 * Displays a warning popup when a scam is detected
 * Blocks navigation until user acknowledges the danger
 * 
 * @param {boolean} isOpen - Whether modal is visible
 * @param {Function} onClose - Close handler (blocked, must acknowledge)
 * @param {Function} onProceedAnyway - Optional: allow user to ignore warning
 * @param {object} result - Analysis result from scam detection
 */
function ScamWarningModal({ isOpen, onClose, onProceedAnyway, result }) {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        // Don't allow escape to close - must acknowledge
        e.preventDefault()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Handle checkbox change
  const handleCheckboxChange = (e) => {
    setDontShowAgain(e.target.checked)
    // Save preference to localStorage
    localStorage.setItem('scamWarningDontShow', e.target.checked ? 'true' : 'false')
  }

  // Don't render if not open
  if (!isOpen) return null

  // Get risk level styling
  const getRiskStyles = () => {
    switch (result?.risk) {
      case 'High':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700'
        }
      case 'Medium':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-500',
          icon: 'text-orange-600',
          button: 'bg-orange-500 hover:bg-orange-600'
        }
      default:
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-500',
          icon: 'text-yellow-600',
          button: 'bg-yellow-500 hover:bg-yellow-600'
        }
    }
  }

  const styles = getRiskStyles()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      {/* Modal Content */}
      <div className={`relative z-10 w-full max-w-lg mx-4 ${styles.bg} border-2 ${styles.border} rounded-2xl shadow-2xl overflow-hidden`}>
        
        {/* Header - Always Visible Warning */}
        <div className="p-6 text-center border-b border-gray-200">
          {/* Warning Icon */}
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full ${styles.bg} border-2 ${styles.border}`}>
              <svg className={`w-12 h-12 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900">
            ⚠️ SCAM DETECTED
          </h2>
          
          {/* Risk Level Badge */}
          <div className="mt-3 inline-flex items-center px-4 py-1 rounded-full bg-red-100 border border-red-500">
            <span className="w-2 h-2 mr-2 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-semibold text-red-700">
              Risk Level: {result?.risk || 'HIGH'}
            </span>
          </div>
        </div>

        {/* Message Content */}
        <div className="p-6">
          {/* Scam Type */}
          {result?.type && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600">Detected Type:</p>
              <p className="text-lg font-bold text-gray-900 uppercase">{result.type}</p>
            </div>
          )}

          {/* Confidence Score */}
          {result?.confidence && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600">Confidence:</p>
              <div className="flex items-center mt-1">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${styles.button} transition-all duration-500`} 
                    style={{ width: `${(result.confidence || 0) * 100}%` }}
                  ></div>
                </div>
                <span className="ml-3 text-sm font-semibold text-gray-900">
                  {Math.round((result.confidence || 0) * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Risk Score */}
          {result?.riskScore !== undefined && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600">Risk Score:</p>
              <div className="flex items-center mt-1">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${styles.button} transition-all duration-500`}
                    style={{ width: `${result.riskScore}%` }}
                  ></div>
                </div>
                <span className="ml-3 text-sm font-semibold text-gray-900">
                  {result.riskScore}/100
                </span>
              </div>
            </div>
          )}

          {/* Matched Keywords */}
          {result?.matchedKeywords?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600">Suspicious Keywords Found:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {result.matchedKeywords.map((keyword, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result?.recommendations?.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600">Safety Recommendations:</p>
              <ul className="mt-2 space-y-2">
                {result.recommendations.slice(0, 4).map((rec, index) => (
                  <li key={index} className="flex items-start text-sm text-gray-700">
                    <span className="mr-2 text-green-600">✓</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Error Message */}
          {result?.error && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-500 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ {result.recommendation || 'Could not fully verify safety. Please be cautious.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer - Action Buttons */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          {/* Primary Warning */}
          <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded-lg">
            <p className="text-center text-red-800 font-semibold">
              🚫 DO NOT click any links or share personal information!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Acknowledge - Required */}
            <button
              onClick={onClose}
              className="w-full py-4 px-6 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-colors"
            >
              ✅ I Understand - Go Back (Safe)
            </button>

            {/* Proceed Anyway - Optional */}
            {onProceedAnyway && (
              <button
                onClick={onProceedAnyway}
                className="w-full py-3 px-6 bg-red-100 hover:bg-red-200 text-red-800 font-semibold rounded-xl transition-colors border border-red-300"
              >
                ⚠️ Proceed Anyway (At My Own Risk)
              </button>
            )}
          </div>

          {/* Checkbox */}
          <div className="mt-4 flex items-center justify-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={handleCheckboxChange}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-500"
              />
              <span className="ml-2 text-sm text-gray-600">
                Don't show this again
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScamWarningModal
