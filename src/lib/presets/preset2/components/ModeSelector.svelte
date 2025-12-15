<script>
  import { MODES, getCurrentMode, setMode } from '$lib/stores/mode.svelte.js';

  let isOpen = $state(false);
  const currentMode = $derived(getCurrentMode());
  const currentModeInfo = $derived(MODES.find(m => m.id === currentMode));

  // Friendly mode names with icons
  const friendlyNames = {
    assistant: { name: 'Chat', icon: '💬', desc: 'Talk with WOPR' },
    monitor: { name: 'Health', icon: '💚', desc: 'System status' },
    pomodoro: { name: 'Focus', icon: '🎯', desc: 'Stay productive' },
    screentime: { name: 'Activity', icon: '📊', desc: 'Track time' }
  };

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

  /** @param {string} modeId */
  function getFriendlyInfo(modeId) {
    return friendlyNames[modeId] || { name: modeId, icon: '📱', desc: '' };
  }
</script>

<div class="mode-selector" class:open={isOpen}>
  <button
    class="current-mode"
    onclick={() => isOpen = !isOpen}
    onkeydown={handleKeydown}
  >
    <span class="mode-icon">{getFriendlyInfo(currentMode).icon}</span>
    <span class="mode-name">{getFriendlyInfo(currentMode).name}</span>
    <span class="dropdown-arrow" class:rotated={isOpen}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
  </button>

  {#if isOpen}
    <div class="mode-dropdown">
      {#each MODES as mode}
        {@const info = getFriendlyInfo(mode.id)}
        <button
          class="mode-option"
          class:active={mode.id === currentMode}
          onclick={() => selectMode(mode.id)}
        >
          <span class="option-icon">{info.icon}</span>
          <div class="option-info">
            <span class="option-name">{info.name}</span>
            <span class="option-desc">{info.desc}</span>
          </div>
          {#if mode.id === currentMode}
            <span class="check-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7L6 10L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
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
    gap: 0.6rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: linear-gradient(
      135deg,
      rgba(212, 208, 232, 0.7) 0%,
      rgba(240, 184, 192, 0.6) 100%
    );
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 14px;
    color: var(--cozy-text, #4a4039);
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow:
      0 4px 16px rgba(100, 80, 60, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  .current-mode:hover {
    transform: translateY(-2px);
    box-shadow:
      0 6px 20px rgba(100, 80, 60, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
    background: linear-gradient(
      135deg,
      rgba(212, 208, 232, 0.85) 0%,
      rgba(240, 184, 192, 0.75) 100%
    );
  }

  .mode-selector.open .current-mode {
    border-radius: 14px 14px 0 0;
    border-bottom-color: transparent;
  }

  .mode-icon {
    font-size: 1.1rem;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  }

  .mode-name {
    flex: 1;
    text-align: left;
  }

  .dropdown-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--cozy-text-light, #8b7d6b);
    transition: transform 0.3s ease;
  }

  .dropdown-arrow.rotated {
    transform: rotate(180deg);
  }

  .mode-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-top: none;
    border-radius: 0 0 14px 14px;
    z-index: 100;
    max-height: 280px;
    overflow-y: auto;
    box-shadow:
      0 8px 32px rgba(100, 80, 60, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  .mode-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(200, 180, 160, 0.15);
    color: var(--cozy-text-light, #8b7d6b);
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s ease;
  }

  .mode-option:last-child {
    border-bottom: none;
    border-radius: 0 0 14px 14px;
  }

  .mode-option:hover {
    background: linear-gradient(
      135deg,
      rgba(212, 208, 232, 0.3) 0%,
      rgba(240, 184, 192, 0.2) 100%
    );
    color: var(--cozy-text, #4a4039);
  }

  .mode-option.active {
    color: var(--cozy-text, #4a4039);
    background: linear-gradient(
      135deg,
      rgba(232, 168, 124, 0.25) 0%,
      rgba(245, 212, 188, 0.3) 100%
    );
  }

  .option-icon {
    font-size: 1.15rem;
    width: 1.8rem;
    height: 1.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 10px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.08));
  }

  .option-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .option-name {
    font-size: 0.85rem;
    font-weight: 600;
  }

  .option-desc {
    font-size: 0.7rem;
    opacity: 0.65;
  }

  .check-icon {
    color: var(--cozy-accent, #e8a87c);
    display: flex;
    align-items: center;
  }
</style>
