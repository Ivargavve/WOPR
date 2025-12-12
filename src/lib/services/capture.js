import { invoke } from '@tauri-apps/api/core';

/**
 * @typedef {Object} ScreenInfo
 * @property {number} width - Screen width
 * @property {number} height - Screen height
 * @property {number} scale_factor - Display scale factor
 */

/**
 * @typedef {Object} ScreenCaptureInfo
 * @property {number} index - Monitor index
 * @property {string} name - Display name
 * @property {number} width - Screen width
 * @property {number} height - Screen height
 * @property {boolean} is_primary - Whether this is the primary display
 */

/**
 * Capture the screen and return as base64 JPEG
 * @param {number | null} [monitorIndex] - Optional monitor index to capture (null = primary)
 * @returns {Promise<string>} Base64 encoded JPEG image
 */
export async function captureScreen(monitorIndex = null) {
  return await invoke('capture_screen', { monitorIndex });
}

/**
 * Get screen information
 * @returns {Promise<ScreenInfo>}
 */
export async function getScreenInfo() {
  return await invoke('get_screen_info');
}

/**
 * Get list of available screens for capture
 * @returns {Promise<ScreenCaptureInfo[]>}
 */
export async function getAvailableScreens() {
  return await invoke('get_available_screens');
}
