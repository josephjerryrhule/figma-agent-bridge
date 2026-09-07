#!/usr/bin/env node

/**
 * Figma Agent Bridge CLI & Daemon.
 * Starts the WebSocket relay, HTTP REST API, and Model Context Protocol (MCP) server.
 */

import http from 'node:http';
import { Command } from 'commander';
import { WebSocketBridge } from './ws-bridge.js';
import { startMcpStdio } from './mcp/server.js';
import { createHttpHandler } from './rest/api.js';

const program = new Command();

program
  .name('figma-agent-bridge')
  .description('Universal AI design bridge for Figma (AGY, Claude, Codex, ChatGPT)')
  .version('1.0.0')
  .option('-p, --port <number>', 'Port for WebSocket and HTTP bridge', '3055')
  .option('--agent <name>', 'Name of agent using this bridge instance (e.g. "Claude Code", "AGY", "Codex")')
  .option('--bridge-only', 'Run WebSocket and REST API only without MCP stdio server', false)
  .action(async (options) => {
    const port = parseInt(options.port, 10) || 3055;
    const bridgeOnly = !!options.bridgeOnly;
    const agent = options.agent || process.env.FIGMA_AGENT_NAME;

    // Create Bridge
    const wsBridge = new WebSocketBridge(undefined, port);
    if (agent) {
      wsBridge.defaultAgent = agent;
    }

    // Create combined HTTP & WebSocket server
    const server = http.createServer(createHttpHandler(wsBridge, port));
    wsBridge.attachToServer(server);

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`ℹ️ [figma-agent-bridge]: Port ${port} is already in use. Connected to existing bridge.`);
      } else {
        console.error('Server error:', err);
      }
    });

    try {
      server.listen(port, () => {
        console.error(`⚡ [figma-agent-bridge]: Server running at http://localhost:${port}`);
        console.error(`🔌 [figma-agent-bridge]: WebSocket bridge listening on ws://localhost:${port}`);
        console.error(`📖 [figma-agent-bridge]: OpenAPI spec available at http://localhost:${port}/openapi.json`);
        if (bridgeOnly) {
          console.error(`🚀 [figma-agent-bridge]: Running in bridge-only mode (HTTP + WebSocket).`);
        }
      });
    } catch (_) {}

    // Start MCP Stdio Server if not in bridge-only mode
    if (!bridgeOnly) {
      try {
        await startMcpStdio(wsBridge, agent);
      } catch (err: any) {
        console.error('[mcp]: Failed to start MCP stdio server:', err.message);
        process.exit(1);
      }
    }

    // Graceful shutdown
    const cleanup = () => {
      wsBridge.close();
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  });

program.parse(process.argv);
