/**
 * Type definitions for FraudShield Mobile App
 */

// URL Check Response from backend
export interface UrlCheckResponse {
  success: boolean
  data: {
    isUnsafe: boolean
    riskScore: number
    reasons: string[]
    details?: {
      domain: string
      nonHttps: boolean
      longUrl: boolean
      suspiciousKeywords: string[]
      newDomain: boolean | null
      domainAge: string | number
      tld: string
      suspiciousTLD: boolean
      typosquatting: boolean
      ipBasedUrl: boolean
      hasAtSymbol: boolean
      excessiveSpecialChars: boolean
      isShortened: boolean
    }
  }
}

// Risk level based on score
export type RiskLevel = 'safe' | 'medium' | 'high' | 'critical'

// Helper to get risk level from score
export function getRiskLevel(score: number): RiskLevel {
  if (score < 30) return 'safe'
  if (score < 60) return 'medium'
  if (score < 80) return 'high'
  return 'critical'
}

// Risk level configuration
export const RiskConfig: Record<RiskLevel, {
  label: string
  color: string
  bgColor: string
  icon: string
}> = {
  safe: {
    label: 'Safe',
    color: '#22c55e',
    bgColor: '#22c55e20',
    icon: '✅'
  },
  medium: {
    label: 'Medium Risk',
    color: '#eab308',
    bgColor: '#eab30820',
    icon: '⚠️'
  },
  high: {
    label: 'High Risk',
    color: '#f97316',
    bgColor: '#f9731620',
    icon: '🚨'
  },
  critical: {
    label: 'Critical',
    color: '#ef4444',
    bgColor: '#ef444420',
    icon: '⛔'
  }
}

// Navigation params
export interface LinkCheckParams {
  url: string
  source?: string
}

// Deep link data
export interface DeepLinkData {
  url: string
  timestamp?: number
}

// App state
export interface AppState {
  currentUrl: string | null
  isChecking: boolean
  result: UrlCheckResponse['data'] | null
  error: string | null
}
