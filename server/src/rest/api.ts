/**
 * REST API Server for Figma Agent Bridge.
 * Allows ChatGPT Custom Actions, curl, and external tools to interact with Figma over HTTP.
 */

import http from 'node:http';
import { WebSocketBridge } from '../ws-bridge.js';
import { getOpenApiSpec } from './openapi.js';

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
      if (req.method === 'GET' && pathname === '/v1/selection') {
        const data = await wsBridge.sendCommand('GET_SELECTION', { depth: 3 });
        sendJson(200, { success: true, data });
        return;
      }

      if (req.method === 'GET' && pathname === '/v1/document') {
        const data = await wsBridge.sendCommand('GET_DOCUMENT_INFO', {});
        sendJson(200, { success: true, data });
        return;
      }

      if (req.method === 'POST') {
        const body = await readBody();

        switch (pathname) {
          case '/v1/inspect': {
            const data = await wsBridge.sendCommand('INSPECT_NODE', body);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/find': {
            const data = await wsBridge.sendCommand('FIND_NODES', body);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/render': {
            if (!body.root) {
              sendJson(400, { success: false, error: 'Missing "root" layout specification in body' });
              return;
            }
            const data = await wsBridge.sendCommand('RENDER_LAYOUT', body);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/update': {
            if (!body.id && !body.name) {
              sendJson(400, { success: false, error: 'Must provide target node "id" or "name" in body' });
              return;
            }
            const data = await wsBridge.sendCommand('UPDATE_NODE', body);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/append': {
            if (!body.parentId || !Array.isArray(body.children)) {
              sendJson(400, { success: false, error: 'Missing "parentId" or "children" array in body' });
              return;
            }
            const data = await wsBridge.sendCommand('APPEND_CHILDREN', body);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/replace': {
            if (!body.parentId || !Array.isArray(body.children)) {
              sendJson(400, { success: false, error: 'Missing "parentId" or "children" array in body' });
              return;
            }
            const data = await wsBridge.sendCommand('REPLACE_CHILDREN', body);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/delete': {
            if (!Array.isArray(body.ids)) {
              sendJson(400, { success: false, error: 'Missing "ids" array in body' });
              return;
            }
            const data = await wsBridge.sendCommand('DELETE_NODES', body);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/screenshot': {
            const data = await wsBridge.sendCommand('CAPTURE_SCREENSHOT', body);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/execute': {
            if (!body.code) {
              sendJson(400, { success: false, error: 'Missing "code" in body' });
              return;
            }
            const data = await wsBridge.sendCommand('EXECUTE_CODE', body);
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/undo': {
            const data = await wsBridge.sendCommand('UNDO', {});
            sendJson(200, { success: true, data });
            return;
          }

          case '/v1/redo': {
            const data = await wsBridge.sendCommand('REDO', {});
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
