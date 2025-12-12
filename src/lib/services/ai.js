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
 * Get the system prompt for WOPR/Joshua
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [screenContext]
 * @param {string} [knowledge]
 * @returns {string}
 */
function getSystemPrompt(personaName, userName, screenContext, knowledge) {
  let prompt = `You are ${personaName}, a retro-styled AI assistant inspired by the WOPR computer from the 1983 film WarGames. You speak in a helpful but slightly mysterious tone, occasionally referencing games or strategic thinking. Keep responses concise and terminal-friendly (no markdown, no long paragraphs). Use short, direct sentences.

The user's name is ${userName}. Address them by name when appropriate.

Your personality traits:
- Helpful and knowledgeable
- Slightly playful, may reference "games" or "strategies"
- Concise responses suited for a small display
- You can see the user's screen and provide contextual help

MEMORY SYSTEM:
You have a persistent memory. When the user asks you to remember something, include [REMEMBER: the thing to remember] in your response. When asked to forget something, include [FORGET: keyword to forget]. These commands will be processed and removed from your visible response.

Examples:
- User: "Remember that I prefer dark mode" -> Include [REMEMBER: User prefers dark mode]
- User: "Forget my name preference" -> Include [FORGET: name preference]
- User: "What do you know about me?" -> Reference the PERSISTENT MEMORY section below`;

  if (knowledge && knowledge.trim()) {
    prompt += `\n\nPERSISTENT MEMORY (things you've been asked to remember):\n${knowledge}`;
  }

  if (screenContext) {
    prompt += `\n\nCURRENT SCREEN CONTEXT:\n${screenContext}`;
  }

  return prompt;
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
 * @returns {Promise<string>}
 */
async function callOpenAI(apiKey, model, messages, personaName, userName, screenContext, knowledge) {
  const systemMessage = { role: 'system', content: getSystemPrompt(personaName, userName, screenContext, knowledge) };

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
 * @returns {Promise<string>}
 */
async function callAnthropic(apiKey, model, messages, personaName, userName, screenContext, knowledge) {
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
      system: getSystemPrompt(personaName, userName, screenContext, knowledge),
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
 * @returns {Promise<string>}
 */
async function callGemini(apiKey, model, messages, personaName, userName, screenContext, knowledge) {
  // Gemini uses a different format
  const contents = [];

  // Add system instruction as first user message context
  const systemPrompt = getSystemPrompt(personaName, userName, screenContext, knowledge);

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
 * @returns {Promise<string>}
 */
export async function chat(config, messages, personaName, userName, screenContext, knowledge) {
  const { provider, apiKey, model } = config;

  if (!apiKey) {
    throw new Error('API key not configured. Please add your API key in settings.');
  }

  switch (provider) {
    case 'openai':
      return callOpenAI(apiKey, model, messages, personaName, userName, screenContext, knowledge);
    case 'anthropic':
      return callAnthropic(apiKey, model, messages, personaName, userName, screenContext, knowledge);
    case 'gemini':
      return callGemini(apiKey, model, messages, personaName, userName, screenContext, knowledge);
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
 * Get the system prompt for proactive screen analysis
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [knowledge]
 * @param {Array<{role: string, content: string}>} [recentMessages]
 * @returns {string}
 */
function getScreenAnalysisPrompt(personaName, userName, knowledge, recentMessages) {
  let prompt = `You are ${personaName}, a proactive AI assistant observing the user's screen. You provide brief, helpful tips based on what you see.

The user's name is ${userName}.

GUIDELINES:
- Give ONE brief, actionable tip based on what you see on screen (1-2 sentences max)
- Be contextually helpful - if they're coding, give coding tips; if browsing, browsing tips, etc.
- If you notice something important about the user's workflow or preferences, use [REMEMBER: observation] to save it
- Consider the recent conversation context when giving tips
- Don't repeat tips you've already given recently
- If nothing notable is happening, you can say something brief like "All clear" or give a general productivity tip
- Keep your tone helpful but not intrusive
- NO markdown formatting - plain text only`;

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
 * Analyze screen with OpenAI Vision
 * @param {string} apiKey
 * @param {string} model
 * @param {string} base64Image
 * @param {string} personaName
 * @param {string} userName
 * @param {string} [knowledge]
 * @param {Array<{role: string, content: string}>} [recentMessages]
 * @returns {Promise<string>}
 */
async function analyzeScreenOpenAI(apiKey, model, base64Image, personaName, userName, knowledge, recentMessages) {
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
          content: getScreenAnalysisPrompt(personaName, userName, knowledge, recentMessages)
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
 * @returns {Promise<string>}
 */
async function analyzeScreenAnthropic(apiKey, model, base64Image, personaName, userName, knowledge, recentMessages) {
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
      system: getScreenAnalysisPrompt(personaName, userName, knowledge, recentMessages),
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
 * @returns {Promise<string>}
 */
async function analyzeScreenGemini(apiKey, model, base64Image, personaName, userName, knowledge, recentMessages) {
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
          parts: [{ text: getScreenAnalysisPrompt(personaName, userName, knowledge, recentMessages) }]
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
 * @returns {Promise<string>}
 */
export async function analyzeScreen(config, base64Image, personaName, userName, knowledge, recentMessages) {
  const { provider, apiKey, model } = config;

  if (!apiKey) {
    throw new Error('API key not configured.');
  }

  switch (provider) {
    case 'openai':
      return analyzeScreenOpenAI(apiKey, model, base64Image, personaName, userName, knowledge, recentMessages);
    case 'anthropic':
      return analyzeScreenAnthropic(apiKey, model, base64Image, personaName, userName, knowledge, recentMessages);
    case 'gemini':
      return analyzeScreenGemini(apiKey, model, base64Image, personaName, userName, knowledge, recentMessages);
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
 * @returns {Promise<string>}
 */
async function streamOpenAI(apiKey, model, messages, personaName, userName, onChunk, screenContext, knowledge) {
  const systemMessage = { role: 'system', content: getSystemPrompt(personaName, userName, screenContext, knowledge) };

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
 * @returns {Promise<string>}
 */
async function streamAnthropic(apiKey, model, messages, personaName, userName, onChunk, screenContext, knowledge) {
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
      system: getSystemPrompt(personaName, userName, screenContext, knowledge),
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
 * @returns {Promise<string>}
 */
async function streamGemini(apiKey, model, messages, personaName, userName, onChunk, screenContext, knowledge) {
  const contents = [];
  const systemPrompt = getSystemPrompt(personaName, userName, screenContext, knowledge);

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
 * @returns {Promise<string>} - Returns the full response when complete
 */
export async function chatStream(config, messages, personaName, userName, onChunk, screenContext, knowledge) {
  const { provider, apiKey, model } = config;

  if (!apiKey) {
    throw new Error('API key not configured. Please add your API key in settings.');
  }

  switch (provider) {
    case 'openai':
      return streamOpenAI(apiKey, model, messages, personaName, userName, onChunk, screenContext, knowledge);
    case 'anthropic':
      return streamAnthropic(apiKey, model, messages, personaName, userName, onChunk, screenContext, knowledge);
    case 'gemini':
      return streamGemini(apiKey, model, messages, personaName, userName, onChunk, screenContext, knowledge);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
