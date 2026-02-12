/*
 * AiBiDi - Server
 * MIT License
 * https://github.com/your-repo/rtl-terminal
 *
 * Uses:
 * - Express.js (MIT License) - https://github.com/expressjs/express
 * - ws (MIT License) - https://github.com/websockets/ws
 * - node-pty (MIT License) - https://github.com/microsoft/node-pty
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const pty = require('node-pty');
const path = require('path');
const os = require('os');
const fs = require('fs');
const portfinder = require('portfinder');
const multer = require('multer');

// Server config
const DEFAULT_PORT = 8200;
process.title = 'AiBiDi';
const AUTO_SHUTDOWN = process.argv.includes('--auto-shutdown');
const SHUTDOWN_DELAY = 3000; // Wait 3 seconds before shutdown (allows refresh)
let connectionCount = 0;
let hadConnection = false;
let shutdownTimer = null;

// Create Express app
const app = express();
const server = http.createServer(app);

// Setup temp directory for file uploads and runtime files
const PROJECT_ROOT = path.join(__dirname, '..');
const TMP_DIR = path.join(PROJECT_ROOT, 'tmp');
const TEMP_DIR = path.join(TMP_DIR, 'uploads');

// 1. Cleanup on startup - delete entire tmp/ directory
if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
    console.log('Cleaned up tmp/ on startup');
}
fs.mkdirSync(TEMP_DIR, { recursive: true });

// 2. Runtime cleanup - queue-based deletion (exactly 60 seconds after upload)

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, TEMP_DIR);
    },
    filename: (req, file, cb) => {
        // Keep original filename with timestamp to avoid conflicts
        const timestamp = Date.now();
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, `${timestamp}-${originalName}`);
    }
});
const upload = multer({ storage });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;

    // Schedule deletion after exactly 60 seconds
    setTimeout(() => {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (e) {
            // Ignore deletion errors
        }
    }, 60 * 1000);

    res.json({ path: filePath });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws) => {
    connectionCount++;
    hadConnection = true;

    // Cancel shutdown if pending (e.g., user refreshed)
    if (shutdownTimer) {
        clearTimeout(shutdownTimer);
        shutdownTimer = null;
        console.log('Shutdown cancelled - new connection');
    }

    console.log(`Client connected (${connectionCount} active)`);

    // Determine shell based on OS
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

    // Create PTY process
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME || process.env.USERPROFILE,
        env: process.env
    });

    // PTY -> WebSocket (terminal output to browser)
    ptyProcess.onData((data) => {
        try {
            ws.send(JSON.stringify({ type: 'output', data }));
        } catch (e) {
            // Client disconnected
        }
    });

    // WebSocket -> PTY (browser input to terminal)
    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message);

            switch (msg.type) {
                case 'input':
                    ptyProcess.write(msg.data);
                    break;
                case 'resize':
                    ptyProcess.resize(msg.cols, msg.rows);
                    break;
            }
        } catch (e) {
            // Invalid message
        }
    });

    // Handle client disconnect
    ws.on('close', () => {
        connectionCount--;
        console.log(`Client disconnected (${connectionCount} active)`);
        ptyProcess.kill();

        // Auto-shutdown when all connections close (with delay for refresh)
        if (AUTO_SHUTDOWN && hadConnection && connectionCount === 0) {
            console.log(`No active connections. Shutting down in ${SHUTDOWN_DELAY/1000}s...`);
            shutdownTimer = setTimeout(() => {
                console.log('Shutting down...');

                // 3. Cleanup on shutdown - delete entire tmp/ directory
                try {
                    if (fs.existsSync(TMP_DIR)) {
                        fs.rmSync(TMP_DIR, { recursive: true, force: true });
                        console.log('Cleaned up tmp/ on shutdown');
                    }
                } catch (e) {
                    // Ignore cleanup errors
                }

                process.exit(0);
            }, SHUTDOWN_DELAY);
        }
    });
});

// Start server with dynamic port
portfinder.setBasePort(DEFAULT_PORT);
portfinder.getPortPromise()
    .then((port) => {
        server.listen(port, () => {
            console.log(`AiBiDi running at http://localhost:${port}`);

            // Write port to file for scripts to read
            const portFile = path.join(TMP_DIR, '.port');
            fs.writeFileSync(portFile, port.toString(), 'utf8');
        });
    })
    .catch((err) => {
        console.error('Could not find available port:', err);
        process.exit(1);
    });

module.exports = server;
