<script>
  import { onMount, onDestroy } from 'svelte';
  import { loadConfig, updateConfigValue } from '$lib/services/storage.js';
  import { chatStream, analyzeScreen } from '$lib/services/ai.js';
  import { captureScreen } from '$lib/services/capture.js';
  import { loadKnowledge, parseAndExecuteKnowledgeCommands, removeKnowledge } from '$lib/services/knowledge.js';
  import * as voice from '$lib/services/voice.js';
  import { checkMicrophonePermission, requestMicrophonePermission } from 'tauri-plugin-macos-permissions-api';
  import { setCozyTheme, getCurrentCozyThemeId, COZY_THEMES } from '$lib/services/cozyTheme.js';

  /**
   * @typedef {Object} Message
   * @property {'user' | 'assistant' | 'system'} role
   * @property {string} content
   * @property {number} timestamp
   */

  /** @type {{ visionOn: boolean, voiceOn: boolean, onResponse?: (response: string, question?: string) => void }} */
  let { visionOn = false, voiceOn = false, onResponse = undefined } = $props();

  /** @type {Message[]} */
  let messages = $state([
    { role: 'system', content: 'Terminal ready...', timestamp: Date.now() }
  ]);

  let inputText = $state('');
  let isLoading = $state(false);
  let isAnalyzing = $state(false);
  let isListening = $state(false);
  let wakeWordHeard = $state(false);
  let inCommandMode = $state(false);
  let lastCaptureTime = $state(0);
  let nextScanCountdown = $state(0);
  let personaName = $state('Buddy');
  let userName = $state('Friend');
  let wakeWord = $state('Buddy');
  let captureIntervalMs = $state(300000); // 5 minutes
  /** @type {number | null} */
  let selectedMonitor = $state(null);
  let knowledge = $state('');
  const startTime = Date.now();

  // Cozy quotes
  const COZY_QUOTES = [
    "Take a deep breath, you're doing great!",
    "Remember to stay hydrated today~",
    "A little progress each day adds up!",
    "You're capable of amazing things!",
    "Be kind to yourself today",
    "Every expert was once a beginner",
    "Take breaks, they help you focus better!",
    "You've got this, I believe in you!",
    "Small steps lead to big achievements"
  ];

  /**
   * Handle terminal commands
   * @param {string} input - The user input
   * @returns {{ handled: boolean, output?: string }}
   */
  function handleCommand(input) {
    const trimmed = input.trim().toLowerCase();
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1).join(' ');

    // Only handle commands starting with /
    if (!cmd.startsWith('/')) {
      return { handled: false };
    }

    switch (cmd) {
      case '/help':
      case '/?':
      case '/h':
        return {
          handled: true,
          output: `Hi there! Here's what I can do:

/clear, /cls - Fresh start
/status, /s - Check how things are going
/quote, /q - Get a little inspiration
/memory, /m - See my notes
/forget, /f [word] - Remove a note
/scan - Take a quick look around
/color, /c 1-2 - Light or Dark mode
/preset, /p 1-2 - Change my appearance
/version, /v - Version info

Keyboard: ⌘/Ctrl + 1-4 to switch modes

Just type normally to chat!`
        };

      case '/clear':
      case '/cls':
        return {
          handled: true,
          output: '__CLEAR__'
        };

      case '/reset':
        return {
          handled: true,
          output: '__RESET__'
        };

      case '/status':
      case '/s':
        return {
          handled: true,
          output: `Status Report

Vision: ${visionOn ? 'Active' : 'Resting'}
Listening: ${voiceOn ? 'All ears!' : 'Quiet mode'}
Provider: ${config?.ai_provider || 'Not configured'}
My name: ${personaName}
Your name: ${userName}

Everything is running smoothly!`
        };

      case '/version':
      case '/v':
      case '/ver':
        return {
          handled: true,
          output: `WOPR Cozy Edition

Version 1.0.0
Your friendly desktop companion!

Here to help you stay focused
and keep things running smoothly.`
        };

      case '/uptime':
      case '/up': {
        const uptimeMs = Date.now() - startTime;
        const hours = Math.floor(uptimeMs / 3600000);
        const minutes = Math.floor((uptimeMs % 3600000) / 60000);
        const seconds = Math.floor((uptimeMs % 60000) / 1000);
        return {
          handled: true,
          output: `Session Time: ${hours}h ${minutes}m ${seconds}s

Started at ${new Date(startTime).toLocaleTimeString()}`
        };
      }

      case '/color':
      case '/c': {
        const colorNum = parseInt(args);
        if (isNaN(colorNum) || colorNum < 1 || colorNum > 2) {
          const currentId = getCurrentCozyThemeId();
          const themeList = COZY_THEMES.map(t =>
            `  ${t.id}. ${t.name}${t.id === currentId ? ' (current)' : ''}`
          ).join('\n');
          return {
            handled: true,
            output: `Color Themes:\n${themeList}\n\nUsage: /color <1-2>`
          };
        }
        setCozyTheme(colorNum);
        const theme = COZY_THEMES.find(t => t.id === colorNum);
        return {
          handled: true,
          output: `Theme changed to: ${theme?.name || 'Unknown'}`
        };
      }

      case '/preset':
      case '/p': {
        const presetNum = parseInt(args);
        if (isNaN(presetNum) || presetNum < 1 || presetNum > 2) {
          return {
            handled: true,
            output: `Current: Preset 2 (Cozy Mode)

/preset 1 - Retro Terminal
/preset 2 - Cozy Mode (current)`
          };
        }
        return {
          handled: true,
          output: `__PRESET__${presetNum}`
        };
      }

      case '/quote':
      case '/q':
        const randomQuote = COZY_QUOTES[Math.floor(Math.random() * COZY_QUOTES.length)];
        return {
          handled: true,
          output: randomQuote
        };

      case '/whoami':
      case '/w':
        return {
          handled: true,
          output: `You are ${userName}!

Session started: ${new Date(startTime).toLocaleString()}

Welcome back!`
        };

      case '/memory':
      case '/m':
        if (!knowledge || !knowledge.trim()) {
          return {
            handled: true,
            output: `Notes: Empty

I haven't learned anything yet!
Chat with me to teach me things.`
          };
        }
        return {
          handled: true,
          output: `My Notes:

${knowledge}

Use /forget [word] to remove entries.`
        };

      case '/forget':
      case '/f':
        if (!args) {
          return {
            handled: true,
            output: `Usage: /forget [keyword]

Removes notes containing that word.`
          };
        }
        return {
          handled: true,
          output: `__FORGET__${args}`
        };

      case '/scan':
        return {
          handled: true,
          output: '__SCAN__'
        };

      default:
        return {
          handled: true,
          output: `Unknown command: ${cmd}

Type /help to see what I can do!`
        };
    }
  }

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

  // Scroll to bottom when messages change
  $effect(() => {
    const lastMsg = messages[messages.length - 1];
    const contentLength = lastMsg?.content?.length || 0;

    if (messagesContainer && (messages.length || contentLength)) {
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
      if (!captureInterval) {
        nextScanCountdown = Math.round(captureIntervalMs / 1000);
        captureAndAnalyze();
        captureInterval = setInterval(captureAndAnalyze, captureIntervalMs);

        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
          nextScanCountdown = Math.max(0, nextScanCountdown - 1);
          if (nextScanCountdown === 0) {
            nextScanCountdown = Math.round(captureIntervalMs / 1000);
          }
        }, 1000);
      }
    } else {
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

  async function startVoiceWithPermission() {
    try {
      console.log('Checking microphone permission...');
      const hasPermission = await checkMicrophonePermission();

      if (!hasPermission) {
        console.log('Requesting microphone permission...');
        const granted = await requestMicrophonePermission();

        if (!granted) {
          messages = [...messages, {
            role: 'system',
            content: 'Microphone permission needed. Check System Settings > Privacy > Microphone.',
            timestamp: Date.now()
          }];
          return;
        }
      }

      if (!voice.isSupported()) {
        messages = [...messages, {
          role: 'system',
          content: 'Voice not available. Try opening in Safari or Chrome.',
          timestamp: Date.now()
        }];
        return;
      }

      if (!voice.getIsAlwaysListening()) {
        voice.init({ wakeWord, alwaysListen: true });
        voice.onCommand(handleVoiceCommand);
        voice.onWakeWord((detected) => {
          wakeWordHeard = detected;
          if (detected) {
            setTimeout(() => { wakeWordHeard = false; }, 1500);
          }
        });
        voice.onStart(() => { isListening = true; });
        voice.onEnd(() => { isListening = false; });
        voice.onError((error) => {
          if (error === 'not-allowed') {
            messages = [...messages, {
              role: 'system',
              content: 'Mic access denied. Grant permission in System Settings.',
              timestamp: Date.now()
            }];
          }
        });
        voice.onCommandMode((listening) => { inCommandMode = listening; });
        voice.startAlwaysListening(wakeWord);
      }
    } catch (e) {
      console.error('Permission check failed:', e);
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
    try {
      config = await loadConfig();
      if (config) {
        personaName = config.persona_name || 'Buddy';
        userName = config.user_name || 'Friend';
        wakeWord = config.wake_word || 'Buddy';
        captureIntervalMs = config.capture_interval_ms || 300000;
        selectedMonitor = config.selected_monitor ?? null;
      }
    } catch (e) {
      console.error('Failed to load config:', e);
    }

    try {
      knowledge = await loadKnowledge();
    } catch (e) {
      console.error('Failed to load knowledge:', e);
    }

    messages = [
      { role: 'assistant', content: `Hey ${userName}!\n\nHow can I help you today?`, timestamp: Date.now() }
    ];
  });

  onDestroy(() => {
    if (captureInterval) clearInterval(captureInterval);
    if (countdownInterval) clearInterval(countdownInterval);
    voice.destroy();
  });

  async function captureAndAnalyze(manual = false) {
    if (!visionOn && !manual) return;
    if (isAnalyzing) return;

    if (!config || !config.api_key) {
      if (manual) {
        messages = [...messages, {
          role: 'system',
          content: 'No API key configured. Add one in Settings.',
          timestamp: Date.now()
        }];
      }
      return;
    }

    isAnalyzing = true;

    try {
      // Reload config to get latest monitor selection
      const latestConfig = await loadConfig();
      if (latestConfig) {
        selectedMonitor = latestConfig.selected_monitor ?? null;
      }

      const base64Image = await captureScreen(selectedMonitor);
      lastCaptureTime = Date.now();
      knowledge = await loadKnowledge();

      const recentMessages = messages
        .filter(m => m.role !== 'system')
        .slice(-5)
        .map(m => ({ role: m.role, content: m.content }));

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
        recentMessages.length > 0 ? recentMessages : undefined,
        'cozy'
      );

      const { cleanedResponse, actions } = await parseAndExecuteKnowledgeCommands(analysis);

      if (cleanedResponse && cleanedResponse.trim()) {
        messages = [...messages, {
          role: 'assistant',
          content: cleanedResponse,
          timestamp: Date.now()
        }];

        if (onResponse) {
          onResponse(cleanedResponse, '');
        }
      }

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

  export function triggerScan() {
    captureAndAnalyze(true);
  }

  export function getIsAnalyzing() {
    return isAnalyzing;
  }

  export function getHasApiKey() {
    return !!config?.api_key;
  }

  export function getVoiceState() {
    return {
      isHearing: inCommandMode,
      isSpeaking: false
    };
  }

  function handleVoiceCommand(command) {
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('scan') || lowerCommand.includes('look') || lowerCommand.includes('what do you see')) {
      captureAndAnalyze(true);
      return;
    }

    inputText = command;
    handleSend();
  }

  async function handleSend() {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    inputText = '';

    const commandResult = handleCommand(userMessage);
    if (commandResult.handled && commandResult.output) {
      messages = [...messages, {
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
      }];

      if (commandResult.output === '__CLEAR__') {
        messages = [{
          role: 'assistant',
          content: 'Fresh start! How can I help?',
          timestamp: Date.now()
        }];
        return;
      }

      if (commandResult.output === '__RESET__') {
        messages = [{
          role: 'assistant',
          content: `Hey ${userName}!\n\nHow can I help you today?`,
          timestamp: Date.now()
        }];
        return;
      }

      if (commandResult.output === '__SCAN__') {
        messages = [...messages, {
          role: 'assistant',
          content: 'Taking a look...',
          timestamp: Date.now()
        }];
        captureAndAnalyze(true);
        return;
      }

      if (commandResult.output.startsWith('__FORGET__')) {
        const keyword = commandResult.output.replace('__FORGET__', '');
        try {
          const result = await removeKnowledge(keyword);
          knowledge = await loadKnowledge();
          messages = [...messages, {
            role: 'assistant',
            content: result.removed
              ? `Done! Removed notes about "${keyword}"`
              : `Couldn't find any notes about "${keyword}"`,
            timestamp: Date.now()
          }];
        } catch (e) {
          messages = [...messages, {
            role: 'system',
            content: 'Oops! Something went wrong.',
            timestamp: Date.now()
          }];
        }
        return;
      }

      if (commandResult.output.startsWith('__PRESET__')) {
        const presetNum = parseInt(commandResult.output.replace('__PRESET__', ''));
        const presetName = `preset${presetNum}`;
        try {
          await updateConfigValue('preset', presetName);

          messages = [...messages, {
            role: 'assistant',
            content: `Switching to ${presetNum === 1 ? 'Retro' : 'Cozy'} mode...`,
            timestamp: Date.now()
          }];

          setTimeout(() => {
            window.location.reload();
          }, 500);
        } catch (e) {
          messages = [...messages, {
            role: 'system',
            content: 'Could not change preset.',
            timestamp: Date.now()
          }];
        }
        return;
      }

      messages = [...messages, {
        role: 'assistant',
        content: commandResult.output,
        timestamp: Date.now()
      }];
      return;
    }

    // Reload config and knowledge
    try {
      config = await loadConfig();
      if (config) {
        personaName = config.persona_name || 'Buddy';
        userName = config.user_name || 'Friend';
        selectedMonitor = config.selected_monitor ?? null;
      }
      knowledge = await loadKnowledge();
    } catch (e) {
      console.error('Failed to reload config/knowledge:', e);
    }

    if (!config || !config.api_key) {
      messages = [...messages, {
        role: 'system',
        content: 'No API key set. Open Settings to add one.',
        timestamp: Date.now()
      }];
      return;
    }

    messages = [...messages, {
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    }];

    isLoading = true;

    const assistantMessageIndex = messages.length;
    messages = [...messages, {
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    }];

    try {
      const chatHistory = messages
        .filter(m => m.role !== 'system')
        .slice(0, -1)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

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
          messages = messages.map((m, i) =>
            i === assistantMessageIndex
              ? { ...m, content: m.content + chunk }
              : m
          );
        },
        undefined,
        knowledge || undefined,
        'cozy',
        config.web_search_enabled ?? false
      );

      const { cleanedResponse, actions } = await parseAndExecuteKnowledgeCommands(fullResponse);

      if (cleanedResponse !== fullResponse) {
        messages = messages.map((m, i) =>
          i === assistantMessageIndex
            ? { ...m, content: cleanedResponse }
            : m
        );
        knowledge = await loadKnowledge();
      }

      if (onResponse) {
        const finalResponse = cleanedResponse || fullResponse;
        onResponse(finalResponse, userMessage);
      }
    } catch (e) {
      console.error('AI error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to get response';
      messages = messages.map((m, i) =>
        i === assistantMessageIndex
          ? { role: 'system', content: `Error: ${errorMessage}`, timestamp: Date.now() }
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

<div class="terminal-mode">
  <!-- Decorative cat -->
  <div class="deco-cat cat-term-2"></div>

  <!-- Terminal output area -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="terminal-output" bind:this={messagesContainer} onclick={() => hiddenInput?.focus()}>
    {#each messages as message}
      <div class="terminal-line {message.role}">
        {#if message.role === 'user'}
          <span class="prompt user-prompt">&gt;</span>
          <span class="line-content user-content">{message.content}</span>
        {:else if message.role === 'assistant'}
          <span class="line-content assistant-content">{message.content}{#if isLoading && message === messages[messages.length - 1]}<span class="cursor">_</span>{/if}</span>
        {:else}
          <span class="line-content system-content">[{message.content}]</span>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Terminal input -->
  <div class="terminal-input-area">
    <span class="input-prompt">&gt;</span>
    <input
      type="text"
      class="terminal-input"
      bind:value={inputText}
      bind:this={hiddenInput}
      onkeydown={handleKeydown}
      onfocus={() => inputFocused = true}
      onblur={() => inputFocused = false}
      disabled={isLoading}
      placeholder={isLoading ? "" : ""}
    />
    {#if isLoading}
      <span class="thinking-indicator">...</span>
    {/if}
  </div>
</div>

<style>
  .terminal-mode {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
    position: relative;
  }

  /* Decorative cats */
  .deco-cat {
    position: absolute;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    pointer-events: none;
    z-index: 0;
    opacity: 0.3;
  }

  .cat-term-2 {
    width: 28px;
    height: 28px;
    bottom: 60px;
    left: 8px;
    background-image: var(--cat-image-8, url('../assets/cats/c8.png'));
    transform: rotate(8deg);
  }

  .terminal-output {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .terminal-line {
    display: flex;
    gap: 0.5rem;
    line-height: 1.6;
    font-size: 0.9rem;
  }

  .prompt {
    color: var(--cozy-text-light, #c4a882);
    font-weight: 500;
    flex-shrink: 0;
  }

  .user-prompt {
    color: var(--cozy-accent, #d4956a);
  }

  .line-content {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .user-content {
    color: var(--cozy-text-light, #7a6a5a);
  }

  .assistant-content {
    color: var(--cozy-text, #5a5048);
    padding-left: 1rem;
  }

  .system-content {
    color: var(--cozy-text-muted, #9a8a7a);
    font-size: 0.85rem;
    font-style: italic;
  }

  .cursor {
    animation: blink 0.8s step-end infinite;
    color: var(--cozy-accent, #d4956a);
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  /* Terminal input area */
  .terminal-input-area {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: var(--cozy-card, rgba(255, 255, 255, 0.35));
    border-top: none;
    border-radius: 10px;
    margin: 0 0.5rem 0.5rem;
  }

  .input-prompt {
    color: var(--cozy-accent, #d4956a);
    font-weight: 500;
    font-size: 0.9rem;
  }

  .terminal-input {
    flex: 1;
    padding: 0.6rem 0;
    border: none;
    font-size: 0.9rem;
    font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
    background: transparent;
    color: var(--cozy-text, #5a5048);
    outline: none;
    min-height: 44px;
  }

  .terminal-input::placeholder {
    color: transparent;
  }

  .terminal-input:disabled {
    color: var(--cozy-text-muted, #a89b8a);
  }

  .thinking-indicator {
    color: var(--cozy-text-muted, #b8a090);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
</style>
