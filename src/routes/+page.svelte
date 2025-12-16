<script>
  import { onMount } from 'svelte';
  import { loadConfig } from '$lib/services/storage.js';
  import { setMode, MODES } from '$lib/stores/mode.svelte.js';

  /** @type {import('svelte').ComponentType | null} */
  let ShellComponent = $state(null);
  let currentPreset = $state('');
  let isLoading = $state(true);
  let configLoaded = $state(false);
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

  // Keyboard shortcuts for mode switching (Cmd+1-4 on Mac, Ctrl+1-4 on Windows)
  $effect(() => {
    /** @param {KeyboardEvent} event */
    const handleKeyDown = (event) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;

      // Map number keys to mode indices
      const keyToIndex = {
        '1': 0, // monitor
        '2': 1, // screentime
        '3': 2, // pomodoro
        '4': 3  // assistant
      };

      const modeIndex = keyToIndex[event.key];
      if (modeIndex !== undefined && MODES[modeIndex]) {
        event.preventDefault();
        setMode(MODES[modeIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  onMount(async () => {
    // Load config first to get the saved preset (for loading screen styling)
    try {
      const config = await loadConfig();
      currentPreset = config.preset || 'preset1';
      configLoaded = true;
      await loadPreset(currentPreset);
    } catch (e) {
      console.error('Failed to load config:', e);
      // Fallback to preset1
      currentPreset = 'preset1';
      configLoaded = true;
      await loadPreset('preset1');
    }
    isLoading = false;
  });
</script>

{#if isLoading}
  <div class="loading-screen" class:cozy={currentPreset === 'preset2'} class:initial={!configLoaded}>
    {#if configLoaded}
      <div class="loading-text">
        {currentPreset === 'preset2' ? 'Loading...' : 'INITIALIZING WOPR...'}
      </div>
    {/if}
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

  /* Initial loading (before config loads) - neutral dark */
  .loading-screen.initial {
    background: #1a1a1a;
  }

  /* Cozy preset loading screen */
  .loading-screen.cozy {
    background: #e8ddd4;
  }

  .loading-screen.cozy .loading-text {
    color: #8b7d6b;
    font-family: 'Quicksand', 'Nunito', system-ui, sans-serif;
    text-transform: none;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
