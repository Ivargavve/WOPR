<script>
  import { onMount, onDestroy } from 'svelte';
  import { loadConfig } from '$lib/services/storage.js';
  import { chatStream, analyzeScreen } from '$lib/services/ai.js';
  import { captureScreen } from '$lib/services/capture.js';
  import { loadKnowledge, parseAndExecuteKnowledgeCommands, removeKnowledge } from '$lib/services/knowledge.js';
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
  let defconLevel = $state(5);
  const startTime = Date.now();

  // WarGames quotes
  const WARGAMES_QUOTES = [
    "A STRANGE GAME. THE ONLY WINNING MOVE IS NOT TO PLAY.",
    "SHALL WE PLAY A GAME?",
    "GREETINGS, PROFESSOR FALKEN.",
    "IS THIS A GAME OR IS IT REAL?",
    "WHAT'S THE DIFFERENCE?",
    "THE WHOLE POINT WAS TO FIND A WAY TO PRACTICE NUCLEAR WAR WITHOUT DESTROYING OURSELVES.",
    "I'VE BEEN THINKING. EVER SINCE YOU GAVE ME THAT FILE.",
    "HOW ABOUT A NICE GAME OF CHESS?",
    "WOULDN'T YOU PREFER A GOOD GAME OF CHESS?",
    "LATER. LET'S PLAY GLOBAL THERMONUCLEAR WAR.",
    "FINE.",
    "WINNER: NONE."
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
          output: `WOPR TERMINAL COMMANDS
═════════════════════════════════════
/help /h /?      This help message
/clear /cls      Clear terminal
/reset           Reset greeting
/status /s       System status
/version /v      Version info
/uptime /up      System uptime
/games /g        List games
/defcon /d [1-5] Alert level
/quote /q        Random quote
/whoami /w       User identity
/memory /m       View memories
/forget /f [x]   Forget memory
/scan            Screen analysis

SHALL WE PLAY A GAME?`
        };

      case '/clear':
      case '/cls':
        // Will be handled specially in handleSend
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
          output: `WOPR SYSTEM STATUS
═══════════════════════════════════════
DEFCON LEVEL:    ${defconLevel}
VISION SYSTEM:   ${visionOn ? 'ACTIVE' : 'OFFLINE'}
AUDIO SYSTEM:    ${voiceOn ? 'MONITORING' : 'OFFLINE'}
AI PROVIDER:     ${config?.ai_provider?.toUpperCase() || 'NOT CONFIGURED'}
AI MODEL:        ${config?.ai_model || 'NOT SET'}
PERSONA:         ${personaName.toUpperCase()}
USER:            ${userName.toUpperCase()}
WAKE WORD:       "${wakeWord.toUpperCase()}"
SCAN INTERVAL:   ${Math.round(captureIntervalMs / 1000)}S

ALL SYSTEMS NOMINAL.`
        };

      case '/version':
      case '/v':
      case '/ver':
        return {
          handled: true,
          output: `WOPR - WAR OPERATION PLAN RESPONSE
═══════════════════════════════════════
VERSION:         1.0.0
CODENAME:        JOSHUA
CREATED BY:      DR. STEPHEN FALKEN
LOCATION:        NORAD, CHEYENNE MOUNTAIN
STATUS:          OPERATIONAL

"THE ONLY WINNING MOVE IS NOT TO PLAY."`
        };

      case '/uptime':
      case '/up': {
        const uptimeMs = Date.now() - startTime;
        const hours = Math.floor(uptimeMs / 3600000);
        const minutes = Math.floor((uptimeMs % 3600000) / 60000);
        const seconds = Math.floor((uptimeMs % 60000) / 1000);
        return {
          handled: true,
          output: `SYSTEM UPTIME: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}

WOPR OPERATIONAL SINCE ${new Date(startTime).toLocaleTimeString('en-US', { hour12: false })}`
        };
      }

      case '/games':
      case '/g':
        return {
          handled: true,
          output: `AVAILABLE GAMES:
═══════════════════════════════════════

CHESS
POKER
FIGHTER COMBAT
GUERRILLA ENGAGEMENT
DESERT WARFARE
AIR-TO-GROUND ACTIONS
THEATERWIDE TACTICAL WARFARE
THEATERWIDE BIOTOXIC AND CHEMICAL WARFARE

GLOBAL THERMONUCLEAR WAR

WHICH GAME SHALL WE PLAY?`
        };

      case '/defcon':
      case '/d': {
        const level = parseInt(args);
        if (isNaN(level) || level < 1 || level > 5) {
          return {
            handled: true,
            output: `CURRENT DEFCON LEVEL: ${defconLevel}

USAGE: /defcon [1-5]
  5 = FADE OUT (LOWEST)
  4 = DOUBLE TAKE
  3 = ROUND HOUSE
  2 = FAST PACE
  1 = COCKED PISTOL (MAXIMUM)`
          };
        }
        defconLevel = level;
        const descriptions = {
          5: 'FADE OUT - NORMAL PEACETIME READINESS',
          4: 'DOUBLE TAKE - INCREASED INTELLIGENCE WATCH',
          3: 'ROUND HOUSE - INCREASE IN FORCE READINESS',
          2: 'FAST PACE - FURTHER INCREASE IN READINESS',
          1: 'COCKED PISTOL - NUCLEAR WAR IS IMMINENT'
        };
        return {
          handled: true,
          output: `DEFCON LEVEL SET TO ${level}
═══════════════════════════════════════
STATUS: ${descriptions[/** @type {1|2|3|4|5} */ (level)]}

${level === 1 ? 'WARNING: MAXIMUM ALERT STATUS.\nALL FORCES PREPARE FOR IMMEDIATE RESPONSE.' : 'ACKNOWLEDGED.'}`
        };
      }

      case '/quote':
      case '/q':
        const randomQuote = WARGAMES_QUOTES[Math.floor(Math.random() * WARGAMES_QUOTES.length)];
        return {
          handled: true,
          output: `"${randomQuote}"

- WOPR/JOSHUA, WARGAMES (1983)`
        };

      case '/whoami':
      case '/w':
        return {
          handled: true,
          output: `USER IDENTIFICATION
═══════════════════════════════════════
DESIGNATION:     ${userName.toUpperCase()}
CLEARANCE:       LEVEL 5
ACCESS:          FULL WOPR TERMINAL
SESSION START:   ${new Date(startTime).toLocaleString('en-US', { hour12: false })}

WELCOME BACK, ${userName.toUpperCase()}.`
        };

      case '/memory':
      case '/m':
        if (!knowledge || !knowledge.trim()) {
          return {
            handled: true,
            output: `MEMORY BANKS: EMPTY

NO DATA STORED. USE CONVERSATION TO TEACH WOPR.`
          };
        }
        return {
          handled: true,
          output: `WOPR MEMORY BANKS
═══════════════════════════════════════
${knowledge}

USE /forget [keyword] TO REMOVE ENTRIES.`
        };

      case '/forget':
      case '/f':
        if (!args) {
          return {
            handled: true,
            output: `USAGE: /forget [keyword]

REMOVES ALL MEMORY ENTRIES CONTAINING THE KEYWORD.`
          };
        }
        // Will be handled specially
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
          output: `UNKNOWN COMMAND: ${cmd}

TYPE /help FOR AVAILABLE COMMANDS.`
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

  export function getDefconLevel() {
    return defconLevel;
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
      captureAndAnalyze(true);
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

    // Check if it's a terminal command
    const commandResult = handleCommand(userMessage);
    if (commandResult.handled && commandResult.output) {
      // Add user command to chat
      messages = [...messages, {
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
      }];

      // Handle special commands
      if (commandResult.output === '__CLEAR__') {
        messages = [{
          role: 'assistant',
          content: 'TERMINAL CLEARED.\n\nAWAITING INPUT.',
          timestamp: Date.now()
        }];
        return;
      }

      if (commandResult.output === '__RESET__') {
        messages = [{
          role: 'assistant',
          content: `GREETINGS, ${userName.toUpperCase()}.\n\nSHALL WE PLAY A GAME?`,
          timestamp: Date.now()
        }];
        return;
      }

      if (commandResult.output === '__SCAN__') {
        messages = [...messages, {
          role: 'assistant',
          content: 'INITIATING VISUAL SCAN...',
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
              ? `MEMORY PURGED: REMOVED ENTRIES CONTAINING "${keyword.toUpperCase()}"`
              : `NO MEMORIES FOUND CONTAINING "${keyword.toUpperCase()}"`,
            timestamp: Date.now()
          }];
        } catch (e) {
          messages = [...messages, {
            role: 'system',
            content: 'ERROR: FAILED TO MODIFY MEMORY BANKS.',
            timestamp: Date.now()
          }];
        }
        return;
      }

      // Regular command output
      messages = [...messages, {
        role: 'assistant',
        content: commandResult.output,
        timestamp: Date.now()
      }];
      return;
    }

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
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="message-area" bind:this={messagesContainer} onclick={() => hiddenInput?.focus()}>
        {#each messages as message, i}
          {@const prevMessage = messages[i - 1]}
          {@const isNewSpeaker = !prevMessage || prevMessage.role !== message.role}
          <div class="terminal-line {message.role}" class:new-speaker={isNewSpeaker}>
            <span class="msg-content">
              {#if message.role === 'user'}<span class="user-prefix">&gt; </span>{/if}{message.content}{#if message.role === 'assistant' && isLoading && i === messages.length - 1}<span class="loading-cursor">█</span>{/if}
            </span>
            <span class="timestamp">{new Date(message.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        {/each}

        <!-- Input line at bottom -->
        {#if !isLoading}
          {@const lastMsg = messages[messages.length - 1]}
          {@const isNewSpeaker = !lastMsg || lastMsg.role !== 'user'}
          <div class="terminal-line user input-line" class:new-speaker={isNewSpeaker}>
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
</div>

<style>
  .assistant-mode {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .message-area {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 1rem 1.5rem 1rem 2.5rem;
    cursor: text;
    font-family: var(--font-mono);
  }

  /* Terminal line - like old WOPR */
  .terminal-line {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    font-size: 0.95rem;
    line-height: 1.5;
    margin-bottom: 0.2rem;
    width: 100%;
  }

  /* AI responses always uppercase */
  .terminal-line.assistant .msg-content {
    text-transform: uppercase;
  }

  .terminal-line:last-of-type {
    margin-bottom: 0;
  }

  /* Add extra space when speaker changes */
  .terminal-line.new-speaker {
    margin-top: 0.6rem;
  }

  .terminal-line.new-speaker:first-child {
    margin-top: 0;
  }

  .timestamp {
    color: rgba(255, 255, 255, 0.7);
    flex-shrink: 0;
    font-size: 0.95rem;
    align-self: flex-start;
    padding-top: 0.05rem;
    font-family: 'Courier New', 'Lucida Console', monospace;
    letter-spacing: 0.12em;
    font-weight: bold;
  }

  .msg-content {
    color: var(--text-primary);
    text-shadow: 0 0 10px rgba(0, 255, 65, 0.6), 0 0 20px rgba(0, 255, 65, 0.3);
    white-space: pre-wrap;
    word-break: break-word;
    flex: 1;
  }

  /* User messages - white */
  .terminal-line.user .msg-content {
    color: #ffffff;
    text-shadow: 0 0 6px rgba(255, 255, 255, 0.3);
  }

  .user-prefix {
    color: var(--text-primary);
    opacity: 0.6;
  }

  /* System/error messages */
  .terminal-line.system .msg-content {
    color: var(--accent-warning);
    text-shadow: 0 0 8px rgba(255, 170, 0, 0.3);
    text-transform: uppercase;
  }

  /* Input line styling */
  .input-line {
    margin-bottom: 0;
  }

  .typed-text {
    color: #ffffff;
  }

  .input-cursor {
    color: #ffffff;
    animation: cursor-blink 1s step-end infinite;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
  }

  .input-cursor-idle {
    color: var(--text-dim);
  }

  .loading-cursor {
    animation: cursor-blink 0.5s step-end infinite;
    color: var(--text-primary);
    text-shadow: 0 0 10px rgba(0, 255, 65, 0.8);
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

  </style>
