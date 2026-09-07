import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { WebSocket } from 'ws';
import { WebSocketBridge } from '../server/src/ws-bridge.js';

describe('WebSocket Bridge Relay', () => {
  let server: http.Server;
  let wsBridge: WebSocketBridge;
  let port: number;

  beforeAll(async () => {
    wsBridge = new WebSocketBridge();
    server = http.createServer((req, res) => {
      res.statusCode = 404;
      res.end();
    });
    wsBridge.attachToServer(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        wsBridge.port = port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    wsBridge.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('rejects commands when no Figma plugin is connected', async () => {
    await expect(wsBridge.sendCommand('GET_STATUS', {}, 1000)).rejects.toThrow();
  });

  it('connects a mock Figma plugin and completes a roundtrip command', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        // Send handshake
        ws.send(JSON.stringify({ type: 'PLUGIN_CONNECTED' }));
        resolve();
      });
      ws.on('error', reject);
    });

    // Handle incoming command from server
    ws.on('message', (raw) => {
      const req = JSON.parse(raw.toString());
      if (req.command === 'GET_STATUS') {
        ws.send(
          JSON.stringify({
            id: req.id,
            success: true,
            data: {
              documentName: 'Design System Master',
              currentPageName: 'Components',
              selectedCount: 1
            }
          })
        );
      }
    });

    // Wait a tick for connection state to update
    await new Promise(r => setTimeout(r, 50));
    expect(wsBridge.isConnected()).toBe(true);

    const result = await wsBridge.sendCommand('GET_STATUS', {});
    expect(result).toEqual({
      documentName: 'Design System Master',
      currentPageName: 'Components',
      selectedCount: 1
    });

    ws.close();
  });

  it('handles plugin returning an error response', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);

    await new Promise<void>((resolve) => {
      ws.on('open', () => resolve());
    });

    ws.on('message', (raw) => {
      const req = JSON.parse(raw.toString());
      ws.send(
        JSON.stringify({
          id: req.id,
          success: false,
          error: 'Node with ID 999:999 does not exist'
        })
      );
    });

    await new Promise(r => setTimeout(r, 50));

    await expect(
      wsBridge.sendCommand('INSPECT_NODE', { id: '999:999' })
    ).rejects.toThrow('Node with ID 999:999 does not exist');

    ws.close();
  });
});
