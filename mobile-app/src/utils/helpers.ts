/**
 * Helper utilities for FraudShield Mobile App
 */

import { Platform } from 'react-native'
import { Vibration } from 'react-native'

/**
 * Vibrate the device
 */
export function vibrate(duration: number = 200): void {
  Vibration.vibrate(duration)
}

/**
 * Vibrate pattern for danger
 */
export function vibrateDanger(): void {
  Vibration.vibrate([0, 300, 200, 300])
}

/**
 * Vibrate pattern for warning
 */
export function vibrateWarning(): void {
  Vibration.vibrate([0, 150, 100, 150])
}

/**
 * Get platform info
 */
export function getPlatform(): string {
  return Platform.OS
}

/**
 * Check if Android
 */
export function isAndroid(): boolean {
  return Platform.OS === 'android'
}

/**
 * Check if iOS
 */
export function isIOS(): boolean {
  return Platform.OS === 'ios'
}

/**
 * Format risk score for display
 */
export function formatRiskScore(score: number): string {
  return `${Math.round(score)}%`
}

/**
 * Truncate text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Get domain from URL string
 */
export function extractDomain(url: string): string {
  try {
    // Add protocol if missing
    let fullUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url
    }
    const urlObj = new URL(fullUrl)
    return urlObj.hostname
  } catch {
    return url
  }
}

/**
 * Check if URL is HTTP (not HTTPS)
 */
export function isHttpOnly(url: string): boolean {
  return url.startsWith('http://') && !url.startsWith('https://')
}

/**
 * Check if URL contains suspicious keywords
 */
export function containsSuspiciousKeywords(url: string): boolean {
  const keywords = [
    'login', 'verify', 'bank', 'update', 'free', 'secure',
    'account', 'password', 'signin', 'confirm', 'kyc',
    'otp', 'gift', 'prize', 'winner', 'lottery', 'claim'
  ]
  const lowerUrl = url.toLowerCase()
  return keywords.some(kw => lowerUrl.includes(kw))
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
