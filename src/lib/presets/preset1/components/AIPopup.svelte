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
        <div class="popup-content">
          <div class="popup-answer">
            {message}
          </div>
        </div>
      </div>
      <div class="popup-footer">
        {#if autoDismissSeconds > 0}
          <div class="popup-countdown">
            [{countdown}s]
          </div>
        {/if}
        <button class="popup-dismiss" onclick={handleDismiss}>
          [ X ]
        </button>
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
    background: rgba(0, 0, 0, 0.85);
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
    gap: 0.5rem;
    max-width: 400px;
    width: 90%;
  }

  .popup-border {
    width: 100%;
    border: 1px solid var(--text-primary);
    background: var(--bg-primary);
    box-shadow: 0 0 20px var(--text-primary-30);
  }

  .popup-content {
    padding: 1rem 1.25rem;
    max-height: 50vh;
    overflow-y: auto;
  }

  .popup-answer {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--text-primary);
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .popup-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 0.25rem;
  }

  .popup-countdown {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-dim);
  }

  .popup-dismiss {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-dim);
    background: transparent;
    border: none;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .popup-dismiss:hover {
    color: var(--text-primary);
    text-shadow: 0 0 10px var(--text-primary);
  }
</style>
