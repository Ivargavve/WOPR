import { invoke } from '@tauri-apps/api/core';

/**
 * @typedef {Object} ScreenInfo
 * @property {number} width - Screen width
 * @property {number} height - Screen height
 * @property {number} scale_factor - Display scale factor
 */

/**
 * Capture the screen and return as base64 JPEG
 * @returns {Promise<string>} Base64 encoded JPEG image
 */
export async function captureScreen() {
  return await invoke('capture_screen');
}

/**
 * Get screen information
 * @returns {Promise<ScreenInfo>}
 */
export async function getScreenInfo() {
  return await invoke('get_screen_info');
}
