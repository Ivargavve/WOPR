<script>
  import { onMount } from 'svelte';

  let cpu = $state(0);
  let ram = $state(0);
  let disk = $state(0);
  let network = $state({ in: 0, out: 0 });
  let uptime = $state('00:00:00');
  let temperature = $state(45);
  let processes = $state([
    { name: 'WOPR', cpu: 2, mem: '45MB', status: 'ACTIVE' },
    { name: 'System', cpu: 8, mem: '1.2GB', status: 'ACTIVE' },
    { name: 'WindowServer', cpu: 4, mem: '320MB', status: 'ACTIVE' },
    { name: 'kernel_task', cpu: 3, mem: '180MB', status: 'ACTIVE' },
    { name: 'launchd', cpu: 1, mem: '12MB', status: 'IDLE' },
  ]);

  const startTime = Date.now();

  function generateBar(value, width = 25) {
    const filled = Math.round((value / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  onMount(() => {
    const interval = setInterval(() => {
      // Simulate fluctuating values
      cpu = Math.min(100, Math.max(5, cpu + (Math.random() - 0.5) * 20));
      ram = Math.min(95, Math.max(30, ram + (Math.random() - 0.5) * 10));
      disk = 45 + Math.random() * 2;
      temperature = 42 + Math.random() * 15;
      network = {
        in: Math.floor(Math.random() * 500) + 50,
        out: Math.floor(Math.random() * 200) + 20
      };

      // Update uptime
      const elapsed = Date.now() - startTime;
      const hrs = Math.floor(elapsed / 3600000);
      const mins = Math.floor((elapsed % 3600000) / 60000);
      const secs = Math.floor((elapsed % 60000) / 1000);
      uptime = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      // Randomize process stats slightly
      processes = processes.map(p => ({
        ...p,
        cpu: Math.max(0, Math.min(100, p.cpu + Math.floor((Math.random() - 0.5) * 4)))
      }));
    }, 1000);

    // Initial values
    cpu = 25;
    ram = 69;

    return () => clearInterval(interval);
  });

  function getVariant(value) {
    if (value > 80) return 'danger';
    if (value > 60) return 'warning';
    return 'normal';
  }
</script>

<div class="monitor-mode">
  <!-- Main Grid -->
  <div class="monitor-grid">
    <!-- CPU Section -->
    <div class="stat-box">
      <div class="stat-title">CPU USAGE</div>
      <div class="stat-value {getVariant(cpu)}">{Math.round(cpu)}%</div>
      <div class="stat-bar {getVariant(cpu)}">{generateBar(cpu)}</div>
      <div class="stat-details">
        <span>CORES: 8</span>
        <span>THREADS: 16</span>
      </div>
    </div>

    <!-- Memory Section -->
    <div class="stat-box">
      <div class="stat-title">MEMORY</div>
      <div class="stat-value {getVariant(ram)}">{Math.round(ram)}%</div>
      <div class="stat-bar {getVariant(ram)}">{generateBar(ram)}</div>
      <div class="stat-details">
        <span>USED: {(ram * 0.16).toFixed(1)}GB</span>
        <span>TOTAL: 16GB</span>
      </div>
    </div>

    <!-- Disk Section -->
    <div class="stat-box">
      <div class="stat-title">DISK I/O</div>
      <div class="stat-value">{Math.round(disk)}%</div>
      <div class="stat-bar">{generateBar(disk)}</div>
      <div class="stat-details">
        <span>READ: 125MB/s</span>
        <span>WRITE: 45MB/s</span>
      </div>
    </div>

    <!-- Temperature -->
    <div class="stat-box">
      <div class="stat-title">TEMPERATURE</div>
      <div class="stat-value {temperature > 70 ? 'danger' : temperature > 55 ? 'warning' : 'normal'}">{Math.round(temperature)}°C</div>
      <div class="stat-bar {temperature > 70 ? 'danger' : temperature > 55 ? 'warning' : 'normal'}">{generateBar(temperature)}</div>
      <div class="stat-details">
        <span>MIN: 38°C</span>
        <span>MAX: 85°C</span>
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
          <span class="net-value">{network.in} KB/s</span>
        </div>
        <div class="net-stat">
          <span class="net-label">▲ OUT:</span>
          <span class="net-value">{network.out} KB/s</span>
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
        <span class="status-dot active"></span>
        ALL SYSTEMS NOMINAL
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
      {#each processes.slice(0, 4) as proc, i}
        <div class="process-row">
          <span class="pid">{1000 + i}</span>
          <span class="name">{proc.name}</span>
          <span class="cpu" class:warning={proc.cpu > 50}>{proc.cpu}%</span>
          <span class="mem">{proc.mem}</span>
          <span class="status" class:active={proc.status === 'ACTIVE'}>{proc.status}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Footer -->
  <div class="monitor-footer">
    <span>WOPR SYSTEM MONITOR v1.0</span>
    <span>REFRESH: 1000ms</span>
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

  .monitor-header {
    text-align: center;
  }

  .header-title {
    font-size: 0.75rem;
    color: var(--text-primary);
    text-shadow: 0 0 10px var(--text-primary);
    letter-spacing: 0.2em;
  }

  .monitor-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
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
    background: var(--text-dim);
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
    overflow: hidden;
  }

  .process-grid {
    font-size: 0.65rem;
  }

  .process-header {
    display: grid;
    grid-template-columns: 45px 1fr 55px 70px 70px;
    gap: 0.4rem;
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-dim);
    font-size: 0.55rem;
    letter-spacing: 0.05em;
  }

  .process-row {
    display: grid;
    grid-template-columns: 45px 1fr 55px 70px 70px;
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
