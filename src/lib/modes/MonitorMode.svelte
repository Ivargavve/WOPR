<script>
  import { onMount } from 'svelte';
  import { RetroPanel, RetroProgress } from '$lib/components';

  let cpu = $state(0);
  let ram = $state(0);
  let disk = $state(0);

  onMount(() => {
    // Simulate system stats (will be replaced with actual Rust calls)
    const interval = setInterval(() => {
      cpu = Math.floor(Math.random() * 60) + 10;
      ram = Math.floor(Math.random() * 40) + 30;
      disk = 45; // Static for now
    }, 2000);

    return () => clearInterval(interval);
  });
</script>

<div class="monitor-mode">
  <RetroPanel title="SYSTEM STATUS">
    <div class="stats">
      <div class="stat-item">
        <RetroProgress
          value={cpu}
          label="CPU"
          style="blocks"
          variant={cpu > 80 ? 'danger' : cpu > 60 ? 'warning' : 'default'}
        />
      </div>

      <div class="stat-item">
        <RetroProgress
          value={ram}
          label="MEMORY"
          style="blocks"
          variant={ram > 80 ? 'danger' : ram > 60 ? 'warning' : 'default'}
        />
      </div>

      <div class="stat-item">
        <RetroProgress
          value={disk}
          label="DISK"
          style="blocks"
        />
      </div>
    </div>
  </RetroPanel>

  <RetroPanel title="PROCESSES">
    <div class="process-list">
      <div class="process-header">
        <span>NAME</span>
        <span>CPU</span>
        <span>MEM</span>
      </div>
      <div class="process-row">
        <span>WOPR</span>
        <span class="dim">2%</span>
        <span class="dim">45MB</span>
      </div>
      <div class="process-row">
        <span>System</span>
        <span class="dim">8%</span>
        <span class="dim">1.2GB</span>
      </div>
      <div class="process-row">
        <span>WindowServer</span>
        <span class="dim">4%</span>
        <span class="dim">320MB</span>
      </div>
    </div>
  </RetroPanel>
</div>

<style>
  .monitor-mode {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
  }

  .stats {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .stat-item {
    padding: 0.5rem 0;
  }

  .process-list {
    font-size: 0.75rem;
  }

  .process-header {
    display: grid;
    grid-template-columns: 1fr 50px 60px;
    gap: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-dim);
    margin-bottom: 0.5rem;
  }

  .process-row {
    display: grid;
    grid-template-columns: 1fr 50px 60px;
    gap: 0.5rem;
    padding: 0.25rem 0;
    color: var(--text-primary);
  }

  .dim {
    color: var(--text-dim);
  }
</style>
