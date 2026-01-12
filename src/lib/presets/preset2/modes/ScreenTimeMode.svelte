<script>
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';

  /** @typedef {{ name: string, seconds: number, percent: number, last_seen: number }} AppUsage */
  /** @typedef {{ today: AppUsage[], all_time: AppUsage[], session_duration: number, total_today: number, current_app: string | null }} ActivityStats */

  /**
   * Format unix timestamp to short datetime
   * @param {number} timestamp
   */
  function formatTime(timestamp) {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp * 1000);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hours}:${mins}`;
  }

  let stats = $state(/** @type {ActivityStats | null} */ (null));

  // Entertainment apps (browsers, games, media)
  const ENTERTAINMENT = [
    'Safari', 'Google Chrome', 'Firefox', 'Arc', 'Brave Browser', 'Microsoft Edge', 'Opera', 'Chrome',
    'Steam', 'Epic Games', 'Battle.net', 'Riot Client', 'GOG Galaxy', 'Origin', 'Minecraft', 'Roblox',
    'Spotify', 'Apple Music', 'Netflix', 'YouTube', 'VLC', 'IINA', 'Plex', 'Disney+', 'Prime Video',
    'Discord', 'Twitch', 'Messages', 'Telegram', 'WhatsApp', 'Slack'
  ];

  function formatDuration(seconds) {
    if (!seconds || seconds < 60) return `${seconds || 0}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
  }

  function formatHours(seconds) {
    if (!seconds) return '0h';
    const hrs = seconds / 3600;
    if (hrs < 1) return `${Math.floor(seconds / 60)}m`;
    return `${hrs.toFixed(1)}h`;
  }

  function categorizeApps(apps) {
    const work = [];
    const play = [];

    for (const app of apps || []) {
      if (ENTERTAINMENT.some(e => app.name.includes(e))) {
        play.push(app);
      } else {
        work.push(app);
      }
    }
    return { work, play };
  }

  function getCategorySeconds(apps) {
    return apps.reduce((sum, app) => sum + app.seconds, 0);
  }

  async function fetchStats() {
    try {
      stats = await invoke('get_activity_stats');
    } catch (e) {
      console.error('Failed to fetch activity stats:', e);
    }
  }

  async function resetToday() {
    if (confirm('Reset today\'s activity?')) {
      await invoke('reset_activity_today');
      await fetchStats();
    }
  }

  onMount(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  });

  // Today's data
  const todayCategories = $derived(categorizeApps(stats?.today));
  const todayTotal = $derived(stats?.total_today ?? 0);
  // Calculate percentages that always add up to 100%
  const workPercent = $derived(todayTotal ? Math.round((getCategorySeconds(todayCategories.work) / todayTotal) * 100) : 0);
  const playPercent = $derived(todayTotal ? 100 - workPercent : 0);

  // All-time data
  const allTimeCategories = $derived(categorizeApps(stats?.all_time));
  const allTimeTotal = $derived(getCategorySeconds(stats?.all_time ?? []));
</script>

<div class="screentime-mode">
  <!-- Decorative cat -->
  <div class="deco-cat cat-screen-1"></div>

  <!-- All-Time Summary -->
  <div class="alltime-bar">
    <div class="alltime-stats">
      <div class="stat-block total">
        <span class="stat-value">{formatHours(allTimeTotal)}</span>
        <span class="stat-label">Total</span>
      </div>
      <div class="stat-block">
        <span class="stat-value">{formatHours(getCategorySeconds(allTimeCategories.work))}</span>
        <span class="stat-label">Work</span>
      </div>
      <div class="stat-block">
        <span class="stat-value">{formatHours(getCategorySeconds(allTimeCategories.play))}</span>
        <span class="stat-label">Play</span>
      </div>
    </div>
    <div class="top-apps">
      <span class="top-apps-label">Top Apps (All Time)</span>
      <div class="top-apps-list">
        {#each (stats?.all_time ?? []).slice(0, 5) as app, i}
          <div class="top-app-row" class:first={i === 0}>
            <span class="top-app-name">{app.name}</span>
            <span class="top-app-time">{formatHours(app.seconds)}</span>
            <span class="top-app-seen">{formatTime(app.last_seen)}</span>
          </div>
        {:else}
          <span class="no-data">No data yet</span>
        {/each}
      </div>
    </div>
  </div>

  <!-- Today Header -->
  <div class="today-header">
    <span class="today-label">Today</span>
    <span class="today-total">{formatDuration(todayTotal)}</span>
    <button class="reset-btn" onclick={resetToday} title="Reset today">↺</button>
  </div>

  <!-- Category Bars -->
  <div class="category-summary">
    <div class="category-bar">
      <div class="bar-info">
        <span class="bar-label">Work</span>
        <span class="bar-value">{workPercent}%</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill work" style="width: {workPercent}%"></div>
      </div>
    </div>
    <div class="category-bar">
      <div class="bar-info">
        <span class="bar-label">Play</span>
        <span class="bar-value">{playPercent}%</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill play" style="width: {playPercent}%"></div>
      </div>
    </div>
  </div>

  <!-- Today Categories Grid -->
  <div class="categories-grid">
    <!-- Work Column -->
    <div class="category-column">
      <div class="column-header">
        <span class="column-title">Work</span>
        <span class="column-percent">{workPercent}%</span>
      </div>
      <div class="column-list">
        {#each todayCategories.work.slice(0, 10) as app, i}
          <div class="app-row" class:top={i === 0}>
            <span class="app-name">{app.name}</span>
            <span class="app-seen">{formatTime(app.last_seen)}</span>
            <span class="app-time">{formatDuration(app.seconds)}</span>
          </div>
        {:else}
          <div class="empty">No work apps yet</div>
        {/each}
      </div>
    </div>

    <!-- Play Column -->
    <div class="category-column">
      <div class="column-header">
        <span class="column-title">Play</span>
        <span class="column-percent">{playPercent}%</span>
      </div>
      <div class="column-list">
        {#each todayCategories.play.slice(0, 10) as app, i}
          <div class="app-row" class:top={i === 0}>
            <span class="app-name">{app.name}</span>
            <span class="app-seen">{formatTime(app.last_seen)}</span>
            <span class="app-time">{formatDuration(app.seconds)}</span>
          </div>
        {:else}
          <div class="empty">No play apps yet</div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="status-footer">
    <span class="live-dot"></span>
    <span>Live Tracking</span>
  </div>
</div>

<style>
  .screentime-mode {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0.5rem;
    gap: 0.5rem;
    font-family: 'Quicksand', 'Nunito', system-ui, sans-serif;
    overflow: hidden;
    position: relative;
  }

  /* Decorative cats */
  .deco-cat {
    position: absolute;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    pointer-events: none;
    z-index: 0;
    opacity: 0.4;
  }

  .cat-screen-1 {
    width: 28px;
    height: 28px;
    top: -2px;
    left: -2px;
    background-image: var(--cat-image-9, url('../assets/cats/c9.png'));
    transform: rotate(10deg);
  }

  /* All-Time Bar */
  .alltime-bar {
    display: flex;
    gap: 0.75rem;
    padding: 0.6rem;
    background: var(--cozy-card, rgba(255, 255, 255, 0.35));
    border-radius: 12px;
  }

  .alltime-stats {
    display: flex;
    gap: 0.6rem;
    padding-right: 0.75rem;
    border-right: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.2));
  }

  .stat-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 40px;
  }

  .stat-block.total .stat-value {
    font-size: 1.6rem;
    color: var(--cozy-accent, #e8a87c);
  }

  .stat-value {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--cozy-text, #4a4039);
  }

  .stat-label {
    font-size: 0.8rem;
    color: var(--cozy-text-muted, #a89b8a);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.1rem;
  }

  .top-apps {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
    overflow: hidden;
  }

  .top-apps-label {
    font-size: 0.8rem;
    color: var(--cozy-text-muted, #a89b8a);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .top-apps-list {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    overflow-y: auto;
    max-height: 75px;
    padding-right: 0.5rem;
  }

  .top-app-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
    color: var(--cozy-text-light, #8b7d6b);
    padding: 0.15rem 0;
  }

  .top-app-row.first {
    color: var(--cozy-text, #4a4039);
  }

  .top-app-row.first .top-app-name {
    font-weight: 600;
  }

  .top-app-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .top-app-time {
    min-width: 30px;
    text-align: right;
    font-weight: 500;
  }

  .top-app-seen {
    font-size: 0.8rem;
    color: var(--cozy-text-muted, #a89b8a);
  }

  .no-data {
    font-size: 0.9rem;
    color: var(--cozy-text-muted, #a89b8a);
    font-style: italic;
  }

  /* Today Header */
  .today-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0;
  }

  .today-label {
    font-size: 1rem;
    color: var(--cozy-text-light, #8b7d6b);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .today-total {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--cozy-text, #4a4039);
    margin-left: auto;
  }

  .reset-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: var(--cozy-text-light, #8b7d6b);
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reset-btn:hover {
    color: #8a6060;
  }

  /* Category Summary Bars */
  .category-summary {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--cozy-card, rgba(255, 255, 255, 0.3));
    border-radius: 10px;
  }

  .category-bar {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .bar-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .bar-label {
    font-size: 0.95rem;
    color: var(--cozy-text, #5a5048);
    font-weight: 500;
  }

  .bar-value {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--cozy-text, #4a4039);
  }

  .bar-track {
    height: 8px;
    background: rgba(200, 180, 160, 0.15);
    border-radius: 4px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  .bar-fill.work {
    background: linear-gradient(90deg, #d4d0e8, #b8a0d0);
  }

  .bar-fill.play {
    background: linear-gradient(90deg, #f5d4bc, #e8a87c);
  }

  /* Categories Grid */
  .categories-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    min-height: 0;
  }

  .category-column {
    display: flex;
    flex-direction: column;
    background: var(--cozy-card, rgba(255, 255, 255, 0.3));
    border-radius: 12px;
    overflow: hidden;
  }

  .column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.65rem;
    border-bottom: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.2));
  }

  .column-title {
    font-size: 0.95rem;
    color: var(--cozy-text-light, #8b7d6b);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .column-percent {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--cozy-text, #4a4039);
  }

  .column-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.3rem;
  }

  .app-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
    padding: 0.4rem 0.5rem;
    border-radius: 8px;
    font-size: 0.9rem;
    margin-bottom: 0.2rem;
  }

  .app-row:hover {
    background: rgba(232, 168, 124, 0.08);
  }

  .app-row.top {
    background: rgba(232, 168, 124, 0.12);
  }

  .app-row.top .app-name {
    color: var(--cozy-text, #4a4039);
    font-weight: 600;
  }

  .app-name {
    flex: 1;
    color: var(--cozy-text-light, #8b7d6b);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 60px;
  }

  .app-seen {
    font-size: 0.8rem;
    color: var(--cozy-text-muted, #a89b8a);
  }

  .app-time {
    font-weight: 600;
    color: var(--cozy-text, #5a5048);
    text-align: right;
    min-width: 35px;
  }

  .empty {
    color: var(--cozy-text-muted, #a89b8a);
    text-align: center;
    padding: 1.5rem;
    font-size: 0.95rem;
    font-style: italic;
  }

  /* Footer */
  .status-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem;
    font-size: 0.9rem;
    color: var(--cozy-text-muted, #a89b8a);
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
</style>
