import { invoke } from '@tauri-apps/api/core';

/**
 * @typedef {Object} ColorTheme
 * @property {number} id - Theme ID (1-5)
 * @property {string} name - Theme display name
 * @property {string} primary - Primary text color
 * @property {string} dim - Dimmed text color
 * @property {string} bright - Bright text color
 * @property {string} border - Border color (with alpha)
 * @property {string} borderBright - Bright border color
 * @property {string} glow - Glow shadow values
 */

/** @type {ColorTheme[]} */
export const COLOR_THEMES = [
  {
    id: 1,
    name: 'PHOSPHOR GREEN',
    primary: '#00ff41',
    dim: '#00aa2a',
    bright: '#33ff66',
    border: '#00ff4133',
    borderBright: '#00ff41',
    glow: '0 0 10px #00ff4144, 0 0 20px #00ff4122'
  },
  {
    id: 2,
    name: 'TERMINAL BLUE',
    primary: '#00bfff',
    dim: '#0080aa',
    bright: '#33d4ff',
    border: '#00bfff33',
    borderBright: '#00bfff',
    glow: '0 0 10px #00bfff44, 0 0 20px #00bfff22'
  },
  {
    id: 3,
    name: 'AMBER CLASSIC',
    primary: '#ffb000',
    dim: '#aa7500',
    bright: '#ffc733',
    border: '#ffb00033',
    borderBright: '#ffb000',
    glow: '0 0 10px #ffb00044, 0 0 20px #ffb00022'
  },
  {
    id: 4,
    name: 'CYBERPUNK PINK',
    primary: '#ff00ff',
    dim: '#aa00aa',
    bright: '#ff33ff',
    border: '#ff00ff33',
    borderBright: '#ff00ff',
    glow: '0 0 10px #ff00ff44, 0 0 20px #ff00ff22'
  },
  {
    id: 5,
    name: 'CRIMSON RED',
    primary: '#ff3333',
    dim: '#aa2222',
    bright: '#ff6666',
    border: '#ff333333',
    borderBright: '#ff3333',
    glow: '0 0 10px #ff333344, 0 0 20px #ff333322'
  }
];

/** @type {number} */
let currentThemeId = 1;

/** @type {((theme: ColorTheme) => void)[]} */
const listeners = [];

/**
 * Get a theme by ID
 * @param {number} id - Theme ID (1-5)
 * @returns {ColorTheme}
 */
export function getThemeById(id) {
  return COLOR_THEMES.find(t => t.id === id) || COLOR_THEMES[0];
}

/**
 * Get the current theme
 * @returns {ColorTheme}
 */
export function getCurrentTheme() {
  return getThemeById(currentThemeId);
}

/**
 * Get the current theme ID
 * @returns {number}
 */
export function getCurrentThemeId() {
  return currentThemeId;
}

/**
 * Convert hex color to RGB components
 * @param {string} hex
 * @returns {{r: number, g: number, b: number}}
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 255, b: 65 };
}

/**
 * Apply a theme to CSS variables
 * @param {ColorTheme} theme
 */
function applyThemeToCSS(theme) {
  const root = document.documentElement;
  const rgb = hexToRgb(theme.primary);
  const rgbDim = hexToRgb(theme.dim);

  // Core colors
  root.style.setProperty('--text-primary', theme.primary);
  root.style.setProperty('--text-dim', theme.dim);
  root.style.setProperty('--text-bright', theme.bright);
  root.style.setProperty('--border-color', theme.border);
  root.style.setProperty('--border-bright', theme.borderBright);
  root.style.setProperty('--glow-green', theme.glow);

  // RGB components for rgba() usage
  root.style.setProperty('--text-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  root.style.setProperty('--text-dim-rgb', `${rgbDim.r}, ${rgbDim.g}, ${rgbDim.b}`);

  // Common alpha variants
  root.style.setProperty('--text-primary-03', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.03)`);
  root.style.setProperty('--text-primary-05', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`);
  root.style.setProperty('--text-primary-08', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`);
  root.style.setProperty('--text-primary-10', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
  root.style.setProperty('--text-primary-15', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
  root.style.setProperty('--text-primary-20', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
  root.style.setProperty('--text-primary-30', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
  root.style.setProperty('--text-primary-40', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
  root.style.setProperty('--text-primary-60', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
  root.style.setProperty('--text-primary-80', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);

  // Dark background tints (for panels, etc.)
  const darkR = Math.round(rgb.r * 0.1);
  const darkG = Math.round(rgb.g * 0.1);
  const darkB = Math.round(rgb.b * 0.1);
  root.style.setProperty('--bg-tint-20', `rgba(${darkR}, ${darkG}, ${darkB}, 0.2)`);
  root.style.setProperty('--bg-tint-30', `rgba(${darkR}, ${darkG}, ${darkB}, 0.3)`);
  root.style.setProperty('--bg-tint-40', `rgba(${darkR}, ${darkG}, ${darkB}, 0.4)`);
  root.style.setProperty('--bg-tint-90', `rgba(${darkR}, ${darkG}, ${darkB}, 0.9)`);
}

/**
 * Set the current theme
 * @param {number} id - Theme ID (1-5)
 * @returns {Promise<{success: boolean, theme: ColorTheme}>}
 */
export async function setTheme(id) {
  if (id < 1 || id > 5) {
    return { success: false, theme: getCurrentTheme() };
  }

  currentThemeId = id;
  const theme = getThemeById(id);

  // Apply to CSS
  applyThemeToCSS(theme);

  // Notify listeners
  listeners.forEach(fn => fn(theme));

  // Save to file
  try {
    await invoke('save_color_theme', { settings: { theme_id: id } });
  } catch (e) {
    console.error('Failed to save color theme:', e);
  }

  return { success: true, theme };
}

/**
 * Load theme from storage and apply it
 * @returns {Promise<ColorTheme>}
 */
export async function loadAndApplyTheme() {
  try {
    /** @type {{ theme_id: number }} */
    const settings = await invoke('load_color_theme');
    currentThemeId = settings.theme_id || 1;
  } catch (e) {
    console.error('Failed to load color theme:', e);
    currentThemeId = 1;
  }

  const theme = getThemeById(currentThemeId);
  applyThemeToCSS(theme);
  return theme;
}

/**
 * Subscribe to theme changes
 * @param {(theme: ColorTheme) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function onThemeChange(callback) {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/**
 * Get all available themes
 * @returns {ColorTheme[]}
 */
export function getAllThemes() {
  return COLOR_THEMES;
}
