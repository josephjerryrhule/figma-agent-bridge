import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { WebSocket } from 'ws';
import { WebSocketBridge } from '../server/src/ws-bridge.js';
import { createHttpHandler } from '../server/src/rest/api.js';

describe('REST API & OpenAPI Endpoints', () => {
  let server: http.Server;
  let wsBridge: WebSocketBridge;
  let port: number;

  beforeAll(async () => {
    wsBridge = new WebSocketBridge();
    server = http.createServer(createHttpHandler(wsBridge));
    wsBridge.attachToServer(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    wsBridge.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('serves OpenAPI 3.1 schema at /openapi.json', async () => {
    const res = await fetch(`http://localhost:${port}/openapi.json`);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.openapi).toBe('3.1.0');
    expect(json.info.title).toBe('Figma Agent Bridge API');
    expect(json.paths['/v1/render']).toBeDefined();
    expect(json.paths['/v1/update']).toBeDefined();
    expect(json.paths['/v1/delete']).toBeDefined();
    expect(json.paths['/v1/screenshot']).toBeDefined();
  });

  it('reports offline status at /health when plugin is disconnected', async () => {
    const res = await fetch(`http://localhost:${port}/health`);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.status).toBe('ok');
    expect(json.figmaConnected).toBe(false);
  });

  it('rejects POST /v1/render with 400 when missing root spec', async () => {
    const res = await fetch(`http://localhost:${port}/v1/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);

    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.error).toContain('Missing "root"');
  });

  it('rejects POST /v1/update with 400 when missing target id', async () => {
    const res = await fetch(`http://localhost:${port}/v1/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello' })
    });
    expect(res.status).toBe(400);

    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.error).toContain('Must provide target node "id" or "name"');
  });

  it('lists connected files and routes REST requests by header or active file', async () => {
    const connectPlugin = async (fileName: string) => {
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
        ws.send(JSON.stringify({ id: request.id, success: true, data: { fileName, payload: request.payload } }));
      });
      return ws;
    };
    const closeSocket = (ws: WebSocket) => new Promise<void>(resolve => {
      ws.once('close', () => resolve());
      ws.close();
    });

    const fileA = await connectPlugin('File A');
    const fileB = await connectPlugin('File B');
    await new Promise(resolve => setTimeout(resolve, 30));

    try {
      const files = await fetch(`http://localhost:${port}/v1/files`);
      expect((await files.json() as any[]).map(file => file.fileName)).toEqual(expect.arrayContaining(['File A', 'File B']));

      const targeted = await fetch(`http://localhost:${port}/v1/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Figma-File': 'File A' },
        body: JSON.stringify({ id: '1:2', file: 'File B' })
      });
      expect((await targeted.json() as any).data).toEqual({ fileName: 'File A', payload: { id: '1:2' } });

      const activated = await fetch(`http://localhost:${port}/v1/files/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: 'File B' })
      });
      expect((await activated.json() as any).data.fileName).toBe('File B');

      const defaulted = await fetch(`http://localhost:${port}/v1/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '1:3' })
      });
      expect((await defaulted.json() as any).data.fileName).toBe('File B');
    } finally {
      await Promise.all([closeSocket(fileA), closeSocket(fileB)]);
    }
  });
});
