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
        <div class="popup-content">
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
            ✕
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
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(8px);
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
    max-width: 340px;
    width: 90%;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .popup-card {
    width: 100%;
    background: rgba(60, 50, 45, 0.85);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .popup-content {
    padding: 1.25rem 1.5rem;
    max-height: 40vh;
    overflow-y: auto;
  }

  .popup-answer {
    font-family: 'Quicksand', sans-serif;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .popup-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .popup-countdown {
    font-family: 'Quicksand', sans-serif;
    font-size: 0.8rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .popup-countdown::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--cozy-accent, #e8a87c);
    animation: pulse 1.2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .popup-dismiss {
    font-family: 'Quicksand', sans-serif;
    font-size: 1.1rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.6);
    background: transparent;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .popup-dismiss:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.1);
  }
</style>
