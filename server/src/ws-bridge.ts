/**
 * WebSocket Bridge Server.
 * Relays commands between AI agents (via MCP or REST) and the Figma Plugin running in the user's browser/desktop.
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

  constructor(server?: any) {
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

        // Check if handshake
        if (message.type === 'PLUGIN_CONNECTED') {
          console.error('[bridge]: Handshake confirmed with Figma plugin');
          return;
        }

        // Handle response to a pending request
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

  public sendCommand<TResponse = any, TPayload = any>(
    command: BridgeCommandType,
    payload: TPayload,
    timeoutMs = 20000
  ): Promise<TResponse> {
    if (!this.isConnected()) {
      return Promise.reject(
        new Error(
          'Figma plugin is not connected. Please open your Figma document and launch the "Agent Canvas Bridge" plugin (Plugins > Development > Agent Canvas Bridge).'
        )
      );
    }

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
