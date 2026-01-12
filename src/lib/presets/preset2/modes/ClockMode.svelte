<script>
  import { onMount } from 'svelte';

  let hourAngle = $state(0);
  let minuteAngle = $state(0);
  let secondAngle = $state(0);
  let dateStr = $state('');
  let dayName = $state('');

  function updateTime() {
    const now = new Date();
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const s = now.getSeconds();

    secondAngle = s * 6;
    minuteAngle = m * 6 + s * 0.1;
    hourAngle = h * 30 + m * 0.5;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    dayName = days[now.getDay()];
    dateStr = `${months[now.getMonth()]} ${now.getDate()}`;
  }

  onMount(() => {
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  });
</script>

<div class="clock-mode">
  <div class="clock-wrapper">
    <svg class="clock-face" viewBox="0 0 200 200">
      <!-- Clock background -->
      <circle cx="100" cy="100" r="95" class="clock-bg" />
      <circle cx="100" cy="100" r="90" class="clock-inner" />

      <!-- Hour markers -->
      {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as i}
        <line
          x1="100"
          y1="18"
          x2="100"
          y2={i % 3 === 0 ? "28" : "24"}
          class="hour-mark"
          class:major={i % 3 === 0}
          transform="rotate({i * 30} 100 100)"
        />
      {/each}

      <!-- Hour numbers -->
      <text x="100" y="38" class="hour-num">12</text>
      <text x="162" y="104" class="hour-num">3</text>
      <text x="100" y="172" class="hour-num">6</text>
      <text x="38" y="104" class="hour-num">9</text>

      <!-- Clock hands -->
      <line
        x1="100"
        y1="100"
        x2="100"
        y2="45"
        class="hand hour-hand"
        transform="rotate({hourAngle} 100 100)"
      />
      <line
        x1="100"
        y1="100"
        x2="100"
        y2="28"
        class="hand minute-hand"
        transform="rotate({minuteAngle} 100 100)"
      />
      <line
        x1="100"
        y1="110"
        x2="100"
        y2="25"
        class="hand second-hand"
        transform="rotate({secondAngle} 100 100)"
      />

      <!-- Center dot -->
      <circle cx="100" cy="100" r="6" class="center-dot" />
      <circle cx="100" cy="100" r="3" class="center-dot-inner" />
    </svg>

    <div class="date-display">
      <span class="day-name">{dayName}</span>
      <span class="date-text">{dateStr}</span>
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
    padding: 0.5rem;
    font-family: 'Quicksand', 'Nunito', system-ui, sans-serif;
    overflow: hidden;
  }

  .clock-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    max-height: 100%;
  }

  .clock-face {
    width: min(420px, 90%, 70vh);
    height: min(420px, 90%, 70vh);
    filter: drop-shadow(0 4px 12px rgba(180, 160, 140, 0.25));
    flex-shrink: 1;
  }

  .clock-bg {
    fill: var(--cozy-card, rgba(255, 255, 255, 0.5));
    stroke: var(--cozy-border, rgba(180, 160, 140, 0.4));
    stroke-width: 2;
  }

  .clock-inner {
    fill: var(--cozy-bg, rgba(255, 252, 248, 0.9));
    stroke: none;
  }

  .hour-mark {
    stroke: var(--cozy-text-muted, #a89b8a);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .hour-mark.major {
    stroke: var(--cozy-text-light, #8b7d6b);
    stroke-width: 3;
  }

  .hour-num {
    font-size: 18px;
    font-weight: 600;
    fill: var(--cozy-text, #5a5048);
    text-anchor: middle;
    dominant-baseline: middle;
  }

  .hand {
    stroke-linecap: round;
    transition: transform 0.1s cubic-bezier(0.4, 2.3, 0.3, 1);
  }

  .hour-hand {
    stroke: var(--cozy-text, #5a5048);
    stroke-width: 6;
  }

  .minute-hand {
    stroke: var(--cozy-text-light, #8b7d6b);
    stroke-width: 4;
  }

  .second-hand {
    stroke: var(--cozy-accent, #e8a87c);
    stroke-width: 2;
  }

  .center-dot {
    fill: var(--cozy-text, #5a5048);
  }

  .center-dot-inner {
    fill: var(--cozy-accent, #e8a87c);
  }

  .date-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
  }

  .day-name {
    font-size: 1.8rem;
    font-weight: 500;
    color: var(--cozy-text, #5a5048);
  }

  .date-text {
    font-size: 1.4rem;
    color: var(--cozy-text-light, #8b7d6b);
  }
</style>
