/**
 * AI Knowledge Service
 * Manages persistent knowledge/memory for the AI that persists across sessions
 */

import { loadBrainData, saveBrainData, loadConfig, saveConfig } from './storage.js';

const KNOWLEDGE_FILE = 'knowledge.md';

/**
 * Extract user name from a knowledge item if it contains name info
 * @param {string} item - The knowledge item
 * @returns {string|null} - Extracted name or null
 */
function extractUserName(item) {
  const lower = item.toLowerCase();
  // Match patterns like "name is X", "user name is X", "called X", "user is X"
  const patterns = [
    /(?:user(?:'s)?|player(?:'s)?)\s+name\s+is\s+(\w+)/i,
    /name\s+is\s+(\w+)/i,
    /called\s+(\w+)/i,
    /user\s+is\s+(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = item.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * Update config with user name if detected
 * @param {string} name - The user name to save
 */
async function updateConfigUserName(name) {
  try {
    const config = await loadConfig();
    if (config.user_name !== name) {
      config.user_name = name;
      await saveConfig(config);
      console.log('Updated config user_name to:', name);
    }
  } catch (e) {
    console.error('Failed to update config user_name:', e);
  }
}

/**
 * Load knowledge from the brain storage
 * @returns {Promise<string>}
 */
export async function loadKnowledge() {
  try {
    const data = await loadBrainData(KNOWLEDGE_FILE);
    return data || '';
  } catch (e) {
    console.error('Failed to load knowledge:', e);
    return '';
  }
}

/**
 * Save knowledge to the brain storage
 * @param {string} content
 * @returns {Promise<void>}
 */
export async function saveKnowledge(content) {
  try {
    await saveBrainData(KNOWLEDGE_FILE, content);
  } catch (e) {
    console.error('Failed to save knowledge:', e);
    throw e;
  }
}

/**
 * Add a new piece of knowledge
 * @param {string} item - The knowledge item to add
 * @returns {Promise<string>} Updated knowledge
 */
export async function addKnowledge(item) {
  const current = await loadKnowledge();
  const trimmedItem = item.trim();

  if (!trimmedItem) return current;

  // Check if this item already exists (case-insensitive)
  const lines = current.split('\n').filter(l => l.trim());
  const itemLower = trimmedItem.toLowerCase();
  const exists = lines.some(line => {
    const cleaned = line.replace(/^[-*]\s*/, '').trim().toLowerCase();
    return cleaned === itemLower;
  });

  if (exists) {
    return current;
  }

  const newEntry = `- ${trimmedItem}`;
  const updated = current ? `${current.trim()}\n${newEntry}` : newEntry;
  await saveKnowledge(updated);
  return updated;
}

/**
 * Remove a piece of knowledge
 * @param {string} item - The knowledge item to remove (partial match)
 * @returns {Promise<{removed: boolean, updated: string}>}
 */
export async function removeKnowledge(item) {
  const current = await loadKnowledge();
  const itemLower = item.toLowerCase().trim();

  if (!itemLower) return { removed: false, updated: current };

  const lines = current.split('\n');
  const filtered = lines.filter(line => {
    const cleaned = line.replace(/^[-*]\s*/, '').trim().toLowerCase();
    return !cleaned.includes(itemLower);
  });

  const removed = filtered.length < lines.length;
  const updated = filtered.join('\n').trim();

  if (removed) {
    await saveKnowledge(updated);
  }

  return { removed, updated };
}

/**
 * Parse AI response for knowledge commands and execute them
 * Commands are formatted as: [REMEMBER: text] or [FORGET: text]
 * @param {string} response - The AI response to parse
 * @returns {Promise<{cleanedResponse: string, actions: string[]}>}
 */
export async function parseAndExecuteKnowledgeCommands(response) {
  const actions = [];
  let cleanedResponse = response;

  // Match [REMEMBER: ...] commands
  const rememberRegex = /\[REMEMBER:\s*([^\]]+)\]/gi;
  let match;

  while ((match = rememberRegex.exec(response)) !== null) {
    const item = match[1].trim();
    await addKnowledge(item);
    actions.push(`Remembered: ${item}`);
    cleanedResponse = cleanedResponse.replace(match[0], '').trim();

    // Check if this is a user name and update config
    const extractedName = extractUserName(item);
    if (extractedName) {
      await updateConfigUserName(extractedName);
    }
  }

  // Match [FORGET: ...] commands
  const forgetRegex = /\[FORGET:\s*([^\]]+)\]/gi;

  while ((match = forgetRegex.exec(response)) !== null) {
    const item = match[1].trim();
    const result = await removeKnowledge(item);
    if (result.removed) {
      actions.push(`Forgot: ${item}`);
    }
    cleanedResponse = cleanedResponse.replace(match[0], '').trim();
  }

  // Clean up any extra whitespace
  cleanedResponse = cleanedResponse.replace(/\n{3,}/g, '\n\n').trim();

  return { cleanedResponse, actions };
}
