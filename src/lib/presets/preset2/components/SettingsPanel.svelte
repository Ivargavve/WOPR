<script>
  import { onMount } from 'svelte';
  import { getAvailableDisplays, setBorderlessFullscreen, setAlwaysOnTop } from '$lib/services/window.js';
  import { loadConfig, saveConfig, getDataPaths, changeDataFolder } from '$lib/services/storage.js';
  import { getAvailableScreens } from '$lib/services/capture.js';
  import { PROVIDERS, testConnection } from '$lib/services/ai.js';
  import { open } from '@tauri-apps/plugin-dialog';

  /** @type {{show: boolean, onclose: () => void}} */
  let { show = false, onclose = () => {} } = $props();

  /** @type {import('$lib/services/storage.js').AppConfig | null} */
  let config = $state(null);
  let isLoading = $state(true);
  let isTesting = $state(false);
  let testResult = $state('');
  let isMigrating = $state(false);
  let migrationStatus = $state('');
  /** @type {import('$lib/services/window.js').DisplayInfo[]} */
  let displays = $state([]);
  /** @type {import('$lib/services/capture.js').ScreenCaptureInfo[]} */
  let captureScreens = $state([]);

  // Local state for form fields
  let personaName = $state('Joshua');
  let userName = $state('Falken');
  /** @type {'openai' | 'anthropic' | 'gemini'} */
  let aiProvider = $state(/** @type {'openai' | 'anthropic' | 'gemini'} */ ('openai'));
  let apiKey = $state('');
  let aiModel = $state('gpt-4o-mini');
  let captureInterval = $state(30);
  let wakeWord = $state('Joshua');
  let alwaysOnTop = $state(false);
  let dataFolderPath = $state('');
  let defaultFolderPath = $state('');
  /** @type {string} */
  let selectedMonitor = $state('default');

  // Get available models for selected provider
  const availableModels = $derived(
    PROVIDERS[aiProvider]?.models.map((/** @type {{ id: string, name: string }} */ m) => ({ value: m.id, label: m.name })) || []
  );

  // Provider options for dropdown
  const providerOptions = Object.entries(PROVIDERS).map(([id, p]) => ({
    value: id,
    label: p.name
  }));

  // When provider changes, set default model
  $effect(() => {
    const provider = PROVIDERS[aiProvider];
    if (provider && !provider.models.find((/** @type {{ id: string }} */ m) => m.id === aiModel)) {
      aiModel = provider.defaultModel;
    }
  });

  onMount(async () => {
    try {
      config = await loadConfig();
      if (config) {
        personaName = config.persona_name;
        userName = config.user_name || 'Falken';
        aiProvider = /** @type {'openai' | 'anthropic' | 'gemini'} */ (config.ai_provider || 'openai');
        apiKey = config.api_key || '';
        aiModel = config.ai_model || 'gpt-4o-mini';
        captureInterval = Math.round((config.capture_interval_ms || 30000) / 1000);
        wakeWord = config.wake_word;
        alwaysOnTop = config.always_on_top;
        selectedMonitor = config.selected_monitor !== null && config.selected_monitor !== undefined
          ? String(config.selected_monitor) : 'default';
      }

      // Get data paths
      const paths = await getDataPaths();
      dataFolderPath = paths.data_folder;
      defaultFolderPath = paths.default_folder;

      displays = await getAvailableDisplays();

      // Get available screens for capture
      try {
        captureScreens = await getAvailableScreens();
      } catch (e) {
        console.error('Failed to get screens:', e);
      }
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
      user_name: userName,
      ai_provider: aiProvider,
      api_key: apiKey || null,
      ai_model: aiModel,
      capture_interval_ms: captureInterval * 1000,
      wake_word: wakeWord,
      always_on_top: alwaysOnTop,
      selected_monitor: selectedMonitor === 'default' ? null : parseInt(selectedMonitor, 10)
    };

    try {
      await saveConfig(updatedConfig);
      await setAlwaysOnTop(alwaysOnTop);
      onclose();
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  async function handleTestConnection() {
    if (!apiKey) {
      testResult = 'No API key';
      return;
    }

    isTesting = true;
    testResult = 'Testing...';

    try {
      const success = await testConnection({
        provider: /** @type {import('$lib/services/ai.js').AIProvider} */ (aiProvider),
        apiKey,
        model: aiModel
      });
      testResult = success ? 'Connected!' : 'Check key';
    } catch (e) {
      testResult = 'Failed';
    } finally {
      isTesting = false;
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

  async function handlePickFolder() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select WOPR Data Folder'
      });

      if (selected && typeof selected === 'string') {
        const newPath = selected.endsWith('/WOPR') || selected.endsWith('\\WOPR')
          ? selected
          : `${selected}/WOPR`;

        isMigrating = true;
        migrationStatus = 'Moving data...';

        try {
          await changeDataFolder(newPath, true);
          dataFolderPath = newPath;
          migrationStatus = 'Done!';
          setTimeout(() => { migrationStatus = ''; }, 2000);
        } catch (e) {
          migrationStatus = 'Error';
        } finally {
          isMigrating = false;
        }
      }
    } catch (e) {
      console.error('Failed to pick folder:', e);
    }
  }

  async function handleResetFolder() {
    if (!defaultFolderPath) return;

    isMigrating = true;
    migrationStatus = 'Resetting...';

    try {
      await changeDataFolder(defaultFolderPath, true);
      dataFolderPath = defaultFolderPath;
      migrationStatus = 'Done!';
      setTimeout(() => { migrationStatus = ''; }, 2000);
    } catch (e) {
      migrationStatus = 'Error';
    } finally {
      isMigrating = false;
    }
  }
</script>

{#if show}
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="settings-overlay" onclick={onclose} role="dialog" aria-modal="true">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="settings-panel" onclick={(e) => e.stopPropagation()} role="document">
      <div class="settings-header">
        <span class="header-title">Settings</span>
        <button class="close-btn" onclick={onclose}>
          <span class="close-icon">✕</span>
        </button>
      </div>

      {#if isLoading}
        <div class="loading">
          <span>Loading...</span>
        </div>
      {:else}
        <div class="settings-content">
          <!-- AI Provider Section -->
          <div class="settings-section">
            <div class="section-header">
              <span class="section-title">AI Provider</span>
            </div>
            <div class="form-group">
              <label class="form-label">Provider</label>
              <select class="form-select" bind:value={aiProvider}>
                {#each providerOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">API Key</label>
              <input
                type="password"
                class="form-input"
                bind:value={apiKey}
                placeholder="Enter your API key"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Model</label>
              <select class="form-select" bind:value={aiModel}>
                {#each availableModels as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </div>
            <div class="test-row">
              <button
                class="btn btn-secondary"
                onclick={handleTestConnection}
                disabled={isTesting || !apiKey}
              >
                {isTesting ? 'Testing...' : 'Test'}
              </button>
              {#if testResult}
                <span class="test-result" class:success={testResult === 'Connected!'}>
                  {testResult}
                </span>
              {/if}
            </div>
          </div>

          <!-- Persona Section -->
          <div class="settings-section">
            <div class="section-header">
              <span class="section-title">Persona</span>
            </div>
            <div class="form-group">
              <label class="form-label">AI Name</label>
              <input
                type="text"
                class="form-input"
                bind:value={personaName}
                placeholder="Buddy"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Your Name</label>
              <input
                type="text"
                class="form-input"
                bind:value={userName}
                placeholder="Friend"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Wake Word</label>
              <input
                type="text"
                class="form-input"
                bind:value={wakeWord}
                placeholder="Buddy"
              />
            </div>
          </div>

          <!-- Screen Capture Section -->
          <div class="settings-section">
            <div class="section-header">
              <span class="section-title">Screen Capture</span>
            </div>
            <div class="form-group">
              <label class="form-label">Capture Interval (seconds)</label>
              <input
                type="number"
                class="form-input"
                bind:value={captureInterval}
                placeholder="30"
              />
            </div>
            {#if captureScreens.length > 1}
              <div class="form-group">
                <label class="form-label">Capture Monitor</label>
                <select class="form-select" bind:value={selectedMonitor}>
                  <option value="default">Primary Display</option>
                  {#each captureScreens as s}
                    <option value={String(s.index)}>
                      {s.name} ({s.width}x{s.height}){s.is_primary ? ' *' : ''}
                    </option>
                  {/each}
                </select>
              </div>
            {/if}
          </div>

          <!-- Data Storage Section -->
          <div class="settings-section">
            <div class="section-header">
              <span class="section-title">Data Storage</span>
            </div>
            <div class="folder-display">
              <span class="folder-path" title={dataFolderPath}>{dataFolderPath}</span>
            </div>
            <div class="folder-buttons">
              <button
                class="btn btn-secondary"
                onclick={handlePickFolder}
                disabled={isMigrating}
              >
                {isMigrating ? 'Working...' : 'Change'}
              </button>
              <button
                class="btn btn-secondary"
                onclick={handleResetFolder}
                disabled={isMigrating || dataFolderPath === defaultFolderPath}
              >
                Reset
              </button>
            </div>
            {#if migrationStatus}
              <div class="migration-status">{migrationStatus}</div>
            {/if}
            <p class="hint">Stores memory, captures, and logs</p>
          </div>

          <!-- Display Section -->
          <div class="settings-section">
            <div class="section-header">
              <span class="section-title">Display</span>
            </div>
            <div class="toggle-row">
              <span class="toggle-label">Always On Top</span>
              <label class="toggle">
                <input type="checkbox" bind:checked={alwaysOnTop} />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="display-buttons">
              <button class="btn btn-secondary" onclick={handleFullscreen}>
                Fullscreen
              </button>
              <button class="btn btn-secondary" onclick={handleWindowed}>
                Windowed
              </button>
            </div>
          </div>
        </div>

        <div class="settings-footer">
          <button class="btn btn-cancel" onclick={onclose}>Cancel</button>
          <button class="btn btn-primary" onclick={handleSave}>
            Save
          </button>
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
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .settings-panel {
    background: linear-gradient(180deg, #fdfaf7 0%, #f8f4f0 100%);
    border-radius: 24px;
    box-shadow: 0 24px 64px rgba(100, 80, 60, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.5);
    width: 100%;
    max-width: 420px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    font-family: 'Quicksand', 'Nunito', system-ui, sans-serif;
    overflow: hidden;
  }

  .settings-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid rgba(200, 180, 160, 0.2);
    background: rgba(255, 255, 255, 0.6);
  }

  .header-title {
    flex: 1;
    font-size: 1.1rem;
    font-weight: 600;
    color: #4a4039;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(240, 184, 192, 0.2);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 44px;
    min-height: 44px;
  }

  .close-btn:hover {
    background: rgba(240, 184, 192, 0.3);
    transform: scale(1.05);
  }

  .close-icon {
    font-size: 1rem;
    color: #8b7d6b;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem;
    color: #8b7d6b;
  }


  .settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .settings-section {
    background: rgba(255, 255, 255, 0.7);
    border-radius: 16px;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.5);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(200, 180, 160, 0.15);
  }

  .section-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #5a5048;
  }

  .form-group {
    margin-bottom: 0.75rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-label {
    display: block;
    font-size: 0.8rem;
    font-weight: 500;
    color: #8b7d6b;
    margin-bottom: 0.35rem;
  }

  .form-input,
  .form-select {
    width: 100%;
    padding: 0.65rem 0.9rem;
    border: 1px solid rgba(200, 180, 160, 0.3);
    border-radius: 10px;
    font-size: 0.9rem;
    font-family: inherit;
    background: rgba(255, 255, 255, 0.9);
    color: #4a4039;
    outline: none;
    transition: all 0.2s ease;
    min-height: 44px;
    box-sizing: border-box;
  }

  .form-input:focus,
  .form-select:focus {
    border-color: rgba(184, 160, 208, 0.5);
    box-shadow: 0 0 0 3px rgba(184, 160, 208, 0.15);
  }

  .form-input::placeholder {
    color: #a89b8a;
  }

  .test-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .test-result {
    font-size: 0.85rem;
    color: #8b7d6b;
  }

  .test-result.success {
    color: #6a9a7a;
  }

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.65rem 1rem;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 44px;
    border: none;
  }

  .btn-primary {
    background: linear-gradient(135deg, #e8a87c, #d4946a);
    color: white;
    box-shadow: 0 4px 12px rgba(232, 168, 124, 0.3);
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(232, 168, 124, 0.4);
  }

  .btn-secondary {
    background: rgba(212, 208, 232, 0.3);
    color: #5a5048;
  }

  .btn-secondary:hover {
    background: rgba(212, 208, 232, 0.5);
  }

  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-cancel {
    background: rgba(200, 180, 160, 0.2);
    color: #8b7d6b;
  }

  .btn-cancel:hover {
    background: rgba(200, 180, 160, 0.3);
  }

  .folder-display {
    margin-bottom: 0.75rem;
  }

  .folder-path {
    display: block;
    font-size: 0.8rem;
    color: #5a5048;
    padding: 0.6rem 0.8rem;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 8px;
    border: 1px solid rgba(200, 180, 160, 0.2);
    word-break: break-all;
    max-height: 50px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .folder-buttons {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .folder-buttons .btn {
    flex: 1;
  }

  .migration-status {
    font-size: 0.8rem;
    color: #6a9a7a;
    margin-bottom: 0.5rem;
  }

  .hint {
    font-size: 0.75rem;
    color: #a89b8a;
    margin: 0;
  }

  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .toggle-label {
    font-size: 0.9rem;
    color: #5a5048;
    font-weight: 500;
  }

  .toggle {
    position: relative;
    display: inline-block;
    width: 52px;
    height: 28px;
  }

  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(200, 180, 160, 0.3);
    transition: 0.3s;
    border-radius: 28px;
  }

  .toggle-slider::before {
    position: absolute;
    content: "";
    height: 22px;
    width: 22px;
    left: 3px;
    bottom: 3px;
    background: white;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .toggle input:checked + .toggle-slider {
    background: linear-gradient(135deg, #b8dcc8, #8cb8a0);
  }

  .toggle input:checked + .toggle-slider::before {
    transform: translateX(24px);
  }

  .display-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .display-buttons .btn {
    flex: 1;
  }

  .settings-footer {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid rgba(200, 180, 160, 0.2);
    background: rgba(255, 255, 255, 0.6);
  }

  .settings-footer .btn {
    flex: 1;
  }
</style>
