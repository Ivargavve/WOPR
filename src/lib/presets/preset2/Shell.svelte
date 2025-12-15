<script>
  import { onMount } from 'svelte';
  import { ModeSelector, SettingsPanel, AIPopup } from './components';
  import { getCurrentMode, getCurrentModeInfo, setMode } from '$lib/stores/mode.svelte.js';
  import { AssistantMode, MonitorMode, PomodoroMode, ScreenTimeMode } from './modes';
  import { loadConfig, saveConfig } from '$lib/services/storage.js';
  import { loadKnowledge } from '$lib/services/knowledge.js';
  import * as permissions from '$lib/services/permissions.js';
  import { invoke } from '@tauri-apps/api/core';

  let hours = $state('12');
  let minutes = $state('00');
  let ampm = $state('PM');
  let greeting = $state('Hello!');
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

  // Sidebar hidden mode
  let sidebarHidden = $state(false);

  // Mode dropdown
  let showModeDropdown = $state(false);

  const modes = [
    { id: 'assistant', label: 'Chat', icon: '/cat/cat (1).png' },
    { id: 'monitor', label: 'Health', icon: '/cat/animal.png' },
    { id: 'pomodoro', label: 'Focus', icon: '/cat/animal (1).png' },
    { id: 'screentime', label: 'Activity', icon: '/cat/animal (2).png' }
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
    // Load config
    loadConfig().then(config => {
      currentConfig = config;
      visionOn = config.vision_enabled;
      listening = config.voice_enabled;
      screentimeEnabled = config.screentime_enabled ?? true;
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

<main class="cozy-container" class:sidebar-hidden={sidebarHidden}>
  <!-- Background with carpet texture -->
  <div class="texture-bg"></div>

  <!-- Paw toggle button - at top, on border -->
  {#if !sidebarHidden}
    <button
      class="paw-toggle"
      onclick={() => sidebarHidden = true}
      title="Hide sidebar"
    >
      <img src="/cat/paw.png" alt="hide" class="paw-icon" />
    </button>
  {/if}

  <!-- Sidebar -->
  <aside class="sidebar" class:hidden={sidebarHidden}>
    <div class="sidebar-texture"></div>
    <div class="sidebar-content">
      <!-- Cat mascot -->
      <div class="cat-mascot">
        <img src="/cat.png" alt="kitty" class="cat-image" />
      </div>

      <!-- Digital Clock -->
      <div class="clock-section">
        <div class="digital-clock">
          <span class="clock-hours">{hours}</span>
          <span class="clock-colon">:</span>
          <span class="clock-minutes">{minutes}</span>
          <span class="clock-ampm">{ampm}</span>
        </div>
        <div class="greeting-text">{greeting}</div>
      </div>

      <!-- Mode Navigation - integrated dropdown -->
      <div class="nav-section">
        <button
          class="mode-button"
          onclick={(e) => { e.stopPropagation(); showModeDropdown = !showModeDropdown; }}
        >
          <img src={currentModeData.icon} alt="" class="mode-icon" />
          <span class="mode-label">{currentModeData.label}</span>
          <span class="mode-arrow" class:open={showModeDropdown}>
            <img src="/cat/paws.png" alt="" class="arrow-icon" />
          </span>
        </button>
        {#if showModeDropdown}
          <div class="mode-dropdown">
            {#each modes as mode}
              <button
                class="mode-option"
                class:active={currentMode === mode.id}
                onclick={() => selectMode(mode.id)}
              >
                <img src={mode.icon} alt="" class="mode-option-icon" />
                <span>{mode.label}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Controls -->
      <div class="controls-section">
        <button
          class="control-btn"
          class:active={visionOn}
          onclick={toggleVision}
        >
          <img src="/cat/animal-shelter.png" alt="eye" class="control-icon" />
          <span class="control-label">Eye</span>
          {#if visionOn}
            <span class="control-status on"></span>
          {/if}
        </button>
        <button
          class="control-btn"
          class:active={listening}
          onclick={toggleListening}
        >
          <img src="/cat/black.png" alt="voice" class="control-icon" />
          <span class="control-label">Voice</span>
          {#if listening}
            <span class="control-status" class:hearing={isHearing} class:speaking={isSpeaking}></span>
          {/if}
        </button>
        <button
          class="control-btn settings"
          onclick={toggleSettings}
        >
          <img src="/cat/cat (2).png" alt="settings" class="control-icon" />
          <span class="control-label">Settings</span>
        </button>
      </div>

      <!-- Status indicators -->
      {#if visionOn}
        <div class="status-section">
          <div class="status-chip">
            <img src="/cat/paw.png" alt="" class="status-icon" />
            <span>Next scan: {captureCountdown}s</span>
          </div>
        </div>
      {/if}

      <!-- Memory/Notes -->
      <div class="memory-section">
        <button class="memory-header" onclick={() => showMemory = !showMemory}>
          <img src="/cat/animal (2).png" alt="" class="memory-icon" />
          <span class="memory-title">Notes</span>
          <span class="memory-count">{memoryItems.length}</span>
          <span class="memory-chevron" class:open={showMemory}>
            <img src="/cat/paws.png" alt="" class="chevron-icon" />
          </span>
        </button>
        {#if showMemory}
          <div class="memory-content">
            {#if memoryItems.length === 0}
              <div class="memory-empty">
                <img src="/happy.png" alt="" class="empty-icon" />
                <span>No notes yet</span>
              </div>
            {:else}
              {#each memoryItems.slice(0, 5) as item}
                <div class="memory-item">{item}</div>
              {/each}
              {#if memoryItems.length > 5}
                <div class="memory-more">+{memoryItems.length - 5} more</div>
              {/if}
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </aside>

  <!-- Show sidebar button when hidden -->
  {#if sidebarHidden}
    <button
      class="show-paw-toggle"
      onclick={() => sidebarHidden = false}
      title="Show sidebar"
    >
      <img src="/cat/paw.png" alt="show" class="paw-icon" />
    </button>
  {/if}

  <!-- Main content area -->
  <div class="main-content">
    <section class="content-area">
      <div class="mode-content" class:hidden={currentMode !== 'assistant'}>
        <AssistantMode bind:this={assistantModeRef} {visionOn} voiceOn={listening} onResponse={handleAIResponse} />
      </div>
      {#if currentMode === 'monitor'}
        <MonitorMode />
      {:else if currentMode === 'pomodoro'}
        <PomodoroMode fullscreen={false} />
      {:else if currentMode === 'screentime'}
        <ScreenTimeMode />
      {:else if currentMode !== 'assistant'}
        <div class="coming-soon">
          <img src="/cat.png" alt="" class="coming-soon-cat" />
          <p>Coming soon</p>
        </div>
      {/if}
    </section>
  </div>

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

  /* Modern cozy color palette */
  :global(:root) {
    --cozy-bg: #f8f4f0;
    --cozy-bg-warm: #fdfaf7;
    --cozy-sidebar: rgba(255, 252, 248, 0.85);
    --cozy-card: rgba(255, 255, 255, 0.9);
    --cozy-border: rgba(200, 180, 160, 0.3);
    --cozy-text: #4a4039;
    --cozy-text-light: #8b7d6b;
    --cozy-text-muted: #a89b8a;
    --cozy-accent: #e8a87c;
    --cozy-accent-soft: rgba(232, 168, 124, 0.3);
    --cozy-pink: #f0b8c0;
    --cozy-lavender: #d4d0e8;
    --cozy-mint: #b8dcc8;
    --cozy-peach: #f5d4bc;
    --cozy-shadow: rgba(100, 80, 60, 0.08);
    --cozy-shadow-strong: rgba(100, 80, 60, 0.15);
  }

  :global(body) {
    font-family: 'Quicksand', 'Nunito', -apple-system, system-ui, sans-serif;
  }

  /* Cozy scrollbar */
  :global(*::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }

  :global(*::-webkit-scrollbar-track) {
    background: rgba(200, 180, 160, 0.1);
    border-radius: 4px;
  }

  :global(*::-webkit-scrollbar-thumb) {
    background: rgba(200, 180, 160, 0.4);
    border-radius: 4px;
  }

  :global(*::-webkit-scrollbar-thumb:hover) {
    background: rgba(200, 180, 160, 0.6);
  }

  .cozy-container {
    display: flex;
    height: 100vh;
    width: 100%;
    background: #e8ddd4;
    font-family: 'Quicksand', 'Nunito', -apple-system, system-ui, sans-serif;
    color: var(--cozy-text);
    position: relative;
    overflow: hidden;
  }

  /* Background texture - removed, using carpet directly on content */
  .texture-bg {
    display: none;
  }

  /* Paw toggle button - circular, on the border, at top */
  .paw-toggle {
    position: fixed;
    top: 16px;
    left: 224px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 252, 248, 0.7);
    border: 2px solid var(--cozy-peach);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 30;
    transition: all 0.3s ease;
    box-shadow: 0 4px 16px var(--cozy-shadow);
    opacity: 0.6;
  }

  .paw-toggle:hover {
    opacity: 1;
    background: rgba(255, 252, 248, 0.95);
    transform: scale(1.1);
    box-shadow: 0 6px 24px var(--cozy-shadow-strong);
  }

  .paw-toggle .paw-icon {
    width: 28px;
    height: 28px;
    object-fit: contain;
    transition: transform 0.2s ease;
  }

  .paw-toggle:hover .paw-icon {
    transform: rotate(-15deg);
  }

  /* Show sidebar paw button */
  .show-paw-toggle {
    position: fixed;
    top: 16px;
    left: 16px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 252, 248, 0.9);
    border: 2px solid var(--cozy-peach);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 30;
    transition: all 0.3s ease;
    box-shadow: 0 4px 16px var(--cozy-shadow);
  }

  .show-paw-toggle:hover {
    background: rgba(255, 252, 248, 1);
    transform: scale(1.1);
    box-shadow: 0 6px 24px var(--cozy-shadow-strong);
  }

  .show-paw-toggle .paw-icon {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }

  /* Sidebar */
  .sidebar {
    width: 240px;
    position: relative;
    z-index: 10;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
    background-image: url('/carpet.jpg');
    background-size: cover;
    background-position: center;
  }

  .sidebar.hidden {
    transform: translateX(-100%);
    opacity: 0;
    pointer-events: none;
    position: absolute;
    height: 100%;
  }

  .sidebar-texture {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      180deg,
      rgba(250, 245, 238, 0.75) 0%,
      rgba(248, 242, 232, 0.7) 50%,
      rgba(245, 238, 228, 0.75) 100%
    );
  }

  .sidebar-content {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    gap: 0.75rem;
    border-right: 1px solid rgba(180, 160, 140, 0.3);
  }

  /* Cat mascot */
  .cat-mascot {
    display: flex;
    justify-content: center;
    padding: 0.5rem 0;
  }

  .cat-image {
    width: 64px;
    height: 64px;
    object-fit: contain;
    filter: drop-shadow(0 4px 12px rgba(100, 80, 60, 0.15));
    transition: transform 0.3s ease;
  }

  .cat-image:hover {
    transform: scale(1.05) rotate(-5deg);
  }

  /* Digital Clock */
  .clock-section {
    text-align: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--cozy-border);
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
    font-size: 2.2rem;
    font-weight: 600;
    color: var(--cozy-text);
    letter-spacing: 0.05em;
    text-shadow: 0 2px 8px rgba(100, 80, 60, 0.1);
  }

  .clock-colon {
    font-size: 2rem;
    font-weight: 400;
    color: var(--cozy-accent);
    animation: blink 1s ease-in-out infinite;
    margin: 0 2px;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .clock-ampm {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--cozy-text-light);
    margin-left: 6px;
  }

  .greeting-text {
    font-family: 'Quicksand', sans-serif;
    font-size: 0.9rem;
    color: var(--cozy-text-light);
    margin-top: 0.35rem;
    font-weight: 500;
  }

  /* Mode Navigation - integrated */
  .nav-section {
    position: relative;
  }

  .mode-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.35);
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--cozy-text);
    transition: all 0.2s ease;
    min-height: 48px;
  }

  .mode-button:hover {
    background: rgba(255, 255, 255, 0.5);
  }

  .mode-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  .mode-label {
    flex: 1;
    text-align: left;
  }

  .mode-arrow {
    width: 18px;
    height: 18px;
    transition: transform 0.2s ease;
  }

  .mode-arrow.open {
    transform: rotate(90deg);
  }

  .arrow-icon {
    width: 100%;
    height: 100%;
    object-fit: contain;
    opacity: 0.6;
  }

  .mode-dropdown {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: rgba(255, 250, 245, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    border: 1px solid rgba(200, 180, 160, 0.3);
    box-shadow: 0 4px 16px var(--cozy-shadow);
    overflow: hidden;
    z-index: 50;
  }

  .mode-option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--cozy-text);
    transition: all 0.2s ease;
    min-height: 44px;
  }

  .mode-option:hover {
    background: rgba(232, 168, 124, 0.15);
  }

  .mode-option.active {
    background: rgba(232, 168, 124, 0.2);
    color: var(--cozy-accent);
    font-weight: 600;
  }

  .mode-option-icon {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }

  /* Controls */
  .controls-section {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .control-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 0.9rem;
    background: rgba(255, 255, 255, 0.25);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--cozy-text-light);
    transition: all 0.2s ease;
    min-height: 44px;
  }

  .control-btn:hover {
    background: rgba(255, 255, 255, 0.4);
  }

  .control-btn.active {
    background: rgba(232, 168, 124, 0.25);
    color: var(--cozy-text);
    font-weight: 600;
  }

  .control-btn.settings {
    margin-top: 0.25rem;
    background: rgba(212, 208, 232, 0.25);
  }

  .control-btn.settings:hover {
    background: rgba(212, 208, 232, 0.4);
  }

  .control-icon {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }

  .control-label {
    flex: 1;
  }

  .control-status {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--cozy-accent);
    box-shadow: 0 0 12px rgba(232, 168, 124, 0.5);
    animation: pulse 2s ease-in-out infinite;
  }

  .control-status.on {
    background: var(--cozy-mint);
    box-shadow: 0 0 12px rgba(184, 220, 200, 0.6);
  }

  .control-status.hearing {
    background: var(--cozy-mint);
    box-shadow: 0 0 12px rgba(184, 220, 200, 0.6);
    animation: pulse 0.8s ease-in-out infinite;
  }

  .control-status.speaking {
    background: var(--cozy-lavender);
    box-shadow: 0 0 12px rgba(212, 208, 232, 0.6);
    animation: pulse 0.4s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.7; }
  }

  /* Status section */
  .status-section {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .status-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    font-size: 0.8rem;
    color: var(--cozy-text-light);
    border: none;
  }

  .status-icon {
    width: 16px;
    height: 16px;
    object-fit: contain;
  }

  /* Memory section */
  .memory-section {
    margin-top: auto;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 10px;
    border: none;
    overflow: hidden;
  }

  .memory-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 0.9rem;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--cozy-text);
    font-family: inherit;
    transition: background 0.2s ease;
    min-height: 44px;
  }

  .memory-header:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .memory-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  .memory-title {
    flex: 1;
    text-align: left;
  }

  .memory-count {
    font-size: 0.75rem;
    color: var(--cozy-text-muted);
    background: rgba(0, 0, 0, 0.05);
    padding: 0.15rem 0.5rem;
    border-radius: 10px;
  }

  .memory-chevron {
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;
  }

  .memory-chevron.open {
    transform: rotate(90deg);
  }

  .chevron-icon {
    width: 100%;
    height: 100%;
    object-fit: contain;
    opacity: 0.5;
  }

  .memory-content {
    padding: 0 0.9rem 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    max-height: 130px;
    overflow-y: auto;
  }

  .memory-item {
    font-size: 0.8rem;
    color: var(--cozy-text-light);
    padding: 0.45rem 0.55rem;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 8px;
    line-height: 1.4;
  }

  .memory-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    color: var(--cozy-text-muted);
    font-size: 0.8rem;
    font-style: italic;
  }

  .empty-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
    opacity: 0.7;
  }

  .memory-more {
    font-size: 0.75rem;
    color: var(--cozy-accent);
    text-align: center;
    padding-top: 0.2rem;
  }

  /* Main content */
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    z-index: 1;
    transition: margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    background-image: url('/carpet2.jpg');
    background-size: cover;
    background-position: center;
  }

  .main-content::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      180deg,
      rgba(252, 248, 242, 0.8) 0%,
      rgba(250, 245, 238, 0.75) 50%,
      rgba(248, 242, 232, 0.8) 100%
    );
    pointer-events: none;
  }

  .sidebar-hidden .main-content {
    margin-left: 0;
  }

  .content-area {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    min-height: 0;
    position: relative;
    z-index: 1;
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

  .coming-soon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
    color: var(--cozy-text-light);
    font-size: 1.1rem;
  }

  .coming-soon-cat {
    width: 80px;
    height: 80px;
    object-fit: contain;
    opacity: 0.6;
  }
</style>
