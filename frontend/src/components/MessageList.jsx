import { useState } from 'react'
import { analysisAPI } from '../services/api'
import ScamWarningModal from './ScamWarningModal'

/**
 * MessageList Component
 * Displays messages with AUTO SCAM DETECTION on click
 * 
 * @param {Array} messages - Array of message objects
 * @param {Function} onMessageClick - Optional callback for safe navigation
 * @param {string} emptyMessage - Message to show when list is empty
 */
function MessageList({ messages = [], onMessageClick, emptyMessage = 'No messages yet' }) {
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)

  /**
   * Handle message click with AUTO SCAM DETECTION
   * 1. Analyze the message automatically
   * 2. If risky → show warning BEFORE any action
   * 3. Block navigation if scam
   */
  const handleMessageClick = async (message) => {
    setIsLoading(true)
    setSelectedMessage(message)

    try {
      // Call the analyze text API
      const response = await analysisAPI.analyzeText(message.content || message.text)
      const result = response.data.data.analysis

      // Check if message is a scam
      const isScam = result.isFraud || 
                    result.prediction === 'SCAM' || 
                    result.risk === 'High' ||
                    result.riskScore >= 70

      if (isScam) {
        // Show warning and BLOCK navigation
        setAnalysisResult({
          ...result,
          messageContent: message.content || message.text,
          isBlocked: true
        })
        setShowWarning(true)
        setIsLoading(false)
        return
      }

      // Safe message - allow navigation
      setIsLoading(false)
      if (onMessageClick) {
        onMessageClick(message, result)
      } else {
        // Default: show message details or navigate
        console.log('Safe message:', message)
      }

    } catch (error) {
      console.error('Analysis error:', error)
      setIsLoading(false)
      
      // On error, treat as potentially unsafe
      setAnalysisResult({
        messageContent: message.content || message.text,
        isBlocked: true,
        error: true,
        risk: 'Unknown',
        recommendation: 'Could not verify safety. Please be cautious.'
      })
      setShowWarning(true)
    }
  }

  /**
   * Handle warning modal close
   */
  const handleCloseWarning = () => {
    setShowWarning(false)
    setSelectedMessage(null)
    setAnalysisResult(null)
  }

  /**
   * Proceed anyway (user chooses to ignore warning)
   */
  const handleProceedAnyway = () => {
    setShowWarning(false)
    if (onMessageClick && selectedMessage) {
      onMessageClick(selectedMessage, analysisResult)
    }
    setSelectedMessage(null)
    setAnalysisResult(null)
  }

  // Empty state
  if (!messages || messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Message List */}
      <div className="space-y-2">
        {messages.map((message, index) => (
          <button
            key={message.id || message._id || index}
            onClick={() => handleMessageClick(message)}
            disabled={isLoading && selectedMessage?.id === message.id}
            className="w-full text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-red-400 hover:bg-red-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Message Preview */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Sender/Title */}
                <h4 className="font-medium text-gray-900 truncate">
                  {message.sender || message.title || 'Unknown Sender'}
                </h4>
                
                {/* Message Preview */}
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                  {message.content || message.text || message.preview || 'No content'}
                </p>
                
                {/* Timestamp */}
                {message.timestamp && (
                  <p className="mt-2 text-xs text-gray-400">
                    {new Date(message.timestamp).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Loading Indicator */}
              {isLoading && selectedMessage?.id === message.id && (
                <div className="ml-3">
                  <div className="animate-spin h-5 w-5 border-2 border-red-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {/* Labels/Tags */}
            {(message.isRead || message.read) && (
              <span className="inline-flex items-center px-2 py-1 mt-2 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                Read
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Scam Warning Modal */}
      {showWarning && analysisResult && (
        <ScamWarningModal
          isOpen={showWarning}
          onClose={handleCloseWarning}
          onProceedAnyway={handleProceedAnyway}
          result={analysisResult}
        />
      )}
    </div>
  )
}

export default MessageList
