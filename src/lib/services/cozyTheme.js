import { invoke } from '@tauri-apps/api/core';

// Import cat images so Vite can properly bundle them
import c1 from '$lib/presets/preset2/assets/cats/c1.png';
import c2 from '$lib/presets/preset2/assets/cats/c2.png';
import c3 from '$lib/presets/preset2/assets/cats/c3.png';
import c4 from '$lib/presets/preset2/assets/cats/c4.png';
import c6 from '$lib/presets/preset2/assets/cats/c6.png';
import c7 from '$lib/presets/preset2/assets/cats/c7.png';
import c8 from '$lib/presets/preset2/assets/cats/c8.png';
import c9 from '$lib/presets/preset2/assets/cats/c9.png';
import c10 from '$lib/presets/preset2/assets/cats/c10.png';
// White variants for dark mode
import c1w from '$lib/presets/preset2/assets/cats/c1w.png';
import c2w from '$lib/presets/preset2/assets/cats/c2w.png';
import c3w from '$lib/presets/preset2/assets/cats/c3w.png';
import c4w from '$lib/presets/preset2/assets/cats/c4w.png';
import c6w from '$lib/presets/preset2/assets/cats/c6w.png';
import c7w from '$lib/presets/preset2/assets/cats/c7w.png';
import c8w from '$lib/presets/preset2/assets/cats/c8w.png';
import c9w from '$lib/presets/preset2/assets/cats/c9w.png';
import c10w from '$lib/presets/preset2/assets/cats/c10w.png';

/**
 * @typedef {Object} CozyTheme
 * @property {number} id - Theme ID (1-2)
 * @property {string} name - Theme display name
 * @property {string} bg - Main background color
 * @property {string} sidebarOverlay - Sidebar overlay gradient
 * @property {string} contentOverlay - Content overlay gradient
 * @property {string} text - Primary text color
 * @property {string} textLight - Light text color
 * @property {string} textMuted - Muted text color
 * @property {string} accent - Accent color
 * @property {string} cardBg - Card background
 * @property {string} borderColor - Border color
 * @property {string} catImage1 - Decorative cat image URL
 */

/** @type {CozyTheme[]} */
export const COZY_THEMES = [
  {
    id: 1,
    name: 'Light',
    bg: '#e8ddd4',
    sidebarOverlay: 'linear-gradient(180deg, rgba(250, 245, 238, 0.75) 0%, rgba(248, 242, 232, 0.7) 50%, rgba(245, 238, 228, 0.75) 100%)',
    contentOverlay: 'linear-gradient(180deg, rgba(252, 248, 242, 0.8) 0%, rgba(250, 245, 238, 0.75) 50%, rgba(248, 242, 232, 0.8) 100%)',
    text: '#4a4039',
    textLight: '#8b7d6b',
    textMuted: '#a89b8a',
    accent: '#e8a87c',
    cardBg: 'rgba(255, 255, 255, 0.55)',
    borderColor: 'rgba(180, 160, 140, 0.3)',
    catImage1: `url('${c1}')`,
    catImage2: `url('${c2}')`,
    catImage3: `url('${c3}')`,
    catImage4: `url('${c4}')`,
    catImage6: `url('${c6}')`,
    catImage7: `url('${c7}')`,
    catImage8: `url('${c8}')`,
    catImage9: `url('${c9}')`,
    catImage10: `url('${c10}')`
  },
  {
    id: 2,
    name: 'Dark',
    bg: '#1a1816',
    sidebarOverlay: 'linear-gradient(180deg, rgba(35, 32, 30, 0.85) 0%, rgba(30, 28, 26, 0.8) 50%, rgba(25, 23, 21, 0.85) 100%)',
    contentOverlay: 'linear-gradient(180deg, rgba(28, 26, 24, 0.85) 0%, rgba(25, 23, 21, 0.8) 50%, rgba(22, 20, 18, 0.85) 100%)',
    text: '#e8e0d8',
    textLight: '#a89b8b',
    textMuted: '#786b5b',
    accent: '#e8a87c',
    cardBg: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    catImage1: `url('${c1w}')`,
    catImage2: `url('${c2w}')`,
    catImage3: `url('${c3w}')`,
    catImage4: `url('${c4w}')`,
    catImage6: `url('${c6w}')`,
    catImage7: `url('${c7w}')`,
    catImage8: `url('${c8w}')`,
    catImage9: `url('${c9w}')`,
    catImage10: `url('${c10w}')`
  }
];

/** @type {number} */
let currentThemeId = 1;

/** @type {((theme: CozyTheme) => void)[]} */
const listeners = [];

/**
 * Get a theme by ID
 * @param {number} id - Theme ID (1-2)
 * @returns {CozyTheme}
 */
export function getCozyThemeById(id) {
  return COZY_THEMES.find(t => t.id === id) || COZY_THEMES[0];
}

/**
 * Get the current theme
 * @returns {CozyTheme}
 */
export function getCurrentCozyTheme() {
  return getCozyThemeById(currentThemeId);
}

/**
 * Get the current theme ID
 * @returns {number}
 */
export function getCurrentCozyThemeId() {
  return currentThemeId;
}

/**
 * Apply a theme to CSS variables
 * @param {CozyTheme} theme
 */
function applyThemeToCSS(theme) {
  const root = document.documentElement;

  root.style.setProperty('--cozy-bg', theme.bg);
  root.style.setProperty('--cozy-sidebar-overlay', theme.sidebarOverlay);
  root.style.setProperty('--cozy-content-overlay', theme.contentOverlay);
  root.style.setProperty('--cozy-text', theme.text);
  root.style.setProperty('--cozy-text-light', theme.textLight);
  root.style.setProperty('--cozy-text-muted', theme.textMuted);
  root.style.setProperty('--cozy-accent', theme.accent);
  root.style.setProperty('--cozy-card', theme.cardBg);
  root.style.setProperty('--cozy-border', theme.borderColor);
  root.style.setProperty('--cat-image-1', theme.catImage1);
  root.style.setProperty('--cat-image-2', theme.catImage2);
  root.style.setProperty('--cat-image-3', theme.catImage3);
  root.style.setProperty('--cat-image-4', theme.catImage4);
  root.style.setProperty('--cat-image-6', theme.catImage6);
  root.style.setProperty('--cat-image-7', theme.catImage7);
  root.style.setProperty('--cat-image-8', theme.catImage8);
  root.style.setProperty('--cat-image-9', theme.catImage9);
  root.style.setProperty('--cat-image-10', theme.catImage10);
}

/**
 * Set the current theme
 * @param {number} id - Theme ID (1-2)
 * @returns {Promise<{success: boolean, theme: CozyTheme}>}
 */
export async function setCozyTheme(id) {
  if (id < 1 || id > 2) {
    return { success: false, theme: getCurrentCozyTheme() };
  }

  currentThemeId = id;
  const theme = getCozyThemeById(id);

  // Apply to CSS
  applyThemeToCSS(theme);

  // Notify listeners
  listeners.forEach(fn => fn(theme));

  // Save to file
  try {
    await invoke('save_cozy_theme', { settings: { theme_id: id } });
  } catch (e) {
    console.error('Failed to save cozy theme:', e);
  }

  return { success: true, theme };
}

/**
 * Load theme from storage and apply it
 * @returns {Promise<CozyTheme>}
 */
export async function loadAndApplyCozyTheme() {
  try {
    /** @type {{ theme_id: number }} */
    const settings = await invoke('load_cozy_theme');
    currentThemeId = settings.theme_id || 1;
  } catch (e) {
    console.error('Failed to load cozy theme:', e);
    currentThemeId = 1;
  }

  const theme = getCozyThemeById(currentThemeId);
  applyThemeToCSS(theme);
  return theme;
}

/**
 * Subscribe to theme changes
 * @param {(theme: CozyTheme) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function onCozyThemeChange(callback) {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/**
 * Get all available themes
 * @returns {CozyTheme[]}
 */
export function getAllCozyThemes() {
  return COZY_THEMES;
}
