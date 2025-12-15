<script>
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';

  /** @typedef {{ name: string, seconds: number, percent: number, last_seen: number }} AppUsage */
  /** @typedef {{ today: AppUsage[], all_time: AppUsage[], session_duration: number, total_today: number, current_app: string | null }} ActivityStats */

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
  const workPercent = $derived(todayTotal ? Math.round((getCategorySeconds(todayCategories.work) / todayTotal) * 100) : 0);
  const playPercent = $derived(todayTotal ? Math.round((getCategorySeconds(todayCategories.play) / todayTotal) * 100) : 0);

  // All-time data
  const allTimeCategories = $derived(categorizeApps(stats?.all_time));
  const allTimeTotal = $derived(getCategorySeconds(stats?.all_time ?? []));
</script>

<div class="screentime-mode">
  <!-- Today Summary Card -->
  <div class="summary-card">
    <div class="summary-header">
      <img src="/cat/animal.png" alt="" class="summary-icon" />
      <span class="summary-title">Today's Activity</span>
      <button class="reset-btn" onclick={resetToday} title="Reset today">
        <img src="/cat/paw.png" alt="reset" class="reset-icon" />
      </button>
    </div>

    <div class="summary-total">
      <span class="total-value">{formatDuration(todayTotal)}</span>
      <span class="total-label">total screen time</span>
    </div>

    <!-- Category Breakdown -->
    <div class="category-bars">
      <div class="category-bar">
        <div class="bar-header">
          <img src="/cat/animal (1).png" alt="" class="bar-icon" />
          <span class="bar-label">Work</span>
          <span class="bar-value">{workPercent}%</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill work" style="width: {workPercent}%"></div>
        </div>
      </div>
      <div class="category-bar">
        <div class="bar-header">
          <img src="/cat/cat (1).png" alt="" class="bar-icon" />
          <span class="bar-label">Play</span>
          <span class="bar-value">{playPercent}%</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill play" style="width: {playPercent}%"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Top Apps Section -->
  <div class="apps-section">
    <div class="section-header">
      <span class="section-title">Most Used Apps</span>
    </div>

    <div class="apps-list">
      {#each (stats?.today ?? []).slice(0, 8) as app, i}
        <div class="app-item" class:top={i === 0}>
          <span class="app-rank">{i + 1}</span>
          <span class="app-name">{app.name}</span>
          <span class="app-time">{formatDuration(app.seconds)}</span>
        </div>
      {:else}
        <div class="no-data">
          <img src="/happy.png" alt="" class="no-data-icon" />
          <span>No activity recorded yet</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- All-Time Stats -->
  <div class="alltime-section">
    <div class="section-header">
      <img src="/cat/cat (2).png" alt="" class="section-icon" />
      <span class="section-title">All-Time Stats</span>
    </div>
    <div class="alltime-grid">
      <div class="alltime-stat">
        <img src="/cat/paw.png" alt="" class="stat-icon" />
        <span class="stat-value">{formatHours(allTimeTotal)}</span>
        <span class="stat-label">Total</span>
      </div>
      <div class="alltime-stat">
        <img src="/cat/animal (1).png" alt="" class="stat-icon" />
        <span class="stat-value">{formatHours(getCategorySeconds(allTimeCategories.work))}</span>
        <span class="stat-label">Work</span>
      </div>
      <div class="alltime-stat">
        <img src="/cat/cat (1).png" alt="" class="stat-icon" />
        <span class="stat-value">{formatHours(getCategorySeconds(allTimeCategories.play))}</span>
        <span class="stat-label">Play</span>
      </div>
    </div>
  </div>

  <!-- Status Footer -->
  <div class="status-footer">
    <img src="/cat/paw.png" alt="" class="status-paw" />
    <span class="status-text">Tracking</span>
  </div>
</div>

<style>
  .screentime-mode {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0.5rem;
    gap: 0.75rem;
    font-family: 'Quicksand', 'Nunito', system-ui, sans-serif;
    overflow-y: auto;
  }

  /* Summary Card */
  .summary-card {
    background: rgba(255, 255, 255, 0.35);
    border-radius: 14px;
    padding: 1rem;
    border: none;
  }

  .summary-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .summary-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  .summary-title {
    flex: 1;
    font-size: 1rem;
    font-weight: 600;
    color: #5a5048;
  }

  .reset-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(240, 184, 192, 0.2);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    /* Touch-friendly */
    min-width: 44px;
    min-height: 44px;
  }

  .reset-btn:hover {
    background: rgba(240, 184, 192, 0.3);
  }

  .reset-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  .summary-total {
    text-align: center;
    margin-bottom: 1.25rem;
  }

  .total-value {
    display: block;
    font-size: 2.5rem;
    font-weight: 700;
    color: #4a4039;
    line-height: 1.2;
  }

  .total-label {
    font-size: 0.85rem;
    color: #a89b8a;
    font-weight: 500;
  }

  /* Category Bars */
  .category-bars {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .category-bar {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .bar-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .bar-icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
  }

  .bar-label {
    flex: 1;
    font-size: 0.85rem;
    color: #5a5048;
    font-weight: 500;
  }

  .bar-value {
    font-size: 0.85rem;
    font-weight: 600;
    color: #4a4039;
  }

  .bar-track {
    height: 10px;
    background: rgba(200, 180, 160, 0.15);
    border-radius: 5px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 5px;
    transition: width 0.5s ease;
  }

  .bar-fill.work {
    background: linear-gradient(90deg, #d4d0e8, #b8a0d0);
  }

  .bar-fill.play {
    background: linear-gradient(90deg, #f5d4bc, #e8a87c);
  }

  /* Apps Section */
  .apps-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    border: none;
    overflow: hidden;
  }

  .section-header {
    padding: 0.6rem 0.85rem;
    border-bottom: 1px solid rgba(200, 180, 160, 0.1);
  }

  .section-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #5a5048;
  }

  .apps-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .app-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    margin-bottom: 0.35rem;
    transition: background 0.2s ease;
  }

  .app-item:hover {
    background: rgba(212, 208, 232, 0.15);
  }

  .app-item.top {
    background: rgba(232, 168, 124, 0.1);
  }

  .app-rank {
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(212, 208, 232, 0.3);
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #8b7d6b;
  }

  .app-item.top .app-rank {
    background: rgba(232, 168, 124, 0.3);
    color: #8a6a50;
  }

  .app-name {
    flex: 1;
    font-size: 0.85rem;
    color: #5a5048;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .app-time {
    font-size: 0.8rem;
    font-weight: 600;
    color: #8b7d6b;
  }

  .no-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 0.5rem;
    color: #a89b8a;
  }

  .no-data-icon {
    width: 40px;
    height: 40px;
    object-fit: contain;
    opacity: 0.7;
  }

  /* All-Time Section */
  .alltime-section {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    border: none;
    overflow: hidden;
  }

  .alltime-section .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(200, 180, 160, 0.15);
  }

  .section-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  .alltime-grid {
    display: flex;
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .alltime-stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
  }

  .stat-icon {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }

  .stat-value {
    font-size: 1rem;
    font-weight: 700;
    color: #4a4039;
  }

  .stat-label {
    font-size: 0.7rem;
    color: #a89b8a;
    font-weight: 500;
  }

  /* Status Footer */
  .status-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .status-paw {
    width: 16px;
    height: 16px;
    object-fit: contain;
    animation: bounce 2s ease-in-out infinite;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  .status-text {
    font-size: 0.8rem;
    color: #8b7d6b;
    font-weight: 500;
  }

</style>
