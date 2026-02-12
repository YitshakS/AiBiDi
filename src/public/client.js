/*
 * AiBiDi - Client
 * MIT License
 * https://github.com/your-repo/rtl-terminal
 *
 * Uses xterm.js (MIT License) - https://github.com/xtermjs/xterm.js
 */

// ==================
// Global State
// ==================

let isRTL = localStorage.getItem('terminalMode') !== 'ltr';

// ==================
// Themes Definition
// ==================

const themes = {
    'dark': {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff',
        cursorAccent: '#1e1e1e',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
        isLight: false
    },
    'light': {
        background: '#ffffff',
        foreground: '#1e1e1e',
        cursor: '#1e1e1e',
        cursorAccent: '#ffffff',
        selection: 'rgba(0, 0, 0, 0.2)',
        black: '#000000',
        red: '#cd3131',
        green: '#00bc00',
        yellow: '#949800',
        blue: '#0451a5',
        magenta: '#bc05bc',
        cyan: '#0598bc',
        white: '#555555',
        brightBlack: '#666666',
        brightRed: '#cd3131',
        brightGreen: '#14ce14',
        brightYellow: '#b5ba00',
        brightBlue: '#0451a5',
        brightMagenta: '#bc05bc',
        brightCyan: '#0598bc',
        brightWhite: '#1e1e1e',
        isLight: true
    },
    'dracula': {
        background: '#282a36',
        foreground: '#f8f8f2',
        cursor: '#f8f8f2',
        cursorAccent: '#282a36',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#21222c',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#f8f8f2',
        brightBlack: '#6272a4',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92df',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff',
        isLight: false
    },
    'monokai': {
        background: '#272822',
        foreground: '#f8f8f2',
        cursor: '#f8f8f2',
        cursorAccent: '#272822',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#272822',
        red: '#f92672',
        green: '#a6e22e',
        yellow: '#f4bf75',
        blue: '#66d9ef',
        magenta: '#ae81ff',
        cyan: '#a1efe4',
        white: '#f8f8f2',
        brightBlack: '#75715e',
        brightRed: '#f92672',
        brightGreen: '#a6e22e',
        brightYellow: '#f4bf75',
        brightBlue: '#66d9ef',
        brightMagenta: '#ae81ff',
        brightCyan: '#a1efe4',
        brightWhite: '#f9f8f5',
        isLight: false
    },
    'solarized-dark': {
        background: '#002b36',
        foreground: '#839496',
        cursor: '#839496',
        cursorAccent: '#002b36',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#073642',
        red: '#dc322f',
        green: '#859900',
        yellow: '#b58900',
        blue: '#268bd2',
        magenta: '#d33682',
        cyan: '#2aa198',
        white: '#eee8d5',
        brightBlack: '#002b36',
        brightRed: '#cb4b16',
        brightGreen: '#586e75',
        brightYellow: '#657b83',
        brightBlue: '#839496',
        brightMagenta: '#6c71c4',
        brightCyan: '#93a1a1',
        brightWhite: '#fdf6e3',
        isLight: false
    },
    'solarized-light': {
        background: '#fdf6e3',
        foreground: '#657b83',
        cursor: '#657b83',
        cursorAccent: '#fdf6e3',
        selection: 'rgba(0, 0, 0, 0.2)',
        black: '#073642',
        red: '#dc322f',
        green: '#859900',
        yellow: '#b58900',
        blue: '#268bd2',
        magenta: '#d33682',
        cyan: '#2aa198',
        white: '#eee8d5',
        brightBlack: '#002b36',
        brightRed: '#cb4b16',
        brightGreen: '#586e75',
        brightYellow: '#657b83',
        brightBlue: '#839496',
        brightMagenta: '#6c71c4',
        brightCyan: '#93a1a1',
        brightWhite: '#fdf6e3',
        isLight: true
    },
    'nord': {
        background: '#2e3440',
        foreground: '#d8dee9',
        cursor: '#d8dee9',
        cursorAccent: '#2e3440',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#3b4252',
        red: '#bf616a',
        green: '#a3be8c',
        yellow: '#ebcb8b',
        blue: '#81a1c1',
        magenta: '#b48ead',
        cyan: '#88c0d0',
        white: '#e5e9f0',
        brightBlack: '#4c566a',
        brightRed: '#bf616a',
        brightGreen: '#a3be8c',
        brightYellow: '#ebcb8b',
        brightBlue: '#81a1c1',
        brightMagenta: '#b48ead',
        brightCyan: '#8fbcbb',
        brightWhite: '#eceff4',
        isLight: false
    }
};

// ==================
// Initialize Terminal
// ==================

const savedTheme = localStorage.getItem('terminalTheme') || 'dark';
const initialTheme = themes[savedTheme] || themes['dark'];

// Font and terminal variables (will be set in async init)
const terminalFont = 'Cascadia Mono';
let term;
let fitAddon;
let ws;

// Expose for testing
window.getTermSelection = () => term ? term.getSelection() : null;

async function initTerminal() {
    // Let browser load font asynchronously (font-display: swap handles this)
    // Check font loading in background (non-blocking)
    document.fonts.ready.then(() => {
        const loaded = document.fonts.check(`14px "${terminalFont}"`);
        if (loaded) {
            console.log('✅ Cascadia Mono font loaded for RTL support');
        } else {
            console.warn('⚠️ Cascadia Mono font failed to load, RTL support may be limited');
        }
    });

    // Brief wait for CSS to parse
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create terminal with loaded font
    term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: `"${terminalFont}", "Consolas", "DejaVu Sans Mono", monospace`,
        theme: initialTheme
    });

    // Fit addon - auto resize
    fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);

    // Open terminal in container
    const terminalContainer = document.getElementById('terminal');
    term.open(terminalContainer);
    fitAddon.fit();

    // Intercept special keys inside terminal
    term.attachCustomKeyEventHandler((e) => {
        // F9 - Toggle RTL
        if (e.keyCode === 120 || e.key === 'F9') {
            if (e.type === 'keydown') {
                e.stopPropagation();
                isRTL = !isRTL;
                updateRTLMode();
            }
            return false;
        }

        // Note: Arrow key swapping moved to term.onData to preserve xterm's modifier handling

        // Ctrl+V - paste from clipboard to terminal
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV' && e.type === 'keydown') {
            e.preventDefault();
            navigator.clipboard.readText().then(text => {
                if (text && ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'input', data: text }));
                }
            });
            return false;
        }

        // Ctrl+key with selection → let browser handle (copy, etc.)
        // Ctrl+key without selection → send to terminal
        if ((e.ctrlKey || e.metaKey) && e.type === 'keydown') {
            const selection = term.getSelection();
            if (selection) {
                return false; // Browser handles it
            }
        }

        return true;
    });

    // ==================
    // WebSocket Connection
    // ==================

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        console.log('✅ Connected to server');
        ws.send(JSON.stringify({
            type: 'resize',
            cols: term.cols,
            rows: term.rows
        }));
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output') {
            term.write(msg.data);
        }
    };

    term.onData((data) => {
        // Swap arrow keys in RTL mode (at data level to preserve xterm's encoding)
        if (isRTL) {
            // Swap C (right) ↔ D (left) in ANSI sequences
            data = data.replace(/\x1b\[([0-9;]*)C/g, '\x1b[$1\x00')  // C -> temp
                       .replace(/\x1b\[([0-9;]*)D/g, '\x1b[$1C')     // D -> C
                       .replace(/\x1b\[([0-9;]*)\x00/g, '\x1b[$1D'); // temp -> D
        }

        ws.send(JSON.stringify({
            type: 'input',
            data: data
        }));
    });

    window.addEventListener('resize', () => {
        fitAddon.fit();
        ws.send(JSON.stringify({
            type: 'resize',
            cols: term.cols,
            rows: term.rows
        }));
    });

    ws.onerror = (error) => {
        console.error('❌ Connection error:', error);
        term.write('\r\n\x1b[31mConnection error\x1b[0m\r\n');
    };

    ws.onclose = () => {
        console.log('⚠️ Disconnected from server');
        term.write('\r\n\x1b[31mDisconnected\x1b[0m\r\n');
    };

    // Focus terminal
    term.focus();

    // RTL selection handling
    const screen = document.querySelector('.xterm-screen');
    const selectionLayer = screen?.querySelector('.xterm-selection');

    if (screen && selectionLayer) {
        // Mirror mouse X coordinates in RTL mode
        const mirrorX = (e) => {
            if (!isRTL) return;
            const rect = screen.getBoundingClientRect();
            const mirroredX = rect.right - (e.clientX - rect.left);
            Object.defineProperty(e, 'clientX', { value: mirroredX, writable: false });
        };

        let isSelecting = false;
        screen.addEventListener('mousedown', e => { isSelecting = true; mirrorX(e); }, true);
        screen.addEventListener('mousemove', e => { if (isSelecting) mirrorX(e); }, true);
        screen.addEventListener('mouseup', e => { if (isSelecting) { mirrorX(e); isSelecting = false; } }, true);

        // Mirror selection display position
        let mirroring = false;
        const mirrorSelectionDisplay = () => {
            if (!isRTL || mirroring) return;
            mirroring = true;
            const width = screen.offsetWidth;
            selectionLayer.querySelectorAll('div').forEach(div => {
                const left = parseFloat(div.style.left) || 0;
                const w = parseFloat(div.style.width) || 0;
                div.style.left = (width - left - w) + 'px';
            });
            mirroring = false;
        };
        new MutationObserver(mirrorSelectionDisplay).observe(selectionLayer, { childList: true, subtree: true });
    }
}

// Start initialization
initTerminal();

// ==================
// Drag & Drop Support
// ==================

const dropZone = document.getElementById('drop-zone');

document.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dropZone.classList.remove('hidden');
});

document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) {
        dropZone.classList.add('hidden');
    }
});

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.add('hidden');

    const files = e.dataTransfer.files;
    if (files.length > 0 && ws && term) {
        const file = files[0];

        // Show uploading message
        term.write(`\r\n[Uploading ${file.name}...]\r\n`);

        try {
            // Upload file to server
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            const filePath = data.path;

            // Insert path into terminal (with quotes for paths with spaces)
            const quotedPath = filePath.includes(' ') ? `"${filePath}"` : filePath;
            ws.send(JSON.stringify({
                type: 'input',
                data: quotedPath
            }));

            term.write(`[File ready: ${filePath}]\r\n`);
        } catch (error) {
            term.write(`\x1b[31m[Upload error: ${error.message}]\x1b[0m\r\n`);
        }
    }
});

// ==================
// RTL/LTR Toggle
// ==================

const rtlToggle = document.getElementById('rtl-toggle');

function updateRTLMode() {
    if (isRTL) {
        document.body.classList.add('rtl-mode');
        rtlToggle.textContent = 'RTL ←';
        rtlToggle.classList.add('active');
    } else {
        document.body.classList.remove('rtl-mode');
        rtlToggle.textContent = '→ LTR';
        rtlToggle.classList.remove('active');
    }
    localStorage.setItem('terminalMode', isRTL ? 'rtl' : 'ltr');
}

updateRTLMode();

rtlToggle.addEventListener('click', () => {
    isRTL = !isRTL;
    updateRTLMode();
});

// ==================
// Theme Selector
// ==================

const themeSelect = document.getElementById('theme-select');
themeSelect.value = savedTheme;

function applyTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;

    // Only update term if it's initialized
    if (term) {
        term.options.theme = theme;
    }
    document.body.style.backgroundColor = theme.background;

    // Update toolbar style for light/dark themes
    if (theme.isLight) {
        document.body.classList.add('light-toolbar');
    } else {
        document.body.classList.remove('light-toolbar');
    }

    localStorage.setItem('terminalTheme', themeName);
}

// Apply initial theme (background only, term theme applied in initTerminal)
applyTheme(savedTheme);

themeSelect.addEventListener('change', (e) => {
    applyTheme(e.target.value);
});

// ==================
// Keyboard Shortcuts
// ==================

// Handle F9 outside terminal
document.addEventListener('keydown', (e) => {
    if (e.key === 'F9') {
        e.preventDefault();
        isRTL = !isRTL;
        updateRTLMode();
    }
});

// ==================
// Logo Animation
// ==================

// Blink logo for 6 seconds on load, then only on hover
const logo = document.getElementById('logo');
const logoContainer = document.getElementById('logo-container');
let animationEnded = false;

if (logo && logoContainer) {
    // After 6 seconds, switch to static logo
    setTimeout(() => {
        logo.src = 'logo1.svg';
        animationEnded = true;
    }, 6000);

    // On hover, show animated logo
    logoContainer.addEventListener('mouseenter', () => {
        if (animationEnded) logo.src = 'logo2.svg';
    });

    // On mouse leave, show static logo
    logoContainer.addEventListener('mouseleave', () => {
        if (animationEnded) logo.src = 'logo1.svg';
    });
}
