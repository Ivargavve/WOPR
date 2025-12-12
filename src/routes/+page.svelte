<script>
  import { onMount } from 'svelte';
  import { RetroButton, ModeSelector, SettingsPanel } from '$lib/components';
  import { getCurrentMode, getCurrentModeInfo } from '$lib/stores/mode.svelte.js';
  import { AssistantMode, MonitorMode, PomodoroMode } from '$lib/modes';
  import { loadConfig, saveConfig } from '$lib/services/storage.js';
  import { loadKnowledge } from '$lib/services/knowledge.js';
  import * as permissions from '$lib/services/permissions.js';

  let time = $state('');
  let status = $state('INITIALIZING');
  let visionOn = $state(false);
  let listening = $state(false);
  let showSettings = $state(false);
  let defconLevel = $state(5);
  let memoryItems = $state(/** @type {string[]} */ ([]));
  let showMemory = $state(false);
  /** @type {import('$lib/services/storage.js').AppConfig | null} */
  let currentConfig = $state(null);

  /** @type {import('$lib/modes').AssistantMode | null} */
  let assistantModeRef = $state(null);

  // Reload memory periodically
  async function reloadMemory() {
    try {
      const knowledge = await loadKnowledge();
      if (knowledge && knowledge.trim()) {
        memoryItems = knowledge.split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^[-*]\s*/, '').trim());
      } else {
        memoryItems = [];
      }
    } catch (e) {
      console.error('Failed to load memory:', e);
    }
  }

  // Get defcon from assistant mode
  function syncDefcon() {
    if (assistantModeRef) {
      defconLevel = assistantModeRef.getDefconLevel();
    }
  }

  const currentMode = $derived(getCurrentMode());
  const modeInfo = $derived(getCurrentModeInfo());

  /** @type {ReturnType<typeof setInterval> | null} */
  let timeInterval = null;

  onMount(() => {
    // Load config to get vision/voice state
    loadConfig().then(config => {
      currentConfig = config;
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

    // Update time every second and sync state
    const updateTime = () => {
      const now = new Date();
      time = now.toLocaleTimeString('en-US', { hour12: false });
      syncDefcon();
    };
    updateTime();
    timeInterval = setInterval(updateTime, 1000);

    // Load memory initially and periodically
    reloadMemory();
    const memoryInterval = setInterval(reloadMemory, 5000);

    return () => {
      if (timeInterval) clearInterval(timeInterval);
      clearInterval(memoryInterval);
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
        return; // Don't save if permission not granted
      }
    } else {
      visionOn = false;
      status = 'STANDBY';
    }
    // Save to config
    if (currentConfig) {
      await saveConfig({ ...currentConfig, vision_enabled: visionOn });
    }
  }

  async function toggleListening() {
    listening = !listening;
    // Save to config
    if (currentConfig) {
      await saveConfig({ ...currentConfig, voice_enabled: listening });
    }
  }

  function toggleSettings() {
    showSettings = !showSettings;
  }

  async function handleSettingsClose() {
    showSettings = false;
    // Reload config to apply any changes
    try {
      const config = await loadConfig();
      currentConfig = config;
      visionOn = config.vision_enabled;
      listening = config.voice_enabled;
      status = visionOn ? 'OBSERVING' : 'STANDBY';
    } catch (e) {
      console.error('Failed to reload config:', e);
    }
  }

  function handleScan() {
    if (assistantModeRef) {
      assistantModeRef.triggerScan();
    }
  }
</script>

<main class="wopr-container">
  <div class="scanlines"></div>

  <div class="main-row">
    <!-- Left column: content + control bar -->
    <div class="left-column">
      <section class="content-area">
        {#if currentMode === 'assistant'}
          <AssistantMode bind:this={assistantModeRef} {visionOn} voiceOn={listening} />
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
          icon="@"
          onclick={handleScan}
          disabled={currentMode !== 'assistant'}
        />
        <RetroButton
          icon="■"
          label="VISION"
          active={visionOn}
          onclick={toggleVision}
        />
        <RetroButton
          icon="♫"
          label="MIC"
          active={listening}
          onclick={toggleListening}
        />
        <RetroButton
          icon="⚙"
          label="CONFIG"
          onclick={toggleSettings}
        />
      </footer>
    </div>

    <!-- Sidebar - right side -->
    <aside class="sidebar">
      <!-- WOPR Logo -->
      <div class="logo-section">
        <pre class="wopr-ascii">██╗    ██╗ ██████╗ ██████╗ ██████╗
██║    ██║██╔═══██╗██╔══██╗██╔══██╗
██║ █╗ ██║██║   ██║██████╔╝██████╔╝
██║███╗██║██║   ██║██╔═══╝ ██╔══██╗
╚███╔███╔╝╚██████╔╝██║     ██║  ██║
 ╚══╝╚══╝  ╚═════╝ ╚═╝     ╚═╝  ╚═╝</pre>
        <div class="status-line">
          <span class="status-value glow">{status}</span>
          <span class="status-sep">|</span>
          <span class="time-value">{time}</span>
        </div>
      </div>

      <!-- Mode selector -->
      <div class="sidebar-section">
        <div class="section-label">MODE</div>
        <ModeSelector />
      </div>

      <!-- DEFCON Level -->
      <div class="sidebar-section">
        <div class="section-label">DEFCON</div>
        <div class="defcon-display defcon-{defconLevel}">
          <span class="defcon-number">{defconLevel}</span>
          <span class="defcon-status">
            {#if defconLevel === 5}FADE OUT
            {:else if defconLevel === 4}DOUBLE TAKE
            {:else if defconLevel === 3}ROUND HOUSE
            {:else if defconLevel === 2}FAST PACE
            {:else}COCKED PISTOL{/if}
          </span>
        </div>
      </div>

      <!-- Status indicators -->
      <div class="sidebar-section">
        <div class="section-label">STATUS</div>
        <div class="status-indicators">
          <div class="indicator" class:active={visionOn}>
            <span class="indicator-icon">■</span>
            <span class="indicator-label">EYE</span>
            <span class="indicator-value">{visionOn ? 'ON' : 'OFF'}</span>
          </div>
          <div class="indicator" class:active={listening}>
            <span class="indicator-icon">♫</span>
            <span class="indicator-label">MIC</span>
            <span class="indicator-value">{listening ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      </div>

      <!-- Memory Bank -->
      <div class="sidebar-section">
        <button class="section-label memory-toggle" onclick={() => showMemory = !showMemory}>
          MEMORY [{memoryItems.length}] {showMemory ? '▲' : '▼'}
        </button>
        {#if showMemory}
          <div class="memory-list">
            {#if memoryItems.length === 0}
              <div class="memory-empty">NO DATA</div>
            {:else}
              {#each memoryItems as item, i}
                <div class="memory-item">
                  <span class="memory-index">{i + 1}.</span>
                  <span class="memory-text">{item}</span>
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>

      <!-- Tips -->
      <div class="sidebar-section tips-section">
        <div class="tips-box">
          <div class="tips-title">TERMINAL</div>
          <div class="tips-content">
            Type <span class="cmd">/help</span> for commands
            <br/><span class="cmd">/memory</span> view memories
            <br/><span class="cmd">/defcon 1-5</span> alert level
          </div>
        </div>
      </div>
    </aside>
  </div>

  <SettingsPanel show={showSettings} onclose={handleSettingsClose} />
</main>

<style>
  .wopr-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    padding: 0.5rem;
    position: relative;
    background: var(--bg-primary);
    gap: 0.4rem;
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

  .main-row {
    display: flex;
    flex: 1;
    gap: 0.5rem;
    min-height: 0;
  }

  .left-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .content-area {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .sidebar {
    width: 220px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.5rem;
  }

  .logo-section {
    text-align: center;
  }

  .wopr-ascii {
    font-size: 0.6rem;
    line-height: 1.1;
    color: var(--text-primary);
    text-shadow: 0 0 10px var(--text-primary), 0 0 20px rgba(0, 255, 65, 0.3);
    margin: 0;
    font-family: var(--font-mono);
  }

  .status-line {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.55rem;
    text-transform: uppercase;
    margin-top: 0.3rem;
  }

  .status-value {
    color: var(--text-primary);
  }

  .status-sep {
    color: var(--border-color);
  }

  .time-value {
    color: var(--text-dim);
    font-family: var(--font-mono);
  }

  .sidebar-section {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .section-label {
    font-size: 0.65rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin-bottom: 0.2rem;
  }

  .status-indicators {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-dim);
    padding: 0.3rem 0;
  }

  .indicator.active {
    color: var(--text-primary);
  }

  .indicator.active .indicator-icon {
    text-shadow: 0 0 8px var(--text-primary);
  }

  .indicator-icon {
    width: 1.2rem;
    text-align: center;
    font-size: 1rem;
  }

  .indicator-label {
    flex: 1;
    text-transform: uppercase;
  }

  .indicator-value {
    font-family: var(--font-mono);
  }

  /* DEFCON Display */
  .defcon-display {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    background: var(--bg-panel);
  }

  .defcon-number {
    font-size: 1.8rem;
    font-weight: bold;
    font-family: var(--font-mono);
    min-width: 2rem;
    text-align: center;
  }

  .defcon-status {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.8;
  }

  .defcon-5 { color: var(--text-primary); }
  .defcon-5 .defcon-number { text-shadow: 0 0 10px var(--text-primary); }

  .defcon-4 { color: #7fff7f; }
  .defcon-4 .defcon-number { text-shadow: 0 0 10px #7fff7f; }

  .defcon-3 { color: #ffff00; }
  .defcon-3 .defcon-number { text-shadow: 0 0 10px #ffff00; }

  .defcon-2 { color: #ffa500; }
  .defcon-2 .defcon-number { text-shadow: 0 0 10px #ffa500; }

  .defcon-1 { color: #ff4444; }
  .defcon-1 .defcon-number { text-shadow: 0 0 15px #ff4444, 0 0 30px #ff4444; }
  .defcon-1 { animation: defcon-alert 1s ease-in-out infinite; }

  @keyframes defcon-alert {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  /* Memory Section */
  .memory-toggle {
    width: 100%;
    background: none;
    border: none;
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    cursor: pointer;
    text-align: left;
    padding: 0;
    margin-bottom: 0.3rem;
  }

  .memory-toggle:hover {
    color: var(--text-primary);
  }

  .memory-list {
    max-height: 120px;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    background: var(--bg-panel);
    padding: 0.3rem;
  }

  .memory-item {
    display: flex;
    gap: 0.3rem;
    font-size: 0.6rem;
    padding: 0.2rem 0;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-dim);
  }

  .memory-item:last-child {
    border-bottom: none;
  }

  .memory-index {
    color: var(--text-primary);
    opacity: 0.6;
    min-width: 1.2rem;
  }

  .memory-text {
    flex: 1;
    word-break: break-word;
  }

  .memory-empty {
    font-size: 0.6rem;
    color: var(--text-dim);
    opacity: 0.5;
    text-align: center;
    padding: 0.5rem;
  }

  /* Tips Section */
  .tips-section {
    margin-top: auto;
  }

  .tips-box {
    border: 1px solid var(--border-color);
    padding: 0.5rem;
    background: var(--bg-panel);
  }

  .tips-title {
    font-size: 0.55rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.3rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.2rem;
  }

  .tips-content {
    font-size: 0.55rem;
    color: var(--text-dim);
    line-height: 1.6;
  }

  .tips-content .cmd {
    color: var(--text-primary);
    font-family: var(--font-mono);
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
    font-size: 1rem;
    color: var(--text-primary);
  }

  .dim {
    color: var(--text-dim);
  }

  .control-bar {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 0;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
    margin-top: auto;
  }

  .control-bar :global(button) {
    flex: 1;
    min-height: 56px; /* Touch-friendly */
    font-size: 0.9rem;
  }

  .control-bar :global(button:first-child) {
    flex: 0;
    min-width: 56px;
  }

  .control-bar :global(.btn-label) {
    font-size: 0.85rem;
  }

  .control-bar :global(.btn-icon) {
    font-size: 1.3rem;
  }

  .glow {
    text-shadow: 0 0 10px var(--text-primary), 0 0 20px rgba(0, 255, 65, 0.3);
  }
</style>
