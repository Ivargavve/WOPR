import { invoke } from '@tauri-apps/api/core';

/**
 * @typedef {Object} ThemeConfig
 * @property {boolean} scanlines - Scanlines effect enabled
 * @property {boolean} flicker - Screen flicker effect enabled
 * @property {number} glow_intensity - Glow intensity (0.0 - 1.0)
 */

/**
 * @typedef {Object} AppConfig
 * @property {string} persona_name - AI persona name
 * @property {string} [user_name] - User's name for personalized responses
 * @property {string} ai_provider - AI provider (openai, anthropic, gemini)
 * @property {string|null} api_key - AI API key
 * @property {string} ai_model - AI model to use
 * @property {number} capture_interval_ms - Screen capture interval
 * @property {boolean} vision_enabled - Whether vision is enabled
 * @property {boolean} voice_enabled - Whether voice is enabled
 * @property {string} wake_word - Voice activation wake word
 * @property {string} current_mode - Current display mode
 * @property {boolean} launch_on_startup - Launch on system startup
 * @property {boolean} always_on_top - Keep window on top
 * @property {ThemeConfig} theme - Theme settings
 * @property {string|null} [data_folder_path] - Custom data folder path
 * @property {number|null} [selected_monitor] - Selected monitor index for capture
 * @property {string|null} [selected_microphone] - Selected microphone device ID
 * @property {boolean} [screentime_enabled] - Whether screen time tracking is enabled
 * @property {string} [preset] - UI preset (preset1, preset2, etc.)
 */

/**
 * @typedef {Object} DataPaths
 * @property {string} data_folder - User data folder
 * @property {string} config_file - Config file path
 * @property {string} brain_dir - Brain storage directory
 * @property {string} captures_dir - Screen captures directory
 * @property {string} default_folder - Default data folder (~/WOPR)
 */

/**
 * Load application configuration
 * @returns {Promise<AppConfig>}
 */
export async function loadConfig() {
  return await invoke('load_config');
}

/**
 * Save application configuration
 * @param {AppConfig} config - Configuration to save
 * @returns {Promise<void>}
 */
export async function saveConfig(config) {
  return await invoke('save_config', { config });
}

/**
 * Update a single config value
 * @param {string} key - Config key to update
 * @param {string} value - New value
 * @returns {Promise<void>}
 */
export async function updateConfigValue(key, value) {
  return await invoke('update_config_value', { key, value: String(value) });
}

/**
 * Get application data paths
 * @returns {Promise<DataPaths>}
 */
export async function getDataPaths() {
  return await invoke('get_data_paths');
}

/**
 * Save data to brain storage
 * @param {string} filename - File name
 * @param {string} content - Content to save
 * @returns {Promise<void>}
 */
export async function saveBrainData(filename, content) {
  return await invoke('save_brain_data', { filename, content });
}

/**
 * Load data from brain storage
 * @param {string} filename - File name
 * @returns {Promise<string|null>}
 */
export async function loadBrainData(filename) {
  return await invoke('load_brain_data', { filename });
}

/**
 * List files in brain storage
 * @returns {Promise<string[]>}
 */
export async function listBrainFiles() {
  return await invoke('list_brain_files');
}

/**
 * Change data folder and optionally migrate existing data
 * @param {string} newPath - New folder path
 * @param {boolean} migrate - Whether to copy existing data to new location
 * @returns {Promise<void>}
 */
export async function changeDataFolder(newPath, migrate = true) {
  return await invoke('change_data_folder', { newPath, migrate });
}
