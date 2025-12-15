<script>
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';

  /** @typedef {{ cpu_usage: number, cpu_count: number, cpu_name: string, cpu_brand: string, cpu_vendor: string, memory_used: number, memory_total: number, memory_percent: number, disk_used: number, disk_total: number, disk_percent: number, cpu_temperature: number | null, gpu_temperature: number | null, gpu_name: string | null, gpu_usage: number | null, gpu_memory_used: number | null, gpu_memory_total: number | null, network_in: number, network_out: number, uptime_seconds: number, processes: Array<{ pid: number, name: string, cpu_usage: number, memory_mb: number, status: string }> }} SystemStats */

  let cpu = $state(0);
  let cpuCount = $state(0);
  let cpuBrand = $state('');
  let ram = $state(0);
  let ramUsed = $state(0);
  let ramTotal = $state(0);
  let disk = $state(0);
  let diskUsed = $state(0);
  let diskTotal = $state(0);
  let network = $state({ in: 0, out: 0 });
  let lastNetworkIn = $state(0);
  let lastNetworkOut = $state(0);
  let uptime = $state('0h 0m');
  let processes = $state(/** @type {Array<{ pid: number, name: string, cpu_usage: number, memory_mb: number, status: string }>} */ ([]));
  let error = $state(/** @type {string | null} */ (null));

  /**
   * @param {number} bytes
   * @returns {string}
   */
  function formatBytes(bytes) {
    if (bytes >= 1e12) return (bytes / 1e12).toFixed(1) + ' TB';
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
    return bytes + ' B';
  }

  /**
   * @param {number} seconds
   * @returns {string}
   */
  function formatUptime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  }

  async function fetchStats() {
    try {
      /** @type {SystemStats} */
      const stats = await invoke('get_system_stats');

      cpu = stats.cpu_usage;
      cpuCount = stats.cpu_count;
      cpuBrand = stats.cpu_brand;
      ram = stats.memory_percent;
      ramUsed = stats.memory_used;
      ramTotal = stats.memory_total;
      disk = stats.disk_percent;
      diskUsed = stats.disk_used;
      diskTotal = stats.disk_total;
      uptime = formatUptime(stats.uptime_seconds);
      processes = stats.processes;

      // Calculate network rate
      if (lastNetworkIn > 0) {
        network = {
          in: Math.max(0, stats.network_in - lastNetworkIn),
          out: Math.max(0, stats.network_out - lastNetworkOut)
        };
      }
      lastNetworkIn = stats.network_in;
      lastNetworkOut = stats.network_out;

      error = null;
    } catch (e) {
      console.error('Failed to fetch system stats:', e);
      error = String(e);
    }
  }

  onMount(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  });

  // Cozy color based on value
  function getBarColor(value) {
    if (value > 85) return 'var(--bar-high)';
    if (value > 60) return 'var(--bar-medium)';
    return 'var(--bar-normal)';
  }

  // Cat status image based on value
  function getStatusImage(value) {
    if (value > 85) return '/cat/animal (1).png'; // stressed cat
    if (value > 60) return '/cat/animal.png'; // alert cat
    return '/cat/cat (1).png'; // happy cat
  }
</script>

<div class="monitor-mode">
  {#if error}
    <div class="error-card">
      <img src="/cat/black.png" alt="" class="card-icon" />
      <span class="error-text">Something went wrong</span>
    </div>
  {/if}

  <!-- Main Stats Grid -->
  <div class="stats-grid">
    <!-- CPU Card -->
    <div class="stat-card">
      <div class="card-header">
        <img src="/cat/animal.png" alt="" class="card-icon" />
        <span class="card-title">Processor</span>
        <span class="card-value">{Math.round(cpu)}%</span>
      </div>
      <div class="bar-container">
        <div class="bar-fill" style="width: {cpu}%; background: {getBarColor(cpu)}"></div>
      </div>
      <div class="card-footer">
        <span class="footer-label">{cpuCount} cores</span>
        <img src={getStatusImage(cpu)} alt="" class="footer-status-icon" />
      </div>
    </div>

    <!-- Memory Card -->
    <div class="stat-card">
      <div class="card-header">
        <img src="/cat/animal (2).png" alt="" class="card-icon" />
        <span class="card-title">Memory</span>
        <span class="card-value">{Math.round(ram)}%</span>
      </div>
      <div class="bar-container">
        <div class="bar-fill" style="width: {ram}%; background: {getBarColor(ram)}"></div>
      </div>
      <div class="card-footer">
        <span class="footer-label">{formatBytes(ramUsed)} / {formatBytes(ramTotal)}</span>
        <img src={getStatusImage(ram)} alt="" class="footer-status-icon" />
      </div>
    </div>

    <!-- Disk Card -->
    <div class="stat-card">
      <div class="card-header">
        <img src="/cat/animal-shelter.png" alt="" class="card-icon" />
        <span class="card-title">Storage</span>
        <span class="card-value">{Math.round(disk)}%</span>
      </div>
      <div class="bar-container">
        <div class="bar-fill" style="width: {disk}%; background: {getBarColor(disk)}"></div>
      </div>
      <div class="card-footer">
        <span class="footer-label">{formatBytes(diskUsed)} / {formatBytes(diskTotal)}</span>
        <img src={getStatusImage(disk)} alt="" class="footer-status-icon" />
      </div>
    </div>
  </div>

  <!-- Info Row -->
  <div class="info-row">
    <div class="info-card">
      <img src="/cat/paw.png" alt="" class="info-icon" />
      <div class="info-content">
        <span class="info-label">Uptime</span>
        <span class="info-value">{uptime}</span>
      </div>
    </div>
    <div class="info-card">
      <img src="/cat/paws.png" alt="" class="info-icon" />
      <div class="info-content">
        <span class="info-label">Down</span>
        <span class="info-value">{formatBytes(network.in)}/s</span>
      </div>
    </div>
    <div class="info-card">
      <img src="/cat/paws.png" alt="" class="info-icon flip" />
      <div class="info-content">
        <span class="info-label">Up</span>
        <span class="info-value">{formatBytes(network.out)}/s</span>
      </div>
    </div>
  </div>

  <!-- Processes Section -->
  <div class="processes-card">
    <div class="processes-header">
      <img src="/cat/cat (2).png" alt="" class="processes-icon" />
      <span class="processes-title">Active Apps</span>
      <span class="processes-count">{processes.length}</span>
    </div>
    <div class="processes-list">
      {#each processes.slice(0, 6) as proc, i}
        <div class="process-item" class:top={i === 0}>
          <span class="process-name">{proc.name}</span>
          <div class="process-bar-container">
            <div
              class="process-bar"
              style="width: {Math.min(proc.cpu_usage, 100)}%"
              class:high={proc.cpu_usage > 50}
            ></div>
          </div>
          <span class="process-value">{proc.cpu_usage.toFixed(0)}%</span>
        </div>
      {/each}
      {#if processes.length === 0}
        <div class="no-processes">
          <img src="/happy.png" alt="" class="no-processes-icon" />
          <span>No active apps</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Status Footer -->
  <div class="status-footer">
    <img src="/cat/paw.png" alt="" class="status-paw" />
    <span class="status-text">System Healthy</span>
  </div>
</div>

<style>
  .monitor-mode {
    --bar-normal: linear-gradient(90deg, #d4d0e8, #b8a0d0);
    --bar-medium: linear-gradient(90deg, #f5d4bc, #e8a87c);
    --bar-high: linear-gradient(90deg, #f0b8c0, #e89090);

    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0.5rem;
    gap: 0.75rem;
    font-family: 'Quicksand', 'Nunito', system-ui, sans-serif;
    overflow: hidden;
  }

  .error-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(240, 184, 192, 0.2);
    border-radius: 14px;
    border: 1px solid rgba(240, 184, 192, 0.3);
  }

  .error-text {
    color: #8a6060;
    font-size: 0.9rem;
  }

  /* Icon styling */
  .card-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  .info-icon {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }

  .info-icon.flip {
    transform: scaleY(-1);
  }

  .footer-status-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  .processes-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  /* Stats Grid */
  .stats-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.35);
    border-radius: 12px;
    padding: 0.85rem;
    border: none;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .card-title {
    flex: 1;
    font-size: 0.95rem;
    font-weight: 600;
    color: #5a5048;
  }

  .card-value {
    font-size: 1.4rem;
    font-weight: 700;
    color: #4a4039;
  }

  .bar-container {
    height: 12px;
    background: rgba(200, 180, 160, 0.15);
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .bar-fill {
    height: 100%;
    border-radius: 6px;
    transition: width 0.5s ease, background 0.3s ease;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-label {
    font-size: 0.8rem;
    color: #8b7d6b;
  }

  /* Info Row */
  .info-row {
    display: flex;
    gap: 0.75rem;
  }

  .info-card {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 10px;
    border: none;
  }

  .info-content {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .info-label {
    font-size: 0.7rem;
    color: #a89b8a;
    font-weight: 500;
  }

  .info-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #5a5048;
  }

  /* Processes Card */
  .processes-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    border: none;
    overflow: hidden;
  }

  .processes-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.85rem;
    border-bottom: 1px solid rgba(200, 180, 160, 0.1);
  }

  .processes-title {
    flex: 1;
    font-size: 0.9rem;
    font-weight: 600;
    color: #5a5048;
  }

  .processes-count {
    font-size: 0.75rem;
    color: #a89b8a;
    background: rgba(200, 180, 160, 0.15);
    padding: 0.2rem 0.6rem;
    border-radius: 10px;
  }

  .processes-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .process-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    margin-bottom: 0.35rem;
    transition: background 0.2s ease;
  }

  .process-item:hover {
    background: rgba(212, 208, 232, 0.15);
  }

  .process-item.top {
    background: rgba(232, 168, 124, 0.1);
  }

  .process-name {
    flex: 1;
    font-size: 0.85rem;
    color: #5a5048;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .process-bar-container {
    width: 80px;
    height: 8px;
    background: rgba(200, 180, 160, 0.15);
    border-radius: 4px;
    overflow: hidden;
  }

  .process-bar {
    height: 100%;
    background: var(--bar-normal);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .process-bar.high {
    background: var(--bar-medium);
  }

  .process-value {
    font-size: 0.75rem;
    font-weight: 600;
    color: #8b7d6b;
    min-width: 35px;
    text-align: right;
  }

  .no-processes {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.5rem;
    color: #a89b8a;
    font-size: 0.85rem;
  }

  .no-processes-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
    opacity: 0.6;
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

  .status-text {
    font-size: 0.8rem;
    color: #8b7d6b;
    font-weight: 500;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
</style>
