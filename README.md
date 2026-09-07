# Figma Agent Bridge ⚡

> Universal AI design bridge connecting **Antigravity (AGY)**, **Claude (Code & Desktop)**, **OpenAI Codex / Cursor**, and **ChatGPT** directly to Figma with full CRUD, Auto Layout generation, and multimodal visual feedback.

---

## Overview

**Figma Agent Bridge** turns your AI coding agents and LLMs into full-fledged UI designers with direct, low-latency access to your Figma canvas.

Unlike one-way generators, the bridge enables a continuous **interactive design loop**:

```
Design ➔ View / Capture ➔ Inspect / Read ➔ Critique ➔ Edit / Mutate ➔ Polish
```

### Key Capabilities

- 🎨 **Declarative Auto Layout**: Generates production-ready, flexbox-style Auto Layout node trees (nested frames, padding, gap, hug/fill responsive constraints).
- 🔤 **Automatic Font Loading**: Resolves and loads fonts (`Inter`, `Roboto`, `Poppins`, `SF Pro`, etc.) on the fly with graceful fallbacks. Never crashes on missing font errors.
- 👁️ **Visual AI Feedback (Screenshots)**: Exports high-resolution PNG or SVG screenshots of any frame or selection, feeding images directly into multimodal models (**Gemini 3.6 Flash/Pro, Claude 3.7 Sonnet, GPT-4o**) for visual inspection and critique.
- 🔍 **Read & Inspect**: Deep inspection of any node or canvas selection (dimensions, typography, colors, padding, child hierarchy, local design tokens).
- ✏️ **Edit & Mutate**: Targeted updates to existing nodes by ID without destroying the parent container (tweak copy, colors, spacing, corner radius, padding).
- 🗑️ **Delete & Clean**: Delete layers or replace child trees cleanly.
- ⚡ **Model Context Protocol (MCP)**: Native MCP server for plug-and-play integration with AGY, Claude Code, and Cursor.
- 🌐 **REST API & OpenAPI 3.1**: Built-in HTTP endpoints and OpenAPI schema for ChatGPT Custom GPT Actions and curl scripts.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AI Agents & Clients                             │
│                                                                        │
│   [ AGY CLI / IDE ]    [ Claude Code / Desktop ]    [ Codex / Cursor ] │
│           │                       │                         │          │
│           └───────────────┬───────┴─────────────────────────┘          │
│                           │ (Model Context Protocol - MCP)             │
│                           ▼                                            │
│                  ┌───────────────────┐        [ ChatGPT / REST ]       │
│                  │  Local MCP Server │                │                │
│                  └────────┬──────────┘                │ (HTTP / SSE)   │
│                           │                           ▼                │
│                           │                ┌────────────────────┐      │
│                           └───────────────►│ Local Bridge Relay │      │
│                                            │  (Port 3055)       │      │
│                                            └─────────┬──────────┘      │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │ WebSocket
                                                       ▼ (ws://localhost:3055)
┌────────────────────────────────────────────────────────────────────────┐
│                        Figma Application                               │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Figma Agent Bridge Plugin                     │  │
│  │                                                                  │  │
│  │  [ UI iframe (ui.html) ] ◄── postMessage ──► [ code.ts Sandbox ] │  │
│  │  - WebSocket Client                          - Figma Plugin API  │  │
│  │  - Status Indicator & Logs                   - Auto Layout Engine│  │
│  │  - Live Command Stream                       - Font Auto-Loader  │  │
│  │                                              - Token Extractor   │  │
│  │                                              - Image Exporter    │  │
│  └───────────────────────────────────┬──────────────────────────────┘  │
│                                      │ Canvas Manipulation             │
│                                      ▼                                 │
│                      [ Live Figma Document Canvas ]                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Quickstart

### 1. Build the Plugin & Server

```bash
cd /Users/joeseph/Desktop/dev/figma-agent-bridge
npm install
npm run build
```

### 2. Import Plugin into Figma

1. Open **Figma** (Desktop app or browser).
2. Go to **Plugins > Development > Import plugin from manifest...**
3. Select the file: `/Users/joeseph/Desktop/dev/figma-agent-bridge/plugin/manifest.json`.
4. Open any Figma design file, right-click the canvas > **Plugins > Development > Agent Canvas Bridge**.
5. The sidebar panel will appear with status indicator (🔴 Disconnected).

### 3. Start the Bridge Server

To run both the WebSocket relay on port `3055` and the MCP server:

```bash
npm start
```

Or run just the standalone HTTP/WebSocket bridge (for REST / ChatGPT):

```bash
npm run start:bridge
```

*The Figma plugin sidebar will automatically transition to **🟢 Live (Port 3055)**.*

---

## Agent Configuration Guides

### 1. Antigravity (AGY)

Add the server to your Antigravity MCP configuration:

```json
{
  "mcpServers": {
    "figma-bridge": {
      "command": "node",
      "args": [
        "/Users/joeseph/Desktop/dev/figma-agent-bridge/server/dist/index.js"
      ]
    }
  }
}
```

### 2. Claude Code & Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": [
        "/Users/joeseph/Desktop/dev/figma-agent-bridge/server/dist/index.js"
      ]
    }
  }
}
```

Or for Claude Code CLI:

```bash
claude mcp add figma node /Users/joeseph/Desktop/dev/figma-agent-bridge/server/dist/index.js
```

### 3. OpenAI Codex / Cursor / Windsurf

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": [
        "/Users/joeseph/Desktop/dev/figma-agent-bridge/server/dist/index.js"
      ]
    }
  }
}
```

### 4. ChatGPT (Custom GPT Actions)

1. Run the bridge server in bridge mode:
   ```bash
   npm run start:bridge
   ```
2. In ChatGPT Custom GPT Builder > **Actions > Create new action**:
3. Import the OpenAPI schema from:
   `http://localhost:3055/openapi.json` (or via your local tunnel/ngrok URL).

---

## Tool Reference

| Tool Name | Description |
|---|---|
| `figma_get_status` | Checks connection status, active file name, current page, and selection count. |
| `figma_get_selection` | Inspects currently selected nodes with full hierarchy, typography, colors, and layout properties. |
| `figma_inspect_node` | Deep-inspects a specific node by ID or name (returns padding, gap, dimensions, corner radius, children). |
| `figma_find_nodes` | Queries canvas for nodes matching name, type (`FRAME`, `TEXT`, `COMPONENT`), or text content. |
| `figma_get_document_info` | Scans document pages, local color styles, typography tokens, and top-level frames. |
| `figma_render_layout` | Declarative Auto Layout engine. Creates nested flexbox layouts, text, shapes, buttons, cards from JSON. |
| `figma_update_node` | Mutates properties of an existing node by ID or name (text copy, font size, background, gap, padding, size). |
| `figma_append_children` | Appends new declarative child elements to an existing parent frame. |
| `figma_replace_children` | Replaces all children inside an existing parent frame with new layout elements. |
| `figma_delete_nodes` | Deletes one or more nodes by ID. |
| `figma_capture_screenshot` | Captures high-resolution PNG or SVG screenshots of any frame or selection for multimodal vision review. |
| `figma_execute_code` | Executes arbitrary JavaScript inside Figma sandbox with full access to `figma.*`. |
| `figma_get_session_history` | Returns the list of all nodes touched or created by the agent in the active session. |
| `figma_undo` | Reverts the last canvas action. |
| `figma_redo` | Reapplies an undone canvas action. |

---

## Example Agent Prompt Workflows

### 1. Designing a Hero Section
> *"Design a modern dark-mode landing page hero section in Figma with an announcement pill, high-contrast headline, subtitle, and primary CTA button."*

The agent calls `figma_render_layout` with a declarative Auto Layout tree, places it centered on the canvas, and selects it.

### 2. Visually Checking & Polishing
> *"Take a screenshot of the hero section you just designed, review the typography scale and button contrast, and refine it."*

The agent calls `figma_capture_screenshot`, inspects the resulting image, spots that the subtitle is slightly cramped, calls `figma_update_node` to increase the `gap` to `24px` and set subtitle color to `#94A3B8`.

### 3. Editing Existing Content
> *"Change the headline of the card I have selected to 'AI-Native Workflow' and change the button background to #2563EB."*

The agent calls `figma_get_selection` to locate the child text and button node IDs, then calls `figma_update_node` with the new copy and color.

---

## Development & Testing

```bash
# Run test suite
npm test

# Typecheck all packages
npm run typecheck

# Watch mode for plugin
npm run dev:plugin
```
