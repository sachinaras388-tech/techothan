import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useAlert } from '../context/AlertContext'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const { unreadCount } = useAlert()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen bg-primary cyber-grid">
      {/* Desktop Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
      />

      {/* Mobile Navigation */}
      <MobileNav 
        isOpen={mobileMenuOpen} 
        onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        onLogout={handleLogout}
        unreadCount={unreadCount}
      />

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        } lg:ml-64 ml-0`}
      >
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 glass border-b border-primary-700">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div>
                <h1 className="text-xl font-display font-semibold gradient-text">
                  FraudShield
                </h1>
                <p className="text-xs text-gray-400 hidden sm:block">
                  AI-Powered Cyber Fraud Detection
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <ConnectionStatus />

              {/* Alerts Badge */}
              <NavLink
                to="/alerts"
                className="relative p-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a1 1 0 001-1v-1a1 1 0 00-1-1H9a1 1 0 00-1 1v1a1 1 0 001 1z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>

              {/* User Menu */}
              <div className="flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-green to-accent-green-dark flex items-center justify-center">
                  <span className="text-primary font-bold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function ConnectionStatus() {
  const { isConnected } = useAlert()

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent-green' : 'bg-danger'} pulse-dot`} />
      <span className="text-xs text-gray-400 hidden sm:inline">
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  )
}
