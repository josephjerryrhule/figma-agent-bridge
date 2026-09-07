import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
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
});
