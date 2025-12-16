<script>
  import { onMount } from 'svelte';
  import { ModeSelector, SettingsPanel, AIPopup } from './components';
  import { getCurrentMode, getCurrentModeInfo, setMode } from '$lib/stores/mode.svelte.js';
  import { AssistantMode, MonitorMode, PomodoroMode, ScreenTimeMode } from './modes';
  import { loadConfig, saveConfig } from '$lib/services/storage.js';
  import { loadKnowledge } from '$lib/services/knowledge.js';
  import * as permissions from '$lib/services/permissions.js';
  import { invoke } from '@tauri-apps/api/core';
  import { loadAndApplyCozyTheme } from '$lib/services/cozyTheme.js';

  let hours = $state('12');
  let minutes = $state('00');
  let ampm = $state('PM');
  let greeting = $state('Hello');
  let userName = $state('');
  let visionOn = $state(false);
  let listening = $state(false);
  let showSettings = $state(false);
  let memoryItems = $state(/** @type {string[]} */ ([]));
  let showMemory = $state(false);
  /** @type {import('$lib/services/storage.js').AppConfig | null} */
  let currentConfig = $state(null);

  /** @type {import('./modes').AssistantMode | null} */
  let assistantModeRef = $state(null);

  // Voice activity indicators
  let isHearing = $state(false);
  let isSpeaking = $state(false);

  // Screen capture countdown
  let captureCountdown = $state(0);
  let lastCaptureTime = $state(Date.now());

  // AI Popup state
  let showAIPopup = $state(false);
  let popupMessage = $state('');
  let popupQuestion = $state('');

  // Screen time tracking
  let screentimeEnabled = $state(true);

  // Fullscreen mode (hide sidebar and bottom bar)
  let fullscreenMode = $state(false);

  // Mode dropdown
  let showModeDropdown = $state(false);

  const modes = [
    { id: 'monitor', label: 'System Monitor' },
    { id: 'screentime', label: 'Screen Time' },
    { id: 'pomodoro', label: 'Pomodoro Timer' },
    { id: 'assistant', label: 'Terminal' }
  ];

  // Get time-based greeting
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Sweet dreams';
  }

  // Reload memory
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

  const currentMode = $derived(getCurrentMode());
  const modeInfo = $derived(getCurrentModeInfo());
  const currentModeData = $derived(modes.find(m => m.id === currentMode) || modes[0]);

  /** @type {ReturnType<typeof setInterval> | null} */
  let timeInterval = null;

  onMount(() => {
    // Load cozy theme
    loadAndApplyCozyTheme();

    // Load config
    loadConfig().then(config => {
      currentConfig = config;
      visionOn = config.vision_enabled;
      listening = config.voice_enabled;
      screentimeEnabled = config.screentime_enabled ?? true;
      userName = config.user_name || '';
    }).catch(e => {
      console.error('Failed to load config:', e);
    });

    // Screen time tracking
    const trackScreenTime = async () => {
      if (screentimeEnabled) {
        try {
          await invoke('track_activity');
        } catch (e) {
          console.error('Screen time tracking error:', e);
        }
      }
    };
    trackScreenTime();
    const screentimeInterval = setInterval(trackScreenTime, 60000);

    // Update time - digital clock format
    const updateTime = () => {
      const now = new Date();
      let h = now.getHours();
      const m = now.getMinutes();
      ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      hours = h.toString();
      minutes = m.toString().padStart(2, '0');
      greeting = getGreeting();

      // Update capture countdown
      if (visionOn && currentConfig) {
        const elapsed = Date.now() - lastCaptureTime;
        const remaining = Math.max(0, currentConfig.capture_interval_ms - elapsed);
        captureCountdown = Math.ceil(remaining / 1000);
        if (remaining <= 0) {
          lastCaptureTime = Date.now();
        }
      } else {
        captureCountdown = 0;
      }

      // Sync voice activity
      if (assistantModeRef) {
        const voiceState = assistantModeRef.getVoiceState?.() || { isHearing: false, isSpeaking: false };
        isHearing = voiceState.isHearing;
        isSpeaking = voiceState.isSpeaking;
      }
    };
    updateTime();
    timeInterval = setInterval(updateTime, 1000);

    reloadMemory();
    const memoryInterval = setInterval(reloadMemory, 5000);

    // Close dropdown on outside click
    const handleClickOutside = () => {
      showModeDropdown = false;
    };
    document.addEventListener('click', handleClickOutside);

    return () => {
      if (timeInterval) clearInterval(timeInterval);
      clearInterval(memoryInterval);
      clearInterval(screentimeInterval);
      document.removeEventListener('click', handleClickOutside);
    };
  });

  async function toggleVision() {
    if (!visionOn) {
      const hasPermission = await permissions.testScreenCapture();
      if (hasPermission) {
        visionOn = true;
      } else {
        await permissions.openScreenRecordingSettings();
        return;
      }
    } else {
      visionOn = false;
    }
    if (currentConfig) {
      await saveConfig({ ...currentConfig, vision_enabled: visionOn });
    }
  }

  async function toggleListening() {
    listening = !listening;
    if (currentConfig) {
      await saveConfig({ ...currentConfig, voice_enabled: listening });
    }
  }

  function toggleSettings() {
    showSettings = !showSettings;
  }

  async function handleSettingsClose() {
    showSettings = false;
    try {
      const config = await loadConfig();
      currentConfig = config;
      visionOn = config.vision_enabled;
      listening = config.voice_enabled;
    } catch (e) {
      console.error('Failed to reload config:', e);
    }
  }

  function handleScan() {
    if (assistantModeRef) {
      assistantModeRef.triggerScan();
    }
  }

  function handleAIResponse(response, question) {
    if (currentMode !== 'assistant') {
      popupMessage = response;
      popupQuestion = question || '';
      showAIPopup = true;
    }
  }

  function closeAIPopup() {
    showAIPopup = false;
    popupMessage = '';
    popupQuestion = '';
  }

  function selectMode(modeId) {
    setMode(modeId);
    showModeDropdown = false;
  }
</script>

<main class="cozy-container" class:fullscreen={fullscreenMode}>
  <div class="main-row">
    <!-- Left column: content + control bar -->
    <div class="left-column">
      <section class="content-area">
        <div class="mode-content" class:hidden={currentMode !== 'assistant'}>
          <AssistantMode bind:this={assistantModeRef} {visionOn} voiceOn={listening} onResponse={handleAIResponse} />
        </div>
        {#if currentMode === 'monitor'}
          <MonitorMode />
        {:else if currentMode === 'pomodoro'}
          <PomodoroMode fullscreen={fullscreenMode} />
        {:else if currentMode === 'screentime'}
          <ScreenTimeMode />
        {:else if currentMode !== 'assistant'}
          <div class="coming-soon">
            <p>Coming soon</p>
          </div>
        {/if}
      </section>

      {#if !fullscreenMode}
        <footer class="control-bar">
          <button class="retro-btn" onclick={handleScan} disabled={!visionOn && currentMode !== 'assistant'}>
            <span class="btn-bracket">[</span>
            <span class="btn-icon">@</span>
            <span class="btn-bracket">]</span>
          </button>
          <button class="retro-btn" class:active={visionOn} onclick={toggleVision}>
            <span class="btn-bracket">[</span>
            <span class="btn-icon">{visionOn ? '■' : '▶'}</span>
            <span class="btn-label">Eye</span>
            <span class="btn-bracket">]</span>
          </button>
          <button class="retro-btn" class:active={listening} onclick={toggleListening}>
            <span class="btn-bracket">[</span>
            <span class="btn-icon">{listening ? '♫' : '○'}</span>
            <span class="btn-label">Voice</span>
            <span class="btn-bracket">]</span>
          </button>
          <button class="retro-btn" onclick={toggleSettings}>
            <span class="btn-bracket">[</span>
            <span class="btn-icon">⚙</span>
            <span class="btn-label">Config</span>
            <span class="btn-bracket">]</span>
          </button>
        </footer>
      {/if}
    </div>

    <!-- Sidebar - right side -->
    {#if !fullscreenMode}
      <aside class="sidebar">
        <!-- Decorative cats -->
        <div class="deco-cat cat-1"></div>
        <div class="deco-cat cat-2"></div>
        <div class="deco-cat cat-3"></div>

        <!-- Digital Clock at top -->
        <div class="clock-section">
          <div class="digital-clock">
            <span class="clock-hours">{hours}</span>
            <span class="clock-colon">:</span>
            <span class="clock-minutes">{minutes}</span>
            <span class="clock-ampm">{ampm}</span>
          </div>
          <div class="greeting-text">{greeting}{userName ? `, ${userName}` : ''}</div>
        </div>

        <!-- Mode selector -->
        <div class="mode-section">
          <button
            class="mode-selector"
            onclick={(e) => { e.stopPropagation(); showModeDropdown = !showModeDropdown; }}
          >
            <span class="mode-prefix">Mode:</span>
            <span class="mode-current">{currentModeData.label}</span>
            <span class="mode-arrow" class:open={showModeDropdown}>▼</span>
          </button>
          {#if showModeDropdown}
            <div class="mode-dropdown">
              {#each modes as mode}
                <button
                  class="mode-option"
                  class:active={currentMode === mode.id}
                  onclick={() => selectMode(mode.id)}
                >
                  <span>{mode.label}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Memory Bank -->
        <div class="memory-section">
          <button class="memory-toggle" onclick={() => showMemory = !showMemory}>
            Memory [{memoryItems.length}] {showMemory ? '▲' : '▼'}
          </button>
          {#if showMemory}
            <div class="memory-list">
              {#if memoryItems.length === 0}
                <div class="memory-empty">No memory yet</div>
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

        <!-- Status indicators -->
        <div class="status-section">
          <div class="status-indicators">
            <div class="indicator" class:active={visionOn}>
              <span class="indicator-label">Eye</span>
              <span class="indicator-value">{visionOn ? captureCountdown + 's' : '—'}</span>
            </div>
            <div class="indicator" class:active={listening}>
              <span class="indicator-label">Voice</span>
              <span class="indicator-value">
                {#if !listening}
                  —
                {:else if isHearing}
                  Hear
                {:else if isSpeaking}
                  Speak
                {:else}
                  On
                {/if}
              </span>
            </div>
          </div>
        </div>

        <!-- Tips -->
        <div class="tips-section">
          <div class="tips-box">
            <div class="tips-title">Tips</div>
            <div class="tips-content">
              Type <span class="cmd">/help</span> for commands
              <br/><span class="cmd">/color 1-2</span> light/dark
              <br/><span class="cmd">/preset 1-2</span> change UI
            </div>
          </div>
        </div>
      </aside>
    {/if}
  </div>

  <!-- Fullscreen toggle button -->
  <button class="fullscreen-toggle" onclick={() => fullscreenMode = !fullscreenMode} title={fullscreenMode ? 'Show panels' : 'Hide panels'}>
    {fullscreenMode ? '◤' : '◢'}
  </button>

  <SettingsPanel show={showSettings} onclose={handleSettingsClose} />
  <AIPopup
    show={showAIPopup}
    message={popupMessage}
    question={popupQuestion}
    autoDismissSeconds={15}
    onclose={closeAIPopup}
  />
</main>

<style>
  /* Import cozy fonts + Orbitron for digital clock */
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&family=Quicksand:wght@300;400;500;600;700&family=Orbitron:wght@400;500;600;700&display=swap');

  .cozy-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    padding: 0.5rem;
    position: relative;
    background: var(--cozy-bg, #e8ddd4);
    font-family: 'Quicksand', 'Nunito', -apple-system, system-ui, sans-serif;
    color: var(--cozy-text, #4a4039);
    gap: 0.4rem;
  }

  .cozy-container.fullscreen {
    padding: 0;
    gap: 0;
  }

  .cozy-container.fullscreen .main-row {
    gap: 0;
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
    background: var(--cozy-card, rgba(255, 255, 255, 0.55));
    border-radius: 16px;
    overflow: hidden;
    position: relative;
  }

  .left-column::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url('./assets/textures/wool2.png');
    background-size: cover;
    background-position: center;
    opacity: 0.15;
    pointer-events: none;
    border-radius: 16px;
  }

  .content-area {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    position: relative;
    padding: 0.5rem;
  }

  .mode-content {
    height: 100%;
  }

  .mode-content.hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
  }

  /* Sidebar */
  .sidebar {
    width: 180px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--cozy-card, rgba(255, 255, 255, 0.55));
    border-radius: 16px;
    position: relative;
    overflow: hidden;
  }

  .sidebar::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url('./assets/textures/carpet2.jpg');
    background-size: cover;
    background-position: center;
    opacity: 0.12;
    pointer-events: none;
    border-radius: 16px;
  }

  /* Decorative cats */
  .deco-cat {
    position: absolute;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    pointer-events: none;
    z-index: 1;
    opacity: 0.75;
    transition: opacity 0.3s ease;
  }

  /* Small cat bottom-left */
  .cat-1 {
    width: 22px;
    height: 22px;
    bottom: 2px;
    left: 2px;
    background-image: var(--cat-image-1, url('./assets/cats/c3.png'));
    transform: rotate(5deg);
  }

  /* Small cat top-left of clock */
  .cat-2 {
    width: 22px;
    height: 22px;
    top: 6px;
    left: 6px;
    background-image: var(--cat-image-2, url('./assets/cats/c2.png'));
    transform: rotate(8deg);
    opacity: 0.6;
  }

  /* Large cat in empty space */
  .cat-3 {
    width: 52px;
    height: 52px;
    bottom: 190px;
    right: 10px;
    background-image: var(--cat-image-3, url('./assets/cats/c10.png'));
    transform: rotate(10deg);
    opacity: 0.55;
  }

  /* Digital Clock */
  .clock-section {
    text-align: center;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.3));
  }

  .digital-clock {
    font-family: 'Orbitron', monospace;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 2px;
  }

  .clock-hours,
  .clock-minutes {
    font-size: 2.4rem;
    font-weight: 600;
    color: var(--cozy-text, #4a4039);
  }

  .clock-colon {
    font-size: 2.2rem;
    font-weight: 400;
    color: var(--cozy-accent, #e8a87c);
    animation: blink 1s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .clock-ampm {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--cozy-text-light, #8b7d6b);
    margin-left: 4px;
  }

  .greeting-text {
    font-size: 0.8rem;
    color: var(--cozy-text-light, #8b7d6b);
    margin-top: 0.25rem;
  }

  /* Mode Selection */
  .mode-section {
    position: relative;
  }

  .mode-selector {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.4rem;
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: inherit;
  }

  .mode-selector:hover {
    opacity: 0.7;
  }

  .mode-prefix {
    font-size: 0.65rem;
    color: var(--cozy-text-muted, #a89b8a);
    text-transform: uppercase;
  }

  .mode-current {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--cozy-text, #4a4039);
    white-space: nowrap;
  }

  .mode-arrow {
    font-size: 0.55rem;
    color: var(--cozy-text-light, #8b7d6b);
    transition: transform 0.2s ease;
  }

  .mode-arrow.open {
    transform: rotate(180deg);
  }

  .mode-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 50%;
    transform: translateX(-50%);
    min-width: 130px;
    background: var(--cozy-card, rgba(255, 255, 255, 0.95));
    backdrop-filter: blur(10px);
    border-radius: 8px;
    border: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.3));
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    z-index: 50;
    padding: 0.3rem 0;
  }

  .mode-option {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 0.45rem 0.75rem;
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.75rem;
    color: var(--cozy-text-light, #8b7d6b);
    transition: all 0.15s ease;
  }

  .mode-option:hover {
    background: var(--cozy-border, rgba(180, 160, 140, 0.2));
    color: var(--cozy-text, #4a4039);
  }

  .mode-option.active {
    color: var(--cozy-accent, #e8a87c);
  }

  .mode-option.active::before {
    content: '•';
    margin-right: 0.4rem;
  }

  /* Memory Section */
  .memory-section {
    position: relative;
  }

  .memory-toggle {
    width: 100%;
    background: none;
    border: none;
    color: var(--cozy-text-light, #8b7d6b);
    font-family: inherit;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    text-align: left;
    padding: 0;
  }

  .memory-toggle:hover {
    color: var(--cozy-text, #4a4039);
  }

  .memory-list {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 150px;
    overflow-y: auto;
    background: var(--cozy-card, rgba(255, 255, 255, 0.95));
    border: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.3));
    border-radius: 8px;
    padding: 0.4rem;
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    margin-top: 0.25rem;
  }

  .memory-item {
    display: flex;
    gap: 0.3rem;
    font-size: 0.65rem;
    padding: 0.25rem 0;
    border-bottom: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.2));
    color: var(--cozy-text-light, #8b7d6b);
  }

  .memory-item:last-child {
    border-bottom: none;
  }

  .memory-index {
    color: var(--cozy-accent, #e8a87c);
    min-width: 1.2rem;
  }

  .memory-text {
    flex: 1;
    word-break: break-word;
  }

  .memory-empty {
    font-size: 0.65rem;
    color: var(--cozy-text-muted, #a89b8a);
    text-align: center;
    padding: 0.5rem;
    font-style: italic;
  }

  /* Status Section */
  .status-section {
    margin-top: auto;
  }

  .status-indicators {
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    padding: 0.5rem 0;
  }

  .indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    color: var(--cozy-text-muted, #a89b8a);
  }

  .indicator.active {
    color: var(--cozy-text, #4a4039);
  }

  .indicator-label {
    text-transform: uppercase;
    font-size: 0.65rem;
    letter-spacing: 0.1em;
  }

  .indicator-value {
    font-size: 0.7rem;
    font-weight: 500;
  }

  .indicator.active .indicator-value {
    color: var(--cozy-accent, #e8a87c);
  }

  /* Tips Section */
  .tips-section {
  }

  .tips-box {
    border: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.3));
    border-radius: 8px;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.3);
  }

  .tips-title {
    font-size: 0.55rem;
    color: var(--cozy-text-muted, #a89b8a);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.3rem;
    padding-bottom: 0.2rem;
    border-bottom: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.2));
  }

  .tips-content {
    font-size: 0.6rem;
    color: var(--cozy-text-light, #8b7d6b);
    line-height: 1.5;
  }

  .tips-content .cmd {
    color: var(--cozy-accent, #e8a87c);
    font-weight: 600;
  }

  /* Control Bar */
  .control-bar {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 0;
    border-top: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.3));
    flex-shrink: 0;
    margin-top: auto;
  }

  .control-bar .retro-btn {
    flex: 1;
    min-height: 56px;
  }

  .control-bar .retro-btn:first-child {
    flex: 0;
    min-width: 56px;
  }

  .retro-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    padding: 0.6rem 0.5rem;
    background: transparent;
    border: none;
    color: var(--cozy-text-light, #8b7d6b);
    font-family: 'Quicksand', sans-serif;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s ease;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: relative;
  }

  .retro-btn:hover:not(:disabled) {
    color: var(--cozy-text, #4a4039);
    text-shadow: 0 0 8px var(--cozy-accent, #e8a87c);
  }

  .retro-btn:hover:not(:disabled) .btn-bracket {
    color: var(--cozy-text, #4a4039);
    text-shadow: 0 0 10px var(--cozy-accent, #e8a87c);
  }

  .retro-btn:active:not(:disabled) {
    transform: scale(0.98);
  }

  .retro-btn.active {
    color: var(--cozy-text, #4a4039);
    text-shadow: 0 0 10px var(--cozy-accent, #e8a87c), 0 0 20px rgba(232, 168, 124, 0.3);
  }

  .retro-btn.active .btn-bracket {
    color: var(--cozy-accent, #e8a87c);
    text-shadow: 0 0 10px var(--cozy-accent, #e8a87c);
  }

  .retro-btn.active .btn-icon {
    animation: icon-pulse 1.5s ease-in-out infinite;
  }

  .retro-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .btn-bracket {
    color: var(--cozy-border, rgba(180, 160, 140, 0.5));
    font-size: 1.1rem;
    font-weight: 300;
    transition: all 0.15s ease;
  }

  .btn-icon {
    font-size: 1.3rem;
  }

  .btn-label {
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: 0.1em;
  }

  @keyframes icon-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  /* Fullscreen toggle */
  .fullscreen-toggle {
    position: fixed;
    bottom: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    background: var(--cozy-card, rgba(255, 255, 255, 0.8));
    border: none;
    border-radius: 8px;
    color: var(--cozy-text-light, #8b7d6b);
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    transition: all 0.2s ease;
    opacity: 0.6;
  }

  .fullscreen-toggle:hover {
    opacity: 1;
    color: var(--cozy-text, #4a4039);
  }

  .coming-soon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--cozy-text-light, #8b7d6b);
  }

  /* Cozy scrollbar */
  :global(*::-webkit-scrollbar) {
    width: 6px;
    height: 6px;
  }

  :global(*::-webkit-scrollbar-track) {
    background: rgba(200, 180, 160, 0.1);
    border-radius: 3px;
  }

  :global(*::-webkit-scrollbar-thumb) {
    background: rgba(200, 180, 160, 0.4);
    border-radius: 3px;
  }

  :global(*::-webkit-scrollbar-thumb:hover) {
    background: rgba(200, 180, 160, 0.6);
  }
</style>
