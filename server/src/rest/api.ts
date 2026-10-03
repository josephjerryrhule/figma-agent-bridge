/**
 * REST API Server for Figma Agent Bridge.
 * Allows ChatGPT Custom Actions, curl, and external tools to interact with Figma over HTTP.
 */

import http from 'node:http';
import { WebSocketBridge } from '../ws-bridge.js';
import { getOpenApiSpec } from './openapi.js';
import { resolveMediaPayload, resolveLayoutTreeMedia, resolveUpdateNodeMedia } from '../shared/media-resolver.js';
import { processExportResult, processScreenshotResult } from '../shared/export-saver.js';

export function createHttpHandler(wsBridge: WebSocketBridge, serverPort = 3055) {
  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Figma-File, X-Agent-Name');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const headerFile = req.headers['x-figma-file'];
    const requestedFile = (typeof headerFile === 'string' ? headerFile : headerFile?.[0]) || url.searchParams.get('file') || undefined;

    const sendJson = (statusCode: number, data: any) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data, null, 2));
    };

    // OpenAPI Spec
    if (req.method === 'GET' && (pathname === '/openapi.json' || pathname === '/v1/openapi.json')) {
      sendJson(200, getOpenApiSpec(`http://localhost:${serverPort}`));
      return;
    }

    if (req.method === 'GET' && pathname === '/v1/files') {
      sendJson(200, wsBridge.listClients());
      return;
    }

    // Health & Status
    if (req.method === 'GET' && (pathname === '/' || pathname === '/health' || pathname === '/v1/status')) {
      const isConnected = wsBridge.isConnected();
      if (!isConnected) {
        sendJson(200, {
          status: 'ok',
          figmaConnected: false,
          message: 'Figma plugin is not connected. Open Figma and launch the "Agent Canvas Bridge" plugin.'
        });
        return;
      }

      try {
        const status = await wsBridge.sendCommand('GET_STATUS', {}, 20000, undefined, requestedFile);
        sendJson(200, {
          status: 'ok',
          figmaConnected: true,
          details: status
        });
      } catch (err: any) {
        sendJson(500, { error: err.message });
      }
      return;
    }

    // Parse JSON body for POST requests
    const readBody = async (): Promise<any> => {
      return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (e: any) {
            reject(new Error(`Invalid JSON body: ${e.message}`));
          }
        });
        req.on('error', reject);
      });
    };

    try {
      const agentHeader = req.headers['x-agent-name'] as string | undefined;
      const queryAgent = url.searchParams.get('agent');
      const userAgent = req.headers['user-agent'] || '';
      let agent = agentHeader || queryAgent;
      if (!agent) {
        if (userAgent.includes('ChatGPT') || userAgent.includes('OpenAI')) {
          agent = 'ChatGPT';
        } else if (userAgent.includes('curl')) {
          agent = 'CLI / Terminal';
        } else {
          agent = 'Codex';
        }
      }

      if (req.method === 'POST' && pathname === '/v1/files/active') {
        const body = await readBody();
        if (!body.file || typeof body.file !== 'string') {
          sendJson(400, { success: false, error: 'Missing "file" in body' });
          return;
        }
        sendJson(200, { success: true, data: wsBridge.setDefaultClient(body.file) });
        return;
      }

      const sendForFile = <T = any>(command: any, payload: any, timeoutMs: number, target = requestedFile) =>
        wsBridge.sendCommand<T>(command, payload, timeoutMs, agent, target);

      if (req.method === 'GET' && pathname === '/v1/selection') {
        const data = await sendForFile('GET_SELECTION', { depth: 3 }, 20000);
        sendJson(200, { success: true, data });
        return;
      }

      if (req.method === 'GET' && pathname === '/v1/document') {
        const data = await sendForFile('GET_DOCUMENT_INFO', {}, 20000);
        sendJson(200, { success: true, data });
        return;
      }

      if (req.method === 'GET' && pathname === '/v1/variables') {
        const data = await sendForFile('GET_VARIABLES', {}, 20000);
        sendJson(200, { success: true, data });
        return;
      }

      if (req.method === 'POST') {
        const body = await readBody();
        const bodyFile = typeof body.file === 'string' ? body.file : undefined;
        delete body.file;
        const send = <T = any>(command: any, payload: any, timeoutMs: number) =>
          sendForFile<T>(command, payload, timeoutMs, requestedFile || bodyFile);

        switch (pathname) {
          case '/v1/inspect': {
            const data = await send('INSPECT_NODE', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/find': {
            const data = await send('FIND_NODES', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/render': {
            if (!body.root) {
              sendJson(400, { success: false, error: 'Missing "root" layout specification in body' });
              return;
            }
            body.root = await resolveLayoutTreeMedia(body.root);
            const data = await send('RENDER_LAYOUT', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/auto-layout': {
            const data = await send('SET_AUTO_LAYOUT', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/component': {
            if (body.spec) {
              body.spec = await resolveLayoutTreeMedia(body.spec);
            }
            const data = await send('CREATE_COMPONENT', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/component-set': {
            if (!Array.isArray(body.componentIds) || body.componentIds.length < 2) {
              sendJson(400, { success: false, error: 'Missing "componentIds" array with at least 2 components' });
              return;
            }
            const data = await send('CREATE_COMPONENT_SET', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/instance': {
            if (!body.componentId) {
              sendJson(400, { success: false, error: 'Missing "componentId" in body' });
              return;
            }
            const data = await send('CREATE_INSTANCE', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/style': {
            if (!body.styleType || !body.name) {
              sendJson(400, { success: false, error: 'Missing "styleType" (PAINT|TEXT|EFFECT) or "name" in body' });
              return;
            }
            const data = await send('CREATE_STYLE', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/apply-style': {
            if (!body.nodeId || !body.styleType) {
              sendJson(400, { success: false, error: 'Missing "nodeId" or "styleType" in body' });
              return;
            }
            const data = await send('APPLY_STYLE', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/variable': {
            if (!body.name || !body.resolvedType || body.value === undefined) {
              sendJson(400, { success: false, error: 'Missing "name", "resolvedType", or "value" in body' });
              return;
            }
            const data = await send('CREATE_VARIABLE', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/group': {
            if (!Array.isArray(body.nodeIds) || body.nodeIds.length === 0) {
              sendJson(400, { success: false, error: 'Missing "nodeIds" array in body' });
              return;
            }
            const data = await send('GROUP_NODES', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/boolean': {
            if (!body.operation || !Array.isArray(body.nodeIds) || body.nodeIds.length < 2) {
              sendJson(400, { success: false, error: 'Missing "operation" or "nodeIds" array (min 2 nodes) in body' });
              return;
            }
            const data = await send('BOOLEAN_OPERATION', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/update': {
            if (!body.id && !body.name) {
              sendJson(400, { success: false, error: 'Must provide target node "id" or "name" in body' });
              return;
            }
            const resolvedBody = await resolveUpdateNodeMedia(body);
            const data = await send('UPDATE_NODE', resolvedBody, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/append': {
            if (!body.parentId || !Array.isArray(body.children)) {
              sendJson(400, { success: false, error: 'Missing "parentId" or "children" array in body' });
              return;
            }
            for (let i = 0; i < body.children.length; i++) {
              body.children[i] = await resolveLayoutTreeMedia(body.children[i]);
            }
            const data = await send('APPEND_CHILDREN', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/replace': {
            if (!body.parentId || !Array.isArray(body.children)) {
              sendJson(400, { success: false, error: 'Missing "parentId" or "children" array in body' });
              return;
            }
            for (let i = 0; i < body.children.length; i++) {
              body.children[i] = await resolveLayoutTreeMedia(body.children[i]);
            }
            const data = await send('REPLACE_CHILDREN', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/media': {
            if (!body.mediaType || !body.source) {
              sendJson(400, { success: false, error: 'Missing "mediaType" (IMAGE|SVG|VIDEO|GIF) or "source" in body' });
              return;
            }
            const resolvedPayload = await resolveMediaPayload(body);
            const data = await send('INSERT_MEDIA', resolvedPayload, 25000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/delete': {
            if (!Array.isArray(body.ids)) {
              sendJson(400, { success: false, error: 'Missing "ids" array in body' });
              return;
            }
            const data = await send('DELETE_NODES', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/duplicate': {
            if (!body.nodeId) {
              sendJson(400, { success: false, error: 'Missing "nodeId" in body' });
              return;
            }
            const data = await send('DUPLICATE_NODE', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/export': {
            const rawData = await send('EXPORT_NODES', body, 60000);
            const data = await processExportResult(rawData, body);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/screenshot': {
            const rawData = await send('CAPTURE_SCREENSHOT', body, 25000);
            const data = await processScreenshotResult(rawData, body);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/speaker-notes/get': {
            const data = await send('GET_SPEAKER_NOTES', body, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/speaker-notes': {
            if (!Array.isArray(body.notes) || body.notes.length === 0) {
              sendJson(400, { success: false, error: 'Missing "notes" array in body: [{ nodeId, notes }]' });
              return;
            }
            const data = await send('SET_SPEAKER_NOTES', body, 30000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/execute': {
            if (!body.code) {
              sendJson(400, { success: false, error: 'Missing "code" in body' });
              return;
            }
            const data = await send('EXECUTE_CODE', body, 60000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/undo': {
            const data = await send('UNDO', {}, 20000);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/redo': {
            const data = await send('REDO', {}, 20000);
            sendJson(200, { success: true, data });
            return;
          }
        }
      }

      sendJson(404, { success: false, error: `Endpoint not found: ${req.method} ${pathname}` });
    } catch (err: any) {
      sendJson(500, {
        success: false,
        error: err.message || 'Internal server error'
      });
    }
  };
}
