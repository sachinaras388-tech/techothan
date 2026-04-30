import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { AlertProvider } from './context/AlertContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
<BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <AlertProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0f172a',
                color: '#f8fafc',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#0f172a',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#0f172a',
                },
              },
            }}
          />
        </AlertProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
