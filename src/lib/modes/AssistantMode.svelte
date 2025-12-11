<script>
  import { onMount, onDestroy } from 'svelte';
  import { RetroPanel, RetroButton, RetroInput } from '$lib/components';
  import { loadConfig } from '$lib/services/storage.js';
  import { chatStream } from '$lib/services/ai.js';
  import { captureScreen } from '$lib/services/capture.js';
  import * as voice from '$lib/services/voice.js';

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
  let isListening = $state(false);
  let screenContext = $state('');
  let lastCaptureTime = $state(0);
  let personaName = $state('Joshua');
  let userName = $state('Player');
  let captureIntervalMs = $state(30000);

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

  onMount(async () => {
    // Load config
    try {
      config = await loadConfig();
      if (config) {
        personaName = config.persona_name || 'Joshua';
        userName = config.user_name || 'Player';
        captureIntervalMs = config.capture_interval_ms || 30000;
      }
    } catch (e) {
      console.error('Failed to load config:', e);
    }

    // Initialize voice
    if (voiceOn && voice.isSupported()) {
      voice.init({ continuous: false });
      voice.onResult(handleVoiceResult);
      voice.onStart(() => isListening = true);
      voice.onEnd(() => isListening = false);
      voice.onError((err) => {
        console.error('Voice error:', err);
        isListening = false;
      });
    }

    // Start screen capture interval
    if (visionOn) {
      await captureScreenContext();
      captureInterval = setInterval(captureScreenContext, captureIntervalMs);
    }

    // Update initial message
    messages = [
      { role: 'system', content: `${personaName} online. Say my name or type to ask anything.`, timestamp: Date.now() }
    ];
  });

  onDestroy(() => {
    if (captureInterval) {
      clearInterval(captureInterval);
    }
    voice.destroy();
  });

  async function captureScreenContext() {
    if (!visionOn) return;

    try {
      const base64Image = await captureScreen();
      screenContext = `[Screen captured at ${new Date().toLocaleTimeString()}. Image data available for analysis.]`;
      lastCaptureTime = Date.now();
    } catch (e) {
      console.error('Failed to capture screen:', e);
      screenContext = '[Screen capture unavailable]';
    }
  }

  /**
   * @param {string} text
   */
  function handleVoiceResult(text) {
    inputText = text;
    handleSend();
  }

  function toggleVoice() {
    if (isListening) {
      voice.stopListening();
    } else {
      voice.startListening();
    }
  }

  async function handleSend() {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    inputText = '';  // Clear input immediately

    // Reload config to get latest settings
    try {
      config = await loadConfig();
      if (config) {
        personaName = config.persona_name || 'Joshua';
        userName = config.user_name || 'Player';
      }
    } catch (e) {
      console.error('Failed to reload config:', e);
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
      await chatStream(
        {
          provider: /** @type {import('$lib/services/ai.js').AIProvider} */ (config.ai_provider),
          apiKey: config.api_key,
          model: config.ai_model
        },
        chatHistory,
        personaName,
        userName,
        visionOn ? screenContext : undefined,
        (chunk) => {
          // Update the assistant message content as chunks arrive
          messages = messages.map((m, i) =>
            i === assistantMessageIndex
              ? { ...m, content: m.content + chunk }
              : m
          );
        }
      );
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
      <input
        type="text"
        class="chat-input"
        placeholder="> Type or speak..."
        bind:value={inputText}
        onkeydown={handleKeydown}
        disabled={isLoading}
      />
      <RetroButton
        icon={isListening ? '||' : '()'}
        onclick={toggleVoice}
        active={isListening}
        disabled={!voiceOn || !voice.isSupported()}
      />
      <RetroButton
        icon=">>"
        onclick={handleSend}
        disabled={isLoading || !inputText.trim()}
        variant="primary"
      />
    </div>
  </div>

  <RetroPanel title="CONTEXT" border="single">
    <div class="context-info">
      <div class="context-row">
        <span class="context-label">VISION:</span>
        <span class="context-value">{visionOn ? 'ACTIVE' : 'OFF'}</span>
      </div>
      {#if visionOn && lastCaptureTime}
        <div class="context-row">
          <span class="context-label">LAST SCAN:</span>
          <span class="context-value">{new Date(lastCaptureTime).toLocaleTimeString()}</span>
        </div>
      {/if}
      <div class="context-row">
        <span class="context-label">VOICE:</span>
        <span class="context-value">{isListening ? 'LISTENING' : voiceOn ? 'READY' : 'OFF'}</span>
      </div>
    </div>
  </RetroPanel>
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

  .thinking .dots {
    animation: blink 1s step-end infinite;
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

  .context-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .context-row {
    display: flex;
    gap: 0.5rem;
    font-size: 0.7rem;
  }

  .context-label {
    color: var(--text-dim);
    min-width: 70px;
  }

  .context-value {
    color: var(--text-primary);
  }
</style>
