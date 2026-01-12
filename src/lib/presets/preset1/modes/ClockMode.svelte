<script>
  import { onMount } from 'svelte';

  let timeStr = $state('00:00:00');
  let dateStr = $state('');
  let dayName = $state('');
  let blinkOn = $state(true);

  function updateTime() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();

    timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    dayName = days[now.getDay()];

    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;

    blinkOn = s % 2 === 0;
  }

  onMount(() => {
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  });
</script>

<div class="clock-mode">
  <div class="clock-container">
    <div class="day-display">[{dayName}]</div>
    <div class="time-display">
      <span class="time-text">{timeStr}</span>
    </div>
    <div class="date-display">{dateStr}</div>
    <div class="status-line">
      <span class="blink" class:on={blinkOn}>_</span>
      <span>SYSTEM TIME ACTIVE</span>
    </div>
  </div>
</div>

<style>
  .clock-mode {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 1rem;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    overflow: hidden;
  }

  .clock-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
  }

  .day-display {
    font-size: clamp(1rem, 3vw, 1.4rem);
    color: var(--terminal-dim, #00aa30);
    letter-spacing: 0.3em;
  }

  .time-display {
    position: relative;
  }

  .time-text {
    font-size: clamp(3rem, 12vw, 6rem);
    font-weight: 600;
    color: var(--terminal-green, #00ff41);
    text-shadow:
      0 0 10px var(--terminal-green, #00ff41),
      0 0 20px var(--terminal-green, #00ff41),
      0 0 40px rgba(0, 255, 65, 0.5);
    letter-spacing: 0.05em;
    line-height: 1;
  }

  .date-display {
    font-size: clamp(1.2rem, 4vw, 1.8rem);
    color: var(--terminal-dim, #00aa30);
    letter-spacing: 0.2em;
  }

  .status-line {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: clamp(0.9rem, 2.5vw, 1.1rem);
    color: var(--terminal-dim, #00aa30);
    letter-spacing: 0.1em;
    margin-top: 0.5rem;
  }

  .blink {
    opacity: 0;
    color: var(--terminal-green, #00ff41);
  }

  .blink.on {
    opacity: 1;
  }
</style>
