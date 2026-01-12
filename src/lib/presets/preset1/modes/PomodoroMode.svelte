<script>
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { getCurrentTheme, onThemeChange } from '$lib/services/colorTheme.js';

  /** @typedef {{ work_minutes: number, break_minutes: number, long_break_minutes: number, sessions_until_long_break: number }} PomodoroSettings */

  /** @type {{ fullscreen?: boolean }} */
  let { fullscreen = false } = $props();

  let themeColor = $state(getCurrentTheme().primary);

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
    isLongBreak ? 'LONG BREAK' :
    isBreak ? 'SHORT BREAK' :
    'FOCUS'
  );

  function getPhaseColor() {
    if (isLongBreak) return '#00bcd4';
    if (isBreak) return '#4caf50';
    return themeColor;
  }

  function getDonutOffset(percent, radius = 45) {
    const circumference = 2 * Math.PI * radius;
    return circumference - (percent / 100) * circumference;
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
      // Go back to focus mode
      isBreak = false;
      isLongBreak = false;
      timeRemaining = workMinutes * 60;
    } else if (completedSessions > 0) {
      // Go back to previous break
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
      // Just reset current phase
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
    const unsubscribe = onThemeChange((theme) => {
      themeColor = theme.primary;
    });
    return () => {
      if (interval) clearInterval(interval);
      if (saveTimeout) clearTimeout(saveTimeout);
      unsubscribe();
    };
  });
</script>

<div class="pomodoro-mode">
  <!-- Main Timer Area -->
  <div class="timer-area">
    <div class="timer-container">
      <svg viewBox="0 0 100 100" class="donut-svg">
        <circle cx="50" cy="50" r="45" class="donut-bg" />
        <circle
          cx="50" cy="50" r="45"
          class="donut-fill"
          style="stroke: {getPhaseColor()}; stroke-dashoffset: {getDonutOffset(progress)};"
        />
      </svg>
      <div class="timer-inner">
        <div class="phase-label" style="color: {getPhaseColor()}">{phaseLabel}</div>
        <div class="time-display" style="color: {getPhaseColor()}">{displayTime()}</div>
        <div class="session-dots">
          {#each Array(sessionsUntilLongBreak) as _, i}
            <span class="dot" class:completed={i < (completedSessions % sessionsUntilLongBreak)} class:current={i === (completedSessions % sessionsUntilLongBreak) && !isBreak && !isLongBreak}></span>
          {/each}
        </div>
      </div>
    </div>

    <!-- Controls below timer -->
    <div class="timer-controls">
      <button class="ctrl-btn" onclick={goBack} title="Go back">
        ⏮
      </button>
      <button class="ctrl-btn primary" onclick={isRunning ? pauseTimer : startTimer} title={isRunning ? 'Pause' : 'Start'}>
        {isRunning ? '⏸' : '▶'}
      </button>
      <button class="ctrl-btn" onclick={resetTimer} title="Reset">
        ↺
      </button>
      <button class="ctrl-btn" onclick={skipPhase} title="Skip">
        ⏭
      </button>
    </div>

    <!-- Stats row -->
    <div class="stats-row">
      <div class="stat">
        <span class="stat-val">{completedSessions}</span>
        <span class="stat-lbl">SESSIONS</span>
      </div>
      <div class="stat">
        <span class="stat-val">{formatFocusTime(totalFocusTime)}</span>
        <span class="stat-lbl">FOCUS TIME</span>
      </div>
      <div class="stat">
        <span class="stat-val">{Math.floor(completedSessions / sessionsUntilLongBreak)}</span>
        <span class="stat-lbl">CYCLES</span>
      </div>
    </div>
  </div>

  <!-- Right Side Panel - hidden in fullscreen mode -->
  {#if !fullscreen}
  <div class="side-panel" class:collapsed={!showPanel}>
    <button class="panel-toggle" onclick={() => showPanel = !showPanel} title={showPanel ? 'Hide settings' : 'Show settings'}>
      <span class="toggle-icon">{showPanel ? '›' : '‹'}</span>
      <span class="toggle-label">{showPanel ? '' : 'SETTINGS'}</span>
    </button>

    {#if showPanel}
      <div class="panel-content">
        <div class="panel-header">
          <span class="panel-title">SETTINGS</span>
          <button class="reset-btn" onclick={resetAll} title="Reset all">×</button>
        </div>

        <div class="setting-group">
          <span class="setting-name">FOCUS</span>
          <div class="setting-controls">
            <button class="adj-btn" onclick={() => workMinutes = Math.max(1, workMinutes - 5)}>−</button>
            <input type="number" bind:value={workMinutes} min="1" max="120" />
            <button class="adj-btn" onclick={() => workMinutes = Math.min(120, workMinutes + 5)}>+</button>
            <span class="unit">min</span>
          </div>
        </div>

        <div class="setting-group">
          <span class="setting-name">SHORT BREAK</span>
          <div class="setting-controls">
            <button class="adj-btn" onclick={() => breakMinutes = Math.max(1, breakMinutes - 1)}>−</button>
            <input type="number" bind:value={breakMinutes} min="1" max="30" />
            <button class="adj-btn" onclick={() => breakMinutes = Math.min(30, breakMinutes + 1)}>+</button>
            <span class="unit">min</span>
          </div>
        </div>

        <div class="setting-group">
          <span class="setting-name">LONG BREAK</span>
          <div class="setting-controls">
            <button class="adj-btn" onclick={() => longBreakMinutes = Math.max(5, longBreakMinutes - 5)}>−</button>
            <input type="number" bind:value={longBreakMinutes} min="5" max="60" />
            <button class="adj-btn" onclick={() => longBreakMinutes = Math.min(60, longBreakMinutes + 5)}>+</button>
            <span class="unit">min</span>
          </div>
        </div>

        <div class="setting-group">
          <span class="setting-name">SESSIONS</span>
          <div class="setting-controls">
            <button class="adj-btn" onclick={() => sessionsUntilLongBreak = Math.max(2, sessionsUntilLongBreak - 1)}>−</button>
            <input type="number" bind:value={sessionsUntilLongBreak} min="2" max="10" />
            <button class="adj-btn" onclick={() => sessionsUntilLongBreak = Math.min(10, sessionsUntilLongBreak + 1)}>+</button>
            <span class="unit">×</span>
          </div>
        </div>

        <div class="panel-footer">
          {#if isRunning}
            <span class="live-dot"></span>
            <span>ACTIVE</span>
          {:else}
            <span>POMODORO</span>
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
    font-family: var(--font-mono);
    overflow: hidden;
  }

  /* Timer Area - Main content */
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
    width: min(80vmin, 350px);
    height: min(80vmin, 350px);
  }

  .donut-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .donut-bg {
    fill: none;
    stroke: var(--text-primary-10);
    stroke-width: 4;
  }

  .donut-fill {
    fill: none;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-dasharray: 282.7;
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
    font-size: 1.2rem;
    letter-spacing: 0.2em;
    margin-bottom: 0.5rem;
    opacity: 0.9;
  }

  .time-display {
    font-size: 4.5rem;
    font-weight: bold;
    text-shadow: 0 0 30px currentColor;
    letter-spacing: 0.1em;
  }

  .session-dots {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.8rem;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--text-primary-15);
    border: 2px solid var(--text-primary-30);
  }

  .dot.completed {
    background: var(--text-primary);
    border-color: var(--text-primary);
    box-shadow: 0 0 8px var(--text-primary);
  }

  .dot.current {
    border-color: var(--text-primary);
    animation: pulse 1.5s ease-in-out infinite;
  }

  /* Timer Controls */
  .timer-controls {
    display: flex;
    gap: 1.5rem;
  }

  .ctrl-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-size: 1.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .ctrl-btn:hover {
    color: var(--text-primary);
    text-shadow: 0 0 15px var(--text-primary);
  }

  .ctrl-btn.primary {
    color: var(--text-primary);
    font-size: 2rem;
    text-shadow: 0 0 10px var(--text-primary);
  }

  .ctrl-btn.primary:hover {
    text-shadow: 0 0 20px var(--text-primary);
  }

  /* Stats Row */
  .stats-row {
    display: flex;
    gap: 1.5rem;
    margin-top: 0.25rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  .stat-val {
    font-size: 1.3rem;
    font-weight: bold;
    color: var(--text-primary);
    text-shadow: 0 0 8px var(--text-primary);
  }

  .stat-lbl {
    font-size: 0.7rem;
    color: var(--text-dim);
    letter-spacing: 0.1em;
  }

  /* Side Panel */
  .side-panel {
    position: relative;
    width: 180px;
    background: var(--bg-tint-30);
    border-left: 1px dashed var(--border-color);
    display: flex;
    flex-direction: column;
    transition: width 0.3s ease;
  }

  .side-panel.collapsed {
    width: 30px;
  }

  .panel-toggle {
    position: absolute;
    left: -12px;
    top: 50%;
    transform: translateY(-50%);
    background: var(--bg-tint-90);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
    padding: 8px 4px;
    gap: 2px;
    flex-direction: column;
    transition: all 0.2s ease;
  }

  .side-panel.collapsed .panel-toggle {
    left: -24px;
    padding: 10px 6px;
  }

  .panel-toggle:hover {
    color: var(--text-primary);
    border-color: var(--text-primary);
    box-shadow: 0 0 10px var(--text-primary-30);
  }

  .toggle-icon {
    font-size: 1.2rem;
    line-height: 1;
    font-weight: bold;
  }

  .toggle-label {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 0.5rem;
    letter-spacing: 0.15em;
    transform: rotate(180deg);
  }

  .panel-content {
    padding: 0.75rem;
    padding-left: 1.5rem;
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
    border-bottom: 1px dashed var(--border-color);
  }

  .panel-title {
    font-size: 0.9rem;
    color: var(--text-dim);
    letter-spacing: 0.15em;
  }

  .reset-btn {
    width: 22px;
    height: 22px;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-dim);
    font-size: 0.9rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .reset-btn:hover {
    border-color: #ff4444;
    color: #ff4444;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .setting-name {
    font-size: 0.75rem;
    color: var(--text-dim);
    letter-spacing: 0.1em;
  }

  .setting-controls {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .adj-btn {
    width: 26px;
    height: 28px;
    background: var(--text-primary-05);
    border: 1px solid var(--border-color);
    color: var(--text-dim);
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .adj-btn:hover {
    background: var(--text-primary-15);
    border-color: var(--text-primary);
    color: var(--text-primary);
  }

  .setting-controls input {
    width: 45px;
    height: 30px;
    background: var(--bg-tint-40);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 1rem;
    text-align: center;
    -moz-appearance: textfield;
  }

  .setting-controls input::-webkit-outer-spin-button,
  .setting-controls input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .setting-controls input:focus {
    outline: none;
    border-color: var(--text-primary);
  }

  .unit {
    font-size: 0.8rem;
    color: var(--text-dim);
    min-width: 22px;
  }

  .panel-footer {
    margin-top: auto;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: var(--text-dim);
    padding-top: 0.5rem;
    border-top: 1px dashed var(--border-color);
  }

  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-primary);
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
      font-size: 3rem;
    }

    .timer-container {
      width: min(70vmin, 280px);
      height: min(70vmin, 280px);
    }
  }
</style>
