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
  let uptime = $state('00:00:00');
  let cpuTemperature = $state(/** @type {number | null} */ (null));
  let gpuTemperature = $state(/** @type {number | null} */ (null));
  let processes = $state(/** @type {Array<{ pid: number, name: string, cpu_usage: number, memory_mb: number, status: string }>} */ ([]));
  let error = $state(/** @type {string | null} */ (null));

  /**
   * @param {number} bytes
   * @returns {string}
   */
  function formatBytes(bytes) {
    if (bytes >= 1e12) return (bytes / 1e12).toFixed(1) + 'TB';
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + 'GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + 'MB';
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + 'KB';
    return bytes + 'B';
  }

  /**
   * @param {number} seconds
   * @returns {string}
   */
  function formatUptime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate stroke-dashoffset for donut chart
   * @param {number} percent
   * @param {number} radius
   * @returns {number}
   */
  function getDonutOffset(percent, radius = 36) {
    const circumference = 2 * Math.PI * radius;
    return circumference - (percent / 100) * circumference;
  }

  const CIRCUMFERENCE = 2 * Math.PI * 36;

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
      cpuTemperature = stats.cpu_temperature;
      gpuTemperature = stats.gpu_temperature;
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

  /**
   * @param {number} value
   * @returns {string}
   */
  function getColor(value) {
    if (value > 80) return '#ff4444';
    if (value > 60) return '#ffa500';
    return '#00ff41';
  }

  /**
   * @param {number} temp
   * @param {boolean} [isGpu=false]
   * @returns {string}
   */
  function getTempColor(temp, isGpu = false) {
    const high = isGpu ? 80 : 70;
    const warn = isGpu ? 65 : 55;
    if (temp > high) return '#ff4444';
    if (temp > warn) return '#ffa500';
    return '#00ff41';
  }

  /**
   * @param {string} status
   * @returns {string}
   */
  function formatProcessStatus(status) {
    if (status.includes('Run')) return 'RUN';
    if (status.includes('Sleep')) return 'SLP';
    if (status.includes('Idle')) return 'IDL';
    return status.toUpperCase().slice(0, 3);
  }
</script>

<div class="monitor-mode">
  {#if error}
    <div class="error-box">
      <span class="error-title">ERROR</span>
      <span class="error-msg">{error}</span>
    </div>
  {/if}

  <!-- Main Stats with Donuts -->
  <div class="stats-row">
    <!-- CPU -->
    <div class="stat-card">
      <div class="donut-container">
        <svg viewBox="0 0 80 80" class="donut">
          <circle cx="40" cy="40" r="36" class="donut-bg" />
          <circle
            cx="40" cy="40" r="36"
            class="donut-fill"
            style="stroke: {getColor(cpu)}; stroke-dashoffset: {getDonutOffset(cpu)};"
          />
        </svg>
        <div class="donut-value" style="color: {getColor(cpu)}">{Math.round(cpu)}%</div>
      </div>
      <div class="stat-label">{cpuBrand || 'CPU'}</div>
      <div class="stat-sub">{cpuCount} cores</div>
    </div>

    <!-- Memory -->
    <div class="stat-card">
      <div class="donut-container">
        <svg viewBox="0 0 80 80" class="donut">
          <circle cx="40" cy="40" r="36" class="donut-bg" />
          <circle
            cx="40" cy="40" r="36"
            class="donut-fill"
            style="stroke: {getColor(ram)}; stroke-dashoffset: {getDonutOffset(ram)};"
          />
        </svg>
        <div class="donut-value" style="color: {getColor(ram)}">{Math.round(ram)}%</div>
      </div>
      <div class="stat-label">MEMORY</div>
      <div class="stat-sub">{formatBytes(ramUsed)} / {formatBytes(ramTotal)}</div>
    </div>

    <!-- Disk -->
    <div class="stat-card">
      <div class="donut-container">
        <svg viewBox="0 0 80 80" class="donut">
          <circle cx="40" cy="40" r="36" class="donut-bg" />
          <circle
            cx="40" cy="40" r="36"
            class="donut-fill"
            style="stroke: {getColor(disk)}; stroke-dashoffset: {getDonutOffset(disk)};"
          />
        </svg>
        <div class="donut-value" style="color: {getColor(disk)}">{Math.round(disk)}%</div>
      </div>
      <div class="stat-label">DISK</div>
      <div class="stat-sub">{formatBytes(diskUsed)} / {formatBytes(diskTotal)}</div>
    </div>

    <!-- CPU Temp - only show if available -->
    {#if cpuTemperature !== null}
      <div class="stat-card">
        <div class="donut-container">
          <svg viewBox="0 0 80 80" class="donut">
            <circle cx="40" cy="40" r="36" class="donut-bg" />
            <circle
              cx="40" cy="40" r="36"
              class="donut-fill"
              style="stroke: {getTempColor(cpuTemperature)}; stroke-dashoffset: {getDonutOffset(cpuTemperature)};"
            />
          </svg>
          <div class="donut-value" style="color: {getTempColor(cpuTemperature)}">
            {Math.round(cpuTemperature)}°
          </div>
        </div>
        <div class="stat-label">CPU TEMP</div>
        <div class="stat-sub">Active</div>
      </div>
    {/if}

    <!-- GPU Temp - only show if available -->
    {#if gpuTemperature !== null}
      <div class="stat-card">
        <div class="donut-container">
          <svg viewBox="0 0 80 80" class="donut">
            <circle cx="40" cy="40" r="36" class="donut-bg" />
            <circle
              cx="40" cy="40" r="36"
              class="donut-fill"
              style="stroke: {getTempColor(gpuTemperature, true)}; stroke-dashoffset: {getDonutOffset(gpuTemperature)};"
            />
          </svg>
          <div class="donut-value" style="color: {getTempColor(gpuTemperature, true)}">
            {Math.round(gpuTemperature)}°
          </div>
        </div>
        <div class="stat-label">GPU TEMP</div>
        <div class="stat-sub">Active</div>
      </div>
    {/if}
  </div>

  <!-- Info Row -->
  <div class="info-row">
    <div class="info-item">
      <span class="info-label">NETWORK</span>
      <div class="info-values">
        <span>▼ {formatBytes(network.in)}/s</span>
        <span>▲ {formatBytes(network.out)}/s</span>
      </div>
    </div>
    <div class="info-item">
      <span class="info-label">UPTIME</span>
      <span class="uptime-value">{uptime}</span>
    </div>
    <div class="info-item">
      <span class="info-label">STATUS</span>
      <span class="status-value">
        <span class="status-dot" class:active={!error}></span>
        {error ? 'ERROR' : 'NOMINAL'}
      </span>
    </div>
  </div>

  <!-- Process List -->
  <div class="process-section">
    <div class="process-header">
      <span>PID</span>
      <span>PROCESS</span>
      <span class="bar-header">CPU USAGE</span>
      <span>MEM</span>
    </div>
    <div class="process-list">
      {#each processes as proc}
        <div class="process-row">
          <span class="pid">{proc.pid}</span>
          <span class="name">{proc.name.slice(0, 16)}</span>
          <div class="cpu-bar-container">
            <div
              class="cpu-bar"
              class:warning={proc.cpu_usage > 50}
              class:critical={proc.cpu_usage > 80}
              style="width: {Math.min(proc.cpu_usage, 100)}%"
            ></div>
            <span class="cpu-value" class:warning={proc.cpu_usage > 50}>{proc.cpu_usage.toFixed(1)}%</span>
          </div>
          <span class="mem">{proc.memory_mb >= 1024 ? (proc.memory_mb / 1024).toFixed(1) + 'G' : proc.memory_mb.toFixed(0) + 'M'}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Footer -->
  <div class="monitor-footer">
    <span>SYSTEM MONITOR</span>
    <span class="live-dot"></span>
    <span>LIVE</span>
  </div>
</div>

<style>
  .monitor-mode {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0.5rem;
    gap: 0.6rem;
    font-family: var(--font-mono);
    overflow: hidden;
  }

  .error-box {
    background: rgba(255, 0, 0, 0.1);
    padding: 0.4rem 0.6rem;
    display: flex;
    gap: 0.5rem;
    font-size: 0.6rem;
  }

  .error-title {
    color: #ff4444;
    font-weight: bold;
  }

  .error-msg {
    color: #ff8888;
    flex: 1;
  }

  /* Stats Row with Donuts */
  .stats-row {
    display: flex;
    justify-content: space-around;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0;
    flex: 1;
    min-height: 0;
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    flex: 1;
    min-width: 0;
  }

  .donut-container {
    position: relative;
    width: 130px;
    height: 130px;
  }

  .donut {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .donut-bg {
    fill: none;
    stroke: rgba(0, 255, 65, 0.1);
    stroke-width: 6;
  }

  .donut-fill {
    fill: none;
    stroke-width: 6;
    stroke-linecap: round;
    stroke-dasharray: 226.2;
    transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;
  }

  .donut-value {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.5rem;
    font-weight: bold;
    text-shadow: 0 0 10px currentColor;
  }

  .stat-label {
    font-size: 0.7rem;
    color: var(--text-dim);
    letter-spacing: 0.1em;
    text-align: center;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stat-sub {
    font-size: 0.65rem;
    color: var(--text-dim);
    opacity: 0.7;
  }

  /* Info Row */
  .info-row {
    display: flex;
    justify-content: space-around;
    padding: 0.4rem 0;
    border-top: 1px dashed var(--border-color);
    border-bottom: 1px dashed var(--border-color);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
  }

  .info-label {
    font-size: 0.6rem;
    color: var(--text-dim);
    letter-spacing: 0.1em;
  }

  .info-values {
    display: flex;
    gap: 0.6rem;
    font-size: 0.7rem;
    color: var(--text-primary);
  }

  .uptime-value {
    font-size: 1.1rem;
    font-weight: bold;
    color: var(--text-primary);
    text-shadow: 0 0 8px var(--text-primary);
    letter-spacing: 0.1em;
  }

  .status-value {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    color: var(--text-primary);
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ff4444;
  }

  .status-dot.active {
    background: var(--text-primary);
    box-shadow: 0 0 8px var(--text-primary);
    animation: pulse 2s ease-in-out infinite;
  }

  /* Process Section */
  .process-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    max-height: 180px;
    overflow: hidden;
  }

  .process-header {
    display: grid;
    grid-template-columns: 50px 100px 1fr 50px;
    gap: 0.5rem;
    padding: 0.3rem 0.4rem;
    font-size: 0.6rem;
    color: var(--text-dim);
    letter-spacing: 0.05em;
    border-bottom: 1px dashed var(--border-color);
  }

  .process-header .bar-header {
    text-align: center;
  }

  .process-list {
    flex: 1;
    overflow-y: auto;
  }

  .process-row {
    display: grid;
    grid-template-columns: 50px 100px 1fr 50px;
    gap: 0.5rem;
    padding: 0.25rem 0.4rem;
    font-size: 0.7rem;
    color: var(--text-primary);
    border-bottom: 1px dashed rgba(0, 255, 65, 0.1);
    align-items: center;
  }

  .process-row:last-child {
    border-bottom: none;
  }

  .process-row .pid {
    color: var(--text-dim);
    font-size: 0.65rem;
  }

  .process-row .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cpu-bar-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 14px;
    background: rgba(0, 255, 65, 0.05);
    border: 1px solid rgba(0, 255, 65, 0.15);
    position: relative;
    padding-right: 45px;
  }

  .cpu-bar {
    height: 100%;
    background: var(--text-primary);
    opacity: 0.6;
    transition: width 0.3s ease;
    min-width: 2px;
  }

  .cpu-bar.warning {
    background: #ffa500;
  }

  .cpu-bar.critical {
    background: #ff4444;
  }

  .cpu-value {
    position: absolute;
    right: 6px;
    font-size: 0.6rem;
    color: var(--text-primary);
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
  }

  .cpu-value.warning {
    color: #ffa500;
  }

  .process-row .mem {
    text-align: right;
    color: var(--text-dim);
    font-size: 0.65rem;
  }

  /* Footer */
  .monitor-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.5rem;
    color: var(--text-dim);
    padding-top: 0.3rem;
  }

  .live-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-primary);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* Responsive */
  @media (max-width: 600px) {
    .stats-row {
      flex-wrap: wrap;
    }
    .stat-card {
      flex-basis: 30%;
    }
    .donut-container {
      width: 70px;
      height: 70px;
    }
    .donut-value {
      font-size: 0.9rem;
    }
  }
</style>
