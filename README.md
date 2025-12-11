# WOPR - AI Desktop Assistant

> "Your personal AI companion on a secondary display"

---

## Overview

WOPR is a retro styled AI assistant that lives on a small secondary touchscreen display. It observes your primary screen activity and provides contextual help, recommendations, and quick answers - all with a nostalgic green on black terminal aesthetic. The default AI persona is named "Joshua" (a WarGames reference), but users can configure this to any name they prefer (Jarvis, Friday, etc.).

---

## Core Concept

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ██╗    ██╗ ██████╗ ██████╗ ██████╗                         │
│   ██║    ██║██╔═══██╗██╔══██╗██╔══██╗                        │
│   ██║ █╗ ██║██║   ██║██████╔╝██████╔╝                        │
│   ██║███╗██║██║   ██║██╔═══╝ ██╔══██╗                        │
│   ╚███╔███╔╝╚██████╔╝██║     ██║  ██║                        │
│    ╚══╝╚══╝  ╚═════╝ ╚═╝     ╚═╝  ╚═╝                        │
│                                                              │
│   [ OBSERVING ]  League of Legends detected...               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

WOPR watches what you do on your computer and provides intelligent, contextual assistance without you having to ask. Like having Jarvis, but tailored to your workflow.

---

## Visual Design: Retro Terminal Aesthetic

### Color Palette
```
Background:    #0a0a0a (deep black)
Primary text:  #00ff41 (matrix green)
Dim text:      #00aa2a (darker green)
Accent:        #00ffff (cyan for highlights)
Warning:       #ffaa00 (amber)
Error:         #ff0040 (red)
```

### Typography
- **Font**: IBM Plex Mono, Fira Code, or JetBrains Mono
- **Effect**: Subtle CRT glow/bloom on text
- **Animation**: Text appears character by character like typing

### Visual Effects
- Scanlines overlay (subtle)
- Screen flicker on updates (very subtle)
- Phosphor glow on bright elements
- CRT screen curvature (optional)

### Example Display States

**Idle State**
```
┌─────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                             │
│           W O P R  v1.0.0                   │
│           ─────────────────                 │
│           STATUS: OBSERVING                 │
│           TIME: 14:32:07                    │
│                                             │
│           > Awaiting context...             │
│           > Say "Joshua" to ask me anything │
│                                             │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ [■ VISION ON]  [♫ LISTENING]  [⚙ CONFIG]   │
└─────────────────────────────────────────────┘
```

**Gaming Mode (League of Legends)**
```
┌─────────────────────────────────────────────┐
│ ══════════════════════════════════════════ │
│  WOPR > LEAGUE OF LEGENDS                   │
│ ══════════════════════════════════════════ │
│                                             │
│  [AHRI]  LVL 12  ◆◆◆◆◆◆◇◇◇◇                │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ RECOMMENDATION                      │   │
│  │                                     │   │
│  │  ┌──────┐  Build: ZHONYA'S         │   │
│  │  │ ⏱️   │  Cost: 3250g             │   │
│  │  │      │  You have: 2800g         │   │
│  │  └──────┘                          │   │
│  │                                     │   │
│  │  > Enemy Zed is 4/1/2              │   │
│  │  > Hourglass counters his ult      │   │
│  │  > Farm 2 waves or 1 kill          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  NEXT: Dragon spawns in 1:24               │
│                                             │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ [■ VISION ON]  [♫ MIC ON]  [⚙]            │
└─────────────────────────────────────────────┘
```

**Voice Query Popup**
```
┌─────────────────────────────────────────────┐
│ ╔═══════════════════════════════════════╗   │
│ ║  JOSHUA RESPONSE                      ║   │
│ ╠═══════════════════════════════════════╣   │
│ ║                                       ║   │
│ ║  Q: "What items counter Zed?"         ║   │
│ ║                                       ║   │
│ ║  A: Zhonya's Hourglass is the         ║   │
│ ║     primary counter. Activate it      ║   │
│ ║     when you see Death Mark above     ║   │
│ ║     your head. Also consider:         ║   │
│ ║     - Guardian Angel (2nd life)       ║   │
│ ║     - Exhaust summoner spell          ║   │
│ ║                                       ║   │
│ ╚═══════════════════════════════════════╝   │
│                                             │
│           [ Dismissing in 8s... ]           │
└─────────────────────────────────────────────┘
```

---

## Application & Display

WOPR is a regular desktop application - no special system services or daemons required.

**How It Works**
- Standard desktop app built with Tauri (lightweight) or Electron
- Drag the window to your secondary screen and maximize
- WOPR remembers which display it was on and launches there next time
- Can run on ANY display - small dedicated screen, tablet via Duet, TV, or just a window on your main monitor

**Startup Behavior**
- **Launch on startup** (default: ON) - WOPR starts automatically when computer boots
- Opens on the remembered display in the last used window mode
- Immediately begins observing (if vision is enabled)
- Can be disabled in Settings if you prefer manual launch

**Window Modes**
| Mode | Description |
|------|-------------|
| Windowed | Resizable window, can be moved around |
| Borderless Fullscreen | Fills the screen without title bar (recommended for dedicated display) |
| Fullscreen | True fullscreen mode |

**Display Memory**
- WOPR remembers which display it was on
- On next launch, automatically moves to that display
- If display is disconnected, falls back to primary display

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  WOPR APPLICATION WINDOW                     │
│          (Runs on any display - remembers preference)        │
│                    Tauri / Electron                          │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      WOPR CORE ENGINE                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Context   │  │     AI      │  │   Plugin    │          │
│  │ Aggregator  │  │  Processor  │  │   Manager   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
        ▲                   ▲                   ▲
        │                   │                   │
┌───────┴───────┐   ┌───────┴───────┐   ┌───────┴───────┐
│ Screen Reader │   │ Voice Input   │   │ Local Storage │
│  OCR + Vision │   │ Wake Word     │   │ Guidelines    │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## Features

### 1. Screen Observation (Vision)
- Captures primary display periodically
- Uses OCR to extract text
- Detects active application
- **Touch button to disable** - Large friendly button on touchscreen

### 2. Voice Activation
- Wake word: **"Joshua"** (configurable)
- Example: "Joshua, what should I build against tanks?"
- Response appears as popup overlay
- Auto dismisses after reading or timeout

### 3. Plugin System
Each application has its own plugin with:
- Detection rules (how to know this app is active)
- Context extraction (what to look for on screen)
- AI guidelines (joshua-guide.md files)
- Custom UI elements (icons, layouts)

### 4. Local Storage
```
~/.wopr/
├── config.yaml           # User preferences
├── memory/
│   ├── sessions/         # Recent session logs
│   └── learned/          # User patterns & preferences
├── plugins/
│   ├── league-of-legends/
│   │   ├── plugin.yaml
│   │   ├── joshua-guide.md   # AI instructions for this game
│   │   └── assets/
│   │       ├── items/       # Item icons
│   │       └── champions/   # Champion icons
│   ├── vscode/
│   │   ├── plugin.yaml
│   │   └── joshua-guide.md
│   └── browser/
│       ├── plugin.yaml
│       └── joshua-guide.md
└── logs/
    └── wopr.log
```

### 5. Privacy Controls

**Touch Controls on Display:**
```
┌─────────────────────────────────────────────┐
│                                             │
│  [■ VISION ON ]  ← Tap to toggle screen     │
│                    capture on/off           │
│                                             │
│  [♫ MIC ON    ]  ← Tap to toggle voice      │
│                    listening on/off         │
│                                             │
│  [⚙ SETTINGS ]  ← Open config panel        │
│                                             │
└─────────────────────────────────────────────┘
```

**Privacy States:**
| State | Vision | Mic | Display |
|-------|--------|-----|---------|
| Full Active | ON | ON | Full UI |
| Vision Off | OFF | ON | "Vision paused" |
| Silent | ON | OFF | Full UI, no voice |
| Private | OFF | OFF | Clock/ambient only |

**Auto Privacy Rules:**
- Detects banking sites → auto pause vision
- Password fields detected → blur/pause
- Configurable app blacklist

---

## Plugin: joshua-guide.md Format

Each plugin includes a `joshua-guide.md` file that instructs WOPR/Joshua how to help with that specific application.

**Example: League of Legends joshua-guide.md**
```markdown
# Joshua Guide: League of Legends

## Context Detection
- Window title contains "League of Legends"
- Process name: LeagueClientUx.exe or League of Legends.exe

## What to Look For
- Champion name (top of screen or tab menu)
- Current level (circle near champion portrait)
- Gold amount (bottom right)
- Items (bottom center inventory)
- Kill/Death/Assist (top right)
- Game time (top center)
- Enemy champions (tab menu)

## Response Style
- Be concise, player is focused on game
- Prioritize actionable advice
- Use game terminology
- Reference item icons when available

## Common Advice Patterns
- Item builds based on enemy team comp
- Objective timers (dragon, baron, towers)
- Counter play tips against fed enemies
- Power spike awareness

## Icon Assets
Items and champion portraits stored in assets/ folder
Reference as: [item:zhonyas] or [champ:ahri]
```

---

## Technical Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Display UI | **Tauri** (Rust + WebView) | Lightweight, native feel |
| Frontend | Svelte or React + CSS | Retro styling flexibility |
| Screen Capture | macOS ScreenCaptureKit | Native, efficient |
| OCR | Apple Vision Framework | Free, local, accurate |
| Voice | Whisper (local) or Web Speech API | Wake word + transcription |
| AI | Ollama (local) or Claude API | Configurable |
| Storage | SQLite + flat files | Simple, portable |

---

## User Experience Flow

### First Launch
```
┌─────────────────────────────────────────────┐
│                                             │
│         W O P R  INITIALIZATION             │
│         ════════════════════════            │
│                                             │
│  > Detecting displays.............. OK      │
│  > Setting up voice recognition.... OK      │
│  > Loading plugins................. OK      │
│  > Connecting to AI backend........ OK      │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  "Shall we play a game?"           │   │
│  │                                     │   │
│  │  I'm Joshua. I'll watch your       │   │
│  │  screen and help you with          │   │
│  │  whatever you're doing.            │   │
│  │                                     │   │
│  │  Say "Joshua" anytime to ask me    │   │
│  │  a question!                        │   │
│  │                                     │   │
│  │  Tap [■] to pause screen reading.  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│              [ GET STARTED ]                │
└─────────────────────────────────────────────┘
```

### Normal Operation
1. WOPR detects active application
2. Loads appropriate plugin + joshua-guide.md
3. Captures screen, extracts context via OCR
4. Sends context to AI with plugin guidelines
5. Displays recommendations in retro UI
6. Updates every 30-60 seconds (configurable)

### Voice Query
1. User says "Joshua, [question]"
2. Wake word detected, starts transcription
3. Full question captured
4. AI processes with current screen context
5. Popup appears with answer
6. Auto dismiss after timeout or tap

---

## Icon & Asset Design

### Item Icons (League Example)
Retro pixel art style versions of items:
```
┌────────┐  ┌────────┐  ┌────────┐
│▓▓▓▓▓▓▓▓│  │   ██   │  │▓▓▓██▓▓▓│
│▓▓████▓▓│  │  ████  │  │▓▓████▓▓│
│▓██░░██▓│  │ ██████ │  │▓██▓▓██▓│
│▓██░░██▓│  │████████│  │▓██████▓│
│▓▓████▓▓│  │████████│  │▓▓████▓▓│
│▓▓▓▓▓▓▓▓│  │  ████  │  │▓▓▓▓▓▓▓▓│
└────────┘  └────────┘  └────────┘
 Zhonya's    Rabadon's   Void Staff
```

### Status Indicators
```
[■] Vision ON   [□] Vision OFF
[♫] Mic ON      [♪] Mic OFF
[●] Connected   [○] Disconnected
```

---

## Built in Display Modes

WOPR comes with preset display modes that users can switch between. Each mode leverages your computer's existing applications and tools - WOPR acts as a smart interface layer, not a replacement.

### Mode Selector (Touch Interface)
```
┌─────────────────────────────────────────────┐
│ ══════════════════════════════════════════ │
│  SELECT MODE                                │
│ ══════════════════════════════════════════ │
│                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ ◉ AI    │ │ ○ SYS   │ │ ○ MUSIC │       │
│  │ ASSIST  │ │ MONITOR │ │ PLAYER  │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ ○ POMO  │ │ ○ CHAT  │ │ ○ DECK  │       │
│  │ TIMER   │ │ HUB     │ │ & SETS  │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│                                             │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────────────────┘
```

---

### Auto Switch: Smart Mode Detection

When enabled, WOPR automatically detects which application is in focus and switches to the appropriate mode or plugin. This is a toggle in Settings that can be turned on/off.

**How It Works**
```
┌─────────────────────────────────────────────┐
│                                             │
│  AUTO SWITCH TRIGGERED                      │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Detected: League of Legends.exe     │   │
│  │                                      │   │
│  │ Switching to: AI Assistant          │   │
│  │ Plugin: League of Legends           │   │
│  │                                      │   │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░  Loading...    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Cancel] [Don't switch for this app]      │
│                                             │
└─────────────────────────────────────────────┘
```

**Auto Switch Rules**
Users can configure which apps trigger which modes:

| Detected Application | Auto Switch To | Plugin |
|---------------------|----------------|--------|
| League of Legends | AI Assistant | league-of-legends |
| VS Code / Cursor | AI Assistant | vscode |
| Spotify | Music Player | - |
| Apple Music | Music Player | - |
| OBS Studio | Control Deck | obs-streaming |
| Discord (focused) | Chat Hub | - |
| Slack (focused) | Chat Hub | - |
| Any browser | AI Assistant | browser |

**Behavior Options**
- **Auto switch enabled** - WOPR changes mode when app focus changes
- **Auto switch disabled** - Manual mode selection only
- **Per app override** - "Never auto switch for this app"
- **Return behavior** - When app closes, return to previous mode or default

**Configuration Example**
```yaml
# ~/.wopr/config.yaml
auto_switch:
  enabled: true
  return_to_previous: true    # Go back when app closes
  transition_delay: 500       # ms before switching (prevents flicker)

  rules:
    - match: "League of Legends"
      process: ["LeagueClient", "League of Legends"]
      mode: "ai_assistant"
      plugin: "league-of-legends"

    - match: "Spotify"
      process: ["Spotify"]
      mode: "music_player"

    - match: "VS Code"
      process: ["Code", "code"]
      mode: "ai_assistant"
      plugin: "vscode"

    - match: "OBS"
      process: ["obs", "obs64"]
      mode: "control_deck"

  ignored_apps:              # Never trigger switch
    - "Finder"
    - "System Preferences"
    - "1Password"
```

---

### Mode 1: AI Assistant (Default)
The core WOPR experience, observes screen, provides contextual help.

*See main documentation above for details.*

---

### Mode 2: System Monitor

Real time hardware monitoring with retro gauges. User configures which stats to display based on their setup.

**Display**
```
┌─────────────────────────────────────────────┐
│ ══════════════════════════════════════════ │
│  WOPR > SYSTEM MONITOR                      │
│ ══════════════════════════════════════════ │
│                                             │
│  CPU ▓▓▓▓▓▓▓▓░░░░░░░░░░░░  42%   45°C     │
│  ╭────────────────────────────────╮         │
│  │ ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐│        │
│  │ │▓▓││▓▓││▓ ││▓ ││░ ││░ ││░ ││░ ││ CORES │
│  │ └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘│        │
│  ╰────────────────────────────────╯         │
│                                             │
│  RAM ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░  61%  16/32GB   │
│  GPU ▓▓▓▓▓▓░░░░░░░░░░░░░░  28%   52°C     │
│  SSD ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░  78%  1.2TB     │
│                                             │
│  NET  ↓ 12.4 MB/s   ↑ 1.2 MB/s             │
│                                             │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ [← MODES]              [⚙ CUSTOMIZE]       │
└─────────────────────────────────────────────┘
```

**Configuration Options**
```yaml
# ~/.wopr/modes/system-monitor.yaml
display:
  cpu: true
  cpu_per_core: true
  cpu_temp: true
  ram: true
  gpu: true           # Requires GPU (NVIDIA/AMD/Apple Silicon)
  gpu_temp: true
  disk: true
  network: true

hardware:
  cpu_name: "Apple M2 Pro"     # Auto detected or manual
  ram_total: "32GB"
  gpu_name: "Apple M2 Pro GPU"

alerts:
  cpu_temp_warning: 80         # Celsius
  gpu_temp_warning: 85
  ram_usage_warning: 90        # Percent
```

**Data Sources**
- macOS: `powermetrics`, `top`, `iostat`, Metal Performance Shaders
- Windows: WMI, OpenHardwareMonitor, GPU-Z APIs
- Linux: `/proc`, `lm-sensors`, `nvidia-smi`

---

### Mode 3: Music Player

Controls and displays music from your existing music apps (Spotify, Apple Music, etc.). WOPR doesn't play music - it's a remote control for what's already running.

**Display**
```
┌─────────────────────────────────────────────┐
│ ══════════════════════════════════════════ │
│  WOPR > NOW PLAYING                         │
│ ══════════════════════════════════════════ │
│                                             │
│      ┌────────────────────────┐             │
│      │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │             │
│      │ ▓▓                ▓▓ │             │
│      │ ▓▓   ╔════════╗   ▓▓ │   ASCII     │
│      │ ▓▓   ║ ALBUM  ║   ▓▓ │   ALBUM     │
│      │ ▓▓   ║  ART   ║   ▓▓ │   ART       │
│      │ ▓▓   ╚════════╝   ▓▓ │             │
│      │ ▓▓                ▓▓ │             │
│      │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │             │
│      └────────────────────────┘             │
│                                             │
│   "Bohemian Rhapsody"                       │
│   Queen • A Night at the Opera              │
│                                             │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░  3:42 / 5:55     │
│                                             │
│      [⏮]    [⏸ PAUSE]    [⏭]              │
│                                             │
│   🔊 ▓▓▓▓▓▓▓▓▓▓░░░░░  VOL 70%              │
│                                             │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ [← MODES]  [♡ LIKE]  [📋 QUEUE]           │
└─────────────────────────────────────────────┘
```

**Supported Apps (via system APIs)**
- **Spotify** - Full control via Spotify Connect / AppleScript
- **Apple Music** - Full control via AppleScript/MusicKit
- **YouTube Music** - Browser control via extension
- **Tidal, Deezer, etc.** - Media key simulation

**Features**
- Play/pause/skip via touch buttons
- Volume control (system or app specific)
- Like/save current track
- View queue
- ASCII art album covers (converted from actual art)

---

### Mode 4: Pomodoro Timer

Focus timer with retro aesthetics. Integrates with your calendar and task apps.

**Display**
```
┌─────────────────────────────────────────────┐
│ ══════════════════════════════════════════ │
│  WOPR > FOCUS MODE                          │
│ ══════════════════════════════════════════ │
│                                             │
│                                             │
│              ╔═══════════════╗              │
│              ║               ║              │
│              ║    18:42      ║              │
│              ║               ║              │
│              ║  ▓▓▓▓▓▓▓░░░░  ║              │
│              ╚═══════════════╝              │
│                                             │
│            SESSION 3 of 4                   │
│            ◆ ◆ ◆ ◇                          │
│                                             │
│   Current task:                             │
│   > "Implement login feature"               │
│                                             │
│   Next: 5 min break                         │
│                                             │
│      [⏸ PAUSE]    [⏭ SKIP]    [✕ END]     │
│                                             │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ [← MODES]              [⚙ SETTINGS]        │
└─────────────────────────────────────────────┘
```

**Configuration**
```yaml
# ~/.wopr/modes/pomodoro.yaml
timing:
  focus_duration: 25      # minutes
  short_break: 5
  long_break: 15
  sessions_before_long: 4

integrations:
  todoist: true           # Pull tasks from Todoist
  things3: false          # Pull tasks from Things 3
  calendar: true          # Warn about upcoming meetings

behavior:
  auto_start_breaks: true
  sound_on_complete: true
  block_distractions: false  # Future: could block certain apps
```

**Features**
- Touch to pause/resume
- Task integration (Todoist, Things, Reminders)
- Calendar awareness ("Meeting in 12 min - shorter session?")
- Session statistics stored locally
- Customizable durations

---

### Mode 5: Chat Hub

Unified notification center for Discord, Slack, and other messaging apps. WIZZ reads from and can send to these apps when they're running on your computer.

**Display**
```
┌─────────────────────────────────────────────┐
│ ══════════════════════════════════════════ │
│  WOPR > CHAT HUB                            │
│ ══════════════════════════════════════════ │
│                                             │
│  DISCORD                              (3)   │
│  ┌─────────────────────────────────────┐   │
│  │ #general • GamersUnited       2m    │   │
│  │ > @you ready for ranked?            │   │
│  │                                      │   │
│  │ DM • Alex                      15m   │   │
│  │ > sent you a link                   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  SLACK                                (1)   │
│  ┌─────────────────────────────────────┐   │
│  │ #engineering • Work            5m    │   │
│  │ > PR review needed on auth branch   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [📝 QUICK REPLY]  [🔕 DND 1HR]           │
│                                             │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ [← MODES]     [⚙ CONNECT APPS]            │
└─────────────────────────────────────────────┘
```

**Quick Reply Interface (on tap)**
```
┌─────────────────────────────────────────────┐
│ ╔═══════════════════════════════════════╗   │
│ ║  REPLY TO: #general                   ║   │
│ ╠═══════════════════════════════════════╣   │
│ ║                                       ║   │
│ ║  > @you ready for ranked?             ║   │
│ ║                                       ║   │
│ ║  Quick responses:                     ║   │
│ ║  [Yeah, 5 min]  [Can't rn]  [👍]     ║   │
│ ║                                       ║   │
│ ║  Or say: "Joshua, reply yes be there"║   │
│ ║  in 10"                               ║   │
│ ║                                       ║   │
│ ╚═══════════════════════════════════════╝   │
│                                             │
│           [✕ DISMISS]                       │
└─────────────────────────────────────────────┘
```

**Integration Methods**
| App | Read | Write | How |
|-----|------|-------|-----|
| Discord | ✓ | ✓ | Discord RPC + Accessibility APIs |
| Slack | ✓ | ✓ | Slack API (user token) + Accessibility |
| iMessage | ✓ | ✓ | AppleScript (macOS) |
| Telegram | ✓ | ✓ | Telegram Bot API / TDLib |
| WhatsApp | ✓ | ○ | Accessibility read only |

**Features**
- Unified inbox across all chat apps
- AI generated quick reply suggestions
- "Do Not Disturb" mode with auto responses
- Priority filtering (mentions, DMs, keywords)
- Voice reply: "Joshua, reply to Discord: on my way"

**Configuration**
```yaml
# ~/.wopr/modes/chat-hub.yaml
apps:
  discord:
    enabled: true
    servers:
      - "GamersUnited"     # Only show these servers
      - "Dev Community"
    priority_keywords:
      - "@me"
      - "urgent"

  slack:
    enabled: true
    workspace: "mycompany"
    api_token: "xoxp-..."   # Stored securely in keychain
    channels:
      - "#engineering"
      - "#general"

  imessage:
    enabled: true
    contacts_only: true     # Ignore unknown numbers

notifications:
  show_preview: true
  group_by_app: true
  max_visible: 5

quick_replies:
  - "👍"
  - "On it!"
  - "Be there in 5"
  - "Can't right now"
```

---

### Mode 6: Control Deck & Settings

The settings hub and customizable button grid. This is where you configure WOPR behavior, create macros, launch apps, and manage all options.

**Settings Panel**
```
┌─────────────────────────────────────────────┐
│ ══════════════════════════════════════════ │
│  WOPR > SETTINGS                            │
│ ══════════════════════════════════════════ │
│                                             │
│  GENERAL                                    │
│  ┌─────────────────────────────────────┐   │
│  │ Launch on Startup        [■ ON ]    │   │
│  │ > Start WOPR when computer boots     │   │
│  │                                      │   │
│  │ Auto Switch Modes        [■ ON ]    │   │
│  │ > Detect apps and switch             │   │
│  │   to matching plugin automatically   │   │
│  │                                      │   │
│  │ Voice Activation         [■ ON ]    │   │
│  │ Screen Capture           [■ ON ]    │   │
│  │ CRT Effects              [□ OFF]    │   │
│  │ Sound Effects            [■ ON ]    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  DISPLAY                                    │
│  ┌─────────────────────────────────────┐   │
│  │ Current: "ASUS ZenScreen"           │   │
│  │ [Remember this display]   [■ ON ]   │   │
│  │                                      │   │
│  │ Window Mode:                         │   │
│  │ ○ Windowed (resizable)              │   │
│  │ ● Borderless Fullscreen             │   │
│  │ ○ Fullscreen                        │   │
│  │                                      │   │
│  │ Always on Top            [□ OFF]    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  AUTO SWITCH RULES                          │
│  ┌─────────────────────────────────────┐   │
│  │ League of Legends → AI Assistant    │   │
│  │ VS Code           → AI Assistant    │   │
│  │ Spotify           → Music Player    │   │
│  │ OBS Studio        → Control Deck    │   │
│  │ [+ Add Rule]                         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ [← MODES]  [BUTTONS]  [PLUGINS]           │
└─────────────────────────────────────────────┘
```

**Custom Buttons Panel**
```
┌─────────────────────────────────────────────┐
│ ══════════════════════════════════════════ │
│  WOPR > CONTROL DECK                        │
│ ══════════════════════════════════════════ │
│                                             │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐   │
│  │ ▶ OBS │ │ 🎤MUTE│ │ 🎬CLIP│ │ 📺SCENE   │
│  │ START │ │       │ │ LAST  │ │ GAME  │   │
│  └───────┘ └───────┘ └───────┘ └───────┘   │
│                                             │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐   │
│  │ 💬    │ │ 🎵    │ │ 📁    │ │ ⚡     │   │
│  │DISCORD│ │SPOTIFY│ │ CODE  │ │TERMINAL   │
│  └───────┘ └───────┘ └───────┘ └───────┘   │
│                                             │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐   │
│  │ 🌐    │ │ 📧    │ │ 🔒    │ │ 💤    │   │
│  │BROWSER│ │ MAIL  │ │ LOCK  │ │ SLEEP │   │
│  └───────┘ └───────┘ └───────┘ └───────┘   │
│                                             │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ [← SETTINGS]  [PAGE 1/3]  [⚙ EDIT]        │
└─────────────────────────────────────────────┘
```

**Button Types**
| Type | Description | Example |
|------|-------------|---------|
| App Launcher | Open any application | Open VS Code |
| URL | Open URL in browser | Open GitHub PR |
| Script | Run shell script/AppleScript | Custom automation |
| Hotkey | Send keyboard shortcut | Cmd+Shift+4 (screenshot) |
| Folder | Quick access to folder | Open Downloads |
| System | System commands | Lock, Sleep, Volume |
| OBS | OBS Studio integration | Scene switch, Start stream |
| Multi Action | Chain multiple actions | "Stream start" sequence |

**Configuration**
```yaml
# ~/.wopr/modes/stream-deck.yaml
pages:
  - name: "Streaming"
    buttons:
      - position: [0, 0]
        type: "obs"
        action: "start_stream"
        icon: "▶"
        label: "OBS START"
        color: "#ff0040"

      - position: [1, 0]
        type: "hotkey"
        action: "cmd+shift+m"  # Discord mute
        icon: "🎤"
        label: "MUTE"
        toggle: true           # Shows on/off state

      - position: [2, 0]
        type: "script"
        action: "~/.wizz/scripts/clip-last-30.sh"
        icon: "🎬"
        label: "CLIP LAST"

      - position: [3, 0]
        type: "obs"
        action: "scene:Gaming"
        icon: "📺"
        label: "SCENE GAME"

  - name: "Apps"
    buttons:
      - position: [0, 0]
        type: "app"
        action: "/Applications/Discord.app"
        icon: "💬"
        label: "DISCORD"

      - position: [1, 0]
        type: "app"
        action: "/Applications/Spotify.app"
        icon: "🎵"
        label: "SPOTIFY"

  - name: "Dev Tools"
    buttons:
      - position: [0, 0]
        type: "multi"
        label: "DEV START"
        actions:
          - type: "app"
            action: "/Applications/VS Code.app"
          - type: "script"
            action: "cd ~/dev && npm run dev"
          - type: "app"
            action: "/Applications/Firefox.app"
            args: "http://localhost:3000"

grid:
  columns: 4
  rows: 3
```

**OBS Integration**
- Connects via OBS WebSocket
- Scene switching
- Start/stop streaming/recording
- Source visibility toggles
- Replay buffer save

---

## Project Phases

### Phase 1: Foundation
- [ ] Basic Tauri app with retro UI
- [ ] Display on secondary screen
- [ ] Touch button controls
- [ ] Screen capture pipeline

### Phase 2: Intelligence
- [ ] OCR integration
- [ ] Active window detection
- [ ] Local AI connection (Ollama)
- [ ] Basic context → recommendation flow

### Phase 3: Voice
- [ ] Wake word detection ("Joshua" - configurable)
- [ ] Voice transcription
- [ ] Popup response UI
- [ ] Auto dismiss logic

### Phase 4: Plugins
- [ ] Plugin loader system
- [ ] joshua guide.md parser
- [ ] League of Legends plugin
- [ ] VS Code plugin

### Phase 5: Polish
- [ ] CRT visual effects
- [ ] Smooth animations
- [ ] Memory/learning system
- [ ] Settings panel

---

## Name Meaning

**WOPR** - War Operation Plan Response, the military supercomputer from the 1983 film WarGames. In the movie, WOPR was given the human name "Joshua" by its creator Dr. Falken.

**Joshua** - The configurable AI persona name. Users can change this to any wake word they prefer (Jarvis, Friday, Alfred, etc.).

The WarGames reference fits perfectly with WOPR's retro terminal aesthetic and AI assistant nature - a nod to one of the most iconic AI/computer characters in film history.

---

## Summary

WOPR is your personal Jarvis, a retro styled AI companion that lives on your secondary display, watches what you're doing, and proactively helps. With voice activation, touch privacy controls, and a plugin system for endless extensibility, it turns a simple secondary screen into an intelligent command center.

The default AI persona "Joshua" can be renamed to anything you prefer - Jarvis, Friday, Alfred, or your own custom name.

*"Joshua, help me out here..."*

```
    ╔═══════════════════════════════════════════╗
    ║                                           ║
    ║   "Shall we play a game?"                 ║
    ║                              - Joshua     ║
    ║                                           ║
    ╚═══════════════════════════════════════════╝
```
