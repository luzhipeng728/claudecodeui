import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { api } from '../utils/api';

function Terminal({ selectedProject, isActive }) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!terminalRef.current || !selectedProject || !isActive) return;

    // Initialize xterm.js
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
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
        brightWhite: '#e5e5e5'
      },
      allowProposedApi: true,
      scrollback: 10000,
      convertEol: true
    });

    xtermRef.current = xterm;

    // Add fit addon
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    xterm.loadAddon(fitAddon);

    // Add web links addon
    const webLinksAddon = new WebLinksAddon();
    xterm.loadAddon(webLinksAddon);

    // Attach terminal to DOM
    xterm.open(terminalRef.current);
    fitAddon.fit();

    // Connect to WebSocket
    connectWebSocket();

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, [selectedProject, isActive]);

  const connectWebSocket = async () => {
    setIsLoading(true);
    
    try {
      // Get authentication token
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch server configuration to get the correct WebSocket URL
      let wsBaseUrl;
      try {
        const configResponse = await fetch('/api/config', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!configResponse.ok) {
          throw new Error('Failed to get WebSocket configuration');
        }
        
        const config = await configResponse.json();
        wsBaseUrl = config.wsUrl;
        
        // If the config returns localhost but we're not on localhost, use current host
        if (wsBaseUrl.includes('localhost') && !window.location.hostname.includes('localhost')) {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          // Use the same port as the current location (since we're using Vite proxy)
          wsBaseUrl = `${protocol}//${window.location.host}`;
        }
      } catch (error) {
        // Fallback to current location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsBaseUrl = `${protocol}//${window.location.host}`;
      }
      
      // Include token and project in WebSocket URL as query parameters
      const wsUrl = `${wsBaseUrl}/terminal?token=${encodeURIComponent(token)}&project=${encodeURIComponent(selectedProject.name)}`;

      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsLoading(false);
        
        // Send terminal size
        if (xtermRef.current) {
          const { cols, rows } = xtermRef.current;
          ws.send(JSON.stringify({
            type: 'resize',
            cols,
            rows
          }));
        }
      };

      ws.onmessage = (event) => {
        if (xtermRef.current) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'data') {
              xtermRef.current.write(data.data);
            } else if (data.type === 'error') {
              xtermRef.current.writeln(`\r\n\x1b[31mError: ${data.message}\x1b[0m`);
            }
          } catch (e) {
            // Handle raw data
            xtermRef.current.write(event.data);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setIsLoading(false);
        if (xtermRef.current) {
          xtermRef.current.writeln('\r\n\x1b[31mConnection error\x1b[0m');
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsLoading(false);
        if (xtermRef.current) {
          xtermRef.current.writeln('\r\n\x1b[33mDisconnected\x1b[0m');
        }
      };

      // Handle terminal input
      if (xtermRef.current) {
        xtermRef.current.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'input',
              data
            }));
          }
        });

        // Handle terminal resize
        xtermRef.current.onResize(({ cols, rows }) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'resize',
              cols,
              rows
            }));
          }
        });
      }
    } catch (error) {
      console.error('Failed to connect terminal:', error);
      setIsLoading(false);
      if (xtermRef.current) {
        xtermRef.current.writeln(`\r\n\x1b[31mFailed to connect: ${error.message}\x1b[0m`);
      }
    }
  };

  const reconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
    connectWebSocket();
  };

  if (!selectedProject) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-gray-400 text-center">
          <p className="mb-2">No project selected</p>
          <p className="text-sm">Select a project to open terminal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Terminal Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-300">
            Terminal - {selectedProject.displayName || selectedProject.name}
          </span>
          {selectedProject.fullPath && (
            <span className="text-xs text-gray-500">
              ({selectedProject.fullPath})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && !isLoading && (
            <button
              onClick={reconnect}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Reconnect
            </button>
          )}
          {isLoading && (
            <span className="text-xs text-gray-400">Connecting...</span>
          )}
        </div>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 p-2">
        <div ref={terminalRef} className="h-full" />
      </div>
    </div>
  );
}

export default Terminal;