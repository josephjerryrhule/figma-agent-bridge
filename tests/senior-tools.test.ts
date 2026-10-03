import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { WebSocketBridge } from '../server/src/ws-bridge.js';
import { createHttpHandler } from '../server/src/rest/api.js';

describe('Senior Designer Tools & Endpoints', () => {
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

  it('serves OpenAPI with all senior designer endpoints', async () => {
    const res = await fetch(`http://localhost:${port}/openapi.json`);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.paths['/v1/auto-layout']).toBeDefined();
    expect(json.paths['/v1/component']).toBeDefined();
    expect(json.paths['/v1/component-set']).toBeDefined();
    expect(json.paths['/v1/instance']).toBeDefined();
    expect(json.paths['/v1/style']).toBeDefined();
    expect(json.paths['/v1/apply-style']).toBeDefined();
    expect(json.paths['/v1/variables']).toBeDefined();
    expect(json.paths['/v1/variable']).toBeDefined();
    expect(json.paths['/v1/group']).toBeDefined();
    expect(json.paths['/v1/boolean']).toBeDefined();
  });

  it('rejects POST /v1/instance with 400 when missing componentId', async () => {
    const res = await fetch(`http://localhost:${port}/v1/instance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);

    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.error).toContain('Missing "componentId"');
  });

  it('rejects POST /v1/component-set with 400 when less than 2 components', async () => {
    const res = await fetch(`http://localhost:${port}/v1/component-set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ componentIds: ['comp-1'] })
    });
    expect(res.status).toBe(400);

    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.error).toContain('at least 2 components');
  });

  it('rejects POST /v1/style with 400 when missing styleType or name', async () => {
    const res = await fetch(`http://localhost:${port}/v1/style`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: '#FF0000' })
    });
    expect(res.status).toBe(400);

    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.error).toContain('Missing "styleType"');
  });
});
