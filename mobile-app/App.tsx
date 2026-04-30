/**
 * FraudShield - Real-Time Malicious Link Detection App
 * Main Entry Point
 */

import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  StatusBar,
  Linking,
  Animated,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// Types (inline to avoid import issues)
type RiskLevel = 'safe' | 'medium' | 'high' | 'critical'

interface UrlCheckResult {
  isUnsafe: boolean
  riskScore: number
  reasons: string[]
  details?: any
}

// Constants
const API_BASE_URL = 'http://localhost:5000/api'
const { width: SCREEN_WIDTH } = Dimensions.get('window')

// Colors
const Colors = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceLight: '#334155',
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  danger: '#ef4444',
  dangerLight: '#dc2626',
  warning: '#f59e0b',
  warningLight: '#d97706',
  success: '#22c55e',
  successLight: '#16a34a',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
}

// Helper functions
function getRiskLevel(score: number): RiskLevel {
  if (score < 30) return 'safe'
  if (score < 60) return 'medium'
  if (score < 80) return 'high'
  return 'critical'
}

function getRiskColor(level: RiskLevel): string {
  const colors = {
    safe: Colors.success,
    medium: Colors.warning,
    high: '#f97316',
    critical: Colors.danger,
  }
  return colors[level]
}

function getRiskBgColor(level: RiskLevel): string {
  const colors = {
    safe: '#22c55e20',
    medium: '#f59e0b20',
    high: '#f9731620',
    critical: '#ef444420',
  }
  return colors[level]
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `https://${trimmed}`
}

// API function
async function checkUrlApi(url: string): Promise<UrlCheckResult> {
  try {
    const normalized = normalizeUrl(url)
    const response = await fetch(`${API_BASE_URL}/analyze/check-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: normalized }),
    })
    const data = await response.json()
    return data.data || { isUnsafe: true, riskScore: 50, reasons: ['Connection error'] }
  } catch (error) {
    return { isUnsafe: true, riskScore: 50, reasons: ['Cannot connect to server'] }
  }
}

// Loading Component
const LoadingOverlay = ({ message = 'Checking link safety...' }: { message?: string }) => (
  <View style={styles.loadingOverlay}>
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
)

// Risk Indicator Component
const RiskIndicator = ({ score }: { score: number }) => {
  const level = getRiskLevel(score)
  const color = getRiskColor(level)
  const bgColor = getRiskBgColor(level)
  
  return (
    <View style={[styles.riskIndicator, { backgroundColor: bgColor, borderColor: color }]}>
      <Text style={[styles.riskScore, { color }]}>{Math.round(score)}%</Text>
      <Text style={[styles.riskLabel, { color }]}>{level.toUpperCase()} RISK</Text>
    </View>
  )
}

// Main App Component
export default function App() {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<UrlCheckResult | null>(null)
  const [fadeAnim] = useState(new Animated.Value(0))

  useEffect(() => {
    // Handle incoming deep links
    const handleUrl = async (url: string) => {
      setUrl(url)
      await handleCheck(url)
    }
    
    // Check initial URL
    Linking.getInitialURL().then(url => {
      if (url) {
        const urlParam = new URL(url).searchParams.get('url')
        if (urlParam) handleUrl(urlParam)
      }
    })
  }, [])

  const handleCheck = async (urlToCheck?: string) => {
    const targetUrl = urlToCheck || url
    if (!targetUrl) return
    
    setIsLoading(true)
    setResult(null)
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
    
    const checkResult = await checkUrlApi(targetUrl)
    setResult(checkResult)
    setIsLoading(false)
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }

  const handleOpenLink = async () => {
    const normalized = normalizeUrl(url)
    await Linking.openURL(normalized)
  }

  const handleGoBack = async () => {
    // Try to go back, or open home
    const canGoBack = await Linking.canOpenURL('fraudshield://home')
    if (canGoBack) {
      await Linking.openURL('fraudshield://home')
    } else {
      // Just reset
      setUrl('')
      setResult(null)
    }
  }

  const level = result ? getRiskLevel(result.riskScore) : 'safe'

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛡️ FraudShield</Text>
        <Text style={styles.headerSubtitle}>Link Protection</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!url && !result ? (
          // Home Screen
          <View style={styles.homeContainer}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🔒</Text>
            </View>
            <Text style={styles.homeTitle}>Link Protection Active</Text>
            <Text style={styles.homeSubtitle}>
              This app will check any link you open for malicious content
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Enter URL to check:</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.input}>
                  <Text style={styles.inputText} />
                  <TextInput
                    style={styles.inputField}
                    value={url}
                    onChangeText={setUrl}
                    placeholder="https://example.com"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>
                <TouchableOpacity
                  style={styles.checkButton}
                  onPress={() => handleCheck()}
                  disabled={!url}
                >
                  <Text style={styles.checkButtonText}>Check</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : isLoading ? (
          // Loading Screen
          <LoadingOverlay message="Analyzing link..." />
        ) : result ? (
          // Result Screen
          <Animated.View style={[styles.resultContainer, { opacity: fadeAnim }]}>
            {/* Warning Icon */}
            <View style={styles.warningIconContainer}>
              <Text style={styles.warningIcon}>
                {level === 'critical' ? '⛔' : level === 'high' ? '🚨' : level === 'medium' ? '⚠️' : '✅'}
              </Text>
            </View>
            
            {/* Title */}
            <Text style={styles.resultTitle}>
              {result.isUnsafe ? '⚠️ Unsafe Link Detected' : '✅ Link Appears Safe'}
            </Text>
            
            {/* Risk Score */}
            <RiskIndicator score={result.riskScore} />
            
            {/* URL Display */}
            <View style={styles.urlContainer}>
              <Text style={styles.urlLabel}>Link URL</Text>
              <Text style={styles.urlText} numberOfLines={3}>
                {url}
              </Text>
            </View>
            
            {/* Reasons */}
            {result.reasons.length > 0 && (
              <View style={styles.reasonsContainer}>
                <Text style={styles.reasonsTitle}>Detection Reasons:</Text>
                {result.reasons.map((reason, index) => (
                  <View key={index} style={styles.reasonItem}>
                    <Text style={styles.reasonBullet}>•</Text>
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                ))}
              </View>
            )}
            
            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.goBackButton}
                onPress={handleGoBack}
              >
                <Text style={styles.goBackButtonText}>← Go Back</Text>
              </TouchableOpacity>
              
              {result.isUnsafe ? (
                <TouchableOpacity
                  style={styles.openAnywayButton}
                  onPress={handleOpenLink}
                >
                  <Text style={styles.openAnywayButtonText}>
                    Open Anyway (Risky)
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.openButton}
                  onPress={handleOpenLink}
                >
                  <Text style={styles.openButtonText}>Open Link →</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* New Check */}
            <TouchableOpacity
              style={styles.newCheckButton}
              onPress={() => { setUrl(''); setResult(null) }}
            >
              <Text style={styles.newCheckButtonText}>Check Another Link</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

// Add TextInput import
import { TextInput } from 'react-native'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  homeContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 48,
  },
  homeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  homeSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  inputField: {
    color: Colors.text,
    fontSize: 16,
    padding: 0,
  },
  checkButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  resultContainer: {
    alignItems: 'center',
  },
  warningIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  warningIcon: {
    fontSize: 48,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  riskIndicator: {
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 20,
  },
  riskScore: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  riskLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  urlContainer: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  urlLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  urlText: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: 'monospace',
  },
  reasonsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  reasonsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  reasonItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reasonBullet: {
    color: Colors.danger,
    marginRight: 8,
    fontSize: 16,
  },
  reasonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  goBackButton: {
    backgroundColor: Colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  goBackButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  openButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  openButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  openAnywayButton: {
    backgroundColor: Colors.danger,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  openAnywayButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  newCheckButton: {
    paddingVertical: 12,
  },
  newCheckButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
})
