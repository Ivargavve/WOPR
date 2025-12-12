/**
 * Voice Input Service using Web Speech API
 * Supports always-listening wake word detection with smart command capture
 */

/** @type {any} */
let recognition = null;
let isListening = false;
let wakeWord = 'joshua';
let alwaysListening = false;

// Command mode state
let inCommandMode = false;
let commandBuffer = '';
let silenceTimeout = null;
const SILENCE_DELAY_MS = 2000; // 2 seconds of silence before processing

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

/** @type {((listening: boolean) => void) | null} */
let onCommandModeCallback = null;

/**
 * Check if speech recognition is supported
 * @returns {boolean}
 */
export function isSupported() {
  // @ts-ignore - webkitSpeechRecognition is vendor-prefixed
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/**
 * Reset the silence timer (called when user is speaking)
 */
function resetSilenceTimer() {
  if (silenceTimeout) {
    clearTimeout(silenceTimeout);
  }

  silenceTimeout = setTimeout(() => {
    // Silence detected - process the command
    if (inCommandMode && commandBuffer.trim()) {
      console.log('Silence detected, processing command:', commandBuffer);
      if (onCommandCallback) {
        onCommandCallback(commandBuffer.trim());
      }
    }
    exitCommandMode();
  }, SILENCE_DELAY_MS);
}

/**
 * Enter command listening mode
 */
function enterCommandMode() {
  console.log('Entering command mode...');
  inCommandMode = true;
  commandBuffer = '';

  if (onCommandModeCallback) {
    onCommandModeCallback(true);
  }

  resetSilenceTimer();
}

/**
 * Exit command listening mode
 */
function exitCommandMode() {
  console.log('Exiting command mode');
  inCommandMode = false;
  commandBuffer = '';

  if (silenceTimeout) {
    clearTimeout(silenceTimeout);
    silenceTimeout = null;
  }

  if (onCommandModeCallback) {
    onCommandModeCallback(false);
  }
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
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (/** @type {any} */ event) => {
    const results = event.results;

    for (let i = event.resultIndex; i < results.length; i++) {
      const result = results[i];
      const transcript = result[0].transcript.trim().toLowerCase();

      // Check for wake word in transcript
      const wakeWordIndex = transcript.indexOf(wakeWord);
      const hasWakeWord = wakeWordIndex !== -1;

      if (inCommandMode) {
        // We're in command mode - collecting the command
        // Extract text after wake word if present, otherwise use full transcript
        let commandText = transcript;
        if (hasWakeWord) {
          commandText = transcript.slice(wakeWordIndex + wakeWord.length).trim();
        }

        if (result.isFinal) {
          // Final result - update command buffer
          if (commandText) {
            commandBuffer = commandText;
            console.log('Command buffer (final):', commandBuffer);
          }
          resetSilenceTimer();
        } else {
          // Interim result - user is still speaking
          if (commandText) {
            commandBuffer = commandText; // Update with latest
          }
          resetSilenceTimer();
        }
      } else {
        // Not in command mode - looking for wake word
        if (hasWakeWord) {
          // Wake word detected! Enter command mode immediately
          console.log('Wake word detected, entering command mode');

          if (onWakeWordCallback) {
            onWakeWordCallback(true, transcript);
          }

          // Extract any command text after the wake word
          const afterWakeWord = transcript.slice(wakeWordIndex + wakeWord.length).trim();

          // Enter command mode
          enterCommandMode();

          // If there's already text after wake word, add it to buffer
          if (afterWakeWord) {
            commandBuffer = afterWakeWord;
            console.log('Initial command buffer:', commandBuffer);
          }

          // If this is a final result with a complete command, process it
          if (result.isFinal && afterWakeWord) {
            // User said wake word + command in one breath
            // Give a brief moment for more speech, then process
            resetSilenceTimer();
          }
        }
      }
    }
  };

  recognition.onerror = (/** @type {any} */ event) => {
    console.error('Speech recognition error:', event.error);

    // Exit command mode on error
    if (inCommandMode) {
      exitCommandMode();
    }

    // Don't report "no-speech" or "aborted" as errors in always-listening mode
    if (alwaysListening && (event.error === 'no-speech' || event.error === 'aborted')) {
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

    // Exit command mode if recognition ends
    if (inCommandMode) {
      exitCommandMode();
    }

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
  alwaysListening = false;

  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }

  if (inCommandMode) {
    exitCommandMode();
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
 * Check if in command mode (waiting for command after wake word)
 * @returns {boolean}
 */
export function getIsInCommandMode() {
  return inCommandMode;
}

/**
 * Set callback for when a command is recognized
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
 * Set callback for command mode changes
 * @param {(listening: boolean) => void} callback
 */
export function onCommandMode(callback) {
  onCommandModeCallback = callback;
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

  if (inCommandMode) {
    exitCommandMode();
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
  onCommandModeCallback = null;
  isListening = false;
}
