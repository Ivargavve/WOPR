<script>
  /**
   * RetroProgress - Progress bar with terminal styling
   *
   * @prop {number} value - Current progress (0-100)
   * @prop {number} max - Maximum value (default 100)
   * @prop {string} label - Optional label text
   * @prop {boolean} showValue - Whether to show percentage
   * @prop {'default' | 'cyan' | 'warning' | 'danger'} variant - Color variant
   * @prop {'bar' | 'blocks'} style - Visual style
   */
  let {
    value = 0,
    max = 100,
    label = '',
    showValue = true,
    variant = 'default',
    style = 'bar'
  } = $props();

  const percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
  const blockCount = 20;
  const filledBlocks = $derived(Math.round((percentage / 100) * blockCount));
</script>

<div class="retro-progress" class:cyan={variant === 'cyan'} class:warning={variant === 'warning'} class:danger={variant === 'danger'}>
  {#if label}
    <div class="progress-header">
      <span class="progress-label">{label}</span>
      {#if showValue}
        <span class="progress-value">{Math.round(percentage)}%</span>
      {/if}
    </div>
  {/if}

  {#if style === 'bar'}
    <div class="progress-track">
      <div class="progress-fill" style="width: {percentage}%"></div>
    </div>
  {:else}
    <div class="progress-blocks">
      {#each Array(blockCount) as _, i}
        <span class="block" class:filled={i < filledBlocks}>
          {i < filledBlocks ? '█' : '░'}
        </span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .retro-progress {
    width: 100%;
    --progress-color: var(--text-primary);
  }

  .retro-progress.cyan {
    --progress-color: var(--accent-cyan);
  }

  .retro-progress.warning {
    --progress-color: var(--accent-warning);
  }

  .retro-progress.danger {
    --progress-color: var(--accent-error);
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
  }

  .progress-label {
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .progress-value {
    color: var(--progress-color);
    font-weight: 500;
  }

  .progress-track {
    height: 8px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    position: relative;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--progress-color);
    box-shadow: 0 0 10px var(--progress-color);
    transition: width 0.3s ease;
  }

  .progress-blocks {
    font-size: 0.8rem;
    letter-spacing: -0.05em;
    line-height: 1;
  }

  .block {
    color: var(--text-dim);
    transition: color 0.1s ease;
  }

  .block.filled {
    color: var(--progress-color);
    text-shadow: 0 0 5px var(--progress-color);
  }
</style>
