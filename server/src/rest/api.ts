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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    const sendJson = (statusCode: number, data: any) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data, null, 2));
    };

    // OpenAPI Spec
    if (req.method === 'GET' && (pathname === '/openapi.json' || pathname === '/v1/openapi.json')) {
      sendJson(200, getOpenApiSpec(`http://localhost:${serverPort}`));
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
        const status = await wsBridge.sendCommand('GET_STATUS', {});
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

      if (req.method === 'GET' && pathname === '/v1/selection') {
        const data = await wsBridge.sendCommand('GET_SELECTION', { depth: 3 }, 20000, agent);
        sendJson(200, { success: true, data });
        return;
      }

      if (req.method === 'GET' && pathname === '/v1/document') {
        const data = await wsBridge.sendCommand('GET_DOCUMENT_INFO', {}, 20000, agent);
        sendJson(200, { success: true, data });
        return;
      }

      if (req.method === 'POST') {
        const body = await readBody();

        switch (pathname) {
          case '/v1/inspect': {
            const data = await wsBridge.sendCommand('INSPECT_NODE', body, 20000, agent);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/find': {
            const data = await wsBridge.sendCommand('FIND_NODES', body, 20000, agent);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/render': {
            if (!body.root) {
              sendJson(400, { success: false, error: 'Missing "root" layout specification in body' });
              return;
            }
            body.root = await resolveLayoutTreeMedia(body.root);
            const data = await wsBridge.sendCommand('RENDER_LAYOUT', body, 20000, agent);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/update': {
            if (!body.id && !body.name) {
              sendJson(400, { success: false, error: 'Must provide target node "id" or "name" in body' });
              return;
            }
            const resolvedBody = await resolveUpdateNodeMedia(body);
            const data = await wsBridge.sendCommand('UPDATE_NODE', resolvedBody, 20000, agent);
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
            const data = await wsBridge.sendCommand('APPEND_CHILDREN', body, 20000, agent);
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
            const data = await wsBridge.sendCommand('REPLACE_CHILDREN', body, 20000, agent);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/media': {
            if (!body.mediaType || !body.source) {
              sendJson(400, { success: false, error: 'Missing "mediaType" (IMAGE|SVG|VIDEO|GIF) or "source" in body' });
              return;
            }
            const resolvedPayload = await resolveMediaPayload(body);
            const data = await wsBridge.sendCommand('INSERT_MEDIA', resolvedPayload, 25000, agent);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/delete': {
            if (!Array.isArray(body.ids)) {
              sendJson(400, { success: false, error: 'Missing "ids" array in body' });
              return;
            }
            const data = await wsBridge.sendCommand('DELETE_NODES', body, 20000, agent);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/duplicate': {
            if (!body.nodeId) {
              sendJson(400, { success: false, error: 'Missing "nodeId" in body' });
              return;
            }
            const data = await wsBridge.sendCommand('DUPLICATE_NODE', body, 20000, agent);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/export': {
            const rawData = await wsBridge.sendCommand('EXPORT_NODES', body, 60000, agent);
            const data = await processExportResult(rawData, body);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/screenshot': {
            const rawData = await wsBridge.sendCommand('CAPTURE_SCREENSHOT', body, 25000, agent);
            const data = await processScreenshotResult(rawData, body);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/execute': {
            if (!body.code) {
              sendJson(400, { success: false, error: 'Missing "code" in body' });
              return;
            }
            const data = await wsBridge.sendCommand('EXECUTE_CODE', body, 20000, agent);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/undo': {
            const data = await wsBridge.sendCommand('UNDO', {}, 20000, agent);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/redo': {
            const data = await wsBridge.sendCommand('REDO', {}, 20000, agent);
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
