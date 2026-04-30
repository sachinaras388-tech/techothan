/**
 * Voice Alert System
 * Uses browser Speech Synthesis API to play voice warnings when scams are detected
 */

/**
 * Play a voice alert with the given text
 * @param {string} text - The message to speak
 */
export const playVoiceAlert = (text) => {
  if (!window.speechSynthesis) {
    console.warn('Browser does not support Speech Synthesis API')
    return
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const speech = new SpeechSynthesisUtterance(text)
  speech.lang = 'en-US'
  speech.rate = 1
  speech.pitch = 1
  speech.volume = 1

  // Use a default voice if available
  const voices = window.speechSynthesis.getVoices()
  const englishVoice = voices.find(
    (voice) => voice.lang.startsWith('en') && voice.name.includes('Google')
  ) || voices.find((voice) => voice.lang.startsWith('en'))

  if (englishVoice) {
    speech.voice = englishVoice
  }

  window.speechSynthesis.speak(speech)
}

/**
 * Play scam warning voice alert
 * Used when a scam is detected
 */
export const playScamWarningAlert = () => {
  const warningMessage =
    'Warning! This message is likely a scam. Do not click any links or share personal information.'
  playVoiceAlert(warningMessage)
}
