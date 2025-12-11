/**
 * Voice Input Service using Web Speech API
 */

/** @type {any} */
let recognition = null;
let isListening = false;

/** @type {((text: string) => void) | null} */
let onResultCallback = null;

/** @type {((error: string) => void) | null} */
let onErrorCallback = null;

/** @type {(() => void) | null} */
let onStartCallback = null;

/** @type {(() => void) | null} */
let onEndCallback = null;

/**
 * Check if speech recognition is supported
 * @returns {boolean}
 */
export function isSupported() {
  // @ts-ignore - webkitSpeechRecognition is vendor-prefixed
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/**
 * Initialize speech recognition
 * @param {Object} options
 * @param {string} [options.language='en-US'] - Recognition language
 * @param {boolean} [options.continuous=false] - Keep listening after result
 * @param {boolean} [options.interimResults=true] - Show interim results
 */
export function init(options = {}) {
  if (!isSupported()) {
    console.error('Speech recognition not supported');
    return false;
  }

  // @ts-ignore - webkitSpeechRecognition is vendor-prefixed
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.lang = options.language || 'en-US';
  recognition.continuous = options.continuous || false;
  recognition.interimResults = options.interimResults !== false;

  recognition.onresult = (/** @type {any} */ event) => {
    const results = event.results;
    const lastResult = results[results.length - 1];

    if (lastResult.isFinal) {
      const transcript = lastResult[0].transcript.trim();
      if (onResultCallback && transcript) {
        onResultCallback(transcript);
      }
    }
  };

  recognition.onerror = (/** @type {any} */ event) => {
    console.error('Speech recognition error:', event.error);
    if (onErrorCallback) {
      onErrorCallback(event.error);
    }
    isListening = false;
  };

  recognition.onstart = () => {
    isListening = true;
    if (onStartCallback) {
      onStartCallback();
    }
  };

  recognition.onend = () => {
    isListening = false;
    if (onEndCallback) {
      onEndCallback();
    }
  };

  return true;
}

/**
 * Start listening for voice input
 * @returns {boolean} Whether listening started successfully
 */
export function startListening() {
  if (!recognition) {
    init();
  }

  if (!recognition) {
    return false;
  }

  try {
    recognition.start();
    return true;
  } catch (e) {
    console.error('Failed to start recognition:', e);
    return false;
  }
}

/**
 * Stop listening
 */
export function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
  }
}

/**
 * Check if currently listening
 * @returns {boolean}
 */
export function getIsListening() {
  return isListening;
}

/**
 * Set callback for when speech is recognized
 * @param {(text: string) => void} callback
 */
export function onResult(callback) {
  onResultCallback = callback;
}

/**
 * Set callback for errors
 * @param {(error: string) => void} callback
 */
export function onError(callback) {
  onErrorCallback = callback;
}

/**
 * Set callback for when listening starts
 * @param {() => void} callback
 */
export function onStart(callback) {
  onStartCallback = callback;
}

/**
 * Set callback for when listening ends
 * @param {() => void} callback
 */
export function onEnd(callback) {
  onEndCallback = callback;
}

/**
 * Clean up resources
 */
export function destroy() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  onResultCallback = null;
  onErrorCallback = null;
  onStartCallback = null;
  onEndCallback = null;
  isListening = false;
}
