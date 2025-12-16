<script>
  import { onMount } from 'svelte';
  import RetroPanel from './RetroPanel.svelte';
  import RetroButton from './RetroButton.svelte';
  import RetroToggle from './RetroToggle.svelte';
  import RetroInput from './RetroInput.svelte';
  import RetroSelect from './RetroSelect.svelte';
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
        captureInterval = Math.round((config.capture_interval_ms || 300000) / 1000);
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
      testResult = 'ERROR: No API key';
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
      testResult = success ? 'OK: Connected!' : 'FAIL: Check key';
    } catch (e) {
      testResult = 'FAIL: ' + (e instanceof Error ? e.message : 'Error');
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
        migrationStatus = 'Migrating data...';

        try {
          await changeDataFolder(newPath, true);
          dataFolderPath = newPath;
          migrationStatus = 'Done!';
          setTimeout(() => { migrationStatus = ''; }, 2000);
        } catch (e) {
          migrationStatus = 'Error: ' + (e instanceof Error ? e.message : 'Failed');
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
    migrationStatus = 'Resetting to default...';

    try {
      await changeDataFolder(defaultFolderPath, true);
      dataFolderPath = defaultFolderPath;
      migrationStatus = 'Done!';
      setTimeout(() => { migrationStatus = ''; }, 2000);
    } catch (e) {
      migrationStatus = 'Error: ' + (e instanceof Error ? e.message : 'Failed');
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
        <span class="header-title">[*] CONFIGURATION</span>
        <button class="close-btn" onclick={onclose}>X</button>
      </div>

      {#if isLoading}
        <div class="loading">> Loading settings...</div>
      {:else}
        <div class="settings-content">
          <RetroPanel title="AI PROVIDER">
            <div class="setting-group">
              <RetroSelect
                label="Provider"
                options={providerOptions}
                bind:value={aiProvider}
              />
            </div>
            <div class="setting-group">
              <RetroInput
                label="API Key"
                type="password"
                bind:value={apiKey}
                placeholder="Enter your API key"
              />
            </div>
            <div class="setting-group">
              <RetroSelect
                label="Model"
                options={availableModels}
                bind:value={aiModel}
              />
            </div>
            <div class="setting-group test-row">
              <RetroButton
                label={isTesting ? 'TESTING...' : 'TEST'}
                onclick={handleTestConnection}
                disabled={isTesting || !apiKey}
              />
              {#if testResult}
                <span class="test-result" class:success={testResult.startsWith('OK')} class:error={testResult.startsWith('FAIL') || testResult.startsWith('ERROR')}>
                  {testResult}
                </span>
              {/if}
            </div>
          </RetroPanel>

          <RetroPanel title="PERSONA">
            <div class="setting-group">
              <RetroInput
                label="AI Name"
                bind:value={personaName}
                placeholder="Joshua"
              />
            </div>
            <div class="setting-group">
              <RetroInput
                label="Your Name"
                bind:value={userName}
                placeholder="Player"
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

          <RetroPanel title="SCREEN CAPTURE">
            <div class="setting-group">
              <RetroInput
                label="Capture Interval (seconds)"
                type="number"
                bind:value={captureInterval}
                placeholder="30"
              />
            </div>
            {#if captureScreens.length > 1}
              <div class="setting-group">
                <RetroSelect
                  label="Capture Monitor"
                  options={[
                    { value: 'default', label: 'Primary Display' },
                    ...captureScreens.map(s => ({
                      value: String(s.index),
                      label: `${s.name} (${s.width}x${s.height})${s.is_primary ? ' *' : ''}`
                    }))
                  ]}
                  bind:value={selectedMonitor}
                />
              </div>
            {/if}
          </RetroPanel>

          <RetroPanel title="DATA STORAGE">
            <div class="folder-display">
              <span class="folder-label">Data Folder:</span>
              <span class="folder-path" title={dataFolderPath}>{dataFolderPath}</span>
            </div>
            <div class="folder-buttons">
              <RetroButton
                label={isMigrating ? 'WORKING...' : 'CHANGE'}
                onclick={handlePickFolder}
                disabled={isMigrating}
              />
              <RetroButton
                label="RESET"
                onclick={handleResetFolder}
                disabled={isMigrating || dataFolderPath === defaultFolderPath}
              />
            </div>
            {#if migrationStatus}
              <div class="migration-status" class:error={migrationStatus.startsWith('Error')}>
                {migrationStatus}
              </div>
            {/if}
            <p class="dim folder-hint">Data includes brain memory and captures</p>
          </RetroPanel>

          <RetroPanel title="DISPLAY">
            <div class="toggle-group">
              <RetroToggle
                label="Always On Top"
                bind:checked={alwaysOnTop}
              />
            </div>
            <div class="display-info">
              <p class="dim">Displays: {displays.length}</p>
            </div>
            <div class="display-buttons">
              <RetroButton label="FULLSCREEN" onclick={handleFullscreen} />
              <RetroButton label="WINDOWED" onclick={handleWindowed} />
            </div>
          </RetroPanel>
        </div>

        <div class="settings-footer">
          <RetroButton label="CANCEL" onclick={onclose} />
          <RetroButton label="SAVE" variant="primary" onclick={handleSave} />
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
    background: rgba(0, 0, 0, 0.9);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .settings-panel {
    background: var(--bg-primary);
    border: 2px solid var(--text-primary);
    box-shadow: var(--glow-green), 0 0 40px var(--text-primary-20);
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
    border: 1px solid var(--border-color);
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    transition: all 0.2s;
  }

  .close-btn:hover {
    color: var(--accent-error);
    border-color: var(--accent-error);
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
    margin-bottom: 0.75rem;
  }

  .setting-group:last-child {
    margin-bottom: 0;
  }

  .toggle-group {
    margin-bottom: 0.5rem;
  }

  .toggle-group:last-child {
    margin-bottom: 0;
  }

  .test-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .test-result {
    font-size: 0.75rem;
    color: var(--text-dim);
  }

  .test-result.success {
    color: var(--text-primary);
  }

  .test-result.error {
    color: var(--accent-error);
  }

  .display-info {
    margin-bottom: 0.75rem;
    font-size: 0.75rem;
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
  }

  .folder-display {
    margin-bottom: 0.75rem;
  }

  .folder-label {
    display: block;
    color: var(--text-dim);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }

  .folder-path {
    display: block;
    color: var(--text-primary);
    font-size: 0.75rem;
    word-break: break-all;
    background: var(--bg-panel);
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    max-height: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .folder-buttons {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .folder-buttons :global(button) {
    flex: 1;
  }

  .folder-hint {
    font-size: 0.65rem;
    margin-top: 0.5rem;
  }

  .migration-status {
    font-size: 0.75rem;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .migration-status.error {
    color: var(--accent-error);
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
