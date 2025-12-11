/**
 * @typedef {'assistant' | 'monitor' | 'music' | 'pomodoro' | 'chat' | 'control'} ModeType
 */

/**
 * @typedef {Object} ModeInfo
 * @property {ModeType} id - Mode identifier
 * @property {string} name - Display name
 * @property {string} icon - Mode icon
 * @property {string} description - Mode description
 */

/** @type {ModeInfo[]} */
export const MODES = [
  {
    id: 'assistant',
    name: 'AI Assistant',
    icon: '🤖',
    description: 'Contextual AI help based on screen activity'
  },
  {
    id: 'monitor',
    name: 'System Monitor',
    icon: '📊',
    description: 'CPU, RAM, and system performance'
  },
  {
    id: 'music',
    name: 'Music Player',
    icon: '🎵',
    description: 'Music controls and now playing'
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro Timer',
    icon: '⏱️',
    description: 'Focus timer with work/break cycles'
  },
  {
    id: 'chat',
    name: 'Chat Hub',
    icon: '💬',
    description: 'Multi-platform messaging overview'
  },
  {
    id: 'control',
    name: 'Control Deck',
    icon: '🎮',
    description: 'Quick actions and shortcuts'
  }
];

/** @type {ModeType} */
let currentMode = $state('assistant');

/** @type {ModeType | null} */
let previousMode = $state(null);

/**
 * Get current mode
 * @returns {ModeType}
 */
export function getCurrentMode() {
  return currentMode;
}

/**
 * Get current mode info
 * @returns {ModeInfo}
 */
export function getCurrentModeInfo() {
  return MODES.find(m => m.id === currentMode) || MODES[0];
}

/**
 * Set current mode
 * @param {ModeType} mode
 */
export function setMode(mode) {
  if (currentMode !== mode) {
    previousMode = currentMode;
    currentMode = mode;
  }
}

/**
 * Go back to previous mode
 */
export function goToPreviousMode() {
  if (previousMode) {
    currentMode = previousMode;
    previousMode = null;
  }
}

/**
 * Get mode info by id
 * @param {ModeType} id
 * @returns {ModeInfo | undefined}
 */
export function getModeInfo(id) {
  return MODES.find(m => m.id === id);
}

/**
 * Cycle to next mode
 */
export function cycleMode() {
  const currentIndex = MODES.findIndex(m => m.id === currentMode);
  const nextIndex = (currentIndex + 1) % MODES.length;
  setMode(MODES[nextIndex].id);
}
