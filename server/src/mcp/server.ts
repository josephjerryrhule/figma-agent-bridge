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
import { BridgeCommandType, CaptureScreenshotResult } from '../shared/protocol.js';

export function createMcpServer(wsBridge: WebSocketBridge): Server {
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
      let command: BridgeCommandType;
      let payload: any = args;

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
        case 'figma_append_children':
          command = 'APPEND_CHILDREN';
          break;
        case 'figma_replace_children':
          command = 'REPLACE_CHILDREN';
          break;
        case 'figma_delete_nodes':
          command = 'DELETE_NODES';
          break;
        case 'figma_capture_screenshot':
          command = 'CAPTURE_SCREENSHOT';
          break;
        case 'figma_execute_code':
          command = 'EXECUTE_CODE';
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

      // Check status shortcut if bridge not connected
      if (name === 'figma_get_status') {
        const isLive = wsBridge.isConnected();
        if (!isLive) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    online: false,
                    message:
                      'Figma plugin is not connected. Open your Figma document and launch "Agent Canvas Bridge" plugin to connect.'
                  },
                  null,
                  2
                )
              }
            ]
          };
        }
      }

      const result = await wsBridge.sendCommand(command, payload);

      // Special handling for screenshot: return both text description and base64 image block for vision models!
      if (name === 'figma_capture_screenshot' && result?.base64) {
        const shot = result as CaptureScreenshotResult;
        return {
          content: [
            {
              type: 'text',
              text: `✅ Captured screenshot of node "${shot.nodeName}" (ID: ${shot.nodeId}) [${shot.width}x${shot.height}px, ${shot.format}]`
            },
            {
              type: 'image',
              data: shot.base64,
              mimeType: shot.mimeType
            }
          ]
        };
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

export async function startMcpStdio(wsBridge: WebSocketBridge): Promise<void> {
  const server = createMcpServer(wsBridge);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp]: Stdio MCP server initialized and listening for AI agent queries');
}
