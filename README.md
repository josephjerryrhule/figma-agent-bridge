# Figma Agent Bridge ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Standard-purple)](https://modelcontextprotocol.io/)
[![Figma Plugin API](https://img.shields.io/badge/Figma-Plugin_API_v1-F24E1E?logo=figma)](https://www.figma.com/plugin-docs/)

> Universal AI design bridge connecting **Antigravity (AGY)**, **Claude (Code & Desktop)**, **OpenAI Codex / Cursor**, and **ChatGPT** directly to Figma with full CRUD, Auto Layout generation, rich media, vector PDF exports, and multimodal visual feedback.

---

## Overview

**Figma Agent Bridge** turns your AI coding agents and LLMs into full-fledged UI designers with direct, low-latency access to your Figma canvas.

Unlike one-way generators, the bridge enables a continuous **interactive design loop**:

```
1. Inspect ➔ 2. Draft ➔ 3. Render ➔ 4. Capture & See ➔ 5. Refine & Mutate ➔ 6. Export
```

### Key Capabilities

- 🎨 **Declarative Auto Layout**: Generates production-ready, flexbox-style Auto Layout node trees (nested frames, padding, gap, hug/fill responsive constraints).
- 🔤 **Automatic Font Loading**: Resolves and loads fonts (`Inter`, `Roboto`, `Poppins`, `SF Pro`, etc.) on the fly with graceful fallbacks. Never crashes on missing font errors.
- 🖼️ **Rich Media Pipeline**: Inserts images (`PNG`, `JPEG`, `WebP`), animated `GIF`s, native vector `SVG`s, and `VIDEO`s from web URLs, local disk paths, or base64.
- 📄 **Vector PDF & Frame Export**: Exports pixel-perfect vector PDFs (pitch decks, proposals, slides), high-res retina images (`PNG`, `JPG`), and `SVG`s directly to disk with batch deck ordering.
- 👁️ **Visual AI Feedback**: Captures high-resolution screenshots of any frame or selection, feeding images directly into multimodal models (**Gemini 3.6 Flash/Pro, Claude 3.7 Sonnet, GPT-4o**) for visual inspection and critique.
- 🏷️ **Real-Time Agent Attribution**: Live segmented indicators in the Figma plugin showing whether **AGY**, **Claude Code**, **Claude Desktop**, **Codex**, or **ChatGPT** is actively controlling the canvas.
- ✏️ **Targeted In-Place Mutations**: Edit copy, colors, spacing, corner radius, and layout properties on existing nodes without destroying parent frames.
- 📋 **Clone & Duplicate**: Clones existing frames, components, or elements with position and name overrides.
- ⚡ **Seamless Port Sharing**: Runs the WebSocket bridge and MCP stdio on port `3055` without port collision, allowing multiple agents to design simultaneously.
- 🌐 **Model Context Protocol (MCP) & REST API**: Native MCP tools for AGY/Claude/Cursor, plus OpenAPI 3.1 endpoints for ChatGPT Custom Actions and scripts.

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
│                                                      │                 │
│                                                      ▼ (WebSocket)     │
│                                                  ws://localhost:3055   │
└──────────────────────────────────────────────────────┼─────────────────┘
                                                       │
┌──────────────────────────────────────────────────────┼─────────────────┐
│                        Figma Application             │                 │
│                                                      ▼                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Agent Canvas Bridge Plugin                    │  │
│  │                                                                  │  │
│  │  [ UI iframe (ui.html) ] ◄── postMessage ──► [ code.ts Sandbox ] │  │
│  │  - Swiss Minimalist UI                       - Figma Plugin DOM  │  │
│  │  - Live Status (3055 · Live)                 - Auto Layout Engine│  │
│  │  - Agent Track (AGY|Claude|Codex|GPT)        - Font Auto-Loader  │  │
│  │  - Monospace Activity Ledger                 - Vector SVG Parser │  │
│  │                                              - PDF/Image Exporter│  │
│  └───────────────────────────────────┬──────────────────────────────┘  │
│                                      │ Canvas Manipulation             │
│                                      ▼                                 │
│                      [ Live Figma Document Canvas ]                    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Quickstart

### 1. Install & Build

```bash
git clone https://github.com/josephjerryrhule/figma-agent-bridge.git
cd figma-agent-bridge
npm install
npm run build
```

This compiles:
- `plugin/dist/code.js` & `plugin/dist/ui.html` (Figma Plugin)
- `dist/bundle/index.mjs` (Standalone executable server)
- `build/figma-agent-bridge.mcpb` (1-click desktop extension bundle)

### 2. Import Plugin into Figma

1. Open **Figma** (Desktop application recommended).
2. Click the top-left Figma menu > **Plugins** > **Development** > **Import plugin from manifest...**
3. Select `plugin/manifest.json` from this repository.
4. Open any design file and launch the plugin:  
   **Right-click canvas > Plugins > Development > Agent Canvas Bridge** (or press `Cmd + Opt + P`).

### 3. Start the Bridge Server

To run the standalone relay daemon:

```bash
npm run start:bridge
```

The plugin UI will instantly switch from `Offline` to `3055 · Live` with a subtle green pulse.

---

## Agent Configuration Guides

### 1. Antigravity (AGY)

Add to your project's `.gemini/antigravity-cli/mcp_config.json`:

```json
{
  "mcpServers": {
    "figma-bridge": {
      "command": "node",
      "args": [
        "/path/to/figma-agent-bridge/dist/bundle/index.mjs",
        "--agent=AGY"
      ]
    }
  }
}
```

### 2. Claude Code CLI

Run this single command in your terminal:

```bash
claude mcp add figma-bridge node /path/to/figma-agent-bridge/dist/bundle/index.mjs --agent="Claude Code"
```

### 3. Claude Desktop

**Option A (1-Click Extension)**:
Drag and drop `build/figma-agent-bridge.mcpb` directly into Claude Desktop settings!

**Option B (`claude_desktop_config.json`)**:
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "figma-bridge": {
      "command": "node",
      "args": [
        "/path/to/figma-agent-bridge/dist/bundle/index.mjs",
        "--agent=Claude Desktop"
      ]
    }
  }
}
```

### 4. Cursor / OpenAI Codex

In Cursor: **Settings > Features > MCP > Add New MCP Server**:
- **Name**: `figma-bridge`
- **Type**: `command`
- **Command**: `node /path/to/figma-agent-bridge/dist/bundle/index.mjs --agent="Codex"`

### 5. ChatGPT Custom Actions (REST)

1. Start the bridge: `npm run start:bridge`
2. Create a Custom GPT on chatgpt.com.
3. In Actions, paste the OpenAPI specification from `http://localhost:3055/openapi.json` (or use ngrok/localtunnel for remote URLs: `ngrok http 3055`).

---

## MCP Tools Reference

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| **`figma_get_status`** | `{}` | Checks if the Figma plugin is connected, returning active file name and page. |
| **`figma_get_selection`** | `{ depth?: number }` | Retrieves currently selected canvas nodes, layout styles, and dimensions. |
| **`figma_inspect_node`** | `{ id?: string, name?: string, depth?: number }` | Deeply inspects a node by ID or name with padding, typography, fills, and children. |
| **`figma_find_nodes`** | `{ query?: string, name?: string, type?: string, limit?: number }` | Searches the active page for nodes matching names, types (`FRAME`, `TEXT`), or text. |
| **`figma_get_document_info`**| `{}` | Extracts all pages, local color styles, typography tokens, and top-level frames. |
| **`figma_render_layout`** | `{ root: LayoutNode, insertPosition?: {x, y} }` | Generates declarative Auto Layout trees (frames, text, shapes, images, SVGs). |
| **`figma_insert_media`** | `{ mediaType, source, name?, width?, height?, scaleMode?, targetParentId?, targetNodeId? }` | Inserts images (`PNG/JPEG/WebP`), vector `SVG`s, `GIF`s, or `VIDEO`s from URLs, paths, or base64. |
| **`figma_export`** | `{ format, nodeId?, nodeIds?, exportAllFrames?, scale?, savePath?, outputDir? }` | Exports vector **PDF**s, pitch decks, retina **PNG**s, **JPG**s, or **SVG**s directly to disk. |
| **`figma_capture_screenshot`**| `{ nodeId?, format?, scale?, savePath? }` | Captures high-res visual screenshot for multimodal AI inspection. |
| **`figma_update_node`** | `{ id, text?, color?, background?, gap?, padding?, cornerRadius?, imageUrl? }` | In-place property mutations without re-rendering parent structures. |
| **`figma_duplicate_node`** | `{ nodeId, name?, x?, y?, insertAfter? }` | Clones any canvas frame, component, or element with optional offsets. |
| **`figma_append_children`** | `{ parentId, children: LayoutNode[] }` | Appends new child elements inside an existing container. |
| **`figma_replace_children`**| `{ parentId, children: LayoutNode[] }` | Clears and replaces all children inside a frame. |
| **`figma_delete_nodes`** | `{ ids: string[] }` | Deletes one or more nodes by their IDs. |
| **`figma_execute_code`** | `{ code: string }` | Evaluates arbitrary JavaScript in the Figma plugin sandbox with direct `figma.*` access. |
| **`figma_get_session_history`**| `{}` | Returns all nodes modified by the AI during the active session. |
| **`figma_undo`** | `{}` | Reverts the last canvas action. |
| **`figma_redo`** | `{}` | Re-applies the most recently undone action. |

---

## Declarative Layout Tree Syntax

`figma_render_layout` accepts clean, flexbox-style JSON:

```json
{
  "type": "FRAME",
  "name": "Feature Card",
  "layout": "VERTICAL",
  "gap": 16,
  "padding": 24,
  "background": "#0D0D0E",
  "cornerRadius": 12,
  "stroke": { "color": "rgba(255, 255, 255, 0.08)", "weight": 1 },
  "width": 360,
  "children": [
    {
      "type": "IMAGE",
      "name": "Cover Image",
      "url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
      "width": 312,
      "height": 180,
      "cornerRadius": 8
    },
    {
      "type": "TEXT",
      "text": "Swiss Minimalism",
      "fontSize": 20,
      "fontWeight": "SemiBold",
      "color": "#FFFFFF"
    },
    {
      "type": "TEXT",
      "text": "High contrast, typography-driven user interfaces with zero AI slop.",
      "fontSize": 14,
      "fontWeight": "Regular",
      "color": "#94A3B8",
      "lineHeight": 20
    }
  ]
}
```

---

## Document & Pitch Deck Export

### Export a Frame to PDF
```json
// Tool: figma_export
{
  "format": "PDF",
  "nodeId": "39:8",
  "savePath": "~/Desktop/Proposal.pdf"
}
```

### Export an Entire Deck
```json
// Tool: figma_export
{
  "format": "PDF",
  "exportAllFrames": true,
  "outputDir": "~/Desktop/pitch_deck_slides/"
}
```
*Outputs ordered slides: `01-Cover.pdf`, `02-Executive_Summary.pdf`, etc.*

---

## Anti-Slop Design Philosophy

Figma Agent Bridge is explicitly engineered against generic "AI slop" designs:
- 🚫 **No arbitrary purple/cyan glowing blobs** or unrequested gradients.
- ✅ **Architectural typography scales**: High-contrast, mathematically balanced font sizes.
- ✅ **Strict spacing scales**: Consistent 4px / 8px / 16px / 24px / 32px rhythms.
- ✅ **Purposeful accents**: High-contrast monochrome palettes with single-point accent colors.
- ✅ **Native Auto Layout**: Every element is properly wrapped in Auto Layout containers with hug/fill constraints ready for developer handoff.

---

## Testing

Run the Vitest test suite:

```bash
npm test
```

Includes 29 passing unit and integration tests covering:
- WebSocket bridge relay roundtrips and error handling
- Declarative schema validation
- Color conversions and RGBA calculations
- Font matching and weight fallbacks
- Media resolver (URLs, local disk paths, SVG markup)
- Disk file saving and batch presentation deck exports
- REST API endpoint verification

---

## License

[MIT](LICENSE) © Joseph Jerry Rhule
