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
  let userName = $state('Player');
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

  // Scroll to bottom when messages change
  $effect(() => {
    if (messagesContainer && messages.length) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      });
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
        userName = config.user_name || 'Player';
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

    // Update initial message
    messages = [
      { role: 'system', content: `${personaName} online. Toggle vision/voice with buttons below.`, timestamp: Date.now() }
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
   * Manual trigger for screen scan
   */
  function handleManualScan() {
    captureAndAnalyze(true);
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
        userName = config.user_name || 'Player';
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
    <RetroPanel title={personaName.toUpperCase()}>
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

      <div class="message-area" bind:this={messagesContainer}>
        {#each messages as message}
          <div class="message" class:user={message.role === 'user'} class:assistant={message.role === 'assistant'} class:system={message.role === 'system'}>
            <span class="message-prefix">
              {#if message.role === 'user'}
                YOU>
              {:else if message.role === 'assistant'}
                {personaName.toUpperCase()}>
              {:else}
                SYS>
              {/if}
            </span>
            <span class="message-content">{message.content}</span>
          </div>
        {/each}
      </div>
    </RetroPanel>
  </div>

  <div class="input-area">
    <div class="input-row">
      <RetroButton
        icon="@"
        onclick={handleManualScan}
        disabled={isAnalyzing || !config?.api_key}
        title="Scan screen now"
      />
      <input
        type="text"
        class="chat-input"
        placeholder="> Type or speak..."
        bind:value={inputText}
        onkeydown={handleKeydown}
        disabled={isLoading}
      />
      <RetroButton
        icon=">>"
        onclick={handleSend}
        disabled={isLoading || !inputText.trim()}
        variant="primary"
      />
    </div>
  </div>
</div>

<style>
  .assistant-mode {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
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
  }

  .message-area {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .message {
    display: flex;
    gap: 0.5rem;
    font-size: 0.8rem;
    line-height: 1.4;
    word-break: break-word;
  }

  .message-prefix {
    color: var(--text-dim);
    flex-shrink: 0;
    font-weight: bold;
  }

  .message.user .message-prefix {
    color: var(--accent-cyan);
  }

  .message.assistant .message-prefix {
    color: var(--text-primary);
  }

  .message.system .message-prefix {
    color: var(--accent-warning);
  }

  .message-content {
    color: var(--text-primary);
  }

  .message.system .message-content {
    color: var(--text-dim);
  }

  @keyframes blink {
    50% { opacity: 0; }
  }

  .input-area {
    flex-shrink: 0;
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
  }

  .chat-input {
    flex: 1;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    padding: 0.75rem;
    outline: none;
    min-width: 0;
  }

  .chat-input:focus {
    border-color: var(--text-primary);
    box-shadow: var(--glow-green);
  }

  .chat-input::placeholder {
    color: var(--text-dim);
  }

  .chat-input:disabled {
    opacity: 0.6;
  }

  .status-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
    font-size: 0.65rem;
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
