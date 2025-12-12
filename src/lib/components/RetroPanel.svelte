<script>
  /**
   * RetroPanel - A styled container with terminal aesthetics
   *
   * @prop {string} title - Optional panel title
   * @prop {'single' | 'double' | 'none'} border - Border style
   * @prop {boolean} glow - Whether to apply glow effect
   */
  let {
    title = '',
    border = 'single',
    glow = false,
    children
  } = $props();
</script>

<div
  class="retro-panel"
  class:border-single={border === 'single'}
  class:border-double={border === 'double'}
  class:border-none={border === 'none'}
  class:glow
>
  {#if title}
    <div class="panel-header">
      <span class="header-decoration">═══</span>
      <span class="header-title">{title}</span>
      <span class="header-decoration">═══</span>
    </div>
  {/if}
  <div class="panel-content">
    {@render children()}
  </div>
</div>

<style>
  .retro-panel {
    background: var(--bg-panel);
    padding: 0.4rem;
    position: relative;
  }

  .border-single {
    border: 1px solid var(--border-color);
  }

  .border-double {
    border: 3px double var(--border-color);
  }

  .border-none {
    border: none;
  }

  .glow {
    box-shadow: var(--glow-green);
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin-bottom: 0.3rem;
    font-size: 0.65rem;
  }

  .header-decoration {
    color: var(--text-dim);
    flex-shrink: 0;
  }

  .header-title {
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;
  }

  .panel-content {
    color: var(--text-primary);
  }
</style>
