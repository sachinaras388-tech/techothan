/**
 * SafeLink Component
 * Real-Time Malicious Link Detection & Warning System
 * 
 * Intercepts all external link clicks and analyzes the URL before navigation.
 * Shows warning modal if URL is detected as unsafe.
 */

import { useState, useCallback } from 'react'
import { analysisAPI } from '../services/api'
import { playScamWarningAlert } from '../utils/voiceAlert'

/**
 * SafeLink - A safe wrapper for anchor tags that checks URLs before navigation
 * 
 * @param {string} href - The URL to link to
 * @param {React.ReactNode} children - The link content
 * @param {string} className - Additional CSS classes
 * @param {boolean} allowProceedAnyway - Whether to show "Proceed Anyway" button
 * @param {function} onLinkClick - Custom click handler (optional)
 * @param {boolean} external - Whether this is an external link (opens in new tab)
 * @param {boolean} skipCheck - Skip URL check (for internal/verified links)
 */
export default function SafeLink({
  href,
  children,
  className = '',
  allowProceedAnyway = false,
  onLinkClick,
  external = false,
  skipCheck = false,
}) {
  const [isChecking, setIsChecking] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [warningData, setWarningData] = useState(null)

  // Determine if URL is external
  const isExternalUrl = (url) => {
    try {
      const urlObj = new URL(url)
      // Check if different origin
      return urlObj.origin !== window.location.origin
    } catch {
      // If can't parse, treat as internal
      return false
    }
  }

  // Handle link click
  const handleClick = async (e) => {
    // Skip validation for:
    // - JavaScript links (#, javascript:, etc.)
    // - Internal app links starts with / but not http
    // - Links marked to skip check
    if (
      skipCheck ||
      !href ||
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      (!href.startsWith('http') && !href.startsWith('www.') && !isExternalUrl(href))
    ) {
      // Allow normal navigation
      if (onLinkClick) {
        onLinkClick(e)
      }
      return
    }

    // Prevent default navigation
    e.preventDefault()

    // Mark as checking
    setIsChecking(true)

    try {
      // Analyze the URL via backend API
      const response = await analysisAPI.checkUrl(href)
      const result = response.data.data

      if (result.isUnsafe) {
        // Show warning modal
        setWarningData(result)
        setShowWarning(true)
        playScamWarningAlert()
      } else {
        // URL is safe - allow navigation
        if (external) {
          window.open(href, '_blank', 'noopener,noreferrer')
        } else {
          window.location.href = href
        }
      }
    } catch (error) {
      // On error, show warning as a safety measure
      console.error('URL check failed:', error)
      setWarningData({
        isUnsafe: true,
        riskScore: 50,
        reasons: ['Unable to verify URL safety'],
      })
      setShowWarning(true)
    } finally {
      setIsChecking(false)
    }
  }

  // Handle proceeding anyway
  const handleProceedAnyway = () => {
    setShowWarning(false)
    if (external) {
      window.open(href, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = href
    }
  }

  // Handle going back (safe)
  const handleGoBack = () => {
    setShowWarning(false)
    setWarningData(null)
  }

  // Determine risk level for styling
  const getRiskLevel = (score) => {
    if (score < 30) return { label: 'Low Risk', color: 'green', bg: 'bg-green-100' }
    if (score < 60) return { label: 'Medium Risk', color: 'yellow', bg: 'bg-yellow-100' }
    if (score < 80) return { label: 'High Risk', color: 'orange', bg: 'bg-orange-100' }
    return { label: 'Critical', color: 'red', bg: 'bg-red-100' }
  }

  const riskInfo = warningData ? getRiskLevel(warningData.riskScore) : null

  return (
    <>
      {/* The Link */}
      <a
        href={href}
        onClick={handleClick}
        className={`${className} ${isChecking ? 'pointer-events-none opacity-50' : ''}`}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        title={isChecking ? 'Checking link safety...' : href}
      >
        {isChecking ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Checking...
          </span>
        ) : (
          children
        )}
      </a>

      {/* Warning Modal */}
      {showWarning && warningData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-lg mx-4 bg-primary-900 border-2 border-red-500 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 text-center border-b border-red-500/50 bg-red-900/30">
              {/* Warning Icon */}
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-red-500/20 border-2 border-red-500">
                  <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-red-500">
                🚨 UNSAFE LINK DETECTED
              </h2>

              {/* Risk Level Badge */}
              {riskInfo && (
                <div className="mt-3 inline-flex items-center px-4 py-1 rounded-full bg-red-500/20 border border-red-500">
                  <span className="w-2 h-2 mr-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="text-sm font-semibold text-red-400">
                    {riskInfo.label} ({warningData.riskScore}% risk)
                  </span>
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="p-6">
              {/* URL */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-400">Link URL:</p>
                <p className="text-sm font-mono break-all text-gray-300 bg-primary-800 p-2 rounded">
                  {href}
                </p>
              </div>

              {/* Risk Score Bar */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-400">Risk Score:</p>
                <div className="flex items-center mt-1">
                  <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        warningData.riskScore >= 80
                          ? 'bg-red-500'
                          : warningData.riskScore >= 60
                          ? 'bg-orange-500'
                          : warningData.riskScore >= 40
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${warningData.riskScore}%` }}
                    ></div>
                  </div>
                  <span className="ml-3 text-sm font-semibold text-gray-300">
                    {warningData.riskScore}%
                  </span>
                </div>
              </div>

              {/* Reasons */}
              {warningData.reasons && warningData.reasons.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-400">Detection Reasons:</p>
                  <ul className="mt-2 space-y-2">
                    {warningData.reasons.map((reason, index) => (
                      <li
                        key={index}
                        className="flex items-start text-sm text-gray-300"
                      >
                        <span className="mr-2 text-red-400">⚠️</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error Message */}
              {!warningData.reasons || warningData.reasons.length === 0 && (
                <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-500 rounded-lg">
                  <p className="text-sm text-yellow-400">
                    ⚠️ This link could not be fully verified. Please be cautious.
                  </p>
                </div>
              )}
            </div>

            {/* Footer - Action Buttons */}
            <div className="p-6 bg-primary-800/50 border-t border-primary-700">
              {/* Primary Warning */}
              <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
                <p className="text-center text-red-400 font-semibold">
                  🚫 DO NOT enter personal information on this link!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {/* Go Back - Required */}
                <button
                  onClick={handleGoBack}
                  className="w-full py-4 px-6 bg-accent-green hover:bg-accent-green-dark text-white font-bold rounded-xl transition-colors"
                >
                  ✅ Go Back (Safe)
                </button>

                {/* Proceed Anyway - Optional */}
                {allowProceedAnyway && (
                  <button
                    onClick={handleProceedAnyway}
                    className="w-full py-3 px-6 bg-red-900/50 hover:bg-red-900 text-red-400 font-semibold rounded-xl transition-colors border border-red-500/50"
                  >
                    ⚠️ Proceed Anyway (At My Own Risk)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Hook for intercepting all link clicks in a component
 * Use this as an alternative to SafeLink component
 */
export function useLinkInterceptor() {
  const [isChecking, setIsChecking] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [warningData, setWarningData] = useState(null)

  /**
   * Check if a URL is safe before navigation
   * @param {string} url - URL to check
   * @returns {Promise<boolean>} - True if safe, false if unsafe
   */
  const checkUrl = useCallback(async (url) => {
    setIsChecking(true)

    try {
      const response = await analysisAPI.checkUrl(url)
      const result = response.data.data

      if (result.isUnsafe) {
        setWarningData(result)
        setShowWarning(true)
        playScamWarningAlert()
        return false
      }

      return true
    } catch (error) {
      console.error('URL check failed:', error)
      setWarningData({
        isUnsafe: true,
        riskScore: 50,
        reasons: ['Unable to verify URL safety'],
      })
      setShowWarning(true)
      return false
    } finally {
      setIsChecking(false)
    }
  }, [])

  /**
   * Close the warning modal
   */
  const closeWarning = useCallback(() => {
    setShowWarning(false)
    setWarningData(null)
  }, [])

  /**
   * Proceed anyway (navigate to the URL)
   */
  const proceedAnyway = useCallback((url) => {
    closeWarning()
    window.location.href = url
  }, [closeWarning])

  return {
    checkUrl,
    isChecking,
    showWarning,
    warningData,
    closeWarning,
    proceedAnyway,
  }
}
