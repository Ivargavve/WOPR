import { updateConfigValue } from '$lib/services/storage.js';

/**
 * @typedef {'assistant' | 'monitor' | 'screentime' | 'pomodoro' | 'clock'} ModeType
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
    id: 'monitor',
    name: 'System Monitor',
    icon: '[]',
    description: 'System stats'
  },
  {
    id: 'screentime',
    name: 'Screen Time',
    icon: '@@',
    description: 'App tracking'
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro Timer',
    icon: '()',
    description: 'Focus timer'
  },
  {
    id: 'assistant',
    name: 'Terminal',
    icon: '>>',
    description: 'Command line'
  },
  {
    id: 'clock',
    name: 'Clock',
    icon: '◷',
    description: 'Large clock'
  }
];

/** @type {ModeType} */
let currentMode = $state('monitor');

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
 * Initialize mode from saved config
 * @param {ModeType} mode
 */
export function initMode(mode) {
  if (MODES.some(m => m.id === mode)) {
    currentMode = mode;
  }
}

/**
 * Set current mode and persist to config
 * @param {ModeType} mode
 */
export function setMode(mode) {
  if (currentMode !== mode) {
    previousMode = currentMode;
    currentMode = mode;
    // Persist to config
    updateConfigValue('current_mode', mode).catch(e => {
      console.error('Failed to save current mode:', e);
    });
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
