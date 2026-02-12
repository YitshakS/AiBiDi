# AiBiDi - Architecture Document

> Technical documentation for developers and contributors

## Architecture Overview

AiBiDi uses a client-server architecture where the browser acts as a UI renderer and the Node.js server manages shell processes:

```
Browser (xterm.js)
    ↕ WebSocket
Node.js Server (Express)
    ↕ PTY
Shell (bash/powershell)
```

**Key Design Decision:** Use the browser's native BiDi rendering instead of implementing BiDi logic in the terminal emulator. This leverages decades of browser BiDi optimization and ensures correct text display across all RTL languages.

## Technical Features

These are implementation details that make AiBiDi work seamlessly:

- **Arrow Key Swapping in RTL** - Automatically reverses left/right arrows in RTL mode for intuitive cursor movement (see "Arrow Key Handling" section)
- **Local Server Architecture** - No cloud dependency, all processing on user's machine
- **Auto-Shutdown** - Server automatically closes when browser closes (3-second grace period for refresh)
- **Dynamic Port Selection** - Finds available port starting from 8200, prevents conflicts
- **Queue-Based File Cleanup** - Uploaded files deleted after exactly 60 seconds using setTimeout (not polling)
- **Smart Font Loading** - Non-blocking async load with fallback, never delays terminal initialization

## Tech Stack

| Component | Technology | Why? |
|-----------|------------|------|
| Server | Express.js | Lightweight, serves static files + handles uploads |
| Shell Bridge | node-pty | Industry standard for terminal emulation |
| Real-time | WebSocket (ws) | Low latency, bidirectional communication |
| Terminal UI | xterm.js | Most mature browser terminal, 40k+ GitHub stars |
| BiDi | Browser native + CSS | Leverages platform BiDi instead of reimplementing |
| Font | Cascadia Mono | Best monospace font with comprehensive RTL support |

## Font Strategy

### Why Cascadia Mono?

**Requirements:**
1. Monospace for terminal grid alignment
2. Comprehensive RTL character coverage (Hebrew, Arabic, Persian, etc.)
3. Open license for redistribution
4. Professional appearance

**Evaluation:**
- ❌ Courier New - Limited RTL support
- ❌ Consolas - No Arabic ligatures
- ❌ Fira Code - Programming-focused, inconsistent RTL
- ✅ **Cascadia Mono** - Designed by Microsoft for terminals, full RTL support

### Implementation

**Self-hosted** (not CDN):
- Faster load times (local server)
- Offline support
- No external dependencies

**Async loading strategy:**
```javascript
// Let browser handle font loading naturally (font-display: swap)
// Check asynchronously, don't block terminal initialization
document.fonts.ready.then(() => {
    const loaded = document.fonts.check(`14px "Cascadia Mono"`);
    // Log result for debugging
});
```

**Why this approach:**
- Previous approach (forced loading with timeout) caused race conditions
- `font-display: swap` allows instant terminal display with fallback
- Font swaps in when ready (typically <100ms on localhost)
- Terminal never blocks waiting for font

**Fallback stack:**
```css
font-family: "Cascadia Mono", "Consolas", "DejaVu Sans Mono", monospace;
```

### RTL Font Challenges

**Urdu (Nastaliq):**
- Traditional Urdu uses Nastaliq script (slanted, overlapping)
- Not compatible with monospace terminal grids
- Solution: Display in Naskh style (Arabic script), maintain grid alignment

**Dhivehi (Thaana):**
- Limited monospace font support
- Falls back to system fonts
- May have inconsistent character widths

## Arrow Key Handling in RTL

**Challenge:** In RTL mode, left/right arrows should reverse behavior to match text direction.

**Initial approach (failed):**
```javascript
// Intercepted keyboard events, sent manual ANSI codes
// Problem: Lost modifier key encoding (Alt, Ctrl)
```

**Final solution:**
```javascript
// Let xterm.js generate ANSI codes naturally
// Swap C↔D in the output data stream
term.onData((data) => {
    if (isRTL) {
        data = data.replace(/\x1b\[([0-9;]*)C/g, ...)  // Swap right↔left
    }
    ws.send(data);
});
```

**Why this works:**
- xterm.js handles all modifier encoding (Alt+Arrow, Ctrl+Arrow, etc.)
- We only swap the final direction character
- Preserves xterm's special handling for word jumping, etc.

## File Upload System

**Why needed:** Browsers can't access local file paths (security), but users want to drag files to get paths in terminal.

**Solution:**
1. User drags file → uploads to server temp directory
2. Server returns path → inserts into terminal
3. File auto-deletes after 60 seconds (queue-based, not polling)

**Implementation:**
```javascript
// Queue-based deletion (efficient)
app.post('/upload', (req, res) => {
    const filePath = req.file.path;
    setTimeout(() => fs.unlinkSync(filePath), 60000);  // Exactly 60s
    res.json({ path: filePath });
});
```

**Cleanup strategy:**
- **On startup:** Delete entire `tmp/` (handles crashes)
- **Runtime:** setTimeout per file (precise, efficient)
- **On shutdown:** Delete `tmp/` (clean exit)

## Dynamic Port Selection

**Why:** Port 8200 might be in use (dev servers, etc.)

**Solution:**
1. Server uses `portfinder` to find available port starting from 8200
2. Writes port to `tmp/.port` file
3. Launch scripts check if server running, read port, open browser

**Prevents:**
- Multiple server instances on same port
- Port conflicts with other applications
- User confusion about which port to use

## File Structure

```
aibidi/
├── README.md              # User documentation
├── ARCHITECTURE.md        # This file (technical docs)
├── LICENSE                # MIT License
├── package.json           # Dependencies
├── AiBiDi.bat            # Windows launcher
├── AiBiDi.sh             # Linux/Mac launcher
├── src/
│   ├── server.js         # Express + WebSocket + PTY + file uploads
│   └── public/
│       ├── index.html    # App shell
│       ├── style.css     # Themes + BiDi styles + @font-face
│       ├── client.js     # xterm.js integration + RTL logic
│       └── fonts/
│           ├── CascadiaMono.woff2  # Self-hosted font
│           └── LICENSE             # SIL OFL 1.1
└── tmp/                  # Runtime (gitignored)
    ├── .port            # Current server port
    └── uploads/         # Temp file uploads (auto-deleted)
```

## Design Decisions

### Why Browser-Based?

**Pros:**
- Native BiDi rendering (tested across billions of devices)
- Cross-platform (Windows, Mac, Linux)
- Easy distribution (no native compilation)
- Modern UI capabilities (themes, drag & drop)

**Cons:**
- Requires running local server
- Slightly higher resource usage than native terminal

**Decision:** Pros outweigh cons for RTL use case

### Why Local Server (Not Electron)?

**Considered Electron but chose local server:**
- ✅ Simpler architecture
- ✅ Smaller download size
- ✅ Uses system browser (always up-to-date)
- ✅ Easy to understand and modify
- ❌ Electron would allow getting drag & drop file paths without upload

**Decision:** Simplicity > Electron's file path advantage

### Why Auto-Shutdown?

**Behavior:** Server automatically shuts down when browser closes

**Why:**
- User expects "close window = quit app" behavior
- No orphaned server processes
- Clean resource management

**Implementation:**
- Track WebSocket connections
- 3-second delay (allows refresh without shutdown)
- Graceful cleanup on exit

## Contributing

When contributing, maintain these principles:
1. **BiDi first** - Test with RTL text (Hebrew, Arabic)
2. **Simplicity** - Avoid over-engineering
3. **Browser native** - Leverage platform features
4. **Clean shutdown** - No orphaned processes
5. **Offline-first** - No external dependencies at runtime
