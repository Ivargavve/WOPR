<script>
  import { onMount } from 'svelte';
  import { RetroButton, ModeSelector, SettingsPanel } from '$lib/components';
  import { getCurrentMode, getCurrentModeInfo } from '$lib/stores/mode.svelte.js';
  import { AssistantMode, MonitorMode, PomodoroMode } from '$lib/modes';
  import { loadConfig } from '$lib/services/storage.js';
  import * as permissions from '$lib/services/permissions.js';

  let time = $state('');
  let status = $state('INITIALIZING');
  let visionOn = $state(false);
  let listening = $state(false);
  let showSettings = $state(false);

  const currentMode = $derived(getCurrentMode());
  const modeInfo = $derived(getCurrentModeInfo());

  /** @type {ReturnType<typeof setInterval> | null} */
  let timeInterval = null;

  onMount(() => {
    // Load config to get vision/voice state
    loadConfig().then(config => {
      visionOn = config.vision_enabled;
      listening = config.voice_enabled;
      // Update status after config loads
      setTimeout(() => {
        status = visionOn ? 'OBSERVING' : 'STANDBY';
      }, 1500);
    }).catch(e => {
      console.error('Failed to load config:', e);
      setTimeout(() => {
        status = 'STANDBY';
      }, 1500);
    });

    // Update time every second
    const updateTime = () => {
      const now = new Date();
      time = now.toLocaleTimeString('en-US', { hour12: false });
    };
    updateTime();
    timeInterval = setInterval(updateTime, 1000);

    return () => {
      if (timeInterval) clearInterval(timeInterval);
    };
  });

  async function toggleVision() {
    if (!visionOn) {
      // Trying to enable - check permission first
      const hasPermission = await permissions.testScreenCapture();
      if (hasPermission) {
        visionOn = true;
        status = 'OBSERVING';
      } else {
        // Open settings for user to grant permission
        await permissions.openScreenRecordingSettings();
      }
    } else {
      visionOn = false;
      status = 'STANDBY';
    }
  }

  function toggleListening() {
    // Just toggle the state - browser will ask for mic permission when voice is actually used
    listening = !listening;
  }

  function toggleSettings() {
    showSettings = !showSettings;
  }
</script>

<main class="wopr-container">
  <div class="scanlines"></div>

  <header class="wopr-header">
    <pre class="logo glow">
██╗    ██╗ ██████╗ ██████╗ ██████╗
██║    ██║██╔═══██╗██╔══██╗██╔══██╗
██║ █╗ ██║██║   ██║██████╔╝██████╔╝
██║███╗██║██║   ██║██╔═══╝ ██╔══██╗
╚███╔███╔╝╚██████╔╝██║     ██║  ██║
 ╚══╝╚══╝  ╚═════╝ ╚═╝     ╚═╝  ╚═╝
    </pre>
    <div class="version">v0.1.0</div>
  </header>

  <section class="status-bar">
    <div class="status-item">
      <span class="label">STATUS:</span>
      <span class="value glow">{status}</span>
    </div>
    <div class="status-item">
      <span class="label">TIME:</span>
      <span class="value">{time}</span>
    </div>
  </section>

  <section class="mode-selector-section">
    <ModeSelector />
  </section>

  <section class="content-area">
    {#if currentMode === 'assistant'}
      <AssistantMode {visionOn} voiceOn={listening} />
    {:else if currentMode === 'monitor'}
      <MonitorMode />
    {:else if currentMode === 'pomodoro'}
      <PomodoroMode />
    {:else}
      <div class="coming-soon">
        <p class="mode-title">[{modeInfo.icon}] {modeInfo.name}</p>
        <p class="dim">> Coming soon...</p>
      </div>
    {/if}
  </section>

  <footer class="control-bar">
    <RetroButton
      icon="■"
      label={visionOn ? 'VISION ON' : 'VISION OFF'}
      active={visionOn}
      onclick={toggleVision}
    />
    <RetroButton
      icon="♫"
      label={listening ? 'LISTENING' : 'MUTED'}
      active={listening}
      onclick={toggleListening}
    />
    <RetroButton
      icon="⚙"
      label="CONFIG"
      onclick={toggleSettings}
    />
  </footer>

  <SettingsPanel show={showSettings} onclose={() => showSettings = false} />
</main>

<style>
  .wopr-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    padding: 1rem;
    position: relative;
    background: var(--bg-primary);
    gap: 0.75rem;
  }

  .scanlines {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.1),
      rgba(0, 0, 0, 0.1) 1px,
      transparent 1px,
      transparent 2px
    );
    pointer-events: none;
    z-index: 100;
  }

  .wopr-header {
    text-align: center;
  }

  .logo {
    font-size: 0.45rem;
    line-height: 1.1;
    color: var(--text-primary);
    margin: 0;
  }

  .version {
    color: var(--text-dim);
    font-size: 0.7rem;
    margin-top: 0.25rem;
  }

  .status-bar {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    font-size: 0.75rem;
  }

  .status-item {
    display: flex;
    gap: 0.5rem;
  }

  .label {
    color: var(--text-dim);
  }

  .value {
    color: var(--text-primary);
  }

  .mode-selector-section {
    flex-shrink: 0;
  }

  .content-area {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .coming-soon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 0.5rem;
  }

  .mode-title {
    font-size: 1.25rem;
    color: var(--text-primary);
  }

  .dim {
    color: var(--text-dim);
  }

  .control-bar {
    display: flex;
    gap: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .control-bar :global(button) {
    flex: 1;
  }

  .glow {
    text-shadow: 0 0 10px var(--text-primary), 0 0 20px rgba(0, 255, 65, 0.3);
  }
</style>
