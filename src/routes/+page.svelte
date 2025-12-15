<script>
  import { onMount } from 'svelte';
  import { loadConfig } from '$lib/services/storage.js';

  /** @type {import('svelte').ComponentType | null} */
  let ShellComponent = $state(null);
  let currentPreset = $state('preset1');
  let isLoading = $state(true);
  let componentKey = $state(0); // Force re-render key

  /**
   * Load a preset's Shell component
   * @param {string} preset - The preset name (preset1, preset2, etc.)
   */
  async function loadPreset(preset) {
    try {
      console.log('Loading preset:', preset);
      // Clear current component first to force fresh render
      ShellComponent = null;

      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 50));

      // Dynamically import the preset's Shell component
      const module = await import(`../lib/presets/${preset}/Shell.svelte`);
      ShellComponent = module.default;
      currentPreset = preset;
      componentKey++; // Force component re-creation
      console.log('Preset loaded successfully:', preset);
    } catch (e) {
      console.error(`Failed to load preset ${preset}:`, e);
      // Fallback to preset1 if the requested preset fails
      if (preset !== 'preset1') {
        console.log('Falling back to preset1');
        await loadPreset('preset1');
      }
    }
  }

  // Set up event listener using $effect for proper Svelte 5 reactivity
  $effect(() => {
    /** @param {Event} event */
    const handlePresetChange = (event) => {
      const customEvent = /** @type {CustomEvent} */ (event);
      console.log('Preset change event received:', customEvent.detail);
      const newPreset = customEvent.detail?.preset;
      if (newPreset) {
        loadPreset(newPreset);
      }
    };

    window.addEventListener('wopr-preset-change', handlePresetChange);
    console.log('Preset change listener registered');

    return () => {
      window.removeEventListener('wopr-preset-change', handlePresetChange);
      console.log('Preset change listener removed');
    };
  });

  onMount(async () => {
    // Load config to get the saved preset
    try {
      const config = await loadConfig();
      const preset = config.preset || 'preset1';
      await loadPreset(preset);
    } catch (e) {
      console.error('Failed to load config:', e);
      // Fallback to preset1
      await loadPreset('preset1');
    }
    isLoading = false;
  });
</script>

{#if isLoading}
  <div class="loading-screen">
    <div class="loading-text">INITIALIZING WOPR...</div>
  </div>
{:else if ShellComponent}
  {#key componentKey}
    <svelte:component this={ShellComponent} />
  {/key}
{:else}
  <div class="error-screen">
    <div class="error-text">FAILED TO LOAD UI PRESET</div>
  </div>
{/if}

<style>
  .loading-screen,
  .error-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    width: 100%;
    background: #0a0a0a;
  }

  .loading-text,
  .error-text {
    color: #00ff41;
    font-family: 'IBM Plex Mono', 'Fira Code', monospace;
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .error-text {
    color: #ff4444;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
