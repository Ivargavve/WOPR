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
  let cpuTemperature = $state(/** @type {number | null} */ (null));
  let gpuTemperature = $state(/** @type {number | null} */ (null));
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
      cpuTemperature = stats.cpu_temperature;
      gpuTemperature = stats.gpu_temperature;
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

  /**
   * @param {number} value
   * @returns {string}
   */
  function getBarColor(value) {
    if (value > 85) return 'var(--bar-high)';
    if (value > 60) return 'var(--bar-medium)';
    return 'var(--bar-normal)';
  }

  /**
   * @param {number} temp
   * @param {boolean} [isGpu=false]
   * @returns {string}
   */
  function getTempColor(temp, isGpu = false) {
    const high = isGpu ? 80 : 70;
    const warn = isGpu ? 65 : 55;
    if (temp > high) return 'var(--bar-high)';
    if (temp > warn) return 'var(--bar-medium)';
    return 'var(--bar-normal)';
  }
</script>

<div class="monitor-mode">
  <!-- Decorative cat -->
  <div class="deco-cat cat-monitor-2"></div>

  {#if error}
    <div class="error-card">
      <span class="error-text">Unable to fetch system stats</span>
    </div>
  {/if}

  <!-- Main Stats -->
  <div class="stats-grid">
    <!-- CPU -->
    <div class="stat-card">
      <div class="card-header">
        <span class="card-title">CPU</span>
        <span class="card-value">{Math.round(cpu)}%</span>
      </div>
      <div class="bar-container">
        <div class="bar-fill orange" style="width: {cpu}%"></div>
      </div>
      <div class="card-footer">
        <span class="footer-label">{cpuBrand || 'Processor'}</span>
        <span class="footer-sub">{cpuCount} cores</span>
      </div>
    </div>

    <!-- Memory -->
    <div class="stat-card">
      <div class="card-header">
        <span class="card-title">Memory</span>
        <span class="card-value">{Math.round(ram)}%</span>
      </div>
      <div class="bar-container">
        <div class="bar-fill purple" style="width: {ram}%"></div>
      </div>
      <div class="card-footer">
        <span class="footer-label">{formatBytes(ramUsed)} / {formatBytes(ramTotal)}</span>
      </div>
    </div>

    <!-- Storage -->
    <div class="stat-card">
      <div class="card-header">
        <span class="card-title">Storage</span>
        <span class="card-value">{Math.round(disk)}%</span>
      </div>
      <div class="bar-container">
        <div class="bar-fill orange" style="width: {disk}%"></div>
      </div>
      <div class="card-footer">
        <span class="footer-label">{formatBytes(diskUsed)} / {formatBytes(diskTotal)}</span>
      </div>
    </div>

    <!-- CPU Temp - if available -->
    {#if cpuTemperature !== null}
      <div class="stat-card small">
        <div class="card-header">
          <span class="card-title">CPU Temp</span>
          <span class="card-value temp">{Math.round(cpuTemperature)}°C</span>
        </div>
        <div class="bar-container">
          <div class="bar-fill" style="width: {cpuTemperature}%; background: {getTempColor(cpuTemperature)}"></div>
        </div>
        <div class="card-footer">
          <span class="footer-label temp-status">{cpuTemperature > 70 ? 'Hot' : cpuTemperature > 55 ? 'Warm' : 'Normal'}</span>
        </div>
      </div>
    {/if}

    <!-- GPU Temp - if available -->
    {#if gpuTemperature !== null}
      <div class="stat-card small">
        <div class="card-header">
          <span class="card-title">GPU Temp</span>
          <span class="card-value temp">{Math.round(gpuTemperature)}°C</span>
        </div>
        <div class="bar-container">
          <div class="bar-fill" style="width: {gpuTemperature}%; background: {getTempColor(gpuTemperature, true)}"></div>
        </div>
        <div class="card-footer">
          <span class="footer-label temp-status">{gpuTemperature > 80 ? 'Hot' : gpuTemperature > 65 ? 'Warm' : 'Normal'}</span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Info Row -->
  <div class="info-row">
    <div class="info-card">
      <span class="info-label">Uptime</span>
      <span class="info-value">{uptime}</span>
    </div>
    <div class="info-card">
      <span class="info-label">Network</span>
      <span class="info-value">
        <span class="net-arrow down">▼</span> {formatBytes(network.in)}/s
        <span class="net-arrow up">▲</span> {formatBytes(network.out)}/s
      </span>
    </div>
    <div class="info-card">
      <span class="info-label">Status</span>
      <span class="info-value status">
        <span class="status-dot" class:active={!error}></span>
        {error ? 'Error' : 'Healthy'}
      </span>
    </div>
  </div>

  <!-- Processes Section -->
  <div class="processes-card">
    <div class="processes-header">
      <span class="col-pid">PID</span>
      <span class="col-name">Process</span>
      <span class="col-cpu">CPU</span>
      <span class="col-mem">Memory</span>
    </div>
    <div class="processes-list">
      {#each processes as proc, i}
        <div class="process-row" class:top={i === 0}>
          <span class="col-pid">{proc.pid}</span>
          <span class="col-name">{proc.name}</span>
          <div class="col-cpu">
            <div class="cpu-bar-container">
              <div
                class="cpu-bar"
                class:warning={proc.cpu_usage > 50}
                class:critical={proc.cpu_usage > 80}
                style="width: {Math.min(proc.cpu_usage, 100)}%"
              ></div>
            </div>
            <span class="cpu-value">{proc.cpu_usage.toFixed(1)}%</span>
          </div>
          <span class="col-mem">{proc.memory_mb >= 1024 ? (proc.memory_mb / 1024).toFixed(1) + 'G' : proc.memory_mb.toFixed(0) + 'M'}</span>
        </div>
      {/each}
      {#if processes.length === 0}
        <div class="no-processes">No active processes</div>
      {/if}
    </div>
  </div>

  <!-- Footer -->
  <div class="monitor-footer">
    <span class="live-dot"></span>
    <span>Live Monitoring</span>
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
    gap: 0.6rem;
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

  .cat-monitor-2 {
    width: 50px;
    height: 50px;
    bottom: 15px;
    left: -5px;
    background-image: var(--cat-image-6, url('../assets/cats/c7.png'));
    transform: rotate(5deg);
  }

  .error-card {
    padding: 0.5rem 0.75rem;
    background: rgba(240, 184, 192, 0.2);
    border-radius: 10px;
    border: 1px solid rgba(240, 184, 192, 0.3);
  }

  .error-text {
    color: #8a6060;
    font-size: 0.8rem;
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.5rem;
  }

  .stat-card {
    background: var(--cozy-card, rgba(255, 255, 255, 0.35));
    border-radius: 12px;
    padding: 0.7rem;
  }

  .stat-card.small {
    padding: 0.5rem 0.7rem;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .card-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--cozy-text, #5a5048);
  }

  .card-value {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--cozy-text, #4a4039);
  }

  .card-value.temp {
    font-size: 1rem;
    color: var(--cozy-accent, #e8a87c);
  }

  .bar-container {
    height: 10px;
    background: rgba(200, 180, 160, 0.15);
    border-radius: 5px;
    overflow: hidden;
    margin-bottom: 0.4rem;
  }

  .bar-fill {
    height: 100%;
    border-radius: 5px;
    transition: width 0.5s ease;
  }

  .bar-fill.orange {
    background: linear-gradient(90deg, #f5d4bc, #e8a87c);
  }

  .bar-fill.purple {
    background: linear-gradient(90deg, #d4d0e8, #b8a0d0);
  }

  .card-footer {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .footer-label {
    font-size: 0.7rem;
    color: var(--cozy-text-light, #8b7d6b);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .footer-sub {
    font-size: 0.65rem;
    color: var(--cozy-text-muted, #a89b8a);
  }

  /* Info Row */
  .info-row {
    display: flex;
    gap: 0.5rem;
    padding: 0.4rem 0;
    border-top: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.2));
    border-bottom: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.2));
  }

  .info-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0.3rem;
  }

  .info-label {
    font-size: 0.65rem;
    color: var(--cozy-text-muted, #a89b8a);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .info-value {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--cozy-text, #5a5048);
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .info-value.status {
    gap: 0.4rem;
  }

  .net-arrow {
    font-size: 0.7rem;
  }

  .net-arrow.down {
    color: var(--cozy-accent, #e8a87c);
  }

  .net-arrow.up {
    color: #b8a0d0;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #e89090;
  }

  .status-dot.active {
    background: #90c090;
    animation: pulse 2s ease-in-out infinite;
  }

  /* Processes */
  .processes-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--cozy-card, rgba(255, 255, 255, 0.3));
    border-radius: 12px;
    overflow: hidden;
  }

  .processes-header {
    display: grid;
    grid-template-columns: 50px 1fr 120px 55px;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--cozy-text-muted, #a89b8a);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--cozy-border, rgba(180, 160, 140, 0.2));
  }

  .processes-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.25rem;
  }

  .process-row {
    display: grid;
    grid-template-columns: 50px 1fr 120px 55px;
    gap: 0.5rem;
    padding: 0.4rem 0.5rem;
    font-size: 0.75rem;
    color: var(--cozy-text, #5a5048);
    border-radius: 8px;
    align-items: center;
  }

  .process-row:hover {
    background: rgba(232, 168, 124, 0.08);
  }

  .process-row.top {
    background: rgba(232, 168, 124, 0.12);
  }

  .col-pid {
    font-size: 0.65rem;
    color: var(--cozy-text-muted, #a89b8a);
  }

  .col-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-cpu {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .cpu-bar-container {
    flex: 1;
    height: 8px;
    background: rgba(200, 180, 160, 0.15);
    border-radius: 4px;
    overflow: hidden;
  }

  .cpu-bar {
    height: 100%;
    background: linear-gradient(90deg, #d4d0e8, #b8a0d0);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .cpu-bar.warning {
    background: linear-gradient(90deg, #f5d4bc, #e8a87c);
  }

  .cpu-bar.critical {
    background: linear-gradient(90deg, #f0b8c0, #e89090);
  }

  .cpu-value {
    font-size: 0.65rem;
    color: var(--cozy-text-light, #8b7d6b);
    min-width: 35px;
    text-align: right;
  }

  .col-mem {
    font-size: 0.7rem;
    color: var(--cozy-text-light, #8b7d6b);
    text-align: right;
  }

  .no-processes {
    padding: 1.5rem;
    text-align: center;
    color: var(--cozy-text-muted, #a89b8a);
    font-size: 0.8rem;
  }

  /* Footer */
  .monitor-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem;
    font-size: 0.7rem;
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
