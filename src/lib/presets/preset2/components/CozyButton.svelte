<script>
  /** @type {{ icon?: string, label?: string, active?: boolean, disabled?: boolean, variant?: 'default' | 'glass' | 'soft', onclick?: () => void }} */
  let { icon = '', label = '', active = false, disabled = false, variant = 'default', onclick = () => {} } = $props();
</script>

<button
  class="cozy-button {variant}"
  class:active
  {disabled}
  onclick={onclick}
>
  <div class="btn-glow"></div>
  <div class="btn-content">
    {#if icon}
      <span class="btn-icon">{icon}</span>
    {/if}
    {#if label}
      <span class="btn-label">{label}</span>
    {/if}
  </div>
  {#if active}
    <div class="active-indicator"></div>
  {/if}
</button>

<style>
  .cozy-button {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0.85rem 1.1rem;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 16px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.9rem;
    color: var(--cozy-text, #5c4a3d);
    box-shadow:
      0 4px 16px rgba(139, 115, 85, 0.08),
      0 1px 3px rgba(139, 115, 85, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    width: 100%;
    overflow: hidden;
  }

  .btn-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .btn-content {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    position: relative;
    z-index: 1;
  }

  .cozy-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.85);
    transform: translateY(-2px);
    box-shadow:
      0 8px 24px rgba(139, 115, 85, 0.12),
      0 2px 6px rgba(139, 115, 85, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
    border-color: rgba(255, 255, 255, 0.7);
  }

  .cozy-button:hover:not(:disabled) .btn-glow {
    opacity: 1;
  }

  .cozy-button:active:not(:disabled) {
    transform: translateY(0);
    box-shadow:
      0 2px 8px rgba(139, 115, 85, 0.1),
      inset 0 1px 2px rgba(139, 115, 85, 0.1);
  }

  /* Active state */
  .cozy-button.active {
    background: linear-gradient(
      135deg,
      rgba(255, 200, 150, 0.8) 0%,
      rgba(255, 218, 185, 0.9) 50%,
      rgba(255, 182, 193, 0.7) 100%
    );
    border-color: rgba(255, 180, 140, 0.5);
    box-shadow:
      0 4px 20px rgba(244, 164, 96, 0.25),
      0 2px 8px rgba(244, 164, 96, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
  }

  .active-indicator {
    position: absolute;
    right: 12px;
    width: 8px;
    height: 8px;
    background: linear-gradient(135deg, #ff9966, #ff6b6b);
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(255, 107, 107, 0.5);
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 12px rgba(255, 107, 107, 0.5);
    }
    50% {
      transform: scale(1.2);
      box-shadow: 0 0 20px rgba(255, 107, 107, 0.7);
    }
  }

  /* Glass variant */
  .cozy-button.glass {
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .cozy-button.glass:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.6);
  }

  /* Soft variant */
  .cozy-button.soft {
    background: linear-gradient(
      135deg,
      rgba(230, 230, 250, 0.6) 0%,
      rgba(255, 240, 245, 0.6) 100%
    );
    border: 1px solid rgba(230, 200, 230, 0.3);
  }

  .cozy-button.soft:hover:not(:disabled) {
    background: linear-gradient(
      135deg,
      rgba(230, 230, 250, 0.8) 0%,
      rgba(255, 240, 245, 0.8) 100%
    );
  }

  .cozy-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  }

  .btn-label {
    font-weight: 600;
    letter-spacing: 0.01em;
  }
</style>
