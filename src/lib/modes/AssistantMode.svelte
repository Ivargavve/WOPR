<script>
  import { onMount, onDestroy } from 'svelte';
  import { RetroPanel, RetroButton, RetroInput } from '$lib/components';
  import { loadConfig } from '$lib/services/storage.js';
  import { chatStream, analyzeScreen } from '$lib/services/ai.js';
  import { captureScreen } from '$lib/services/capture.js';
  import { loadKnowledge, parseAndExecuteKnowledgeCommands } from '$lib/services/knowledge.js';
  import * as voice from '$lib/services/voice.js';
  import { checkMicrophonePermission, requestMicrophonePermission } from 'tauri-plugin-macos-permissions-api';

  /**
   * @typedef {Object} Message
   * @property {'user' | 'assistant' | 'system'} role
   * @property {string} content
   * @property {number} timestamp
   */

  /** @type {{ visionOn: boolean, voiceOn: boolean }} */
  let { visionOn = false, voiceOn = false } = $props();

  /** @type {Message[]} */
  let messages = $state([
    { role: 'system', content: 'Awaiting context...', timestamp: Date.now() }
  ]);

  let inputText = $state('');
  let isLoading = $state(false);
  let isAnalyzing = $state(false);
  let isListening = $state(false);
  let wakeWordHeard = $state(false);
  let inCommandMode = $state(false);
  let lastCaptureTime = $state(0);
  let nextScanCountdown = $state(0);
  let personaName = $state('Joshua');
  let userName = $state('Falken');
  let wakeWord = $state('Joshua');
  let captureIntervalMs = $state(30000);
  /** @type {number | null} */
  let selectedMonitor = $state(null);
  let knowledge = $state('');

  /** @type {ReturnType<typeof setInterval> | null} */
  let countdownInterval = null;

  /** @type {import('$lib/services/storage.js').AppConfig | null} */
  let config = $state(null);

  /** @type {ReturnType<typeof setInterval> | null} */
  let captureInterval = null;

  /** @type {HTMLDivElement | null} */
  let messagesContainer = null;

  /** @type {HTMLInputElement | null} */
  let hiddenInput = null;

  let inputFocused = $state(false);

  // Scroll to bottom when messages change or content updates
  $effect(() => {
    // Track both messages array and last message content for streaming updates
    const lastMsg = messages[messages.length - 1];
    const contentLength = lastMsg?.content?.length || 0;

    // Trigger on any change
    if (messagesContainer && (messages.length || contentLength)) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 10);
    }
  });

  // Auto-refocus input after response completes
  $effect(() => {
    if (!isLoading && hiddenInput) {
      setTimeout(() => {
        hiddenInput?.focus();
      }, 50);
    }
  });

  // React to visionOn changes
  $effect(() => {
    if (visionOn) {
      // Start vision if not already running
      if (!captureInterval) {
        nextScanCountdown = Math.round(captureIntervalMs / 1000);
        captureAndAnalyze();
        captureInterval = setInterval(captureAndAnalyze, captureIntervalMs);

        // Start countdown timer
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
          nextScanCountdown = Math.max(0, nextScanCountdown - 1);
          if (nextScanCountdown === 0) {
            nextScanCountdown = Math.round(captureIntervalMs / 1000);
          }
        }, 1000);
      }
    } else {
      // Stop vision
      if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      nextScanCountdown = 0;
    }
  });

  /**
   * Request microphone permission and start voice recognition
   */
  async function startVoiceWithPermission() {
    try {
      // Check current permission status
      console.log('Checking microphone permission...');
      const hasPermission = await checkMicrophonePermission();
      console.log('Microphone permission status:', hasPermission);

      if (!hasPermission) {
        // Request permission silently (macOS will show its own dialog)
        console.log('Requesting microphone permission...');
        const granted = await requestMicrophonePermission();
        console.log('Permission granted:', granted);

        if (!granted) {
          messages = [...messages, {
            role: 'system',
            content: 'Microphone permission denied. Enable in System Settings > Privacy & Security > Microphone.',
            timestamp: Date.now()
          }];
          return;
        }
      }

      // Permission granted, start voice recognition
      if (!voice.isSupported()) {
        console.warn('Speech recognition not supported in this browser/webview');
        messages = [...messages, {
          role: 'system',
          content: 'Voice not supported. Try opening http://localhost:1420 in Safari/Chrome instead.',
          timestamp: Date.now()
        }];
        return;
      }

      if (!voice.getIsAlwaysListening()) {
        console.log('Starting voice recognition...');
        voice.init({ wakeWord, alwaysListen: true });
        voice.onCommand(handleVoiceCommand);
        voice.onWakeWord((detected) => {
          wakeWordHeard = detected;
          if (detected) {
            setTimeout(() => { wakeWordHeard = false; }, 1500);
          }
        });
        voice.onStart(() => {
          console.log('Voice recognition started');
          isListening = true;
        });
        voice.onEnd(() => {
          console.log('Voice recognition ended');
          isListening = false;
        });
        voice.onError((error) => {
          console.error('Voice error:', error);
          if (error === 'not-allowed') {
            messages = [...messages, {
              role: 'system',
              content: 'Mic access denied. Please grant permission in System Settings.',
              timestamp: Date.now()
            }];
          } else if (error !== 'no-speech' && error !== 'aborted') {
            messages = [...messages, {
              role: 'system',
              content: `Voice error: ${error}`,
              timestamp: Date.now()
            }];
          }
        });
        voice.onCommandMode((listening) => {
          inCommandMode = listening;
          console.log('Command mode:', listening);
        });
        voice.startAlwaysListening(wakeWord);
      }
    } catch (e) {
      console.error('Permission check failed:', e);
      // Fallback: try starting voice anyway (might work in browser)
      if (voice.isSupported() && !voice.getIsAlwaysListening()) {
        voice.init({ wakeWord, alwaysListen: true });
        voice.onCommand(handleVoiceCommand);
        voice.onStart(() => isListening = true);
        voice.onEnd(() => isListening = false);
        voice.startAlwaysListening(wakeWord);
      }
    }
  }

  // React to voiceOn changes
  $effect(() => {
    if (voiceOn) {
      startVoiceWithPermission();
    } else {
      if (voice.getIsAlwaysListening()) {
        voice.stopAlwaysListening();
        isListening = false;
      }
    }
  });

  onMount(async () => {
    // Load config
    try {
      config = await loadConfig();
      if (config) {
        personaName = config.persona_name || 'Joshua';
        userName = config.user_name || 'Falken';
        wakeWord = config.wake_word || 'Joshua';
        captureIntervalMs = config.capture_interval_ms || 30000;
        selectedMonitor = config.selected_monitor ?? null;
      }
    } catch (e) {
      console.error('Failed to load config:', e);
    }

    // Load knowledge
    try {
      knowledge = await loadKnowledge();
    } catch (e) {
      console.error('Failed to load knowledge:', e);
    }

    // Update initial message - WarGames style greeting
    messages = [
      { role: 'assistant', content: `GREETINGS, ${userName.toUpperCase()}.\n\nSHALL WE PLAY A GAME?`, timestamp: Date.now() }
    ];

    // Note: Vision and voice are started by $effect() reactively based on props
  });

  onDestroy(() => {
    if (captureInterval) {
      clearInterval(captureInterval);
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    voice.destroy();
  });

  /**
   * Capture screen and proactively analyze it
   * @param {boolean} [manual=false] - Whether this was manually triggered
   */
  async function captureAndAnalyze(manual = false) {
    if (!visionOn && !manual) return;
    if (isAnalyzing) return; // Don't overlap analyses

    // Need config to analyze
    if (!config || !config.api_key) {
      if (manual) {
        messages = [...messages, {
          role: 'system',
          content: 'ERROR: No API key configured.',
          timestamp: Date.now()
        }];
      }
      return;
    }

    isAnalyzing = true;

    try {
      // Capture the screen
      const base64Image = await captureScreen(selectedMonitor);
      lastCaptureTime = Date.now();

      // Reload knowledge before analysis
      knowledge = await loadKnowledge();

      // Get recent messages for context (last 5, excluding system messages)
      const recentMessages = messages
        .filter(m => m.role !== 'system')
        .slice(-5)
        .map(m => ({ role: m.role, content: m.content }));

      // Analyze the screen with AI
      const analysis = await analyzeScreen(
        {
          provider: /** @type {import('$lib/services/ai.js').AIProvider} */ (config.ai_provider),
          apiKey: config.api_key,
          model: config.ai_model
        },
        base64Image,
        personaName,
        userName,
        knowledge || undefined,
        recentMessages.length > 0 ? recentMessages : undefined
      );

      // Process any knowledge commands in the response
      const { cleanedResponse, actions } = await parseAndExecuteKnowledgeCommands(analysis);

      // Add the tip as an assistant message
      if (cleanedResponse && cleanedResponse.trim()) {
        messages = [...messages, {
          role: 'assistant',
          content: cleanedResponse,
          timestamp: Date.now()
        }];
      }

      // Reload knowledge if updated
      if (actions.length > 0) {
        knowledge = await loadKnowledge();
      }
    } catch (e) {
      console.error('Screen analysis failed:', e);
      if (manual) {
        messages = [...messages, {
          role: 'system',
          content: `Scan error: ${e instanceof Error ? e.message : 'Unknown error'}`,
          timestamp: Date.now()
        }];
      }
    } finally {
      isAnalyzing = false;
    }
  }

  /**
   * Manual trigger for screen scan - exported for parent component
   */
  export function triggerScan() {
    captureAndAnalyze(true);
  }

  // Export state for parent to check
  export function getIsAnalyzing() {
    return isAnalyzing;
  }

  export function getHasApiKey() {
    return !!config?.api_key;
  }

  /**
   * Handle voice command (wake word + command detected)
   * @param {string} command
   */
  function handleVoiceCommand(command) {
    // Check for special commands
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('scan') || lowerCommand.includes('look') || lowerCommand.includes('what do you see')) {
      // Trigger manual screen scan
      handleManualScan();
      return;
    }

    // Otherwise, treat as a chat message
    inputText = command;
    handleSend();
  }

  async function handleSend() {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    inputText = '';  // Clear input immediately

    // Reload config and knowledge to get latest settings
    try {
      config = await loadConfig();
      if (config) {
        personaName = config.persona_name || 'Joshua';
        userName = config.user_name || 'Falken';
        selectedMonitor = config.selected_monitor ?? null;
      }
      knowledge = await loadKnowledge();
    } catch (e) {
      console.error('Failed to reload config/knowledge:', e);
    }

    if (!config || !config.api_key) {
      messages = [...messages, {
        role: 'system',
        content: 'ERROR: No API key configured. Open settings to add your key.',
        timestamp: Date.now()
      }];
      return;
    }

    // Add user message
    messages = [...messages, {
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    }];

    isLoading = true;

    // Add empty assistant message that will be updated as streaming progresses
    const assistantMessageIndex = messages.length;
    messages = [...messages, {
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    }];

    try {
      // Prepare chat history (last 10 messages, excluding the empty one we just added)
      const chatHistory = messages
        .filter(m => m.role !== 'system')
        .slice(0, -1)  // Exclude the empty assistant message
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      // Get AI response with streaming
      const fullResponse = await chatStream(
        {
          provider: /** @type {import('$lib/services/ai.js').AIProvider} */ (config.ai_provider),
          apiKey: config.api_key,
          model: config.ai_model
        },
        chatHistory,
        personaName,
        userName,
        (chunk) => {
          // Update the assistant message content as chunks arrive
          messages = messages.map((m, i) =>
            i === assistantMessageIndex
              ? { ...m, content: m.content + chunk }
              : m
          );
        },
        undefined, // screenContext not needed for chat anymore
        knowledge || undefined
      );

      // Process knowledge commands from the response
      const { cleanedResponse, actions } = await parseAndExecuteKnowledgeCommands(fullResponse);

      // Update the message with cleaned response (commands removed)
      if (cleanedResponse !== fullResponse) {
        messages = messages.map((m, i) =>
          i === assistantMessageIndex
            ? { ...m, content: cleanedResponse }
            : m
        );
        // Reload knowledge after updates
        knowledge = await loadKnowledge();
      }
    } catch (e) {
      console.error('AI error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to get response';
      // Replace the empty assistant message with an error
      messages = messages.map((m, i) =>
        i === assistantMessageIndex
          ? { role: 'system', content: `ERROR: ${errorMessage}`, timestamp: Date.now() }
          : m
      );
    } finally {
      isLoading = false;
    }
  }

  /**
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
</script>

<div class="assistant-mode">
  <div class="chat-panel-wrapper">
    <RetroPanel>
      <!-- Compact status bar -->
      <div class="status-bar">
        <span class="status-item" class:active={visionOn} class:scanning={isAnalyzing}>
          {#if isAnalyzing}
            EYE:SCAN
          {:else if visionOn}
            EYE:{nextScanCountdown}s
          {:else}
            EYE:OFF
          {/if}
        </span>
        <span class="status-divider">|</span>
        <span class="status-item" class:active={isListening} class:command-mode={inCommandMode} class:wake-word-heard={wakeWordHeard} class:waiting={voiceOn && !isListening}>
          {#if inCommandMode}
            MIC:SPEAK...
          {:else if wakeWordHeard}
            MIC:HEARD!
          {:else if isListening}
            MIC:ON
          {:else if voiceOn}
            MIC:...
          {:else}
            MIC:OFF
          {/if}
        </span>
        {#if lastCaptureTime}
          <span class="status-divider">|</span>
          <span class="status-item dim">@{new Date(lastCaptureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        {/if}
      </div>

      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="message-area" bind:this={messagesContainer} onclick={() => hiddenInput?.focus()}>
        {#each messages as message, i}
          <div class="terminal-line">
            <span class="timestamp">{new Date(message.timestamp).toLocaleTimeString('en-US', { hour12: false })}</span>
            <span class="msg-content">{message.content}{#if message.role === 'assistant' && isLoading && i === messages.length - 1}<span class="loading-cursor">█</span>{/if}</span>
          </div>
        {/each}

        <!-- Input line at bottom -->
        {#if !isLoading}
          <div class="terminal-line input-line">
            <span class="timestamp">{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
            <span class="msg-content"><span class="typed-text">{inputText}</span>{#if inputFocused}<span class="input-cursor">█</span>{:else}<span class="input-cursor-idle">_</span>{/if}</span>
          </div>
        {/if}

        <input
          type="text"
          class="chat-input-hidden"
          bind:value={inputText}
          bind:this={hiddenInput}
          onkeydown={handleKeydown}
          onfocus={() => inputFocused = true}
          onblur={() => inputFocused = false}
          disabled={isLoading}
        />
      </div>
    </RetroPanel>
  </div>
</div>

<style>
  .assistant-mode {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    height: 100%;
  }

  .chat-panel-wrapper {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .chat-panel-wrapper :global(.retro-panel) {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .chat-panel-wrapper :global(.panel-content) {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    padding: 0.3rem;
  }

  .message-area {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    cursor: text;
    font-family: var(--font-mono);
  }

  /* Terminal line - like old WOPR */
  .terminal-line {
    display: flex;
    gap: 1.5rem;
    font-size: 0.75rem;
    line-height: 1.4;
    margin-bottom: 0.4rem;
    width: 100%;
    text-transform: uppercase;
  }

  .terminal-line:last-of-type {
    margin-bottom: 0;
  }

  .timestamp {
    color: var(--text-dim);
    flex-shrink: 0;
    font-size: 0.65rem;
    opacity: 0.7;
  }

  .msg-content {
    color: var(--text-primary);
    text-shadow: 0 0 8px rgba(0, 255, 65, 0.4);
    white-space: pre-wrap;
    word-break: break-word;
    flex: 1;
  }

  /* Input line styling */
  .input-line {
    margin-bottom: 0;
  }

  .typed-text {
    color: var(--text-primary);
  }

  .input-cursor {
    color: var(--text-primary);
    animation: cursor-blink 1s step-end infinite;
    text-shadow: 0 0 10px var(--text-primary);
  }

  .input-cursor-idle {
    color: var(--text-dim);
  }

  .loading-cursor {
    animation: cursor-blink 0.5s step-end infinite;
    color: var(--text-primary);
  }

  @keyframes cursor-blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  .chat-input-hidden {
    position: absolute;
    left: -9999px;
    opacity: 0;
    width: 1px;
    height: 1px;
  }

  .status-bar {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.15rem 0;
    margin-bottom: 0.25rem;
    border-bottom: 1px solid var(--border-color);
    font-size: 0.5rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
  }

  .status-item {
    color: var(--text-dim);
  }

  .status-item.active {
    color: var(--text-primary);
  }

  .status-item.scanning,
  .status-item.waiting {
    color: var(--accent-warning);
    animation: blink 0.5s step-end infinite;
  }

  .status-item.wake-word-heard {
    color: var(--accent-cyan);
    animation: pulse 0.5s ease-in-out;
  }

  .status-item.command-mode {
    color: var(--accent-cyan);
    animation: blink 0.5s step-end infinite;
  }

  .status-item.dim {
    color: var(--text-dim);
    opacity: 0.7;
  }

  .status-divider {
    color: var(--border-color);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
