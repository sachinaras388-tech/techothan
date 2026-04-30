import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [email, setEmail] = useState('')

  // Get email from navigation state (passed from Register page)
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email)
    }
  }, [location.state])

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false

    const newOtp = [...otp]
    newOtp[index] = element.value
    setOtp(newOtp)

    if (element.value !== '' && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const token = otp.join('')
    
    if (token.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    if (!email) {
      toast.error('Email is required')
      return
    }

    setLoading(true)
    try {
      await authAPI.verifyOTP(email, token)
      toast.success('Email verified successfully!')
      navigate('/login', { state: { verified: true, email } })
    } catch (error) {
      toast.error(error.message || 'Invalid or expired verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setResendLoading(true)
    try {
      await authAPI.resendOTP(email)
      toast.success('Verification code sent! Check your email.')
    } catch (error) {
      toast.error(error.message || 'Failed to resend verification code')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary cyber-grid flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-green to-accent-green-dark flex items-center justify-center"
          >
            <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </motion.div>
          <h1 className="text-3xl font-display font-bold gradient-text">FraudShield</h1>
          <p className="text-gray-400 mt-2">Email Verification</p>
        </div>

        {/* Verify Form */}
        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold mb-2 text-center">Verify Your Email</h2>
          <p className="text-gray-400 mb-6 text-center">
            Enter the 6-digit code sent to your email address.
          </p>

          {/* Email Display (if passed from register) */}
          {email && (
            <div className="mb-4 p-3 bg-primary-800 rounded-lg border border-primary-600">
              <p className="text-sm text-gray-400">Verification code sent to:</p>
              <p className="text-accent-green font-medium">{email}</p>
            </div>
          )}

          {/* OTP Input */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleChange(e.target, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-12 h-14 text-center text-xl font-bold rounded-lg border border-primary-600 bg-primary-700 text-white focus:border-accent-green focus:outline-none transition-colors"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          {/* Resend Section */}
          <div className="mt-6 pt-6 border-t border-primary-600">
            <p className="text-gray-400 text-sm text-center mb-4">
              Didn't receive the code?
            </p>
            
            <div className="space-y-4">
              {!email && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="input-field"
                  />
                </div>
              )}
              
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || !email}
                className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Resend Verification Code'
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already verified?{' '}
              <Link to="/login" className="text-accent-green hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
