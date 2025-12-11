import { invoke } from '@tauri-apps/api/core';

/**
 * @typedef {Object} WindowConfig
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} width - Window width
 * @property {number} height - Window height
 * @property {string|null} display_id - Display identifier
 * @property {boolean} is_fullscreen - Whether fullscreen
 * @property {boolean} is_borderless - Whether borderless
 */

/**
 * @typedef {Object} DisplayInfo
 * @property {string} id - Display identifier
 * @property {string} name - Display name
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} width - Display width
 * @property {number} height - Display height
 * @property {boolean} is_primary - Whether primary display
 */

/**
 * Get current window state
 * @returns {Promise<WindowConfig>}
 */
export async function getWindowState() {
  return await invoke('get_window_state');
}

/**
 * Save current window state to config file
 * @returns {Promise<void>}
 */
export async function saveWindowState() {
  return await invoke('save_window_state');
}

/**
 * Restore window state from config file
 * @returns {Promise<void>}
 */
export async function restoreWindowState() {
  return await invoke('restore_window_state');
}

/**
 * Set borderless fullscreen mode
 * @param {boolean} enabled - Whether to enable borderless fullscreen
 * @returns {Promise<void>}
 */
export async function setBorderlessFullscreen(enabled) {
  return await invoke('set_borderless_fullscreen', { enabled });
}

/**
 * Set always on top
 * @param {boolean} enabled - Whether to keep window on top
 * @returns {Promise<void>}
 */
export async function setAlwaysOnTop(enabled) {
  return await invoke('set_always_on_top', { enabled });
}

/**
 * Get list of available displays
 * @returns {Promise<DisplayInfo[]>}
 */
export async function getAvailableDisplays() {
  return await invoke('get_available_displays');
}

/**
 * Move window to specific display
 * @param {number} displayIndex - Index of the display
 * @returns {Promise<void>}
 */
export async function moveToDisplay(displayIndex) {
  return await invoke('move_to_display', { displayIndex });
}
