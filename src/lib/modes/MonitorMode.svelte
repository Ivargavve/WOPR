<script>
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';

  /** @typedef {{ cpu_usage: number, cpu_count: number, cpu_name: string, cpu_brand: string, cpu_vendor: string, memory_used: number, memory_total: number, memory_percent: number, disk_used: number, disk_total: number, disk_percent: number, cpu_temperature: number | null, gpu_temperature: number | null, gpu_name: string | null, gpu_usage: number | null, gpu_memory_used: number | null, gpu_memory_total: number | null, network_in: number, network_out: number, uptime_seconds: number, processes: Array<{ pid: number, name: string, cpu_usage: number, memory_mb: number, status: string }> }} SystemStats */

  let cpu = $state(0);
  let cpuCount = $state(0);
  let cpuName = $state('');
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
  let gpuName = $state(/** @type {string | null} */ (null));
  let gpuUsage = $state(/** @type {number | null} */ (null));
  let gpuMemoryUsed = $state(/** @type {number | null} */ (null));
  let gpuMemoryTotal = $state(/** @type {number | null} */ (null));
  let processes = $state(/** @type {Array<{ pid: number, name: string, cpu_usage: number, memory_mb: number, status: string }>} */ ([]));
  let error = $state(/** @type {string | null} */ (null));

  /**
   * @param {number} value
   * @param {number} width
   * @returns {string}
   */
  function generateBar(value, width = 25) {
    const filled = Math.round((value / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

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

  async function fetchStats() {
    try {
      /** @type {SystemStats} */
      const stats = await invoke('get_system_stats');

      cpu = stats.cpu_usage;
      cpuCount = stats.cpu_count;
      cpuName = stats.cpu_name;
      cpuBrand = stats.cpu_brand;
      ram = stats.memory_percent;
      ramUsed = stats.memory_used;
      ramTotal = stats.memory_total;
      disk = stats.disk_percent;
      diskUsed = stats.disk_used;
      diskTotal = stats.disk_total;
      cpuTemperature = stats.cpu_temperature;
      gpuTemperature = stats.gpu_temperature;
      gpuName = stats.gpu_name;
      gpuUsage = stats.gpu_usage;
      gpuMemoryUsed = stats.gpu_memory_used;
      gpuMemoryTotal = stats.gpu_memory_total;
      uptime = formatUptime(stats.uptime_seconds);
      processes = stats.processes;

      // Calculate network rate (bytes per second since last check)
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
    // Fetch immediately
    fetchStats();

    // Then refresh every 2 seconds (to avoid too much overhead)
    const interval = setInterval(fetchStats, 2000);

    return () => clearInterval(interval);
  });

  /**
   * @param {number} value
   * @returns {string}
   */
  function getVariant(value) {
    if (value > 80) return 'danger';
    if (value > 60) return 'warning';
    return 'normal';
  }

  /**
   * @param {string} status
   * @returns {string}
   */
  function formatProcessStatus(status) {
    // Convert Rust debug format like "Run" to display format
    if (status.includes('Run')) return 'ACTIVE';
    if (status.includes('Sleep')) return 'SLEEP';
    if (status.includes('Idle')) return 'IDLE';
    return status.toUpperCase().slice(0, 6);
  }
</script>

<div class="monitor-mode">
  {#if error}
    <div class="error-box">
      <span class="error-title">ERROR</span>
      <span class="error-msg">{error}</span>
    </div>
  {/if}

  <!-- Main Grid -->
  <div class="monitor-grid">
    <!-- CPU Section -->
    <div class="stat-box">
      <div class="stat-title">{cpuBrand || cpuName || 'CPU'}</div>
      <div class="stat-value {getVariant(cpu)}">{Math.round(cpu)}%</div>
      <div class="stat-bar {getVariant(cpu)}">{generateBar(cpu)}</div>
      <div class="stat-details">
        <span>CORES: {cpuCount}</span>
        <span>USAGE: {Math.round(cpu)}%</span>
      </div>
    </div>

    <!-- Memory Section -->
    <div class="stat-box">
      <div class="stat-title">MEMORY</div>
      <div class="stat-value {getVariant(ram)}">{Math.round(ram)}%</div>
      <div class="stat-bar {getVariant(ram)}">{generateBar(ram)}</div>
      <div class="stat-details">
        <span>USED: {formatBytes(ramUsed)}</span>
        <span>TOTAL: {formatBytes(ramTotal)}</span>
      </div>
    </div>

    <!-- Disk Section -->
    <div class="stat-box">
      <div class="stat-title">DISK</div>
      <div class="stat-value {getVariant(disk)}">{Math.round(disk)}%</div>
      <div class="stat-bar {getVariant(disk)}">{generateBar(disk)}</div>
      <div class="stat-details">
        <span>USED: {formatBytes(diskUsed)}</span>
        <span>TOTAL: {formatBytes(diskTotal)}</span>
      </div>
    </div>

    <!-- CPU Temperature -->
    <div class="stat-box">
      <div class="stat-title">CPU TEMP</div>
      {#if cpuTemperature !== null}
        <div class="stat-value {cpuTemperature > 70 ? 'danger' : cpuTemperature > 55 ? 'warning' : 'normal'}">{Math.round(cpuTemperature)}°C</div>
        <div class="stat-bar {cpuTemperature > 70 ? 'danger' : cpuTemperature > 55 ? 'warning' : 'normal'}">{generateBar(cpuTemperature)}</div>
      {:else}
        <div class="stat-value dim">N/A</div>
        <div class="stat-bar dim">—</div>
      {/if}
      <div class="stat-details">
        <span>MIN: 35°C</span>
        <span>MAX: 100°C</span>
      </div>
    </div>

    <!-- GPU Temperature -->
    <div class="stat-box">
      <div class="stat-title">GPU TEMP</div>
      {#if gpuTemperature !== null}
        <div class="stat-value {gpuTemperature > 80 ? 'danger' : gpuTemperature > 65 ? 'warning' : 'normal'}">{Math.round(gpuTemperature)}°C</div>
        <div class="stat-bar {gpuTemperature > 80 ? 'danger' : gpuTemperature > 65 ? 'warning' : 'normal'}">{generateBar(gpuTemperature)}</div>
      {:else}
        <div class="stat-value dim">N/A</div>
        <div class="stat-bar dim">—</div>
      {/if}
      <div class="stat-details">
        <span>MIN: 40°C</span>
        <span>MAX: 100°C</span>
      </div>
    </div>
  </div>

  <!-- Network & Info Row -->
  <div class="info-row">
    <div class="info-box">
      <div class="info-title">NETWORK I/O</div>
      <div class="network-stats">
        <div class="net-stat">
          <span class="net-label">▼ IN:</span>
          <span class="net-value">{formatBytes(network.in)}/s</span>
        </div>
        <div class="net-stat">
          <span class="net-label">▲ OUT:</span>
          <span class="net-value">{formatBytes(network.out)}/s</span>
        </div>
      </div>
    </div>

    <div class="info-box">
      <div class="info-title">SYSTEM UPTIME</div>
      <div class="uptime-display">{uptime}</div>
    </div>

    <div class="info-box">
      <div class="info-title">STATUS</div>
      <div class="status-display">
        <span class="status-dot" class:active={!error}></span>
        {error ? 'MONITORING ERROR' : 'ALL SYSTEMS NOMINAL'}
      </div>
    </div>
  </div>

  <!-- Process List -->
  <div class="process-section">
    <div class="process-grid">
      <div class="process-header">
        <span>PID</span>
        <span>NAME</span>
        <span>CPU</span>
        <span>MEM</span>
        <span>STATUS</span>
      </div>
      {#each processes as proc}
        <div class="process-row">
          <span class="pid">{proc.pid}</span>
          <span class="name">{proc.name.slice(0, 16)}</span>
          <span class="cpu" class:warning={proc.cpu_usage > 50}>{proc.cpu_usage.toFixed(1)}%</span>
          <span class="mem">{proc.memory_mb >= 1024 ? (proc.memory_mb / 1024).toFixed(1) + 'GB' : proc.memory_mb.toFixed(0) + 'MB'}</span>
          <span class="status" class:active={proc.status.includes('Run')}>{formatProcessStatus(proc.status)}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Footer -->
  <div class="monitor-footer">
    <span>WOPR SYSTEM MONITOR v2.0</span>
    <span>REFRESH: 2000ms</span>
    <span>NODE: PRIMARY</span>
  </div>
</div>

<style>
  .monitor-mode {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0.5rem;
    gap: 0.5rem;
    font-family: var(--font-mono);
    overflow: hidden;
  }

  .error-box {
    background: rgba(255, 0, 0, 0.1);
    border: 1px solid #ff4444;
    padding: 0.5rem;
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

  .monitor-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
  }

  @media (max-width: 900px) {
    .monitor-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 700px) {
    .monitor-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .stat-box {
    border: 1px solid var(--border-color);
    padding: 0.5rem;
    background: rgba(0, 20, 0, 0.3);
  }

  .stat-title {
    font-size: 0.6rem;
    color: var(--text-dim);
    text-align: center;
    margin-bottom: 0.3rem;
    letter-spacing: 0.1em;
  }

  .stat-value {
    font-size: 1.8rem;
    font-weight: bold;
    text-align: center;
    color: var(--text-primary);
    text-shadow: 0 0 15px var(--text-primary);
  }

  .stat-value.dim {
    color: var(--text-dim);
    text-shadow: none;
  }

  .stat-value.warning {
    color: #ffa500;
    text-shadow: 0 0 15px #ffa500;
  }

  .stat-value.danger {
    color: #ff4444;
    text-shadow: 0 0 15px #ff4444;
    animation: pulse 1s ease-in-out infinite;
  }

  .stat-bar {
    font-size: 0.5rem;
    text-align: center;
    color: var(--text-primary);
    letter-spacing: -0.05em;
    margin: 0.3rem 0;
    text-shadow: 0 0 5px var(--text-primary);
  }

  .stat-bar.dim {
    color: var(--text-dim);
    text-shadow: none;
  }

  .stat-bar.warning {
    color: #ffa500;
    text-shadow: 0 0 5px #ffa500;
  }

  .stat-bar.danger {
    color: #ff4444;
    text-shadow: 0 0 5px #ff4444;
  }

  .stat-details {
    display: flex;
    justify-content: space-between;
    font-size: 0.55rem;
    color: var(--text-dim);
  }

  .info-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .info-box {
    border: 1px solid var(--border-color);
    padding: 0.4rem;
    background: rgba(0, 20, 0, 0.3);
    text-align: center;
  }

  .info-title {
    font-size: 0.55rem;
    color: var(--text-dim);
    margin-bottom: 0.3rem;
    letter-spacing: 0.1em;
  }

  .network-stats {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .net-stat {
    display: flex;
    gap: 0.4rem;
    font-size: 0.65rem;
  }

  .net-label {
    color: var(--text-dim);
  }

  .net-value {
    color: var(--text-primary);
  }

  .uptime-display {
    font-size: 1.1rem;
    font-weight: bold;
    color: var(--text-primary);
    text-shadow: 0 0 10px var(--text-primary);
    font-family: 'Courier New', monospace;
    letter-spacing: 0.15em;
  }

  .status-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.65rem;
    color: var(--text-primary);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff4444;
  }

  .status-dot.active {
    background: var(--text-primary);
    box-shadow: 0 0 10px var(--text-primary);
    animation: blink 2s ease-in-out infinite;
  }

  .process-section {
    flex: 1;
    border: 1px solid var(--border-color);
    padding: 0.4rem 0.5rem;
    background: rgba(0, 20, 0, 0.3);
    overflow-y: auto;
    min-height: 0;
  }

  .process-grid {
    font-size: 0.65rem;
  }

  .process-header {
    display: grid;
    grid-template-columns: 55px 1fr 55px 60px 60px;
    gap: 0.4rem;
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-dim);
    font-size: 0.55rem;
    letter-spacing: 0.05em;
  }

  .process-row {
    display: grid;
    grid-template-columns: 55px 1fr 55px 60px 60px;
    gap: 0.4rem;
    padding: 0.3rem 0;
    border-bottom: 1px dashed var(--border-color);
    color: var(--text-primary);
  }

  .process-row:last-child {
    border-bottom: none;
  }

  .process-row .pid {
    color: var(--text-dim);
  }

  .process-row .name {
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .process-row .cpu {
    text-align: right;
  }

  .process-row .cpu.warning {
    color: #ffa500;
  }

  .process-row .mem {
    text-align: right;
    color: var(--text-dim);
  }

  .process-row .status {
    text-align: center;
    font-size: 0.55rem;
    color: var(--text-dim);
  }

  .process-row .status.active {
    color: var(--text-primary);
  }

  .monitor-footer {
    display: flex;
    justify-content: space-between;
    font-size: 0.55rem;
    color: var(--text-dim);
    padding-top: 0.4rem;
    border-top: 1px solid var(--border-color);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
