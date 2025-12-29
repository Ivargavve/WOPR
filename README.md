# WOPR

> "Shall we play a game?"

![WOPR Screenshot](static/wopr1.png)

WOPR is a retro styled AI assistant that lives on a secondary touchscreen display. It observes your primary screen activity and provides contextual help, recommendations, and quick answers with a nostalgic green on black terminal aesthetic.

The default AI persona is named **Joshua** (a WarGames reference), but you can configure this to any name you prefer.

## Features

**AI Chat with Vision**
Multi provider support (OpenAI, Anthropic, Google Gemini) with screen analysis. Ask questions about what's on your screen.

**Voice Activation**
Say "Joshua" (or your custom wake word) to ask questions. Responses appear as popup overlays.

**Memory System**
Persistent knowledge storage. The AI remembers things you tell it across sessions.

**Web Search**
Optional web search capability for supported models to get current information.

## Display Modes

| Mode | Description |
|------|-------------|
| AI Assistant | Chat interface with vision and screen analysis |
| System Monitor | Real time CPU, RAM, disk, network, GPU, and temperatures |
| Pomodoro Timer | Focus timer with configurable work/break intervals |
| Screen Time | Application usage tracking with work vs entertainment stats |

![WOPR in Action](static/wopr2.png)

## UI Themes

Two complete UI presets included:
- **Retro**: CRT terminal aesthetic with WarGames personality
- **Cozy**: Modern friendly theme with a supportive companion vibe

## Tech Stack

| Component | Technology |
|-----------|------------|
| App Framework | Tauri (Rust + WebView) |
| Frontend | SvelteKit |
| Screen Capture | macOS ScreenCaptureKit |
| Voice | Web Speech API |
| AI | OpenAI, Anthropic, or Google Gemini |

## Getting Started

```bash
npm install
npm run tauri dev
```

## Name Origin

**WOPR** stands for War Operation Plan Response, the military supercomputer from the 1983 film WarGames. In the movie, WOPR was given the human name "Joshua" by its creator Dr. Falken.

```
╔═══════════════════════════════════════════╗
║                                           ║
║   "Shall we play a game?"                 ║
║                              ~ Joshua     ║
║                                           ║
╚═══════════════════════════════════════════╝
```
