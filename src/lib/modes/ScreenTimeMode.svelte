<script>
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';

  /** @typedef {{ name: string, seconds: number, percent: number, last_seen: number }} AppUsage */
  /** @typedef {{ today: AppUsage[], all_time: AppUsage[], session_duration: number, total_today: number, current_app: string | null }} ActivityStats */

  /**
   * Format unix timestamp to full datetime
   * @param {number} timestamp
   * @param {boolean} [short=false] - Use short format for inline display
   */
  function formatTime(timestamp, short = false) {
    if (!timestamp) return '--:--:--';
    const date = new Date(timestamp * 1000);
    if (short) {
      // Short format: MM/DD HH:MM
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const mins = String(date.getMinutes()).padStart(2, '0');
      return `${month}/${day} ${hours}:${mins}`;
    }
    // Full format: YYYY-MM-DD HH:MM:SS
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    const secs = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
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
    if (confirm('Reset today?')) {
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

  // All-time data
  const allTimeCategories = $derived(categorizeApps(stats?.all_time));
  const allTimeTotal = $derived(getCategorySeconds(stats?.all_time ?? []));
</script>

<div class="screentime-mode">
  <!-- All-Time Stats Bar -->
  <div class="alltime-bar">
    <div class="alltime-stats">
      <div class="stat-block total">
        <span class="stat-value">{formatHours(allTimeTotal)}</span>
        <span class="stat-label">TOTAL</span>
      </div>
      <div class="stat-block">
        <span class="stat-value">{formatHours(getCategorySeconds(allTimeCategories.work))}</span>
        <span class="stat-label">WORK</span>
      </div>
      <div class="stat-block">
        <span class="stat-value">{formatHours(getCategorySeconds(allTimeCategories.play))}</span>
        <span class="stat-label">PLAY</span>
      </div>
    </div>
    <div class="top-apps">
      <span class="top-apps-label">TOP APPS</span>
      <div class="top-apps-list">
        {#each (stats?.all_time ?? []).slice(0, 5) as app, i}
          <div class="top-app-row" class:first={i === 0}>
            <span class="top-app-name">{app.name}</span>
            <span class="top-app-time">{formatHours(app.seconds)}</span>
            <span class="top-app-seen">{formatTime(app.last_seen, true)}</span>
          </div>
        {:else}
          <span class="no-data">No data</span>
        {/each}
      </div>
    </div>
  </div>

  <!-- Today Section -->
  <div class="today-section">
    <div class="today-header">
      <span class="today-label">TODAY</span>
      <span class="today-total">{formatDuration(todayTotal)}</span>
      <button class="reset-btn" onclick={resetToday} title="Reset today">×</button>
    </div>

    <!-- Categories Grid -->
    <div class="categories-grid">
      <!-- Work Column -->
      <div class="category">
        <div class="category-header">
          <span class="category-name">WORK</span>
          <span class="category-percent">{todayTotal ? Math.round((getCategorySeconds(todayCategories.work) / todayTotal) * 100) : 0}%</span>
        </div>
        <div class="category-list">
          {#each todayCategories.work.slice(0, 12) as app, i}
            <div class="app-row" class:top={i === 0}>
              <span class="app-name">{app.name}</span>
              <span class="app-seen">{formatTime(app.last_seen, true)}</span>
              <span class="app-time">{formatDuration(app.seconds)}</span>
            </div>
          {:else}
            <div class="empty">No work apps yet</div>
          {/each}
        </div>
      </div>

      <!-- Play Column -->
      <div class="category">
        <div class="category-header">
          <span class="category-name">PLAY</span>
          <span class="category-percent">{todayTotal ? Math.round((getCategorySeconds(todayCategories.play) / todayTotal) * 100) : 0}%</span>
        </div>
        <div class="category-list">
          {#each todayCategories.play.slice(0, 12) as app, i}
            <div class="app-row" class:top={i === 0}>
              <span class="app-name">{app.name}</span>
              <span class="app-seen">{formatTime(app.last_seen, true)}</span>
              <span class="app-time">{formatDuration(app.seconds)}</span>
            </div>
          {:else}
            <div class="empty">No play apps yet</div>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="screentime-footer">
    <span class="live-indicator">LIVE</span>
  </div>
</div>

<style>
  .screentime-mode {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0.5rem;
    gap: 0.5rem;
    font-family: var(--font-mono);
    overflow: hidden;
  }

  /* All-Time Bar */
  .alltime-bar {
    display: flex;
    gap: 1rem;
    padding: 0.6rem;
    background: rgba(0, 255, 65, 0.03);
    border-bottom: 1px dashed var(--border-color);
  }

  .alltime-stats {
    display: flex;
    gap: 0.75rem;
    padding-right: 0.75rem;
    border-right: 1px dashed var(--border-color);
  }

  .stat-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 45px;
  }

  .stat-block.total .stat-value {
    font-size: 1.2rem;
    text-shadow: 0 0 12px var(--text-primary);
  }

  .stat-value {
    font-size: 0.85rem;
    font-weight: bold;
    color: var(--text-primary);
  }

  .stat-label {
    font-size: 0.45rem;
    color: var(--text-dim);
    letter-spacing: 0.1em;
    margin-top: 0.15rem;
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
    font-size: 0.45rem;
    color: var(--text-dim);
    letter-spacing: 0.1em;
  }

  .top-apps-list {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    overflow-y: auto;
    max-height: 70px;
  }

  .top-app-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.55rem;
    color: var(--text-dim);
    padding: 0.1rem 0;
  }

  .top-app-row.first {
    color: var(--text-primary);
  }

  .top-app-row.first .top-app-name {
    text-shadow: 0 0 8px var(--text-primary);
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
  }

  .top-app-seen {
    font-size: 0.5rem;
    opacity: 0.6;
    font-family: var(--font-mono);
  }

  .no-data {
    font-size: 0.5rem;
    color: var(--text-dim);
    opacity: 0.5;
  }

  /* Today Section */
  .today-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .today-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0;
  }

  .today-label {
    font-size: 0.55rem;
    color: var(--text-dim);
    letter-spacing: 0.15em;
  }

  .today-total {
    font-size: 1.2rem;
    font-weight: bold;
    color: var(--text-primary);
    text-shadow: 0 0 15px var(--text-primary);
    margin-left: auto;
  }

  .reset-btn {
    width: 22px;
    height: 22px;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-dim);
    font-size: 0.85rem;
    cursor: pointer;
  }

  .reset-btn:hover {
    border-color: #ff4444;
    color: #ff4444;
  }

  .categories-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    min-height: 0;
  }

  .category {
    display: flex;
    flex-direction: column;
    background: rgba(0, 20, 0, 0.2);
    overflow: hidden;
  }

  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.4rem 0.5rem;
    border-bottom: 1px dashed var(--border-color);
  }

  .category-name {
    font-size: 0.55rem;
    color: var(--text-dim);
    letter-spacing: 0.1em;
  }

  .category-percent {
    font-size: 1rem;
    font-weight: bold;
    color: var(--text-primary);
    text-shadow: 0 0 10px var(--text-primary);
  }

  .category-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.3rem;
  }

  .app-row {
    display: flex;
    justify-content: space-between;
    padding: 0.35rem 0.3rem;
    border-bottom: 1px dashed var(--border-color);
    font-size: 0.6rem;
  }

  .app-row:last-child {
    border-bottom: none;
  }

  .app-row.top {
    background: rgba(0, 255, 65, 0.08);
  }

  .app-row.top .app-name {
    color: var(--text-primary);
  }

  .app-name {
    color: var(--text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    margin-right: 0.5rem;
  }

  .app-seen {
    font-size: 0.5rem;
    color: var(--text-dim);
    opacity: 0.6;
    font-family: var(--font-mono);
  }

  .app-time {
    color: var(--text-primary);
    font-size: 0.55rem;
    white-space: nowrap;
    min-width: 28px;
    text-align: right;
  }

  .empty {
    color: var(--text-dim);
    opacity: 0.5;
    text-align: center;
    padding: 1.5rem;
    font-size: 0.55rem;
  }

  .screentime-footer {
    display: flex;
    justify-content: flex-end;
    font-size: 0.5rem;
    color: var(--text-dim);
    padding-top: 0.3rem;
  }

  .live-indicator {
    color: var(--text-primary);
    animation: blink 2s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
