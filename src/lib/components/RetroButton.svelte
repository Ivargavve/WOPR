<script>
  /**
   * RetroButton - Touch friendly button with terminal styling
   *
   * @prop {string} icon - Optional icon character
   * @prop {string} label - Button label text
   * @prop {boolean} active - Whether button is in active state
   * @prop {boolean} disabled - Whether button is disabled
   * @prop {'default' | 'primary' | 'warning' | 'danger'} variant - Button style variant
   * @prop {(e: MouseEvent) => void} onclick - Click handler
   */
  /** @type {{icon?: string, label?: string, active?: boolean, disabled?: boolean, variant?: 'default' | 'primary' | 'warning' | 'danger', onclick?: (e: MouseEvent) => void}} */
  let {
    icon = '',
    label = '',
    active = false,
    disabled = false,
    variant = 'default',
    onclick = undefined
  } = $props();

  /** @param {MouseEvent} e */
  function handleClick(e) {
    if (onclick) onclick(e);
  }
</script>

<button
  class="retro-btn"
  class:active
  class:primary={variant === 'primary'}
  class:warning={variant === 'warning'}
  class:danger={variant === 'danger'}
  {disabled}
  onclick={handleClick}
>
  {#if icon}
    <span class="btn-icon">{icon}</span>
  {/if}
  {#if label}
    <span class="btn-label">{label}</span>
  {/if}
</button>

<style>
  .retro-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    min-height: 44px; /* Touch friendly */
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s ease;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .retro-btn:hover:not(:disabled) {
    border-color: var(--text-primary);
    color: var(--text-primary);
  }

  .retro-btn:active:not(:disabled) {
    transform: scale(0.98);
  }

  .retro-btn.active {
    border-color: var(--text-primary);
    color: var(--text-primary);
    box-shadow: var(--glow-green);
  }

  .retro-btn.primary {
    border-color: var(--text-primary);
    color: var(--text-primary);
  }

  .retro-btn.primary:hover:not(:disabled) {
    background: var(--text-primary);
    color: var(--bg-primary);
  }

  .retro-btn.warning {
    border-color: var(--accent-warning);
    color: var(--accent-warning);
  }

  .retro-btn.warning:hover:not(:disabled) {
    background: var(--accent-warning);
    color: var(--bg-primary);
  }

  .retro-btn.danger {
    border-color: var(--accent-error);
    color: var(--accent-error);
  }

  .retro-btn.danger:hover:not(:disabled) {
    background: var(--accent-error);
    color: var(--bg-primary);
  }

  .retro-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-icon {
    font-size: 1rem;
  }

  .btn-label {
    font-size: 0.65rem;
    font-weight: 500;
  }
</style>
