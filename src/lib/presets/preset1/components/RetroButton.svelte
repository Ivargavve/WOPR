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
  class:icon-only={icon && !label}
  class:primary={variant === 'primary'}
  class:warning={variant === 'warning'}
  class:danger={variant === 'danger'}
  {disabled}
  onclick={handleClick}
>
  <span class="btn-bracket">[</span>
  {#if icon}
    <span class="btn-icon">{icon}</span>
  {/if}
  {#if label}
    <span class="btn-label">{label}</span>
  {/if}
  <span class="btn-bracket">]</span>
</button>

<style>
  .retro-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    padding: 0.6rem 0.5rem;
    min-height: 44px; /* Touch friendly */
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s ease;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    position: relative;
  }

  .retro-btn:hover:not(:disabled) {
    color: var(--text-primary);
    text-shadow: 0 0 8px var(--text-primary);
  }

  .retro-btn:hover:not(:disabled) .btn-bracket {
    color: var(--text-primary);
    text-shadow: 0 0 10px var(--text-primary);
  }

  .retro-btn:active:not(:disabled) {
    transform: scale(0.98);
  }

  .retro-btn.active {
    color: var(--text-primary);
    text-shadow: 0 0 10px var(--text-primary), 0 0 20px var(--text-primary-30);
  }

  .retro-btn.active .btn-bracket {
    color: var(--text-primary);
    text-shadow: 0 0 10px var(--text-primary);
  }

  .retro-btn.active .btn-icon {
    animation: icon-pulse 1.5s ease-in-out infinite;
  }

  .retro-btn.primary {
    color: var(--text-primary);
  }

  .retro-btn.primary:hover:not(:disabled) {
    text-shadow: 0 0 15px var(--text-primary), 0 0 30px var(--text-primary-40);
  }

  .retro-btn.warning {
    color: var(--accent-warning);
  }

  .retro-btn.warning .btn-bracket {
    color: var(--accent-warning);
  }

  .retro-btn.warning:hover:not(:disabled) {
    text-shadow: 0 0 15px var(--accent-warning);
  }

  .retro-btn.danger {
    color: var(--accent-error);
  }

  .retro-btn.danger .btn-bracket {
    color: var(--accent-error);
  }

  .retro-btn.danger:hover:not(:disabled) {
    text-shadow: 0 0 15px var(--accent-error);
  }

  .retro-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .btn-bracket {
    color: var(--border-color);
    font-size: 0.9rem;
    font-weight: 300;
    transition: all 0.15s ease;
  }

  .btn-icon {
    font-size: 0.85rem;
  }

  .btn-label {
    font-size: 0.6rem;
    font-weight: 500;
    letter-spacing: 0.1em;
  }

  /* Icon-only buttons (like the @ scan button) */
  .retro-btn.icon-only {
    padding: 0.6rem 0.4rem;
  }

  .retro-btn.icon-only .btn-icon {
    font-size: 0.9rem;
  }

  @keyframes icon-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
</style>
