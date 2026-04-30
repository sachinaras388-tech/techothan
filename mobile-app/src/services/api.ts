/**
 * API Service for FraudShield Mobile App
 * Handles communication with the backend
 */

import * as Linking from 'expo-linking'
import * as SecureStore from 'expo-secure-store'
import { UrlCheckResponse } from '../types'

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api'

/**
 * Check URL safety with the backend API
 * @param url - The URL to check
 * @returns Promise with the check result
 */
export async function checkUrlSafety(url: string): Promise<UrlCheckResponse['data']> {
  try {
    // Normalize the URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    // Get stored token if available (for authenticated requests)
    const token = await SecureStore.getItemAsync('auth_token')
    
    const response = await fetch(`${API_BASE_URL}/analyze/check-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ url: normalizedUrl }),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to check URL')
    }

    return data.data
  } catch (error) {
    console.error('URL check error:', error)
    
    // On error, return a safety uncertain response
    return {
      isUnsafe: true,
      riskScore: 50,
      reasons: ['Unable to verify URL - connection error'],
      details: undefined
    }
  }
}

/**
 * Get the base URL for the app
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL
}

/**
 * Create a deep link URL for the app
 */
export function createDeepLink(url: string): string {
  return Linking.createURL(`check?url=${encodeURIComponent(url)}`)
}

/**
 * Parse incoming deep link
 */
export function parseDeepLink(url: string): { url: string } | null {
  try {
    const parsed = Linking.parse(url)
    if (parsed.queryParams?.url) {
      return {
        url: decodeURIComponent(parsed.queryParams.url as string)
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Open URL in browser
 */
export async function openInBrowser(url: string): Promise<void> {
  await Linking.openURL(url)
}

/**
 * Go back to previous app/screen
 */
export function goBack(): void {
  Linking.openURL('fraudshield://back')
}
