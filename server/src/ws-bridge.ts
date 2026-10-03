/**
 * WebSocket Bridge Server & Relay Client.
 * Relays commands between AI agents and one or more Figma Plugin instances.
 * If another local bridge instance is already running on port 3055, seamlessly routes requests through it.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import { BridgeCommandType, BridgeRequest, BridgeResponse, PluginConnectionInfo } from './shared/protocol.js';

interface PendingRequest {
  clientId: string;
  resolve: (data: any) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface ConnectedClient extends PluginConnectionInfo {
  id: string;
  ws: WebSocket;
  connectedAt: number;
  lastUsedAt: number;
}

export interface ConnectedClientInfo extends Omit<PluginConnectionInfo, 'instanceId'> {
  id: string;
  connectedAt: number;
  isDefault: boolean;
}

export class WebSocketBridge {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, ConnectedClient>();
  private defaultClientId: string | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  public port: number;

  constructor(server?: any, port = 3055) {
    this.port = port;
    if (server) this.attachToServer(server);
  }

  public attachToServer(server: any): void {
    this.wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
      this.wss?.handleUpgrade(request, socket, head, ws => this.wss?.emit('connection', ws, request));
    });
    this.wss.on('connection', (ws: WebSocket) => this.handleConnection(ws));
  }

  private handleConnection(ws: WebSocket): void {
    const connectedAt = Date.now();
    const id = `client_${connectedAt}_${Math.random().toString(36).slice(2, 8)}`;
    const client: ConnectedClient = { id, ws, connectedAt, lastUsedAt: connectedAt };
    this.clients.set(id, client);
    this.defaultClientId = id;
    console.error(`[bridge]: Figma plugin connected (${id})`);

    ws.on('message', (data: Buffer | string) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'PLUGIN_CONNECTED' || message.type === 'PLUGIN_INFO') {
          this.updateClientInfo(client, message);
          console.error(`[bridge]: Plugin info received for ${this.describeClient(client)}`);
          return;
        }
        if (message.id && this.pendingRequests.has(message.id)) {
          const pending = this.pendingRequests.get(message.id)!;
          clearTimeout(pending.timer);
          this.pendingRequests.delete(message.id);
          const response = message as BridgeResponse;
          if (response.success) pending.resolve(response.data);
          else pending.reject(new Error(response.error || 'Figma command failed without error message'));
        }
      } catch (err: any) {
        console.error('[bridge]: Failed to parse incoming plugin message:', err?.message);
      }
    });

    ws.on('close', () => {
      console.error(`[bridge]: Figma plugin disconnected (${this.describeClient(client)})`);
      this.clients.delete(id);
      if (this.defaultClientId === id) this.defaultClientId = this.mostRecentClient()?.id ?? null;
      this.rejectPendingForClient(id, 'Figma plugin connection closed before response was received');
    });
    ws.on('error', err => console.error('[bridge]: WebSocket error:', err.message));
  }

  private updateClientInfo(client: ConnectedClient, info: Partial<PluginConnectionInfo>): void {
    client.fileName = typeof info.fileName === 'string' ? info.fileName : client.fileName;
    client.fileKey = typeof info.fileKey === 'string' || info.fileKey === null ? info.fileKey : client.fileKey;
    client.editorType = typeof info.editorType === 'string' ? info.editorType : client.editorType;
    client.pageName = typeof info.pageName === 'string' ? info.pageName : client.pageName;
    client.instanceId = typeof info.instanceId === 'string' ? info.instanceId : client.instanceId;
  }

  public isConnected(): boolean {
    return this.openClients().length > 0;
  }

  public listClients(): ConnectedClientInfo[] {
    return this.openClients().sort((a, b) => b.connectedAt - a.connectedAt).map(client => this.toClientInfo(client));
  }

  public async setDefaultClientRemote(target: string): Promise<ConnectedClientInfo> {
    const res = await fetch(`http://127.0.0.1:${this.port}/v1/files/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: target })
    });
    const json = (await res.json()) as any;
    if (!res.ok || json.success === false) {
      throw new Error(json.error || `Failed to set active file (status ${res.status})`);
    }
    return json.data ?? json;
  }

  public setDefaultClient(target: string): ConnectedClientInfo {
    const client = this.resolveClient(target);
    this.defaultClientId = client.id;
    return this.toClientInfo(client);
  }

  public resolveClient(target?: string): ConnectedClient {
    const clients = this.openClients();
    if (!clients.length) throw new Error('No Figma plugin is connected. Open your Figma document and launch the "Agent Canvas Bridge" plugin.');
    if (!target) {
      const defaultClient = this.defaultClientId ? this.clients.get(this.defaultClientId) : undefined;
      if (defaultClient && this.isOpen(defaultClient)) return defaultClient;
      const fallback = this.mostRecentClient();
      if (!fallback) throw new Error('No Figma plugin is connected.');
      this.defaultClientId = fallback.id;
      return fallback;
    }

    const exactId = clients.find(client => client.id === target);
    if (exactId) return exactId;
    const exactFileKey = clients.filter(client => client.fileKey === target);
    if (exactFileKey.length === 1) return exactFileKey[0];
    if (exactFileKey.length > 1) throw this.ambiguousTargetError(target, exactFileKey);
    const normalisedTarget = target.toLocaleLowerCase();
    const exactFileName = clients.filter(client => client.fileName?.toLocaleLowerCase() === normalisedTarget);
    if (exactFileName.length === 1) return exactFileName[0];
    if (exactFileName.length > 1) throw this.ambiguousTargetError(target, exactFileName);
    const partialFileName = clients.filter(client => client.fileName?.toLocaleLowerCase().includes(normalisedTarget));
    if (partialFileName.length === 1) return partialFileName[0];
    if (partialFileName.length > 1) throw this.ambiguousTargetError(target, partialFileName);
    throw new Error(`No connected Figma file matches "${target}". Connected files: ${clients.map(client => this.describeClient(client)).join(', ')}.`);
  }

  public defaultAgent?: string;

  public async sendCommand<TResponse = any, TPayload = any>(
    command: BridgeCommandType,
    payload: TPayload,
    timeoutMs = 20000,
    agent?: string,
    target?: string
  ): Promise<TResponse> {
    const effectiveAgent = agent || this.defaultAgent || 'AI Agent';
    const result = this.isConnected()
      ? await this.sendViaDirectWebSocket<TResponse, TPayload>(command, payload, timeoutMs, effectiveAgent, target)
      : await this.sendViaLocalHttp<TResponse, TPayload>(command, payload, timeoutMs, effectiveAgent, target);
    if (command === 'GET_STATUS' && result && typeof result === 'object') {
      const clients = this.listClients();
      return { ...(result as object), clients, connectedFiles: clients, defaultClientId: this.defaultClientId } as TResponse;
    }
    return result;
  }

  private sendViaDirectWebSocket<TResponse, TPayload>(command: BridgeCommandType, payload: TPayload, timeoutMs: number, agent: string, target?: string): Promise<TResponse> {
    const client = this.resolveClient(target);
    const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const request: BridgeRequest<TPayload> = { id, command, payload, timestamp: Date.now(), agent };
    client.lastUsedAt = Date.now();
    return new Promise<TResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Figma command '${command}' timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
      this.pendingRequests.set(id, { clientId: client.id, resolve, reject, timer });
      try {
        client.ws.send(JSON.stringify(request));
      } catch (err: any) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(new Error(`Failed to transmit command '${command}' to Figma: ${err.message}`));
      }
    });
  }

  private async sendViaLocalHttp<TResponse, TPayload>(command: BridgeCommandType, payload: TPayload, timeoutMs: number, agent: string, target?: string): Promise<TResponse> {
    const endpoint = this.getEndpointForCommand(command);
    const url = `http://127.0.0.1:${this.port}${endpoint.path}`;
    try {
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json', 'X-Agent-Name': agent, ...(target ? { 'X-Figma-File': target } : {}) },
        body: endpoint.method === 'POST' ? JSON.stringify(payload) : undefined,
        signal: controller.signal
      });
      clearTimeout(timeoutTimer);
      const json = (await res.json()) as any;
      if (command === 'GET_STATUS') return json.details || json;
      if (json.success) return json.data;
      throw new Error(json.error || `Command failed with status ${res.status}`);
    } catch (err: any) {
      if (err.name === 'AbortError') throw new Error(`Command '${command}' timed out after ${timeoutMs}ms`);
      if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('fetch failed')) {
        throw new Error('Figma plugin is not connected. Please open your Figma document and launch the "Agent Canvas Bridge" plugin.');
      }
      throw err;
    }
  }

  private getEndpointForCommand(command: BridgeCommandType): { path: string; method: 'GET' | 'POST' } {
    switch (command) {
      case 'GET_STATUS': return { path: '/v1/status', method: 'GET' };
      case 'GET_SELECTION': return { path: '/v1/selection', method: 'GET' };
      case 'GET_DOCUMENT_INFO': return { path: '/v1/document', method: 'GET' };
      case 'INSPECT_NODE': return { path: '/v1/inspect', method: 'POST' };
      case 'FIND_NODES': return { path: '/v1/find', method: 'POST' };
      case 'RENDER_LAYOUT': return { path: '/v1/render', method: 'POST' };
      case 'UPDATE_NODE': return { path: '/v1/update', method: 'POST' };
      case 'APPEND_CHILDREN': return { path: '/v1/append', method: 'POST' };
      case 'REPLACE_CHILDREN': return { path: '/v1/replace', method: 'POST' };
      case 'DELETE_NODES': return { path: '/v1/delete', method: 'POST' };
      case 'DUPLICATE_NODE': return { path: '/v1/duplicate', method: 'POST' };
      case 'CAPTURE_SCREENSHOT': return { path: '/v1/screenshot', method: 'POST' };
      case 'EXPORT_NODES': return { path: '/v1/export', method: 'POST' };
      case 'INSERT_MEDIA': return { path: '/v1/media', method: 'POST' };
      case 'EXECUTE_CODE': return { path: '/v1/execute', method: 'POST' };
      case 'GET_SPEAKER_NOTES': return { path: '/v1/speaker-notes/get', method: 'POST' };
      case 'SET_SPEAKER_NOTES': return { path: '/v1/speaker-notes', method: 'POST' };
      case 'UNDO': return { path: '/v1/undo', method: 'POST' };
      case 'REDO': return { path: '/v1/redo', method: 'POST' };
      default: return { path: '/v1/status', method: 'GET' };
    }
  }

  private openClients(): ConnectedClient[] { return [...this.clients.values()].filter(client => this.isOpen(client)); }
  private isOpen(client: ConnectedClient): boolean { return client.ws.readyState === WebSocket.OPEN; }
  private mostRecentClient(): ConnectedClient | undefined { return this.openClients().sort((a, b) => b.connectedAt - a.connectedAt)[0]; }
  private toClientInfo(client: ConnectedClient): ConnectedClientInfo {
    return { id: client.id, fileName: client.fileName, fileKey: client.fileKey, editorType: client.editorType, pageName: client.pageName, connectedAt: client.connectedAt, isDefault: client.id === this.defaultClientId };
  }
  private describeClient(client: ConnectedClient): string {
    return `${client.fileName || 'Unnamed file'} (id: ${client.id}${client.fileKey ? `, key: ${client.fileKey}` : ''})`;
  }
  private ambiguousTargetError(target: string, clients: ConnectedClient[]): Error {
    return new Error(`Figma file target "${target}" is ambiguous. Matches: ${clients.map(client => this.describeClient(client)).join(', ')}.`);
  }
  private rejectPendingForClient(clientId: string, reason: string): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      if (pending.clientId !== clientId) continue;
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
      this.pendingRequests.delete(id);
    }
  }
  private rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
      this.pendingRequests.delete(id);
    }
  }
  public close(): void {
    this.rejectAllPending('Bridge server is shutting down');
    if (this.wss) this.wss.close();
  }
}
