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
  let showSettings = $state(false);

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

  // Cat image based on phase
  const phaseImage = $derived(
    isLongBreak ? '/cat/cat (1).png' :
    isBreak ? '/cat/animal (2).png' :
    '/cat/animal.png'
  );

  function getPhaseColor() {
    if (isLongBreak) return '#b8dcc8';
    if (isBreak) return '#d4d0e8';
    return '#f0b8c0';
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
  <!-- Timer Card -->
  <div class="timer-card">
    <div class="phase-header">
      <img src={phaseImage} alt="" class="phase-icon" />
      <span class="phase-label">{phaseLabel}</span>
    </div>

    <!-- Progress Ring -->
    <div class="timer-ring">
      <svg viewBox="0 0 100 100" class="ring-svg">
        <circle cx="50" cy="50" r="42" class="ring-bg" />
        <circle
          cx="50" cy="50" r="42"
          class="ring-fill"
          style="stroke: {getPhaseColor()}; stroke-dashoffset: {264 - (progress / 100) * 264};"
        />
      </svg>
      <div class="timer-center">
        <div class="timer-display">{displayTime()}</div>
        <div class="timer-dots">
          {#each Array(sessionsUntilLongBreak) as _, i}
            <span
              class="session-dot"
              class:completed={i < (completedSessions % sessionsUntilLongBreak)}
              class:current={i === (completedSessions % sessionsUntilLongBreak) && !isBreak && !isLongBreak}
            ></span>
          {/each}
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="timer-controls">
      <button class="ctrl-btn" onclick={resetTimer} title="Reset">
        <img src="/cat/paw.png" alt="reset" class="btn-icon" />
      </button>
      <button
        class="ctrl-btn primary"
        onclick={isRunning ? pauseTimer : startTimer}
        style="background: {getPhaseColor()}"
      >
        <img src={isRunning ? '/cat/animal (1).png' : '/cat/animal.png'} alt="" class="btn-icon-lg" />
      </button>
      <button class="ctrl-btn" onclick={skipPhase} title="Skip">
        <img src="/cat/paws.png" alt="skip" class="btn-icon" />
      </button>
    </div>
  </div>

  <!-- Stats Row -->
  <div class="stats-row">
    <div class="stat-item">
      <img src="/cat/cat (1).png" alt="" class="stat-icon" />
      <span class="stat-value">{completedSessions}</span>
      <span class="stat-label">Sessions</span>
    </div>
    <div class="stat-item">
      <img src="/cat/paw.png" alt="" class="stat-icon" />
      <span class="stat-value">{formatFocusTime(totalFocusTime)}</span>
      <span class="stat-label">Focus Time</span>
    </div>
    <div class="stat-item">
      <img src="/cat/paws.png" alt="" class="stat-icon" />
      <span class="stat-value">{Math.floor(completedSessions / sessionsUntilLongBreak)}</span>
      <span class="stat-label">Cycles</span>
    </div>
  </div>

  <!-- Settings Toggle -->
  <button class="settings-toggle" onclick={() => showSettings = !showSettings}>
    <img src="/cat/cat (2).png" alt="" class="settings-icon" />
    <span>Settings</span>
    <span class="chevron" class:open={showSettings}>
      <img src="/cat/paws.png" alt="" class="chevron-icon" />
    </span>
  </button>

  <!-- Settings Panel -->
  {#if showSettings}
    <div class="settings-panel">
      <div class="setting-row">
        <span class="setting-label">Focus</span>
        <div class="setting-control">
          <button class="adj-btn" onclick={() => workMinutes = Math.max(1, workMinutes - 5)}>-</button>
          <span class="setting-value">{workMinutes}m</span>
          <button class="adj-btn" onclick={() => workMinutes = Math.min(120, workMinutes + 5)}>+</button>
        </div>
      </div>
      <div class="setting-row">
        <span class="setting-label">Short Break</span>
        <div class="setting-control">
          <button class="adj-btn" onclick={() => breakMinutes = Math.max(1, breakMinutes - 1)}>-</button>
          <span class="setting-value">{breakMinutes}m</span>
          <button class="adj-btn" onclick={() => breakMinutes = Math.min(30, breakMinutes + 1)}>+</button>
        </div>
      </div>
      <div class="setting-row">
        <span class="setting-label">Long Break</span>
        <div class="setting-control">
          <button class="adj-btn" onclick={() => longBreakMinutes = Math.max(5, longBreakMinutes - 5)}>-</button>
          <span class="setting-value">{longBreakMinutes}m</span>
          <button class="adj-btn" onclick={() => longBreakMinutes = Math.min(60, longBreakMinutes + 5)}>+</button>
        </div>
      </div>
      <div class="setting-row">
        <span class="setting-label">Sessions</span>
        <div class="setting-control">
          <button class="adj-btn" onclick={() => sessionsUntilLongBreak = Math.max(2, sessionsUntilLongBreak - 1)}>-</button>
          <span class="setting-value">{sessionsUntilLongBreak}x</span>
          <button class="adj-btn" onclick={() => sessionsUntilLongBreak = Math.min(10, sessionsUntilLongBreak + 1)}>+</button>
        </div>
      </div>
      <button class="reset-all-btn" onclick={resetAll}>
        <img src="/cat/black.png" alt="" class="reset-icon" />
        Reset Everything
      </button>
    </div>
  {/if}
</div>

<style>
  .pomodoro-mode {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0.5rem;
    gap: 0.75rem;
    font-family: 'Quicksand', 'Nunito', system-ui, sans-serif;
    overflow-y: auto;
  }

  /* Timer Card */
  .timer-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.35);
    border-radius: 14px;
    border: none;
  }

  .phase-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .phase-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  .phase-label {
    font-size: 1.1rem;
    font-weight: 600;
    color: #5a5048;
  }

  /* Timer Ring */
  .timer-ring {
    position: relative;
    width: 200px;
    height: 200px;
  }

  .ring-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: rgba(200, 180, 160, 0.2);
    stroke-width: 8;
  }

  .ring-fill {
    fill: none;
    stroke-width: 8;
    stroke-linecap: round;
    stroke-dasharray: 264;
    transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;
  }

  .timer-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }

  .timer-display {
    font-size: 2.8rem;
    font-weight: 700;
    color: #4a4039;
    letter-spacing: -0.02em;
  }

  .timer-dots {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
    margin-top: 0.5rem;
  }

  .session-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(200, 180, 160, 0.3);
    border: 2px solid rgba(200, 180, 160, 0.3);
    transition: all 0.3s ease;
  }

  .session-dot.completed {
    background: #e8a87c;
    border-color: #e8a87c;
  }

  .session-dot.current {
    border-color: #e8a87c;
    animation: pulse-dot 1.5s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }

  /* Controls */
  .timer-controls {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .ctrl-btn {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.5);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 44px;
    min-height: 44px;
  }

  .ctrl-btn:hover {
    background: rgba(255, 255, 255, 0.7);
    transform: scale(1.05);
  }

  .ctrl-btn.primary {
    width: 64px;
    height: 64px;
    border: none;
    box-shadow: 0 4px 16px rgba(100, 80, 60, 0.15);
  }

  .ctrl-btn.primary:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 24px rgba(100, 80, 60, 0.2);
  }

  .btn-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  .btn-icon-lg {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  /* Stats Row */
  .stats-row {
    display: flex;
    gap: 0.75rem;
  }

  .stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.6rem;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 10px;
    border: none;
  }

  .stat-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    margin-bottom: 0.25rem;
  }

  .stat-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: #4a4039;
  }

  .stat-label {
    font-size: 0.7rem;
    color: #a89b8a;
    font-weight: 500;
  }

  /* Settings Toggle */
  .settings-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.35);
    border: none;
    border-radius: 10px;
    color: #8b7d6b;
    font-size: 0.9rem;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 44px;
  }

  .settings-toggle:hover {
    background: rgba(255, 255, 255, 0.5);
    color: #5a5048;
  }

  .settings-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  .chevron {
    margin-left: auto;
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;
  }

  .chevron.open {
    transform: rotate(90deg);
  }

  .chevron-icon {
    width: 100%;
    height: 100%;
    object-fit: contain;
    opacity: 0.6;
  }

  /* Settings Panel */
  .settings-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.85rem;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    border: none;
  }

  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .setting-label {
    font-size: 0.9rem;
    color: #5a5048;
    font-weight: 500;
  }

  .setting-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .adj-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(212, 208, 232, 0.3);
    border: none;
    border-radius: 10px;
    font-size: 1.1rem;
    color: #8b7d6b;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 44px;
    min-height: 44px;
  }

  .adj-btn:hover {
    background: rgba(212, 208, 232, 0.5);
    color: #5a5048;
  }

  .setting-value {
    min-width: 45px;
    text-align: center;
    font-size: 0.95rem;
    font-weight: 600;
    color: #4a4039;
  }

  .reset-all-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: rgba(240, 184, 192, 0.2);
    border: none;
    border-radius: 10px;
    color: #8a6060;
    font-size: 0.85rem;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 0.5rem;
    min-height: 44px;
  }

  .reset-all-btn:hover {
    background: rgba(240, 184, 192, 0.35);
  }

  .reset-icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
  }
</style>
