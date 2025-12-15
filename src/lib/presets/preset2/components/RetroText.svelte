<script>
  /**
   * RetroText - Styled text with optional typing animation
   *
   * @prop {'default' | 'dim' | 'bright' | 'cyan' | 'warning' | 'error'} color - Text color
   * @prop {boolean} glow - Whether to apply glow effect
   * @prop {boolean} typing - Whether to animate typing effect
   * @prop {number} typingSpeed - Milliseconds per character
   */
  import { onMount } from 'svelte';

  let {
    color = 'default',
    glow = false,
    typing = false,
    typingSpeed = 30,
    children
  } = $props();

  let displayText = $state('');
  let fullText = $state('');
  /** @type {HTMLSpanElement | null} */
  let containerRef = $state(null);

  onMount(() => {
    if (typing && containerRef) {
      // Get the text content from the slot
      fullText = containerRef.textContent || '';
      displayText = '';

      let i = 0;
      const interval = setInterval(() => {
        if (i < fullText.length) {
          displayText = fullText.slice(0, i + 1);
          i++;
        } else {
          clearInterval(interval);
        }
      }, typingSpeed);

      return () => clearInterval(interval);
    }
  });
</script>

<span
  bind:this={containerRef}
  class="retro-text"
  class:dim={color === 'dim'}
  class:bright={color === 'bright'}
  class:cyan={color === 'cyan'}
  class:warning={color === 'warning'}
  class:error={color === 'error'}
  class:glow
  class:typing
>
  {#if typing}
    {displayText}<span class="typing-cursor">█</span>
  {:else}
    {@render children()}
  {/if}
</span>

<style>
  .retro-text {
    color: var(--text-primary);
    font-family: var(--font-mono);
  }

  .retro-text.dim {
    color: var(--text-dim);
  }

  .retro-text.bright {
    color: var(--text-bright);
  }

  .retro-text.cyan {
    color: var(--accent-cyan);
  }

  .retro-text.warning {
    color: var(--accent-warning);
  }

  .retro-text.error {
    color: var(--accent-error);
  }

  .retro-text.glow {
    text-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
  }

  .typing-cursor {
    animation: cursor-blink 0.7s step-end infinite;
  }

  @keyframes cursor-blink {
    50% { opacity: 0; }
  }
</style>
