/**
 * useLinkInterceptor Hook
 * Real-Time Malicious Link Detection & Warning System
 * 
 * Custom hook for intercepting link clicks and analyzing URLs
 */

import { useState, useCallback } from 'react'
import { analysisAPI } from '../services/api'
import { playScamWarningAlert } from '../utils/voiceAlert'

/**
 * Hook for intercepting all link clicks and analyzing URLs
 * Use this to add link safety checking to any component
 * 
 * @returns {Object} Hook interface
 */
export function useLinkInterceptor() {
  const [isChecking, setIsChecking] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [warningData, setWarningData] = useState(null)
  const [pendingUrl, setPendingUrl] = useState(null)

  /**
   * Check if a URL is safe before navigation
   * @param {string} url - URL to check
   * @returns {Promise<boolean>} - True if safe, false if unsafe
   */
  const checkUrl = useCallback(async (url) => {
    setIsChecking(true)
    setPendingUrl(url)

    try {
      const response = await analysisAPI.checkUrl(url)
      const result = response.data.data

      if (result.isUnsafe) {
        setWarningData(result)
        setShowWarning(true)
        playScamWarningAlert()
        return false
      }

      // URL is safe
      return true
    } catch (error) {
      console.error('URL check failed:', error)
      // On error, show warning as a safety measure
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
    setPendingUrl(null)
  }, [])

  /**
   * Proceed anyway (navigate to the URL)
   * @param {boolean} openInNewTab - Whether to open in new tab
   */
  const proceedAnyway = useCallback((openInNewTab = false) => {
    if (pendingUrl) {
      closeWarning()
      if (openInNewTab) {
        window.open(pendingUrl, '_blank', 'noopener,noreferrer')
      } else {
        window.location.href = pendingUrl
      }
    }
  }, [pendingUrl, closeWarning])

  /**
   * Navigate to safe URL (when URL is verified as safe)
   * @param {string} url - URL to navigate to
   * @param {boolean} openInNewTab - Whether to open in new tab
   */
  const navigateToUrl = useCallback((url, openInNewTab = false) => {
    if (openInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = url
    }
  }, [])

  return {
    checkUrl,
    isChecking,
    showWarning,
    warningData,
    pendingUrl,
    closeWarning,
    proceedAnyway,
    navigateToUrl,
  }
}

/**
 * Hook for creating a safe click handler
 * Returns a handler that can be used on click events
 * 
 * @param {Object} options - Configuration options
 * @returns {Function} Click handler
 */
export function useSafeClickHandler(options = {}) {
  const {
    allowProceedAnyway = false,
    openInNewTab = false,
    onUnsafeClick,
    onSafeClick,
  } = options

  const {
    checkUrl,
    isChecking,
    showWarning,
    warningData,
    closeWarning,
    proceedAnyway,
    navigateToUrl,
  } = useLinkInterceptor()

  /**
   * Handle a link click event
   * @param {string} url - The URL to navigate to
   * @param {Event} e - Click event (optional)
   */
  const handleClick = useCallback(async (url, e) => {
    if (e) {
      e.preventDefault()
    }

    // Check URL safety
    const isSafe = await checkUrl(url)

    if (isSafe) {
      // Call safe click callback
      if (onSafeClick) {
        onSafeClick(url)
      } else {
        navigateToUrl(url, openInNewTab)
      }
    } else {
      // Call unsafe click callback
      if (onUnsafeClick) {
        onUnsafeClick(url, warningData)
      }
      // Warning modal is already shown by checkUrl
    }
  }, [checkUrl, navigateToUrl, openInNewTab, onSafeClick, onUnsafeClick, warningData])

  return {
    handleClick,
    isChecking,
    showWarning,
    warningData,
    closeWarning,
    proceedAnyway: () => proceedAnyway(openInNewTab),
  }
}

export default useLinkInterceptor
