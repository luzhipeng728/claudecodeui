import pty from 'node-pty';
import { extractProjectDirectory } from './projects.js';

const terminals = new Map();

export function handleTerminalWebSocket(ws, req) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const projectName = url.searchParams.get('project');
    
    if (!projectName) {
        ws.send(JSON.stringify({ type: 'error', message: 'No project specified' }));
        ws.close();
        return;
    }

    let ptyProcess = null;
    let projectPath = null;

    const initTerminal = async () => {
        try {
            // Get project path
            projectPath = await extractProjectDirectory(projectName);
            if (!projectPath) {
                ws.send(JSON.stringify({ type: 'error', message: 'Project not found' }));
                ws.close();
                return;
            }

            // Check if we already have a terminal for this project
            const terminalKey = `${req.user.id}-${projectName}`;
            
            // Spawn a new PTY process
            ptyProcess = pty.spawn(process.env.SHELL || 'bash', [], {
                name: 'xterm-color',
                cols: 80,
                rows: 30,
                cwd: projectPath,
                env: {
                    ...process.env,
                    TERM: 'xterm-256color',
                    COLORTERM: 'truecolor',
                    USER: process.env.USER,
                    HOME: process.env.HOME,
                    PATH: process.env.PATH
                }
            });

            // Store terminal reference
            terminals.set(terminalKey, ptyProcess);

            // Send initial prompt
            ws.send(JSON.stringify({ 
                type: 'data', 
                data: `\x1b[32m➜\x1b[0m Connected to terminal in ${projectPath}\r\n` 
            }));

            // Handle PTY output
            ptyProcess.onData((data) => {
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({ type: 'data', data }));
                }
            });

            // Handle PTY exit
            ptyProcess.onExit(() => {
                console.log('PTY process exited');
                terminals.delete(terminalKey);
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({ 
                        type: 'data', 
                        data: '\r\n\x1b[31mTerminal session ended\x1b[0m\r\n' 
                    }));
                    ws.close();
                }
            });

        } catch (error) {
            console.error('Failed to initialize terminal:', error);
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: `Failed to initialize terminal: ${error.message}` 
            }));
            ws.close();
        }
    };

    // Initialize terminal
    initTerminal();

    // Handle WebSocket messages
    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message.toString());
            
            switch (msg.type) {
                case 'input':
                    if (ptyProcess) {
                        ptyProcess.write(msg.data);
                    }
                    break;
                    
                case 'resize':
                    if (ptyProcess && msg.cols && msg.rows) {
                        ptyProcess.resize(msg.cols, msg.rows);
                    }
                    break;
                    
                default:
                    console.log('Unknown message type:', msg.type);
            }
        } catch (error) {
            console.error('Error processing terminal message:', error);
        }
    });

    // Handle WebSocket close
    ws.on('close', () => {
        console.log('Terminal WebSocket closed');
        if (ptyProcess) {
            ptyProcess.kill();
            const terminalKey = `${req.user.id}-${projectName}`;
            terminals.delete(terminalKey);
        }
    });

    // Handle WebSocket error
    ws.on('error', (error) => {
        console.error('Terminal WebSocket error:', error);
        if (ptyProcess) {
            ptyProcess.kill();
        }
    });
}

// Cleanup function to kill all terminals
export function cleanupTerminals() {
    for (const [key, terminal] of terminals.entries()) {
        try {
            terminal.kill();
        } catch (error) {
            console.error(`Failed to kill terminal ${key}:`, error);
        }
    }
    terminals.clear();
}