/**
 * Voice Input Service using Web Speech API
 * Supports always-listening wake word detection
 */

/** @type {any} */
let recognition = null;
let isListening = false;
let wakeWord = 'joshua';
let alwaysListening = false;

/** @type {ReturnType<typeof setTimeout> | null} */
let restartTimeout = null;

/** @type {((text: string) => void) | null} */
let onCommandCallback = null;

/** @type {((error: string) => void) | null} */
let onErrorCallback = null;

/** @type {(() => void) | null} */
let onStartCallback = null;

/** @type {(() => void) | null} */
let onEndCallback = null;

/** @type {((detected: boolean, transcript: string) => void) | null} */
let onWakeWordCallback = null;

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
 * @param {string} [options.wakeWord='joshua'] - Wake word to listen for
 * @param {boolean} [options.alwaysListen=false] - Always listen for wake word
 */
export function init(options = {}) {
  if (!isSupported()) {
    console.error('Speech recognition not supported');
    return false;
  }

  wakeWord = (options.wakeWord || 'joshua').toLowerCase();
  alwaysListening = options.alwaysListen || false;

  // @ts-ignore - webkitSpeechRecognition is vendor-prefixed
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.lang = options.language || 'en-US';
  recognition.continuous = true;  // Always continuous now
  recognition.interimResults = true;

  recognition.onresult = (/** @type {any} */ event) => {
    const results = event.results;

    for (let i = event.resultIndex; i < results.length; i++) {
      const result = results[i];
      const transcript = result[0].transcript.trim().toLowerCase();

      if (result.isFinal) {
        // Check if wake word is in the transcript
        const wakeWordIndex = transcript.indexOf(wakeWord);

        if (wakeWordIndex !== -1) {
          // Extract the command after the wake word
          const afterWakeWord = transcript.slice(wakeWordIndex + wakeWord.length).trim();

          // Notify that wake word was detected
          if (onWakeWordCallback) {
            onWakeWordCallback(true, transcript);
          }

          // If there's a command after the wake word, process it
          if (afterWakeWord && onCommandCallback) {
            onCommandCallback(afterWakeWord);
          }
        }
      } else {
        // Interim result - check if wake word is being said
        if (transcript.includes(wakeWord) && onWakeWordCallback) {
          onWakeWordCallback(true, transcript);
        }
      }
    }
  };

  recognition.onerror = (/** @type {any} */ event) => {
    console.error('Speech recognition error:', event.error);

    // Don't report "no-speech" or "aborted" as errors in always-listening mode
    if (alwaysListening && (event.error === 'no-speech' || event.error === 'aborted')) {
      // Just restart silently
      scheduleRestart();
      return;
    }

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

    // Auto-restart if in always-listening mode
    if (alwaysListening) {
      scheduleRestart();
    }
  };

  return true;
}

/**
 * Schedule a restart of speech recognition
 */
function scheduleRestart() {
  if (restartTimeout) {
    clearTimeout(restartTimeout);
  }

  restartTimeout = setTimeout(() => {
    if (alwaysListening && recognition && !isListening) {
      try {
        recognition.start();
      } catch (e) {
        // May already be started, ignore
        console.debug('Recognition restart:', e);
      }
    }
  }, 100);
}

/**
 * Start listening for voice input
 * @returns {boolean} Whether listening started successfully
 */
export function startListening() {
  if (!recognition) {
    init({ alwaysListen: alwaysListening, wakeWord });
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
 * Stop listening completely
 */
export function stopListening() {
  alwaysListening = false;  // Disable auto-restart

  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }

  if (recognition && isListening) {
    recognition.stop();
  }
}

/**
 * Start always-listening mode
 * @param {string} [newWakeWord] - Wake word to listen for
 * @returns {boolean}
 */
export function startAlwaysListening(newWakeWord) {
  if (newWakeWord) {
    wakeWord = newWakeWord.toLowerCase();
  }

  alwaysListening = true;

  if (!recognition) {
    init({ alwaysListen: true, wakeWord });
  }

  if (!isListening) {
    return startListening();
  }

  return true;
}

/**
 * Stop always-listening mode
 */
export function stopAlwaysListening() {
  stopListening();
}

/**
 * Update the wake word
 * @param {string} newWakeWord
 */
export function setWakeWord(newWakeWord) {
  wakeWord = newWakeWord.toLowerCase();
}

/**
 * Check if currently listening
 * @returns {boolean}
 */
export function getIsListening() {
  return isListening;
}

/**
 * Check if in always-listening mode
 * @returns {boolean}
 */
export function getIsAlwaysListening() {
  return alwaysListening;
}

/**
 * Set callback for when a command is recognized (wake word + command)
 * @param {(text: string) => void} callback
 */
export function onCommand(callback) {
  onCommandCallback = callback;
}

/**
 * Set callback for when wake word is detected
 * @param {(detected: boolean, transcript: string) => void} callback
 */
export function onWakeWord(callback) {
  onWakeWordCallback = callback;
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
  alwaysListening = false;

  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }

  if (recognition) {
    try {
      recognition.stop();
    } catch (e) {
      // Ignore
    }
    recognition = null;
  }

  onCommandCallback = null;
  onErrorCallback = null;
  onStartCallback = null;
  onEndCallback = null;
  onWakeWordCallback = null;
  isListening = false;
}
