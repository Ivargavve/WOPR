<script>
  import { onMount } from 'svelte';
  import { RetroPanel, RetroButton, RetroProgress } from '$lib/components';

  const WORK_TIME = 25 * 60; // 25 minutes
  const BREAK_TIME = 5 * 60; // 5 minutes

  let timeRemaining = $state(WORK_TIME);
  let isRunning = $state(false);
  let isBreak = $state(false);
  let completedSessions = $state(0);

  const progress = $derived(
    isBreak
      ? ((BREAK_TIME - timeRemaining) / BREAK_TIME) * 100
      : ((WORK_TIME - timeRemaining) / WORK_TIME) * 100
  );

  const displayTime = $derived(() => {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  /** @type {ReturnType<typeof setInterval> | null} */
  let interval = null;

  function startTimer() {
    isRunning = true;
    interval = setInterval(() => {
      if (timeRemaining > 0) {
        timeRemaining--;
      } else {
        // Timer complete
        if (!isBreak) {
          completedSessions++;
          isBreak = true;
          timeRemaining = BREAK_TIME;
        } else {
          isBreak = false;
          timeRemaining = WORK_TIME;
        }
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

  function resetTimer() {
    pauseTimer();
    timeRemaining = isBreak ? BREAK_TIME : WORK_TIME;
  }

  function skipPhase() {
    pauseTimer();
    if (!isBreak) {
      completedSessions++;
    }
    isBreak = !isBreak;
    timeRemaining = isBreak ? BREAK_TIME : WORK_TIME;
  }

  onMount(() => {
    return () => {
      if (interval) clearInterval(interval);
    };
  });
</script>

<div class="pomodoro-mode">
  <RetroPanel title={isBreak ? 'BREAK TIME' : 'FOCUS TIME'}>
    <div class="timer-display">
      <div class="time glow">{displayTime()}</div>
      <RetroProgress value={progress} showValue={false} variant={isBreak ? 'cyan' : 'default'} />
    </div>
  </RetroPanel>

  <div class="controls">
    {#if isRunning}
      <RetroButton icon="⏸" label="PAUSE" onclick={pauseTimer} active />
    {:else}
      <RetroButton icon="▶" label="START" onclick={startTimer} variant="primary" />
    {/if}
    <RetroButton icon="↺" label="RESET" onclick={resetTimer} />
    <RetroButton icon="⏭" label="SKIP" onclick={skipPhase} />
  </div>

  <RetroPanel title="STATS" border="single">
    <div class="stats">
      <div class="stat">
        <span class="stat-value glow">{completedSessions}</span>
        <span class="stat-label">SESSIONS</span>
      </div>
      <div class="stat">
        <span class="stat-value">{completedSessions * 25}</span>
        <span class="stat-label">MINUTES</span>
      </div>
    </div>
  </RetroPanel>
</div>

<style>
  .pomodoro-mode {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
  }

  .timer-display {
    text-align: center;
    padding: 1rem 0;
  }

  .time {
    font-size: 3rem;
    font-weight: bold;
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
    color: var(--text-primary);
  }

  .controls {
    display: flex;
    gap: 0.5rem;
  }

  .controls :global(button) {
    flex: 1;
  }

  .stats {
    display: flex;
    justify-content: space-around;
    text-align: center;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: var(--text-primary);
  }

  .stat-label {
    font-size: 0.65rem;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .glow {
    text-shadow: 0 0 10px var(--text-primary), 0 0 20px rgba(0, 255, 65, 0.3);
  }
</style>
