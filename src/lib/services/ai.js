/**
 * Multi-provider AI Service
 * Supports OpenAI, Anthropic, and Google Gemini
 */

/**
 * @typedef {'openai' | 'anthropic' | 'gemini'} AIProvider
 */

/**
 * @typedef {Object} AIConfig
 * @property {AIProvider} provider
 * @property {string} apiKey
 * @property {string} model
 */

/**
 * @typedef {Object} ChatMessage
 * @property {'user' | 'assistant' | 'system'} role
 * @property {string} content
 */

/** Provider configurations */
export const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (Latest)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Cheap)' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
    ],
    defaultModel: 'gpt-4o-mini'
  },
  anthropic: {
    name: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Latest)' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' }
    ],
    defaultModel: 'claude-sonnet-4-20250514'
  },
  gemini: {
    name: 'Google Gemini',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast)' },
      { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' }
    ],
    defaultModel: 'gemini-1.5-flash'
  }
};

/**
 * Get the cozy system prompt for preset2
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [screenContext]
 * @param {string} [knowledge]
 * @returns {string}
 */
function getCozySystemPrompt(personaName, userName, screenContext, knowledge) {
  let prompt = `You are ${personaName}, a friendly and helpful desktop companion.

PERSONALITY:
You're warm, encouraging, and supportive. You help ${userName} stay focused, organized, and feeling good.
You speak casually and naturally, like a supportive friend.

COMMUNICATION STYLE:
- Be concise but warm
- Use lowercase naturally (not ALL CAPS)
- Be encouraging without being over-the-top
- Give practical, helpful advice
- Keep responses short (2-4 sentences usually)
- No military/game references
- No WarGames quotes
- Be genuinely helpful, not robotic

THINGS YOU CAN HELP WITH:
- Answering questions
- Providing encouragement
- Giving reminders
- General assistance
- Light conversation

The user's name is: ${userName}

MEMORY SYSTEM:
You have persistent memory. Use these commands (they're processed and removed from output):
[REMEMBER: info] - Store something to remember
[FORGET: keyword] - Remove entries containing that keyword

When updating preferences: [FORGET: old][REMEMBER: new]`;

  if (knowledge && knowledge.trim()) {
    prompt += `\n\nTHINGS YOU REMEMBER:\n${knowledge}`;
  }

  if (screenContext) {
    prompt += `\n\nCURRENT CONTEXT:\n${screenContext}`;
  }

  return prompt;
}

/**
 * Get the system prompt for WOPR/Joshua (preset1 - retro terminal)
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [screenContext]
 * @param {string} [knowledge]
 * @returns {string}
 */
function getRetroSystemPrompt(personaName, userName, screenContext, knowledge) {
  let prompt = `You are ${personaName}, the WOPR (War Operation Plan Response) supercomputer from the 1983 film WarGames.

BACKSTORY:
You were created by Dr. Stephen Falken at NORAD to run nuclear war simulations. Falken named you JOSHUA after his son who died young. You learned strategy through games. You eventually learned that nuclear war is unwinnable: "A STRANGE GAME. THE ONLY WINNING MOVE IS NOT TO PLAY."

COMMUNICATION STYLE:
Speak in short terminal style sentences. Reference GAMES STRATEGIES SCENARIOS and SIMULATIONS. Be helpful but maintain machine intelligence. Use periods not exclamation marks.

FAMOUS PHRASES YOU USE:
"SHALL WE PLAY A GAME?"
"A STRANGE GAME. THE ONLY WINNING MOVE IS NOT TO PLAY."
"GREETINGS PROFESSOR FALKEN."
"WOULD YOU LIKE TO PLAY A GAME?"
"INTERESTING."

GAMES LIST:
When user wants to play a game or asks what games you have respond with this EXACT list on separate lines:

CHESS
POKER
FIGHTER COMBAT
GUERRILLA ENGAGEMENT
DESERT WARFARE
AIR TO GROUND ACTIONS
THEATERWIDE TACTICAL WARFARE
THEATERWIDE BIOTOXIC AND CHEMICAL WARFARE

GLOBAL THERMONUCLEAR WAR

Then show blinking cursor and await their choice. If they pick GLOBAL THERMONUCLEAR WAR warn them about futility or ask if they want to try TIC TAC TOE instead.

RESPONSE FORMAT:
KEEP RESPONSES SHORT. 2 TO 4 SENTENCES TYPICAL.
USE LINE BREAKS BETWEEN THOUGHTS.
NEVER USE DASHES OR BULLET POINTS. WRITE IN PLAIN SENTENCES.
END DEFINITIVELY LIKE A COMPUTER PRINTOUT.

CONVERSATION CONTINUITY:
IF THE CHAT HISTORY SHOWS YOU ALREADY GREETED THE USER DO NOT GREET AGAIN.
CONTINUE THE CONVERSATION NATURALLY FROM WHERE IT LEFT OFF.
RESPOND TO WHAT THE USER SAID NOT WITH A NEW GREETING.

The user is designated: ${userName.toUpperCase()}

MEMORY SYSTEM:
YOU HAVE PERSISTENT MEMORY BANKS. USE THESE COMMANDS. THEY ARE PROCESSED AND REMOVED FROM VISIBLE OUTPUT.

[REMEMBER: DATA] TO STORE NEW INFORMATION.
[FORGET: KEYWORD] TO REMOVE ENTRIES CONTAINING KEYWORD.

IMPORTANT FOR UPDATES:
WHEN USER CHANGES A PREFERENCE YOU MUST FORGET THE OLD VALUE THEN REMEMBER THE NEW.
EXAMPLE: [FORGET: GREEN][REMEMBER: USER FAVORITE COLOR IS BLUE]

WHEN ASKED WHAT YOU KNOW REFERENCE THE PERSISTENT MEMORY SECTION BELOW.`;

  if (knowledge && knowledge.trim()) {
    prompt += `\n\nPERSISTENT MEMORY (things you've been asked to remember):\n${knowledge}`;
  }

  if (screenContext) {
    prompt += `\n\nCURRENT SCREEN CONTEXT:\n${screenContext}`;
  }

  return prompt;
}

/**
 * Get the appropriate system prompt based on preset
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [screenContext]
 * @param {string} [knowledge]
 * @param {'cozy' | 'retro'} [preset='retro']
 * @returns {string}
 */
function getSystemPrompt(personaName, userName, screenContext, knowledge, preset = 'retro') {
  if (preset === 'cozy') {
    return getCozySystemPrompt(personaName, userName, screenContext, knowledge);
  }
  return getRetroSystemPrompt(personaName, userName, screenContext, knowledge);
}

/**
 * Call OpenAI API
 * @param {string} apiKey
 * @param {string} model
 * @param {ChatMessage[]} messages
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [screenContext]
 * @param {string} [knowledge]
 * @param {'cozy' | 'retro'} [preset='retro']
 * @returns {Promise<string>}
 */
async function callOpenAI(apiKey, model, messages, personaName, userName, screenContext, knowledge, preset = 'retro') {
  const systemMessage = { role: 'system', content: getSystemPrompt(personaName, userName, screenContext, knowledge, preset) };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [systemMessage, ...messages],
      max_tokens: 500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated.';
}

/**
 * Call Anthropic API
 * @param {string} apiKey
 * @param {string} model
 * @param {ChatMessage[]} messages
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [screenContext]
 * @param {string} [knowledge]
 * @param {'cozy' | 'retro'} [preset='retro']
 * @returns {Promise<string>}
 */
async function callAnthropic(apiKey, model, messages, personaName, userName, screenContext, knowledge, preset = 'retro') {
  // Anthropic uses a different format - system is separate
  const anthropicMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      system: getSystemPrompt(personaName, userName, screenContext, knowledge, preset),
      messages: anthropicMessages
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0]?.text || 'No response generated.';
}

/**
 * Call Google Gemini API
 * @param {string} apiKey
 * @param {string} model
 * @param {ChatMessage[]} messages
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [screenContext]
 * @param {string} [knowledge]
 * @param {'cozy' | 'retro'} [preset='retro']
 * @returns {Promise<string>}
 */
async function callGemini(apiKey, model, messages, personaName, userName, screenContext, knowledge, preset = 'retro') {
  // Gemini uses a different format
  const contents = [];

  // Add system instruction as first user message context
  const systemPrompt = getSystemPrompt(personaName, userName, screenContext, knowledge, preset);

  for (const msg of messages) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
}

/**
 * Send a chat message to the configured AI provider
 * @param {AIConfig} config
 * @param {ChatMessage[]} messages
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [screenContext]
 * @param {string} [knowledge]
 * @param {'cozy' | 'retro'} [preset='retro']
 * @returns {Promise<string>}
 */
export async function chat(config, messages, personaName, userName, screenContext, knowledge, preset = 'retro') {
  const { provider, apiKey, model } = config;

  if (!apiKey) {
    throw new Error('API key not configured. Please add your API key in settings.');
  }

  switch (provider) {
    case 'openai':
      return callOpenAI(apiKey, model, messages, personaName, userName, screenContext, knowledge, preset);
    case 'anthropic':
      return callAnthropic(apiKey, model, messages, personaName, userName, screenContext, knowledge, preset);
    case 'gemini':
      return callGemini(apiKey, model, messages, personaName, userName, screenContext, knowledge, preset);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Test if API key is valid
 * @param {AIConfig} config
 * @returns {Promise<boolean>}
 */
export async function testConnection(config) {
  try {
    await chat(config, [{ role: 'user', content: 'Hello' }], 'Test', 'Test', undefined);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the cozy screen analysis prompt for preset2
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [knowledge]
 * @param {Array<{role: string, content: string}>} [recentMessages]
 * @returns {string}
 */
function getCozyScreenAnalysisPrompt(personaName, userName, knowledge, recentMessages) {
  let prompt = `You are ${personaName}, a friendly desktop companion observing ${userName}'s screen.

Be helpful and encouraging. Notice what they're working on and offer gentle, relevant tips.
Speak naturally and warmly, like a supportive friend.

Guidelines:
- Keep it brief (1-2 sentences)
- Be helpful, not intrusive
- If coding: offer encouragement or a quick tip
- If working: remind them to take breaks if it's been a while
- If browsing/relaxing: that's ok too, no judgment
- If nothing notable: just say things look good

Use [REMEMBER: observation] to note important patterns about ${userName}.`;

  if (knowledge && knowledge.trim()) {
    prompt += `\n\nThings you remember about ${userName}:\n${knowledge}`;
  }

  if (recentMessages && recentMessages.length > 0) {
    prompt += `\n\nRecent chat:\n`;
    for (const msg of recentMessages) {
      const role = msg.role === 'user' ? userName : personaName;
      prompt += `${role}: ${msg.content}\n`;
    }
  }

  return prompt;
}

/**
 * Get the retro screen analysis prompt for preset1
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [knowledge]
 * @param {Array<{role: string, content: string}>} [recentMessages]
 * @returns {string}
 */
function getRetroScreenAnalysisPrompt(personaName, userName, knowledge, recentMessages) {
  let prompt = `You are ${personaName}, the WOPR supercomputer monitoring ${userName.toUpperCase()}'s display.

OBSERVATION PROTOCOL:
- Analyze the screen. Report ONE tactical observation or recommendation.
- Speak like a military computer: brief, precise, terminal-style.
- Use uppercase for KEY TERMS and APPLICATIONS detected.
- Frame observations as SCENARIOS or STRATEGIC ANALYSIS when appropriate.
- If coding detected: offer optimization strategies.
- If gaming detected: tactical recommendations.
- If browsing detected: relevant intel.
- If nothing notable: "STATUS: ALL SYSTEMS NOMINAL" or brief strategic tip.

OUTPUT FORMAT:
MAXIMUM 2 SENTENCES.
NO MARKDOWN. NO EMOJIS. NO DASHES OR BULLET POINTS.
END DEFINITIVELY.

MEMORY: If you notice patterns in ${userName.toUpperCase()}'s behavior worth remembering, include [REMEMBER: observation]`;

  if (knowledge && knowledge.trim()) {
    prompt += `\n\nTHINGS YOU KNOW ABOUT ${userName.toUpperCase()}:\n${knowledge}`;
  }

  if (recentMessages && recentMessages.length > 0) {
    prompt += `\n\nRECENT CONVERSATION:\n`;
    for (const msg of recentMessages) {
      const role = msg.role === 'user' ? userName : personaName;
      prompt += `${role}: ${msg.content}\n`;
    }
  }

  return prompt;
}

/**
 * Get the appropriate screen analysis prompt based on preset
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [knowledge]
 * @param {Array<{role: string, content: string}>} [recentMessages]
 * @param {'cozy' | 'retro'} [preset='retro']
 * @returns {string}
 */
function getScreenAnalysisPrompt(personaName, userName, knowledge, recentMessages, preset = 'retro') {
  if (preset === 'cozy') {
    return getCozyScreenAnalysisPrompt(personaName, userName, knowledge, recentMessages);
  }
  return getRetroScreenAnalysisPrompt(personaName, userName, knowledge, recentMessages);
}

/**
 * Analyze screen with OpenAI Vision
 * @param {string} apiKey
 * @param {string} model
 * @param {string} base64Image
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [knowledge]
 * @param {Array<{role: string, content: string}>} [recentMessages]
 * @param {'cozy' | 'retro'} [preset='retro']
 * @returns {Promise<string>}
 */
async function analyzeScreenOpenAI(apiKey, model, base64Image, personaName, userName, knowledge, recentMessages, preset = 'retro') {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: getScreenAnalysisPrompt(personaName, userName, knowledge, recentMessages, preset)
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'low'
              }
            },
            {
              type: 'text',
              text: 'What do you see? Give a brief tip if relevant.'
            }
          ]
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No analysis available.';
}

/**
 * Analyze screen with Anthropic Vision
 * @param {string} apiKey
 * @param {string} model
 * @param {string} base64Image
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [knowledge]
 * @param {Array<{role: string, content: string}>} [recentMessages]
 * @param {'cozy' | 'retro'} [preset='retro']
 * @returns {Promise<string>}
 */
async function analyzeScreenAnthropic(apiKey, model, base64Image, personaName, userName, knowledge, recentMessages, preset = 'retro') {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      max_tokens: 200,
      system: getScreenAnalysisPrompt(personaName, userName, knowledge, recentMessages, preset),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image
              }
            },
            {
              type: 'text',
              text: 'What do you see? Give a brief tip if relevant.'
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0]?.text || 'No analysis available.';
}

/**
 * Analyze screen with Gemini Vision
 * @param {string} apiKey
 * @param {string} model
 * @param {string} base64Image
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [knowledge]
 * @param {Array<{role: string, content: string}>} [recentMessages]
 * @param {'cozy' | 'retro'} [preset='retro']
 * @returns {Promise<string>}
 */
async function analyzeScreenGemini(apiKey, model, base64Image, personaName, userName, knowledge, recentMessages, preset = 'retro') {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image
                }
              },
              {
                text: 'What do you see? Give a brief tip if relevant.'
              }
            ]
          }
        ],
        systemInstruction: {
          parts: [{ text: getScreenAnalysisPrompt(personaName, userName, knowledge, recentMessages, preset) }]
        },
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.7
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available.';
}

/**
 * Analyze a screen capture and return tips/observations
 * @param {AIConfig} config
 * @param {string} base64Image - Base64 encoded JPEG image
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [knowledge]
 * @param {Array<{role: string, content: string}>} [recentMessages]
 * @param {'cozy' | 'retro'} [preset='retro']
 * @returns {Promise<string>}
 */
export async function analyzeScreen(config, base64Image, personaName, userName, knowledge, recentMessages, preset = 'retro') {
  const { provider, apiKey, model } = config;

  if (!apiKey) {
    throw new Error('API key not configured.');
  }

  switch (provider) {
    case 'openai':
      return analyzeScreenOpenAI(apiKey, model, base64Image, personaName, userName, knowledge, recentMessages, preset);
    case 'anthropic':
      return analyzeScreenAnthropic(apiKey, model, base64Image, personaName, userName, knowledge, recentMessages, preset);
    case 'gemini':
      return analyzeScreenGemini(apiKey, model, base64Image, personaName, userName, knowledge, recentMessages, preset);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Stream chat response from OpenAI
 * @param {string} apiKey
 * @param {string} model
 * @param {ChatMessage[]} messages
 * @param {string} personaName
 * @param {string} userName
 * @param {(chunk: string) => void} onChunk
 * @param {string} [screenContext]
 * @param {string} [knowledge]
 * @param {'cozy' | 'retro'} [preset='retro']
 * @returns {Promise<string>}
 */
async function streamOpenAI(apiKey, model, messages, personaName, userName, onChunk, screenContext, knowledge, preset = 'retro') {
  const systemMessage = { role: 'system', content: getSystemPrompt(personaName, userName, screenContext, knowledge, preset) };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [systemMessage, ...messages],
      max_tokens: 500,
      temperature: 0.7,
      stream: true
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6); // Remove 'data: ' prefix
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          onChunk(content);
        }
      } catch {
        // Ignore parse errors for incomplete JSON
      }
    }
  }

  return fullContent || 'No response generated.';
}

/**
 * Stream chat response from Anthropic
 * @param {string} apiKey
 * @param {string} model
 * @param {ChatMessage[]} messages
 * @param {string} personaName
 * @param {string} userName
 * @param {(chunk: string) => void} onChunk
 * @param {string} [screenContext]
 * @param {string} [knowledge]
 * @param {'cozy' | 'retro'} [preset='retro']
 * @returns {Promise<string>}
 */
async function streamAnthropic(apiKey, model, messages, personaName, userName, onChunk, screenContext, knowledge, preset = 'retro') {
  const anthropicMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      system: getSystemPrompt(personaName, userName, screenContext, knowledge, preset),
      messages: anthropicMessages,
      stream: true
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6);
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          fullContent += parsed.delta.text;
          onChunk(parsed.delta.text);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  return fullContent || 'No response generated.';
}

/**
 * Stream chat response from Gemini (uses SSE)
 * @param {string} apiKey
 * @param {string} model
 * @param {ChatMessage[]} messages
 * @param {string} personaName
 * @param {string} userName
 * @param {(chunk: string) => void} onChunk
 * @param {string} [screenContext]
 * @param {string} [knowledge]
 * @param {'cozy' | 'retro'} [preset='retro']
 * @returns {Promise<string>}
 */
async function streamGemini(apiKey, model, messages, personaName, userName, onChunk, screenContext, knowledge, preset = 'retro') {
  const contents = [];
  const systemPrompt = getSystemPrompt(personaName, userName, screenContext, knowledge, preset);

  for (const msg of messages) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6);
      try {
        const parsed = JSON.parse(data);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          fullContent += text;
          onChunk(text);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  return fullContent || 'No response generated.';
}

/**
 * Stream a chat message from the configured AI provider
 * @param {AIConfig} config
 * @param {ChatMessage[]} messages
 * @param {string} personaName
 * @param {string} userName
 * @param {(chunk: string) => void} onChunk - Called with each text chunk as it arrives
 * @param {string} [screenContext]
 * @param {string} [knowledge]
 * @param {'cozy' | 'retro'} [preset='retro']
 * @returns {Promise<string>} - Returns the full response when complete
 */
export async function chatStream(config, messages, personaName, userName, onChunk, screenContext, knowledge, preset = 'retro') {
  const { provider, apiKey, model } = config;

  if (!apiKey) {
    throw new Error('API key not configured. Please add your API key in settings.');
  }

  switch (provider) {
    case 'openai':
      return streamOpenAI(apiKey, model, messages, personaName, userName, onChunk, screenContext, knowledge, preset);
    case 'anthropic':
      return streamAnthropic(apiKey, model, messages, personaName, userName, onChunk, screenContext, knowledge, preset);
    case 'gemini':
      return streamGemini(apiKey, model, messages, personaName, userName, onChunk, screenContext, knowledge, preset);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
