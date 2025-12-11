# WOPR Implementation Guide

> Technical specification for Claude Code to build WOPR

---

## Overview

WOPR is a retro styled AI desktop assistant for Windows that runs on a secondary display. It observes the user's screen, provides contextual help, and learns over time. The default AI persona is named "Joshua" (a WarGames reference), but users can configure this to any name they prefer.

**Reference Document:** `WOPR_AI_ASSISTANT.md` contains the full feature specification and UI mockups.

---

## Technical Constraints

| Constraint | Value |
|------------|-------|
| Platform | **Windows only** |
| Framework | **Tauri + Svelte** |
| AI Backend | **Google Gemini API** |
| Storage | **Local files only** (no database, no cloud sync) |
| Cost | **Free** (except Gemini API usage) |

---

## Tech Stack

```
┌─────────────────────────────────────────┐
│           WOPR Application              │
├─────────────────────────────────────────┤
│  Frontend: Svelte + CSS                 │
│  Backend:  Tauri (Rust)                 │
├─────────────────────────────────────────┤
│  Screen Capture: Windows DXGI / GDI     │
│  OCR: Tesseract.js or Windows OCR API   │
│  Voice: Web Speech API / Whisper.cpp    │
│  AI: Google Gemini API                  │
│  Storage: YAML + JSON + Markdown files  │
└─────────────────────────────────────────┘
```

---

## Folder Structure

### Project Structure
```
wopr/
├── src/
│   ├── lib/
│   │   ├── components/        # Svelte UI components
│   │   │   ├── modes/         # Each display mode
│   │   │   │   ├── AIAssistant.svelte
│   │   │   │   ├── SystemMonitor.svelte
│   │   │   │   ├── MusicPlayer.svelte
│   │   │   │   ├── PomodoroTimer.svelte
│   │   │   │   ├── ChatHub.svelte
│   │   │   │   └── ControlDeck.svelte
│   │   │   ├── shared/        # Reusable components
│   │   │   └── overlays/      # Popups, voice response, etc.
│   │   ├── stores/            # Svelte stores (state management)
│   │   ├── services/          # Core services
│   │   │   ├── gemini.ts      # Gemini API client
│   │   │   ├── screenCapture.ts
│   │   │   ├── ocr.ts
│   │   │   ├── voice.ts
│   │   │   ├── windowDetector.ts
│   │   │   └── storage.ts
│   │   ├── plugins/           # Plugin loader system
│   │   └── utils/
│   ├── routes/
│   │   └── +page.svelte       # Main app entry
│   ├── app.css                # Retro terminal styling
│   └── app.html
├── src-tauri/
│   ├── src/
│   │   ├── main.rs            # Tauri entry point
│   │   ├── commands/          # Tauri commands (Rust)
│   │   │   ├── screen.rs      # Screen capture
│   │   │   ├── window.rs      # Window detection
│   │   │   ├── system.rs      # System stats (CPU, RAM, etc.)
│   │   │   └── autostart.rs   # Launch on startup
│   │   └── lib.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── static/
│   └── fonts/                 # Monospace fonts
└── package.json
```

### User Data Folders (Created at Runtime)
```
C:\Users\{user}\AppData\Local\WOPR\
├── config\                    # User managed
│   ├── config.yaml            # Main settings
│   ├── plugins\
│   │   ├── league-of-legends\
│   │   │   ├── plugin.yaml
│   │   │   ├── joshua-guide.md
│   │   │   └── assets\
│   │   ├── vscode\
│   │   └── browser\
│   ├── buttons\
│   │   └── deck-pages.yaml
│   └── scripts\
│
└── brain\                     # WOPR managed (AI writes here)
    ├── observations\
    │   └── {date}.md          # Daily observations
    ├── learned\
    │   ├── {plugin-name}.md   # Per app learned preferences
    │   └── general.md         # General user patterns
    ├── insights\
    │   └── patterns.md
    └── context\
        └── recent.md          # Rolling context for AI
```

---

## Implementation Stages

Each stage is designed to be **independently runnable by a Claude subagent**. Stages can be parallelized where noted.

---

### Stage 1: Project Scaffold
**Subagent task:** Set up the base Tauri + Svelte project

**Tasks:**
- [ ] Initialize Tauri project with Svelte template
- [ ] Configure `tauri.conf.json` for Windows
- [ ] Set up folder structure as specified above
- [ ] Add base dependencies to `package.json` and `Cargo.toml`
- [ ] Create basic app shell that opens a window

**Commands to run:**
```bash
npm create tauri-app@latest wopr -- --template svelte
cd wopr
npm install
```

**Dependencies to add:**
```json
{
  "devDependencies": {
    "@tauri-apps/cli": "^1.5",
    "svelte": "^4.0"
  },
  "dependencies": {
    "@tauri-apps/api": "^1.5",
    "yaml": "^2.3",
    "@google/generative-ai": "^0.1"
  }
}
```

**Deliverable:** App launches and shows empty window

---

### Stage 2: Retro UI Theme
**Subagent task:** Implement the retro terminal visual style

**Tasks:**
- [ ] Create `app.css` with retro terminal theme
- [ ] Implement color palette from spec:
  - Background: `#0a0a0a`
  - Primary text: `#00ff41` (matrix green)
  - Dim text: `#00aa2a`
  - Accent: `#00ffff` (cyan)
  - Warning: `#ffaa00`
  - Error: `#ff0040`
- [ ] Add monospace font (IBM Plex Mono or JetBrains Mono)
- [ ] Create CSS classes for:
  - CRT scanline effect (optional toggle)
  - Text glow effect
  - Box/panel styling
  - Button styling (touch friendly)
- [ ] Create reusable Svelte components:
  - `<RetroPanel>`
  - `<RetroButton>`
  - `<RetroToggle>`
  - `<RetroProgress>`

**Deliverable:** Styled components that match mockups in `WOPR_AI_ASSISTANT.md`

---

### Stage 3: Window & Display Management
**Subagent task:** Handle window positioning, fullscreen, startup

**Tasks:**
- [ ] Implement window position memory (save/restore)
- [ ] Implement display detection and selection
- [ ] Add window modes: Windowed, Borderless Fullscreen, Fullscreen
- [ ] Implement "Always on Top" toggle
- [ ] Implement "Launch on Startup" using Windows Registry or Startup folder
- [ ] Save window preferences to `config.yaml`

**Tauri APIs to use:**
- `@tauri-apps/api/window` - Window management
- `tauri::api::process` - Autostart

**Deliverable:** App remembers position, can fullscreen on chosen display, auto launches

---

### Stage 4: Storage Service
**Subagent task:** Implement file based storage system

**Tasks:**
- [ ] Create `storage.ts` service
- [ ] Implement config folder management:
  - Read/write `config.yaml`
  - Load plugins from `plugins/` directory
  - Load button configs from `buttons/`
- [ ] Implement brain folder management:
  - Create daily observation files
  - Read/write learned preferences
  - Manage context files
- [ ] Create default config on first launch
- [ ] Allow user to change folder locations in settings

**File formats:**
- Settings: YAML
- Structured data: JSON
- AI readable content: Markdown

**Deliverable:** Full read/write access to both folder structures

---

### Stage 5: Mode System & Navigation
**Subagent task:** Implement the 6 display modes with switching

**Tasks:**
- [ ] Create mode router/switcher
- [ ] Implement mode selector UI (touch grid from spec)
- [ ] Create skeleton components for each mode:
  - `AIAssistant.svelte`
  - `SystemMonitor.svelte`
  - `MusicPlayer.svelte`
  - `PomodoroTimer.svelte`
  - `ChatHub.svelte`
  - `ControlDeck.svelte` (includes Settings)
- [ ] Implement mode transition animations
- [ ] Save last used mode to config

**Deliverable:** Can switch between 6 modes, each showing placeholder content

---

### Stage 6: Settings Panel (Control Deck)
**Subagent task:** Build the settings UI in Control Deck mode

**Tasks:**
- [ ] Implement Settings panel UI matching spec mockups
- [ ] Create toggle components for all settings:
  - Launch on Startup
  - Auto Switch Modes
  - Voice Activation
  - Screen Capture
  - CRT Effects
  - Sound Effects
- [ ] Implement Display settings section:
  - Current display selector
  - Window mode selector
  - Always on Top toggle
- [ ] Implement Storage settings section:
  - Config folder path + browse button
  - Brain folder path + browse button
  - Open folder buttons
- [ ] Implement Auto Switch Rules editor:
  - List current rules
  - Add/edit/delete rules
- [ ] All settings persist to `config.yaml`

**Deliverable:** Fully functional settings panel

---

### Stage 7: Screen Capture & OCR
**Subagent task:** Capture screen and extract text

**Can run in parallel with:** Stage 6, Stage 8

**Tasks:**
- [ ] Implement screen capture using Windows APIs (DXGI or GDI)
- [ ] Create Tauri command for screen capture (Rust side)
- [ ] Implement OCR using either:
  - Windows.Media.Ocr API (native, recommended)
  - Tesseract.js (fallback)
- [ ] Create capture scheduling (configurable interval, default 30s)
- [ ] Implement capture toggle (Vision ON/OFF button)
- [ ] Handle multi monitor (capture primary display only)
- [ ] Privacy: process in memory, never save screenshots

**Rust crates to consider:**
- `screenshots` - Screen capture
- `windows` - Windows API bindings

**Deliverable:** Can capture screen and extract text on interval

---

### Stage 8: Active Window Detection
**Subagent task:** Detect which application is in focus

**Can run in parallel with:** Stage 6, Stage 7

**Tasks:**
- [ ] Implement active window detection (Windows API)
- [ ] Get window title and process name
- [ ] Create Tauri command to poll active window
- [ ] Implement auto switch logic:
  - Match active window against rules in config
  - Trigger mode/plugin switch when match found
- [ ] Implement ignored apps list
- [ ] Add transition delay (prevent flicker on rapid switches)

**Windows APIs:**
- `GetForegroundWindow`
- `GetWindowText`
- `GetWindowThreadProcessId`

**Deliverable:** Auto switches mode when configured apps are detected

---

### Stage 9: Gemini AI Integration
**Subagent task:** Connect to Google Gemini API

**Tasks:**
- [ ] Create `gemini.ts` service
- [ ] Implement API key storage (secure, in config)
- [ ] Create prompt builder that combines:
  - Current screen context (OCR text)
  - Active application info
  - Plugin's `joshua-guide.md` instructions
  - Learned preferences from brain folder
  - Recent context
- [ ] Implement response parsing
- [ ] Add rate limiting / debouncing
- [ ] Handle API errors gracefully
- [ ] Create context window management (don't exceed token limits)

**Gemini specifics:**
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
// Or "gemini-pro-vision" for image input
```

**Deliverable:** Can send context to Gemini and receive recommendations

---

### Stage 10: AI Assistant Mode (Core Experience)
**Subagent task:** Build the main AI Assistant display mode

**Depends on:** Stage 7, 8, 9

**Tasks:**
- [ ] Implement AI Assistant UI matching spec mockups
- [ ] Display current detected application
- [ ] Show AI recommendations in styled panels
- [ ] Update recommendations when:
  - Screen capture runs
  - Active window changes
  - User triggers refresh
- [ ] Implement recommendation history (last few)
- [ ] Add loading states during AI calls

**Deliverable:** Working AI assistant that observes and recommends

---

### Stage 11: Plugin System
**Subagent task:** Load and use application specific plugins

**Depends on:** Stage 10

**Tasks:**
- [ ] Create plugin loader that reads from `config/plugins/`
- [ ] Parse `plugin.yaml` for each plugin:
  ```yaml
  name: "League of Legends"
  match:
    process: ["LeagueClient", "League of Legends"]
    window_title: ["League of Legends"]
  ```
- [ ] Load `joshua-guide.md` as AI instructions
- [ ] Load assets (icons) from plugin's `assets/` folder
- [ ] Pass plugin context to Gemini prompts
- [ ] Create default plugins:
  - League of Legends
  - VS Code
  - Browser (Chrome/Firefox/Edge)

**Deliverable:** Plugins customize AI behavior per application

---

### Stage 12: Voice Activation
**Subagent task:** Implement "Joshua" wake word and voice questions (configurable)

**Can run in parallel with:** Stage 11

**Tasks:**
- [ ] Implement microphone access
- [ ] Implement wake word detection ("Joshua" - configurable)
  - Option 1: Web Speech API (simpler)
  - Option 2: Whisper.cpp (better, local)
- [ ] After wake word, capture full question
- [ ] Send question + current context to Gemini
- [ ] Display response in popup overlay (matching spec mockup)
- [ ] Auto dismiss popup after timeout or tap
- [ ] Implement Mic ON/OFF toggle

**Deliverable:** Say "Joshua, [question]" and get spoken answers displayed

---

### Stage 13: Brain & Learning System
**Subagent task:** Implement WOPR's memory and learning

**Depends on:** Stage 9, 10

**Tasks:**
- [ ] Create daily observation writer:
  - Log app usage times
  - Log AI interactions
  - Summarize at end of day
- [ ] Implement preference learning:
  - Track user choices
  - Ask Gemini to identify patterns
  - Write insights to `learned/*.md`
- [ ] Create context builder that includes learned preferences
- [ ] Implement "recent context" rolling window
- [ ] Add "Clear Brain" option in settings

**Deliverable:** WOPR remembers and improves over time

---

### Stage 14: System Monitor Mode
**Subagent task:** Build the system stats display

**Can run in parallel with:** Stage 12, 13

**Tasks:**
- [ ] Get system stats via Tauri/Rust:
  - CPU usage (total + per core)
  - CPU temperature
  - RAM usage
  - GPU usage + temperature (if available)
  - Disk usage
  - Network speed
- [ ] Create retro gauge/bar visualizations
- [ ] Implement configurable display (show/hide each stat)
- [ ] Update stats on interval (1-2 seconds)

**Rust crates:**
- `sysinfo` - Cross platform system info
- `nvml-wrapper` - NVIDIA GPU stats

**Deliverable:** Real time system monitor with retro styling

---

### Stage 15: Music Player Mode
**Subagent task:** Control and display music from running apps

**Can run in parallel with:** Stage 14

**Tasks:**
- [ ] Detect running music apps (Spotify, etc.)
- [ ] Get current track info:
  - Windows: Use Windows.Media.Control API
- [ ] Implement playback controls (play/pause/next/prev)
- [ ] Implement volume control
- [ ] Display album art (convert to ASCII art for retro feel, or show actual)
- [ ] Show progress bar

**Deliverable:** Control Spotify/other players from WOPR

---

### Stage 16: Pomodoro Timer Mode
**Subagent task:** Build the focus timer

**Can run in parallel with:** Stage 14, 15

**Tasks:**
- [ ] Implement timer logic (focus/short break/long break)
- [ ] Create large retro timer display
- [ ] Implement session tracking (session X of Y)
- [ ] Add sound notifications
- [ ] Save timer settings to config
- [ ] Optional: integrate with task apps (read from Todoist API, etc.)

**Deliverable:** Functional pomodoro timer

---

### Stage 17: Chat Hub Mode
**Subagent task:** Display and reply to chat notifications

**Can run in parallel with:** Stage 14, 15, 16

**Tasks:**
- [ ] Read notifications from Discord/Slack (if running)
  - Windows: Use notification listener APIs
  - Or: Accessibility APIs to read app content
- [ ] Display recent messages grouped by app
- [ ] Implement quick reply (predefined responses)
- [ ] Implement "Do Not Disturb" toggle
- [ ] Voice reply: "Joshua, reply [message]"

**Note:** Full read write integration with Discord/Slack is complex. Start with notification reading only.

**Deliverable:** View and respond to chat messages

---

### Stage 18: Control Deck Buttons
**Subagent task:** Customizable macro buttons

**Tasks:**
- [ ] Create button grid UI (4x3 default)
- [ ] Implement button types:
  - App launcher
  - URL opener
  - Script runner (PowerShell/batch)
  - Hotkey sender
  - System command (lock, sleep, volume)
- [ ] Create button editor UI
- [ ] Support multiple pages of buttons
- [ ] Save button config to `buttons/deck-pages.yaml`

**Deliverable:** Customizable stream deck functionality

---

### Stage 19: Polish & Effects
**Subagent task:** Final visual polish

**Tasks:**
- [ ] Add CRT scanline effect (toggleable)
- [ ] Add subtle screen flicker on updates
- [ ] Add text typing animation for AI responses
- [ ] Add phosphor glow effect on text
- [ ] Add transition animations between modes
- [ ] Add sound effects (toggleable):
  - Mode switch
  - Button press
  - Timer complete
  - Notification

**Deliverable:** Full retro aesthetic experience

---

### Stage 20: Testing & Packaging
**Subagent task:** Final testing and Windows installer

**Tasks:**
- [ ] Test all modes thoroughly
- [ ] Test on different Windows versions (10, 11)
- [ ] Test multi monitor scenarios
- [ ] Build Windows installer (MSI or NSIS)
- [ ] Configure auto updater (optional)
- [ ] Create default plugin pack
- [ ] Write user documentation

**Tauri build:**
```bash
npm run tauri build
```

**Deliverable:** Distributable Windows installer

---

## Parallel Execution Map

```
Stage 1 (Scaffold)
    │
    ▼
Stage 2 (UI Theme)
    │
    ▼
Stage 3 (Window Mgmt) ──────┐
    │                       │
    ▼                       │
Stage 4 (Storage)           │
    │                       │
    ▼                       │
Stage 5 (Mode System)       │
    │                       │
    ▼                       │
Stage 6 (Settings) ─────────┼─── Stage 7 (Screen Capture)
    │                       │           │
    │                       │           │
    │                       └─── Stage 8 (Window Detection)
    │                                   │
    ▼                                   │
Stage 9 (Gemini AI) ◄───────────────────┘
    │
    ▼
Stage 10 (AI Assistant Mode)
    │
    ▼
Stage 11 (Plugins) ─────────┬─── Stage 12 (Voice)
    │                       │
    ▼                       │
Stage 13 (Brain/Learning) ◄─┘
    │
    ├─── Stage 14 (System Monitor) ───┐
    │                                 │
    ├─── Stage 15 (Music Player) ─────┼─── Can run in parallel
    │                                 │
    ├─── Stage 16 (Pomodoro) ─────────┤
    │                                 │
    └─── Stage 17 (Chat Hub) ─────────┘
                │
                ▼
        Stage 18 (Control Deck Buttons)
                │
                ▼
        Stage 19 (Polish)
                │
                ▼
        Stage 20 (Testing & Packaging)
```

---

## Environment Setup

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js (v18+)
# Download from nodejs.org

# Install Tauri CLI
npm install -g @tauri-apps/cli

# Windows: Install Visual Studio Build Tools
# Required for Rust compilation on Windows
```

### Environment Variables
```
GEMINI_API_KEY=your_api_key_here
```

---

## API Reference

### Gemini API
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`
- Auth: API key in header
- Docs: https://ai.google.dev/docs

### Key Tauri APIs
- `@tauri-apps/api/window` - Window management
- `@tauri-apps/api/fs` - File system access
- `@tauri-apps/api/path` - Path utilities
- `@tauri-apps/api/shell` - Run external commands
- `@tauri-apps/api/globalShortcut` - Hotkeys
- `@tauri-apps/api/notification` - System notifications

---

## Notes for Claude Code

1. **Always reference `WOPR_AI_ASSISTANT.md`** for UI mockups and feature details
2. **Use subagents** for parallel stages to speed up development
3. **Test incrementally** - each stage should produce working functionality
4. **Prioritize core experience** - Stages 1-11 are essential, 12-18 are enhancements
5. **Keep it simple** - Don't over engineer. Files over databases. Simple over clever.
6. **Windows only** - Don't add macOS or Linux compatibility code
7. **Local only** - No cloud storage, no sync features, just local files
