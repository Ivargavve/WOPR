<script>
  /**
   * RetroSelect - Dropdown select with terminal styling
   *
   * @prop {string} value - Selected value
   * @prop {Array<{value: string, label: string}>} options - Select options
   * @prop {string} label - Optional label
   * @prop {boolean} disabled - Whether select is disabled
   * @prop {(value: string) => void} onchange - Change handler
   */
  let {
    value = $bindable(''),
    options = [],
    label = '',
    disabled = false,
    onchange = () => {}
  } = $props();

  let isOpen = $state(false);

  const selectedOption = $derived(options.find(o => o.value === value));

  /** @param {string} optionValue */
  function handleSelect(optionValue) {
    value = optionValue;
    isOpen = false;
    onchange(optionValue);
  }

  /** @param {KeyboardEvent} e */
  function handleKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      isOpen = !isOpen;
    } else if (e.key === 'Escape') {
      isOpen = false;
    }
  }
</script>

<div class="retro-select-wrapper">
  {#if label}
    <span class="select-label">{label}</span>
  {/if}
  <div
    class="retro-select"
    class:open={isOpen}
    class:disabled
    role="listbox"
    aria-expanded={isOpen}
    tabindex={disabled ? -1 : 0}
    onclick={() => !disabled && (isOpen = !isOpen)}
    onkeydown={handleKeydown}
    onblur={() => setTimeout(() => isOpen = false, 150)}
  >
    <span class="select-value">
      {selectedOption?.label || 'Select...'}
    </span>
    <span class="select-arrow">{isOpen ? '▲' : '▼'}</span>

    {#if isOpen}
      <div class="select-dropdown">
        {#each options as option}
          <button
            class="select-option"
            class:selected={option.value === value}
            onclick={(e) => { e.stopPropagation(); handleSelect(option.value); }}
          >
            <span class="option-marker">{option.value === value ? '►' : ' '}</span>
            {option.label}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .retro-select-wrapper {
    width: 100%;
  }

  .select-label {
    display: block;
    color: var(--text-dim);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .retro-select {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    padding: 0.75rem;
    cursor: pointer;
    transition: border-color 0.2s ease;
    min-height: 44px;
  }

  .retro-select:hover:not(.disabled) {
    border-color: var(--text-primary);
  }

  .retro-select.open {
    border-color: var(--text-primary);
    box-shadow: var(--glow-green);
  }

  .retro-select.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .select-value {
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .select-arrow {
    color: var(--text-dim);
    font-size: 0.6rem;
    margin-left: 0.5rem;
  }

  .select-dropdown {
    position: absolute;
    top: 100%;
    left: -1px;
    right: -1px;
    background: var(--bg-primary);
    border: 1px solid var(--text-primary);
    border-top: none;
    z-index: 100;
    max-height: 200px;
    overflow-y: auto;
  }

  .select-option {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.75rem;
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.1s ease;
  }

  .select-option:hover {
    background: var(--bg-panel);
    color: var(--text-primary);
  }

  .select-option.selected {
    color: var(--text-primary);
  }

  .option-marker {
    margin-right: 0.5rem;
    color: var(--text-primary);
  }
</style>
