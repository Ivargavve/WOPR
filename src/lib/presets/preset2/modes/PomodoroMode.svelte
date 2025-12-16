<script>
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';

  /** @typedef {{ work_minutes: number, break_minutes: number, long_break_minutes: number, sessions_until_long_break: number }} PomodoroSettings */

  /** @type {{ fullscreen?: boolean }} */
  let { fullscreen = false } = $props();

  // Configurable times (in minutes)
  let workMinutes = $state(25);
  let breakMinutes = $state(5);
  let longBreakMinutes = $state(15);
  let sessionsUntilLongBreak = $state(4);
  let settingsLoaded = $state(false);
  let showPanel = $state(true);

  // Timer state
  let timeRemaining = $state(25 * 60);
  let isRunning = $state(false);
  let isBreak = $state(false);
  let isLongBreak = $state(false);
  let completedSessions = $state(0);
  let totalFocusTime = $state(0);

  /** @type {ReturnType<typeof setInterval> | null} */
  let interval = null;

  /** @type {ReturnType<typeof setTimeout> | null} */
  let saveTimeout = null;

  async function loadSettings() {
    try {
      /** @type {PomodoroSettings} */
      const settings = await invoke('load_pomodoro_settings');
      workMinutes = settings.work_minutes;
      breakMinutes = settings.break_minutes;
      longBreakMinutes = settings.long_break_minutes;
      sessionsUntilLongBreak = settings.sessions_until_long_break;
      timeRemaining = workMinutes * 60;
      settingsLoaded = true;
    } catch (e) {
      console.error('Failed to load pomodoro settings:', e);
      settingsLoaded = true;
    }
  }

  async function saveSettings() {
    if (!settingsLoaded) return;
    try {
      await invoke('save_pomodoro_settings', {
        settings: {
          work_minutes: workMinutes,
          break_minutes: breakMinutes,
          long_break_minutes: longBreakMinutes,
          sessions_until_long_break: sessionsUntilLongBreak
        }
      });
    } catch (e) {
      console.error('Failed to save pomodoro settings:', e);
    }
  }

  function scheduleSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveSettings, 500);
  }

  // Derived values
  const totalTime = $derived(
    isLongBreak ? longBreakMinutes * 60 :
    isBreak ? breakMinutes * 60 :
    workMinutes * 60
  );

  const progress = $derived(
    totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0
  );

  const displayTime = $derived(() => {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  const phaseLabel = $derived(
    isLongBreak ? 'Long Break' :
    isBreak ? 'Short Break' :
    'Focus Time'
  );

  function getPhaseColor() {
    if (isLongBreak) return '#b8dcc8';
    if (isBreak) return '#d4d0e8';
    return '#e8a87c';
  }

  function startTimer() {
    if (timeRemaining <= 0) {
      timeRemaining = totalTime;
    }
    isRunning = true;
    interval = setInterval(() => {
      if (timeRemaining > 0) {
        timeRemaining--;
        if (!isBreak && !isLongBreak) {
          totalFocusTime++;
        }
      } else {
        completePhase();
      }
    }, 1000);
  }

  function pauseTimer() {
    isRunning = false;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  function completePhase() {
    pauseTimer();
    if (!isBreak && !isLongBreak) {
      completedSessions++;
      if (completedSessions % sessionsUntilLongBreak === 0) {
        isLongBreak = true;
        isBreak = false;
        timeRemaining = longBreakMinutes * 60;
      } else {
        isBreak = true;
        isLongBreak = false;
        timeRemaining = breakMinutes * 60;
      }
    } else {
      isBreak = false;
      isLongBreak = false;
      timeRemaining = workMinutes * 60;
    }
  }

  function resetTimer() {
    pauseTimer();
    timeRemaining = totalTime;
  }

  function skipPhase() {
    completePhase();
  }

  function goBack() {
    pauseTimer();
    if (isBreak || isLongBreak) {
      isBreak = false;
      isLongBreak = false;
      timeRemaining = workMinutes * 60;
    } else if (completedSessions > 0) {
      completedSessions--;
      if ((completedSessions + 1) % sessionsUntilLongBreak === 0) {
        isLongBreak = true;
        isBreak = false;
        timeRemaining = longBreakMinutes * 60;
      } else {
        isBreak = true;
        isLongBreak = false;
        timeRemaining = breakMinutes * 60;
      }
    } else {
      timeRemaining = workMinutes * 60;
    }
  }

  function resetAll() {
    pauseTimer();
    isBreak = false;
    isLongBreak = false;
    completedSessions = 0;
    totalFocusTime = 0;
    timeRemaining = workMinutes * 60;
  }

  function formatFocusTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
  }

  $effect(() => {
    if (!isRunning && !isBreak && !isLongBreak) {
      timeRemaining = workMinutes * 60;
    }
  });

  $effect(() => {
    const _ = [workMinutes, breakMinutes, longBreakMinutes, sessionsUntilLongBreak];
    if (settingsLoaded) {
      scheduleSave();
    }
  });

  onMount(() => {
    loadSettings();
    return () => {
      if (interval) clearInterval(interval);
      if (saveTimeout) clearTimeout(saveTimeout);
    };
  });
</script>

<div class="pomodoro-mode">
  <!-- Main Timer Area -->
  <div class="timer-area">
    <div class="timer-container">
      <svg viewBox="0 0 100 100" class="ring-svg">
        <circle cx="50" cy="50" r="45" class="ring-bg" />
        <circle
          cx="50" cy="50" r="45"
          class="ring-fill"
          style="stroke: {getPhaseColor()}; stroke-dashoffset: {283 - (progress / 100) * 283};"
        />
      </svg>
      <div class="timer-inner">
        <div class="phase-label" style="color: {getPhaseColor()}">{phaseLabel}</div>
        <div class="time-display">{displayTime()}</div>
        <div class="session-dots">
          {#each Array(sessionsUntilLongBreak) as _, i}
            <span
              class="dot"
              class:completed={i < (completedSessions % sessionsUntilLongBreak)}
              class:current={i === (completedSessions % sessionsUntilLongBreak) && !isBreak && !isLongBreak}
            ></span>
          {/each}
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="timer-controls">
      <button class="ctrl-btn" onclick={goBack} title="Go back">⏮</button>
      <button class="ctrl-btn primary" onclick={isRunning ? pauseTimer : startTimer} style="background: {getPhaseColor()}">
        {isRunning ? '⏸' : '▶'}
      </button>
      <button class="ctrl-btn" onclick={resetTimer} title="Reset">↺</button>
      <button class="ctrl-btn" onclick={skipPhase} title="Skip">⏭</button>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat">
        <span class="stat-val">{completedSessions}</span>
        <span class="stat-lbl">Sessions</span>
      </div>
      <div class="stat">
        <span class="stat-val">{formatFocusTime(totalFocusTime)}</span>
        <span class="stat-lbl">Focus</span>
      </div>
      <div class="stat">
        <span class="stat-val">{Math.floor(completedSessions / sessionsUntilLongBreak)}</span>
        <span class="stat-lbl">Cycles</span>
      </div>
    </div>
  </div>

  <!-- Side Panel - hidden in fullscreen -->
  {#if !fullscreen}
    <div class="side-panel" class:collapsed={!showPanel}>
      <button class="panel-toggle" onclick={() => showPanel = !showPanel}>
        <span class="toggle-icon">{showPanel ? '›' : '‹'}</span>
        {#if !showPanel}
          <span class="toggle-label">Settings</span>
        {/if}
      </button>

      {#if showPanel}
        <div class="panel-content">
          <div class="panel-header">
            <span class="panel-title">Settings</span>
            <button class="reset-btn" onclick={resetAll} title="Reset all">×</button>
          </div>

          <div class="setting-group">
            <span class="setting-name">Focus</span>
            <div class="setting-controls">
              <button class="adj-btn" onclick={() => workMinutes = Math.max(1, workMinutes - 5)}>−</button>
              <span class="setting-value">{workMinutes}m</span>
              <button class="adj-btn" onclick={() => workMinutes = Math.min(120, workMinutes + 5)}>+</button>
            </div>
          </div>

          <div class="setting-group">
            <span class="setting-name">Short Break</span>
            <div class="setting-controls">
              <button class="adj-btn" onclick={() => breakMinutes = Math.max(1, breakMinutes - 1)}>−</button>
              <span class="setting-value">{breakMinutes}m</span>
              <button class="adj-btn" onclick={() => breakMinutes = Math.min(30, breakMinutes + 1)}>+</button>
            </div>
          </div>

          <div class="setting-group">
            <span class="setting-name">Long Break</span>
            <div class="setting-controls">
              <button class="adj-btn" onclick={() => longBreakMinutes = Math.max(5, longBreakMinutes - 5)}>−</button>
              <span class="setting-value">{longBreakMinutes}m</span>
              <button class="adj-btn" onclick={() => longBreakMinutes = Math.min(60, longBreakMinutes + 5)}>+</button>
            </div>
          </div>

          <div class="setting-group">
            <span class="setting-name">Sessions</span>
            <div class="setting-controls">
              <button class="adj-btn" onclick={() => sessionsUntilLongBreak = Math.max(2, sessionsUntilLongBreak - 1)}>−</button>
              <span class="setting-value">{sessionsUntilLongBreak}×</span>
              <button class="adj-btn" onclick={() => sessionsUntilLongBreak = Math.min(10, sessionsUntilLongBreak + 1)}>+</button>
            </div>
          </div>

          <div class="panel-footer">
            {#if isRunning}
              <span class="live-dot"></span>
              <span>Active</span>
            {:else}
              <span>Pomodoro</span>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .pomodoro-mode {
    display: flex;
    height: 100%;
    font-family: 'Quicksand', 'Nunito', system-ui, sans-serif;
    overflow: hidden;
    position: relative;
  }

  /* Timer Area */
  .timer-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    gap: 1rem;
  }

  .timer-container {
    position: relative;
    width: min(70vmin, 280px);
    height: min(70vmin, 280px);
  }

  .ring-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: rgba(200, 180, 160, 0.2);
    stroke-width: 6;
  }

  .ring-fill {
    fill: none;
    stroke-width: 6;
    stroke-linecap: round;
    stroke-dasharray: 283;
    transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;
  }

  .timer-inner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }

  .phase-label {
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    margin-bottom: 0.3rem;
    text-transform: uppercase;
  }

  .time-display {
    font-size: 3.5rem;
    font-weight: 700;
    color: var(--cozy-text, #4a4039);
    letter-spacing: -0.02em;
  }

  .session-dots {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
    margin-top: 0.5rem;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(200, 180, 160, 0.3);
    border: 2px solid rgba(200, 180, 160, 0.4);
    transition: all 0.3s ease;
  }

  .dot.completed {
    background: var(--cozy-accent, #e8a87c);
    border-color: var(--cozy-accent, #e8a87c);
  }

  .dot.current {
    border-color: var(--cozy-accent, #e8a87c);
    animation: pulse 1.5s ease-in-out infinite;
  }

  /* Controls */
  .timer-controls {
    display: flex;
    gap: 1rem;
  }

  .ctrl-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: var(--cozy-card, rgba(255, 255, 255, 0.5));
    border: none;
    border-radius: 50%;
    color: var(--cozy-text-light, #8b7d6b);
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .ctrl-btn:hover {
    background: var(--cozy-bg, rgba(255, 255, 255, 0.7));
    color: var(--cozy-text, #4a4039);
    transform: scale(1.05);
  }

  .ctrl-btn.primary {
    width: 64px;
    height: 64px;
    color: white;
    font-size: 1.5rem;
    box-shadow: 0 4px 16px rgba(100, 80, 60, 0.2);
  }

  .ctrl-btn.primary:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 24px rgba(100, 80, 60, 0.25);
  }

  /* Stats */
  .stats-row {
    display: flex;
    gap: 1.5rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  .stat-val {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--cozy-text, #4a4039);
  }

  .stat-lbl {
    font-size: 0.65rem;
    color: var(--cozy-text-muted, #a89b8a);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Side Panel */
  .side-panel {
    position: relative;
    width: 180px;
    background: var(--cozy-card, rgba(255, 255, 255, 0.3));
    border-left: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.2));
    display: flex;
    flex-direction: column;
    transition: width 0.3s ease;
  }

  .side-panel.collapsed {
    width: 32px;
  }

  .panel-toggle {
    position: absolute;
    left: -14px;
    top: 50%;
    transform: translateY(-50%);
    background: var(--cozy-card, rgba(255, 255, 255, 0.9));
    border: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.3));
    border-radius: 8px;
    color: var(--cozy-text-light, #8b7d6b);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
    padding: 8px 5px;
    gap: 2px;
    flex-direction: column;
    transition: all 0.2s ease;
  }

  .side-panel.collapsed .panel-toggle {
    left: -20px;
    padding: 10px 6px;
  }

  .panel-toggle:hover {
    color: var(--cozy-text, #4a4039);
    border-color: var(--cozy-accent, #e8a87c);
    background: var(--cozy-bg, white);
  }

  .toggle-icon {
    font-size: 1.1rem;
    line-height: 1;
    font-weight: 600;
  }

  .toggle-label {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    transform: rotate(180deg);
    text-transform: uppercase;
  }

  .panel-content {
    padding: 0.75rem;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.2));
  }

  .panel-title {
    font-size: 0.8rem;
    color: var(--cozy-text-light, #8b7d6b);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .reset-btn {
    width: 24px;
    height: 24px;
    background: rgba(240, 184, 192, 0.2);
    border: none;
    border-radius: 6px;
    color: var(--cozy-text-light, #8b7d6b);
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .reset-btn:hover {
    background: rgba(240, 184, 192, 0.4);
    color: #8a6060;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .setting-name {
    font-size: 0.65rem;
    color: var(--cozy-text-muted, #a89b8a);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .setting-controls {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .adj-btn {
    width: 28px;
    height: 28px;
    background: var(--cozy-card, rgba(212, 208, 232, 0.3));
    border: none;
    border-radius: 6px;
    color: var(--cozy-text-light, #8b7d6b);
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .adj-btn:hover {
    background: var(--cozy-bg, rgba(212, 208, 232, 0.5));
    color: var(--cozy-text, #5a5048);
  }

  .setting-value {
    min-width: 40px;
    text-align: center;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--cozy-text, #4a4039);
  }

  .panel-footer {
    margin-top: auto;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.65rem;
    color: var(--cozy-text-muted, #a89b8a);
    padding-top: 0.5rem;
    border-top: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.2));
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--cozy-accent, #e8a87c);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* Responsive */
  @media (max-width: 500px) {
    .side-panel {
      display: none;
    }

    .time-display {
      font-size: 2.5rem;
    }

    .timer-container {
      width: min(60vmin, 220px);
      height: min(60vmin, 220px);
    }
  }
</style>
