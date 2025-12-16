<script>
  /**
   * AIPopup - Retro styled popup for AI responses when not on assistant tab
   *
   * @prop {boolean} show - Whether to show the popup
   * @prop {string} message - The AI response message
   * @prop {string} question - The original question (optional)
   * @prop {number} autoDismissSeconds - Auto dismiss countdown (0 = no auto dismiss)
   * @prop {() => void} onclose - Close handler
   */
  import { onMount } from 'svelte';

  /** @type {{show?: boolean, message?: string, question?: string, autoDismissSeconds?: number, onclose?: () => void}} */
  let {
    show = false,
    message = '',
    question = '',
    autoDismissSeconds = 10,
    onclose = () => {}
  } = $props();

  let countdown = $state(autoDismissSeconds);
  /** @type {ReturnType<typeof setInterval> | null} */
  let countdownInterval = $state(null);

  $effect(() => {
    if (show && autoDismissSeconds > 0) {
      countdown = autoDismissSeconds;
      countdownInterval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          if (countdownInterval) clearInterval(countdownInterval);
          onclose();
        }
      }, 1000);
    } else {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  });

  function handleDismiss() {
    if (countdownInterval) clearInterval(countdownInterval);
    onclose();
  }
</script>

{#if show}
  <div class="popup-overlay" onclick={handleDismiss}>
    <div class="popup-container" onclick={(e) => e.stopPropagation()}>
      <div class="popup-card">
        <div class="popup-header">
          <span class="popup-icon">💭</span>
          <span class="popup-title">Response</span>
        </div>
        <div class="popup-content">
          {#if question}
            <div class="popup-question">
              "{question}"
            </div>
          {/if}
          <div class="popup-answer">
            {message}
          </div>
        </div>
        <div class="popup-footer">
          {#if autoDismissSeconds > 0}
            <div class="popup-countdown">
              {countdown}s
            </div>
          {/if}
          <button class="popup-dismiss" onclick={handleDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(74, 64, 57, 0.4);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .popup-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 420px;
    width: 90%;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .popup-card {
    width: 100%;
    background: rgba(252, 248, 242, 0.75);
    backdrop-filter: blur(20px);
    border-radius: 24px;
    box-shadow:
      0 20px 60px rgba(74, 64, 57, 0.2),
      0 4px 16px rgba(74, 64, 57, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.5);
  }

  .popup-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.1rem 1.5rem;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.3) 100%);
    border-bottom: 1px solid rgba(200, 180, 160, 0.15);
  }

  .popup-icon {
    font-size: 1.4rem;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.08));
  }

  .popup-title {
    font-family: 'Quicksand', sans-serif;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--cozy-text, #4a4039);
    letter-spacing: 0.02em;
  }

  .popup-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 50vh;
    overflow-y: auto;
  }

  .popup-question {
    font-family: 'Quicksand', sans-serif;
    font-size: 0.9rem;
    color: var(--cozy-text-light, #8b7d6b);
    line-height: 1.5;
    font-style: italic;
    padding: 0.85rem 1.1rem;
    background: linear-gradient(135deg, rgba(212, 208, 232, 0.25) 0%, rgba(184, 160, 208, 0.15) 100%);
    border-radius: 14px;
    border-left: 3px solid rgba(184, 160, 208, 0.6);
  }

  .popup-answer {
    font-family: 'Quicksand', sans-serif;
    font-size: 1rem;
    color: var(--cozy-text, #4a4039);
    line-height: 1.75;
    white-space: pre-wrap;
  }

  .popup-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.45) 100%);
    border-top: 1px solid rgba(200, 180, 160, 0.15);
  }

  .popup-countdown {
    font-family: 'Quicksand', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--cozy-text-muted, #a89b8a);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .popup-countdown::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--cozy-accent, #e8a87c);
    animation: pulse 1.2s ease-in-out infinite;
    box-shadow: 0 0 8px rgba(232, 168, 124, 0.4);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.85); }
  }

  .popup-dismiss {
    font-family: 'Quicksand', sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    color: white;
    background: linear-gradient(135deg, #e8a87c 0%, #d89668 100%);
    border: none;
    border-radius: 12px;
    padding: 0.7rem 1.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow:
      0 4px 12px rgba(232, 168, 124, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    letter-spacing: 0.02em;
  }

  .popup-dismiss:hover {
    transform: translateY(-2px);
    box-shadow:
      0 6px 20px rgba(232, 168, 124, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .popup-dismiss:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(232, 168, 124, 0.3);
  }
</style>
