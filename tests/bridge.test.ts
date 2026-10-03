import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { WebSocket } from 'ws';
import { WebSocketBridge } from '../server/src/ws-bridge.js';

const waitFor = async (predicate: () => boolean, timeoutMs = 1000): Promise<void> => {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) throw new Error('Timed out waiting for plugin message');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};

const closeSocket = (ws: WebSocket): Promise<void> => new Promise(resolve => {
  if (ws.readyState === WebSocket.CLOSED) return resolve();
  ws.once('close', () => resolve());
  ws.close();
});

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
    expect(result).toMatchObject({
      documentName: 'Design System Master',
      currentPageName: 'Components',
      selectedCount: 1
    });
    expect((result as any).connectedFiles).toHaveLength(1);
    expect((result as any).clients[0].isDefault).toBe(true);

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

  it('routes targeted commands to the named file and untargeted commands to the newest file', async () => {
    const connectPlugin = async (fileName: string, fileKey: string, label: string) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'PLUGIN_CONNECTED', fileName, fileKey, editorType: 'figma', pageName: 'Page 1' }));
          resolve();
        });
        ws.on('error', reject);
      });
      ws.on('message', raw => {
        const request = JSON.parse(raw.toString());
        ws.send(JSON.stringify({ id: request.id, success: true, data: { client: label } }));
      });
      return ws;
    };

    const fileA = await connectPlugin('File A', 'key-a', 'A');
    const fileB = await connectPlugin('File B', 'key-b', 'B');
    await waitFor(() => wsBridge.listClients().filter(client => client.fileName === 'File A' || client.fileName === 'File B').length === 2);

    await expect(wsBridge.sendCommand('GET_SELECTION', {}, 1000, undefined, 'File B')).resolves.toEqual({ client: 'B' });
    await expect(wsBridge.sendCommand('GET_SELECTION', {}, 1000)).resolves.toEqual({ client: 'B' });

    await Promise.all([closeSocket(fileA), closeSocket(fileB)]);
  });

  it('keeps pending commands for another client when the default client closes', async () => {
    const connectPlugin = async (fileName: string) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'PLUGIN_CONNECTED', fileName, editorType: 'figma', pageName: 'Page 1' }));
          resolve();
        });
        ws.on('error', reject);
      });
      return ws;
    };

    const fileA = await connectPlugin('File A');
    const fileB = await connectPlugin('File B');
    await waitFor(() => wsBridge.listClients().filter(client => client.fileName === 'File A' || client.fileName === 'File B').length === 2);

    let requestForA: any;
    fileA.on('message', raw => { requestForA = JSON.parse(raw.toString()); });
    const pending = wsBridge.sendCommand('GET_SELECTION', {}, 1000, undefined, 'File A');
    await waitFor(() => Boolean(requestForA));

    await closeSocket(fileB);
    await waitFor(() => wsBridge.listClients().find(client => client.isDefault)?.fileName === 'File A');
    fileA.send(JSON.stringify({ id: requestForA.id, success: true, data: { client: 'A' } }));

    await expect(pending).resolves.toEqual({ client: 'A' });
    expect(wsBridge.listClients().find(client => client.isDefault)?.fileName).toBe('File A');

    await closeSocket(fileA);
  });

  it('reports clear errors for ambiguous and unknown file targets', async () => {
    const connectPlugin = async (fileName: string) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'PLUGIN_CONNECTED', fileName, editorType: 'figma', pageName: 'Page 1' }));
          resolve();
        });
        ws.on('error', reject);
      });
      return ws;
    };

    const website = await connectPlugin('Marketing Website');
    const campaign = await connectPlugin('Marketing Campaign');
    await waitFor(() => wsBridge.listClients().filter(client => client.fileName?.startsWith('Marketing')).length === 2);

    await expect(wsBridge.sendCommand('GET_SELECTION', {}, 1000, undefined, 'Marketing')).rejects.toThrow(/ambiguous.*Marketing Website.*Marketing Campaign/i);
    await expect(wsBridge.sendCommand('GET_SELECTION', {}, 1000, undefined, 'Missing File')).rejects.toThrow(/No connected Figma file matches "Missing File".*Marketing Website/i);

    await Promise.all([closeSocket(website), closeSocket(campaign)]);
  });

  it('changes the default routing target with setDefaultClient', async () => {
    const connectPlugin = async (fileName: string, label: string) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'PLUGIN_CONNECTED', fileName, editorType: 'figma', pageName: 'Page 1' }));
          resolve();
        });
        ws.on('error', reject);
      });
      ws.on('message', raw => {
        const request = JSON.parse(raw.toString());
        ws.send(JSON.stringify({ id: request.id, success: true, data: { client: label } }));
      });
      return ws;
    };

    const fileA = await connectPlugin('File A', 'A');
    const fileB = await connectPlugin('File B', 'B');
    await waitFor(() => wsBridge.listClients().filter(client => client.fileName === 'File A' || client.fileName === 'File B').length === 2);

    expect(wsBridge.setDefaultClient('File A').fileName).toBe('File A');
    await expect(wsBridge.sendCommand('GET_SELECTION', {}, 1000)).resolves.toEqual({ client: 'A' });

    await Promise.all([closeSocket(fileA), closeSocket(fileB)]);
  });
});
