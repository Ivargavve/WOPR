<script>
  import { onMount } from 'svelte';
  import { RetroPanel, RetroButton, RetroToggle, RetroInput, RetroSelect } from '$lib/components';
  import { getAvailableDisplays, setBorderlessFullscreen, setAlwaysOnTop } from '$lib/services/window.js';
  import { loadConfig, saveConfig } from '$lib/services/storage.js';

  /** @type {{show: boolean, onclose: () => void}} */
  let { show = false, onclose = () => {} } = $props();

  /** @type {import('$lib/services/storage.js').AppConfig | null} */
  let config = $state(null);
  let isLoading = $state(true);
  /** @type {import('$lib/services/window.js').DisplayInfo[]} */
  let displays = $state([]);

  // Local state for form fields
  let personaName = $state('Joshua');
  let apiKey = $state('');
  let visionEnabled = $state(true);
  let voiceEnabled = $state(true);
  let wakeWord = $state('Joshua');
  let scanlines = $state(true);
  let alwaysOnTop = $state(false);

  onMount(async () => {
    try {
      config = await loadConfig();
      if (config) {
        personaName = config.persona_name;
        apiKey = config.api_key || '';
        visionEnabled = config.vision_enabled;
        voiceEnabled = config.voice_enabled;
        wakeWord = config.wake_word;
        scanlines = config.theme?.scanlines ?? true;
        alwaysOnTop = config.always_on_top;
      }

      displays = await getAvailableDisplays();
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      isLoading = false;
    }
  });

  async function handleSave() {
    if (!config) return;

    const updatedConfig = {
      ...config,
      persona_name: personaName,
      api_key: apiKey || null,
      vision_enabled: visionEnabled,
      voice_enabled: voiceEnabled,
      wake_word: wakeWord,
      always_on_top: alwaysOnTop,
      theme: {
        ...config.theme,
        scanlines
      }
    };

    try {
      await saveConfig(updatedConfig);
      await setAlwaysOnTop(alwaysOnTop);
      onclose();
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  async function handleFullscreen() {
    try {
      await setBorderlessFullscreen(true);
    } catch (e) {
      console.error('Failed to set fullscreen:', e);
    }
  }

  async function handleWindowed() {
    try {
      await setBorderlessFullscreen(false);
    } catch (e) {
      console.error('Failed to exit fullscreen:', e);
    }
  }
</script>

{#if show}
  <div class="settings-overlay" onclick={onclose} onkeydown={(e) => e.key === 'Escape' && onclose()} role="dialog" tabindex="-1">
    <div class="settings-panel" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="document">
      <div class="settings-header">
        <span class="header-title">⚙ CONFIGURATION</span>
        <button class="close-btn" onclick={onclose}>✕</button>
      </div>

      {#if isLoading}
        <div class="loading">Loading settings...</div>
      {:else}
        <div class="settings-content">
          <RetroPanel title="AI PERSONA">
            <div class="setting-group">
              <RetroInput
                label="Persona Name"
                bind:value={personaName}
                placeholder="Joshua"
              />
            </div>
            <div class="setting-group">
              <RetroInput
                label="Gemini API Key"
                type="password"
                bind:value={apiKey}
                placeholder="Enter your API key"
              />
            </div>
            <div class="setting-group">
              <RetroInput
                label="Wake Word"
                bind:value={wakeWord}
                placeholder="Joshua"
              />
            </div>
          </RetroPanel>

          <RetroPanel title="FEATURES">
            <div class="toggle-group">
              <RetroToggle
                label="Screen Vision"
                bind:checked={visionEnabled}
              />
            </div>
            <div class="toggle-group">
              <RetroToggle
                label="Voice Activation"
                bind:checked={voiceEnabled}
              />
            </div>
            <div class="toggle-group">
              <RetroToggle
                label="Scanlines Effect"
                bind:checked={scanlines}
              />
            </div>
            <div class="toggle-group">
              <RetroToggle
                label="Always On Top"
                bind:checked={alwaysOnTop}
              />
            </div>
          </RetroPanel>

          <RetroPanel title="DISPLAY">
            <div class="display-info">
              <p class="dim">Available displays: {displays.length}</p>
              {#each displays as display, i}
                <p class="display-item">
                  {display.is_primary ? '●' : '○'} {display.name} ({display.width}x{display.height})
                </p>
              {/each}
            </div>
            <div class="display-buttons">
              <RetroButton
                label="FULLSCREEN"
                onclick={handleFullscreen}
              />
              <RetroButton
                label="WINDOWED"
                onclick={handleWindowed}
              />
            </div>
          </RetroPanel>
        </div>

        <div class="settings-footer">
          <RetroButton
            label="CANCEL"
            onclick={onclose}
          />
          <RetroButton
            label="SAVE"
            variant="primary"
            onclick={handleSave}
          />
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .settings-panel {
    background: var(--bg-primary);
    border: 2px solid var(--text-primary);
    box-shadow: var(--glow-green), 0 0 40px rgba(0, 255, 65, 0.2);
    width: 100%;
    max-width: 450px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-panel);
  }

  .header-title {
    color: var(--text-primary);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 1rem;
    cursor: pointer;
    padding: 0.25rem;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: var(--accent-error);
  }

  .settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .loading {
    padding: 2rem;
    text-align: center;
    color: var(--text-dim);
  }

  .setting-group {
    margin-bottom: 1rem;
  }

  .setting-group:last-child {
    margin-bottom: 0;
  }

  .toggle-group {
    margin-bottom: 0.75rem;
  }

  .toggle-group:last-child {
    margin-bottom: 0;
  }

  .display-info {
    margin-bottom: 1rem;
    font-size: 0.75rem;
  }

  .display-item {
    padding: 0.25rem 0;
    color: var(--text-primary);
  }

  .display-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .display-buttons :global(button) {
    flex: 1;
  }

  .dim {
    color: var(--text-dim);
    margin-bottom: 0.5rem;
  }

  .settings-footer {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .settings-footer :global(button) {
    flex: 1;
  }
</style>
