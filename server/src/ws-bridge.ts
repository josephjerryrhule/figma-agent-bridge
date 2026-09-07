/**
 * WebSocket Bridge Server & Relay Client.
 * Relays commands between AI agents and the Figma Plugin.
 * If another local bridge instance is already running on port 3055, seamlessly routes requests through it.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import { BridgeCommandType, BridgeRequest, BridgeResponse } from './shared/protocol.js';

interface PendingRequest {
  resolve: (data: any) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class WebSocketBridge {
  private wss: WebSocketServer | null = null;
  private activeClient: WebSocket | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  public port: number;

  constructor(server?: any, port = 3055) {
    this.port = port;
    if (server) {
      this.attachToServer(server);
    }
  }

  public attachToServer(server: any): void {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
      this.wss?.handleUpgrade(request, socket, head, (ws) => {
        this.wss?.emit('connection', ws, request);
      });
    });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });
  }

  private handleConnection(ws: WebSocket): void {
    console.error('[bridge]: Figma plugin connected');
    this.activeClient = ws;

    ws.on('message', (data: Buffer | string) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'PLUGIN_CONNECTED') {
          console.error('[bridge]: Handshake confirmed with Figma plugin');
          return;
        }

        if (message.id && this.pendingRequests.has(message.id)) {
          const pending = this.pendingRequests.get(message.id)!;
          clearTimeout(pending.timer);
          this.pendingRequests.delete(message.id);

          const response = message as BridgeResponse;
          if (response.success) {
            pending.resolve(response.data);
          } else {
            pending.reject(new Error(response.error || 'Figma command failed without error message'));
          }
        }
      } catch (err: any) {
        console.error('[bridge]: Failed to parse incoming plugin message:', err?.message);
      }
    });

    ws.on('close', () => {
      console.error('[bridge]: Figma plugin disconnected');
      if (this.activeClient === ws) {
        this.activeClient = null;
      }
      this.rejectAllPending('Figma plugin connection closed before response was received');
    });

    ws.on('error', (err) => {
      console.error('[bridge]: WebSocket error:', err.message);
    });
  }

  public isConnected(): boolean {
    return this.activeClient !== null && this.activeClient.readyState === WebSocket.OPEN;
  }

  public async sendCommand<TResponse = any, TPayload = any>(
    command: BridgeCommandType,
    payload: TPayload,
    timeoutMs = 20000
  ): Promise<TResponse> {
    // 1. Direct WebSocket communication if plugin is connected directly to this process
    if (this.isConnected()) {
      return this.sendViaDirectWebSocket(command, payload, timeoutMs);
    }

    // 2. Fallback: Query local bridge daemon over HTTP (in case another process owns port 3055)
    return this.sendViaLocalHttp(command, payload, timeoutMs);
  }

  private sendViaDirectWebSocket<TResponse, TPayload>(
    command: BridgeCommandType,
    payload: TPayload,
    timeoutMs: number
  ): Promise<TResponse> {
    const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const request: BridgeRequest<TPayload> = {
      id,
      command,
      payload,
      timestamp: Date.now()
    };

    return new Promise<TResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Figma command '${command}' timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      try {
        this.activeClient!.send(JSON.stringify(request));
      } catch (err: any) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(new Error(`Failed to transmit command '${command}' to Figma: ${err.message}`));
      }
    });
  }

  private async sendViaLocalHttp<TResponse, TPayload>(
    command: BridgeCommandType,
    payload: TPayload,
    timeoutMs: number
  ): Promise<TResponse> {
    const endpoint = this.getEndpointForCommand(command);
    const url = `http://127.0.0.1:${this.port}${endpoint.path}`;

    try {
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.method === 'POST' ? JSON.stringify(payload) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutTimer);
      const json = (await res.json()) as any;

      if (command === 'GET_STATUS') {
        return json.details || json;
      }

      if (json.success) {
        return json.data;
      }

      throw new Error(json.error || `Command failed with status ${res.status}`);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Command '${command}' timed out after ${timeoutMs}ms`);
      }
      if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('fetch failed')) {
        throw new Error(
          'Figma plugin is not connected. Please open your Figma document and launch the "Agent Canvas Bridge" plugin.'
        );
      }
      throw err;
    }
  }

  private getEndpointForCommand(command: BridgeCommandType): { path: string; method: 'GET' | 'POST' } {
    switch (command) {
      case 'GET_STATUS':
        return { path: '/v1/status', method: 'GET' };
      case 'GET_SELECTION':
        return { path: '/v1/selection', method: 'GET' };
      case 'GET_DOCUMENT_INFO':
        return { path: '/v1/document', method: 'GET' };
      case 'INSPECT_NODE':
        return { path: '/v1/inspect', method: 'POST' };
      case 'FIND_NODES':
        return { path: '/v1/find', method: 'POST' };
      case 'RENDER_LAYOUT':
        return { path: '/v1/render', method: 'POST' };
      case 'UPDATE_NODE':
        return { path: '/v1/update', method: 'POST' };
      case 'APPEND_CHILDREN':
        return { path: '/v1/append', method: 'POST' };
      case 'REPLACE_CHILDREN':
        return { path: '/v1/replace', method: 'POST' };
      case 'DELETE_NODES':
        return { path: '/v1/delete', method: 'POST' };
      case 'CAPTURE_SCREENSHOT':
        return { path: '/v1/screenshot', method: 'POST' };
      case 'EXECUTE_CODE':
        return { path: '/v1/execute', method: 'POST' };
      case 'UNDO':
        return { path: '/v1/undo', method: 'POST' };
      case 'REDO':
        return { path: '/v1/redo', method: 'POST' };
      default:
        return { path: '/v1/status', method: 'GET' };
    }
  }

  private rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }

  public close(): void {
    this.rejectAllPending('Bridge server is shutting down');
    if (this.wss) {
      this.wss.close();
    }
  }
}
