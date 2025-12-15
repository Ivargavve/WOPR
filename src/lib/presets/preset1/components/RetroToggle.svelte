<script>
  /**
   * RetroToggle - On/off toggle switch with terminal styling
   *
   * @prop {string} label - Toggle label
   * @prop {boolean} checked - Whether toggle is on
   * @prop {boolean} disabled - Whether toggle is disabled
   * @prop {(checked: boolean) => void} onchange - Change handler
   */
  let {
    label = '',
    checked = $bindable(false),
    disabled = false,
    onchange = () => {}
  } = $props();

  function handleClick() {
    if (disabled) return;
    checked = !checked;
    onchange(checked);
  }
</script>

<button
  class="retro-toggle"
  class:active={checked}
  class:disabled
  onclick={handleClick}
  role="switch"
  aria-checked={checked}
  aria-label={label}
>
  <span class="toggle-track">
    <span class="toggle-indicator">{checked ? 'ON' : 'OFF'}</span>
    <span class="toggle-knob"></span>
  </span>
  {#if label}
    <span class="toggle-label">{label}</span>
  {/if}
</button>

<style>
  .retro-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: var(--font-mono);
  }

  .retro-toggle.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .toggle-track {
    position: relative;
    width: 60px;
    height: 28px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    padding: 0 4px;
    transition: all 0.2s ease;
  }

  .retro-toggle.active .toggle-track {
    border-color: var(--text-primary);
    box-shadow: var(--glow-green);
  }

  .toggle-indicator {
    font-size: 0.6rem;
    color: var(--text-dim);
    position: absolute;
    transition: all 0.2s ease;
  }

  .retro-toggle:not(.active) .toggle-indicator {
    right: 8px;
  }

  .retro-toggle.active .toggle-indicator {
    left: 8px;
    color: var(--text-primary);
  }

  .toggle-knob {
    width: 18px;
    height: 18px;
    background: var(--text-dim);
    transition: all 0.2s ease;
    position: absolute;
    left: 4px;
  }

  .retro-toggle.active .toggle-knob {
    left: calc(100% - 22px);
    background: var(--text-primary);
    box-shadow: 0 0 8px var(--text-primary);
  }

  .toggle-label {
    color: var(--text-dim);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: color 0.2s ease;
  }

  .retro-toggle.active .toggle-label {
    color: var(--text-primary);
  }
</style>
