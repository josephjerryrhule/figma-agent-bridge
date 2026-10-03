/**
 * Model Context Protocol (MCP) Server for Figma Agent Bridge.
 * Allows AGY, Claude Code, Claude Desktop, and Codex to design, inspect, and edit Figma in real-time.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { WebSocketBridge } from '../ws-bridge.js';
import { toolsDefinitions } from './tools.js';
import { BridgeCommandType, CaptureScreenshotResult, ExportNodesResult } from '../shared/protocol.js';
import { resolveMediaPayload, resolveLayoutTreeMedia, resolveUpdateNodeMedia } from '../shared/media-resolver.js';
import { processExportResult, processScreenshotResult } from '../shared/export-saver.js';

export function createMcpServer(wsBridge: WebSocketBridge, configuredAgent?: string): Server {
  const server = new Server(
    {
      name: 'figma-agent-bridge',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // List all available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: Tool[] = toolsDefinitions.map(def => {
      const jsonSchema = zodToJsonSchema(def.inputSchema, { target: 'openApi3' });
      return {
        name: def.name,
        description: def.description,
        inputSchema: (jsonSchema as any).properties ? (jsonSchema as any) : { type: 'object', properties: {} }
      };
    });

    return { tools };
  });

  // Handle tool execution requests
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      if (name === 'figma_set_active_file') {
        const file = (args as { file: string }).file;
        // Plugins may be connected to a separate bridge daemon on the shared port; forward there if none are local.
        const selected = wsBridge.isConnected()
          ? wsBridge.setDefaultClient(file)
          : await wsBridge.setDefaultClientRemote(file);
        return {
          content: [{ type: 'text', text: JSON.stringify(selected, null, 2) }]
        };
      }

      let command: BridgeCommandType;
      const { file: target, ...payloadWithoutFile } = args as Record<string, any>;
      let payload: any = payloadWithoutFile;

      switch (name) {
        case 'figma_get_status':
          command = 'GET_STATUS';
          break;
        case 'figma_get_selection':
          command = 'GET_SELECTION';
          break;
        case 'figma_inspect_node':
          command = 'INSPECT_NODE';
          break;
        case 'figma_find_nodes':
          command = 'FIND_NODES';
          break;
        case 'figma_get_document_info':
          command = 'GET_DOCUMENT_INFO';
          break;
        case 'figma_render_layout':
          command = 'RENDER_LAYOUT';
          break;
        case 'figma_update_node':
          command = 'UPDATE_NODE';
          break;
        case 'figma_set_auto_layout':
          command = 'SET_AUTO_LAYOUT';
          break;
        case 'figma_create_component':
          command = 'CREATE_COMPONENT';
          break;
        case 'figma_create_component_set':
          command = 'CREATE_COMPONENT_SET';
          break;
        case 'figma_create_instance':
          command = 'CREATE_INSTANCE';
          break;
        case 'figma_create_style':
          command = 'CREATE_STYLE';
          break;
        case 'figma_apply_style':
          command = 'APPLY_STYLE';
          break;
        case 'figma_get_variables':
          command = 'GET_VARIABLES';
          break;
        case 'figma_create_variable':
          command = 'CREATE_VARIABLE';
          break;
        case 'figma_group_nodes':
          command = 'GROUP_NODES';
          break;
        case 'figma_boolean_operation':
          command = 'BOOLEAN_OPERATION';
          break;
        case 'figma_append_children':
          command = 'APPEND_CHILDREN';
          break;
        case 'figma_replace_children':
          command = 'REPLACE_CHILDREN';
          break;
        case 'figma_delete_nodes':
          command = 'DELETE_NODES';
          break;
        case 'figma_duplicate_node':
          command = 'DUPLICATE_NODE';
          break;
        case 'figma_insert_media':
          command = 'INSERT_MEDIA';
          break;
        case 'figma_export':
          command = 'EXPORT_NODES';
          break;
        case 'figma_capture_screenshot':
          command = 'CAPTURE_SCREENSHOT';
          break;
        case 'figma_execute_code':
          command = 'EXECUTE_CODE';
          break;
        case 'figma_get_speaker_notes':
          command = 'GET_SPEAKER_NOTES';
          break;
        case 'figma_set_speaker_notes':
          command = 'SET_SPEAKER_NOTES';
          break;
        case 'figma_get_session_history':
          command = 'GET_SESSION_HISTORY';
          break;
        case 'figma_undo':
          command = 'UNDO';
          break;
        case 'figma_redo':
          command = 'REDO';
          break;
        default:
          return {
            content: [{ type: 'text', text: `Error: Unknown tool '${name}'` }],
            isError: true
          };
      }

      // Pre-process and resolve media assets (URLs, local files, SVGs)
      if (command === 'INSERT_MEDIA') {
        payload = await resolveMediaPayload(payload);
      } else if (command === 'RENDER_LAYOUT') {
        if (payload?.root) {
          payload.root = await resolveLayoutTreeMedia(payload.root);
        }
      } else if (command === 'CREATE_COMPONENT' && payload?.spec) {
        payload.spec = await resolveLayoutTreeMedia(payload.spec);
      } else if (command === 'APPEND_CHILDREN' || command === 'REPLACE_CHILDREN') {
        if (Array.isArray(payload?.children)) {
          for (let i = 0; i < payload.children.length; i++) {
            payload.children[i] = await resolveLayoutTreeMedia(payload.children[i]);
          }
        }
      } else if (command === 'UPDATE_NODE') {
        payload = await resolveUpdateNodeMedia(payload);
      }

      // Determine active agent
      let activeAgent = configuredAgent || process.env.FIGMA_AGENT_NAME;
      if (!activeAgent) {
        const clientVer = (server as any).getClientVersion?.();
        const clientName = clientVer?.name?.toLowerCase() || '';
        if (clientName.includes('claude-code')) {
          activeAgent = 'Claude Code';
        } else if (clientName.includes('claude') || clientName.includes('desktop')) {
          activeAgent = 'Claude Desktop';
        } else if (clientName.includes('antigravity') || clientName.includes('agy')) {
          activeAgent = 'AGY';
        } else if (process.env.CLAUDE_CODE || process.env.CLAUDE_VERSION) {
          activeAgent = 'Claude Code';
        } else if (process.env.ANTIGRAVITY_CLI || process.env.ANTIGRAVITY || process.env.USER_REQUEST) {
          activeAgent = 'AGY';
        } else {
          activeAgent = 'Claude';
        }
      }

      const timeoutMs = command === 'EXPORT_NODES' || command === 'EXECUTE_CODE' ? 60000 : 25000;
      const result = await wsBridge.sendCommand(command, payload, timeoutMs, activeAgent, target);

      // Special handling for export: save to disk if requested and return detailed summary
      if (name === 'figma_export') {
        const processed = await processExportResult(result as ExportNodesResult, payload);
        const content: any[] = [];
        let summaryText = `✅ ${processed.summary}\nFormat: ${processed.format}\nExported (${processed.totalCount} item${processed.totalCount === 1 ? '' : 's'}):`;
        for (const item of processed.items) {
          summaryText += `\n- "${item.nodeName}" (ID: ${item.nodeId}) [${Math.round(item.byteLength / 1024)} KB]`;
          if (item.filePath) summaryText += ` -> ${item.filePath}`;
        }
        content.push({ type: 'text', text: summaryText });

        // If single image without savePath, include image block for vision models
        if (!payload.savePath && !payload.outputDir && processed.items.length === 1) {
          const item = processed.items[0];
          if (item.base64 && (item.format === 'PNG' || item.format === 'JPG')) {
            content.push({
              type: 'image',
              data: item.base64,
              mimeType: item.mimeType
            });
          }
        }
        return { content };
      }

      // Special handling for screenshot: save to disk if requested & return base64 image block
      if (name === 'figma_capture_screenshot' && result?.base64) {
        const shot = await processScreenshotResult(result as CaptureScreenshotResult, payload);
        const content: any[] = [
          {
            type: 'text',
            text: `✅ Captured screenshot of node "${shot.nodeName}" (ID: ${shot.nodeId}) [${shot.width}x${shot.height}px, ${shot.format}]${shot.filePath ? ` -> Saved to ${shot.filePath}` : ''}`
          }
        ];
        if (shot.base64 && (shot.format === 'PNG' || shot.format === 'JPG')) {
          content.push({
            type: 'image',
            data: shot.base64,
            mimeType: shot.mimeType
          });
        }
        return { content };
      }

      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)
          }
        ]
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Figma Bridge Error: ${err?.message || String(err)}`
          }
        ],
        isError: true
      };
    }
  });

  return server;
}

export async function startMcpStdio(wsBridge: WebSocketBridge, agentName?: string): Promise<void> {
  const server = createMcpServer(wsBridge, agentName);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[mcp]: Stdio MCP server initialized for agent "${agentName || 'Auto-Detect'}"`);
}
