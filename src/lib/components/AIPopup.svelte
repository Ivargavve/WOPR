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
      <div class="popup-border">
        <div class="popup-header">
          <span class="popup-title">JOSHUA RESPONSE</span>
        </div>
        <div class="popup-divider"></div>
        <div class="popup-content">
          {#if question}
            <div class="popup-question">
              <span class="label">Q:</span> "{question}"
            </div>
          {/if}
          <div class="popup-answer">
            <span class="label">A:</span> {message}
          </div>
        </div>
      </div>
      {#if autoDismissSeconds > 0}
        <div class="popup-countdown">
          [ Dismissing in {countdown}s... ]
        </div>
      {/if}
      <button class="popup-dismiss" onclick={handleDismiss}>
        [ DISMISS ]
      </button>
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
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .popup-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
    max-width: 90%;
    width: 100%;
  }

  .popup-border {
    width: 100%;
    border: 2px solid var(--text-primary);
    background: var(--bg-primary);
    box-shadow:
      0 0 20px rgba(0, 255, 65, 0.3),
      inset 0 0 20px rgba(0, 255, 65, 0.05);
  }

  .popup-header {
    padding: 0.6rem 1rem;
    border-bottom: 1px solid var(--text-primary);
    background: rgba(0, 255, 65, 0.1);
  }

  .popup-title {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    text-shadow: 0 0 10px var(--text-primary);
  }

  .popup-divider {
    height: 1px;
    background: var(--text-primary);
    opacity: 0.3;
  }

  .popup-content {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .popup-question {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--text-dim);
    line-height: 1.5;
  }

  .popup-answer {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--text-primary);
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .label {
    color: var(--text-primary);
    font-weight: bold;
    text-shadow: 0 0 8px var(--text-primary);
  }

  .popup-countdown {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-dim);
    text-align: center;
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .popup-dismiss {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-dim);
    background: transparent;
    border: 1px solid var(--border-color);
    padding: 0.5rem 1.5rem;
    cursor: pointer;
    transition: all 0.15s ease;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .popup-dismiss:hover {
    color: var(--text-primary);
    border-color: var(--text-primary);
    text-shadow: 0 0 10px var(--text-primary);
    box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
  }
</style>
