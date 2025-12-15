<script>
  import { MODES, getCurrentMode, setMode } from '$lib/stores/mode.svelte.js';

  let isOpen = $state(false);
  const currentMode = $derived(getCurrentMode());
  const currentModeInfo = $derived(MODES.find(m => m.id === currentMode));

  /** @param {string} modeId */
  function selectMode(modeId) {
    // @ts-ignore - modeId is a valid ModeType
    setMode(modeId);
    isOpen = false;
  }

  /** @param {KeyboardEvent} e */
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      isOpen = false;
    }
  }
</script>

<div class="mode-selector" class:open={isOpen}>
  <button
    class="current-mode"
    onclick={() => isOpen = !isOpen}
    onkeydown={handleKeydown}
  >
    <span class="mode-icon">{currentModeInfo?.icon}</span>
    <span class="mode-name">{currentModeInfo?.name}</span>
    <span class="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
  </button>

  {#if isOpen}
    <div class="mode-dropdown">
      {#each MODES as mode}
        <button
          class="mode-option"
          class:active={mode.id === currentMode}
          onclick={() => selectMode(mode.id)}
        >
          <span class="option-icon">{mode.icon}</span>
          <div class="option-info">
            <span class="option-name">{mode.name}</span>
            <span class="option-desc">{mode.description}</span>
          </div>
          {#if mode.id === currentMode}
            <span class="active-indicator">●</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .mode-selector {
    position: relative;
    width: 100%;
  }

  .current-mode {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    padding: 0.5rem 0.5rem;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 40px;
  }

  .current-mode:hover {
    border-color: var(--text-primary);
  }

  .mode-selector.open .current-mode {
    border-color: var(--text-primary);
    box-shadow: var(--glow-green);
  }

  .mode-icon {
    font-size: 0.9rem;
  }

  .mode-name {
    flex: 1;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dropdown-arrow {
    font-size: 0.5rem;
    color: var(--text-dim);
  }

  .mode-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-primary);
    border: 1px solid var(--text-primary);
    border-top: none;
    z-index: 100;
    max-height: 250px;
    overflow-y: auto;
  }

  .mode-option {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    padding: 0.5rem;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-dim);
    font-family: var(--font-mono);
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
    min-height: 40px;
  }

  .mode-option:last-child {
    border-bottom: none;
  }

  .mode-option:hover {
    background: var(--bg-panel);
    color: var(--text-primary);
  }

  .mode-option.active {
    color: var(--text-primary);
    background: var(--bg-panel);
  }

  .option-icon {
    font-size: 0.85rem;
    width: 1.4rem;
    text-align: center;
  }

  .option-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
  }

  .option-name {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .option-desc {
    font-size: 0.5rem;
    color: var(--text-dim);
    opacity: 0.8;
  }

  .active-indicator {
    color: var(--text-primary);
    text-shadow: 0 0 8px var(--text-primary);
    font-size: 0.6rem;
  }
</style>
