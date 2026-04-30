/**
 * Link Checker Utility
 * Handles URL validation and checking logic
 */

import { Linking } from 'react-native'
import { checkUrlSafety } from '../services/api'
import { UrlCheckResponse, getRiskLevel } from '../types'

// Cache for recently checked URLs
const urlCache = new Map<string, { result: UrlCheckResponse['data']; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    const normalized = url.trim()
    const toCheck = normalized.startsWith('http') ? normalized : `https://${normalized}`
    new URL(toCheck)
    return true
  } catch {
    return false
  }
}

/**
 * Normalize URL to standard format
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `https://${trimmed}`
}

/**
 * Extract domain from URL
 */
export function getDomain(url: string): string {
  try {
    const normalized = normalizeUrl(url)
    const urlObj = new URL(normalized)
    return urlObj.hostname
  } catch {
    return ''
  }
}

/**
 * Check URL with caching
 */
export async function checkUrl(
  url: string,
  useCache: boolean = true
): Promise<UrlCheckResponse['data']> {
  const normalized = normalizeUrl(url)

  // Check cache first
  if (useCache) {
    const cached = urlCache.get(normalized)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.result
    }
  }

  // Check with API
  const result = await checkUrlSafety(normalized)

  // Cache the result
  urlCache.set(normalized, { result, timestamp: Date.now() })

  // Clean old cache entries
  cleanCache()

  return result
}

/**
 * Clean expired cache entries
 */
function cleanCache(): void {
  const now = Date.now()
  for (const [url, entry] of urlCache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      urlCache.delete(url)
    }
  }
}

/**
 * Open URL in default browser
 */
export async function openLink(url: string): Promise<void> {
  const normalized = normalizeUrl(url)
  await Linking.openURL(normalized)
}

/**
 * Validate and get URL for display (masked)
 */
export function getDisplayUrl(url: string): string {
  try {
    const domain = getDomain(url)
    if (domain.length > 30) {
      return domain.substring(0, 27) + '...'
    }
    return domain
  } catch {
    return url
  }
}

/**
 * Get risk color based on score
 */
export function getRiskColor(score: number): string {
  const level = getRiskLevel(score)
  const colors = {
    safe: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444'
  }
  return colors[level]
}

/**
 * Get risk background color
 */
export function getRiskBgColor(score: number): string {
  const level = getRiskLevel(score)
  const colors = {
    safe: '#22c55e20',
    medium: '#eab30820',
    high: '#f9731620',
    critical: '#ef444420'
  }
  return colors[level]
}
