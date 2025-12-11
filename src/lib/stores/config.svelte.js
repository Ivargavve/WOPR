import { loadConfig, saveConfig } from '$lib/services/storage.js';

/**
 * @typedef {import('$lib/services/storage.js').AppConfig} AppConfig
 */

/** @type {AppConfig | null} */
let configState = $state(null);
let isLoading = $state(false);
/** @type {string | null} */
let error = $state(null);

/**
 * Initialize config store by loading from backend
 * @returns {Promise<AppConfig>}
 */
export async function initConfig() {
  if (configState !== null) return configState;

  isLoading = true;
  error = null;

  try {
    configState = await loadConfig();
    return configState;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    // Return default config on error
    configState = getDefaultConfig();
    return configState;
  } finally {
    isLoading = false;
  }
}

/**
 * Get current config (must be initialized first)
 * @returns {AppConfig | null}
 */
export function getConfig() {
  return configState;
}

/**
 * Update config and save to backend
 * @param {Partial<AppConfig>} updates
 */
export async function updateConfig(updates) {
  if (!configState) {
    await initConfig();
  }

  if (configState) {
    configState = { ...configState, ...updates };

    try {
      await saveConfig(configState);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    }
  }
}

/**
 * Get loading state
 * @returns {boolean}
 */
export function isConfigLoading() {
  return isLoading;
}

/**
 * Get error state
 * @returns {string | null}
 */
export function getConfigError() {
  return error;
}

/**
 * Get default config
 * @returns {AppConfig}
 */
function getDefaultConfig() {
  return {
    persona_name: 'Joshua',
    ai_provider: 'openai',
    api_key: null,
    ai_model: 'gpt-4o-mini',
    capture_interval_ms: 30000,
    vision_enabled: false,  // Default OFF - requires permission
    voice_enabled: false,   // Default OFF - requires permission
    wake_word: 'Joshua',
    current_mode: 'assistant',
    launch_on_startup: true,
    always_on_top: false,
    theme: {
      scanlines: true,
      flicker: false,
      glow_intensity: 0.8
    }
  };
}
