# Figma Agent Bridge — Server Subsystem

The backend orchestration engine providing Model Context Protocol (MCP) tooling, REST API endpoints, and a WebSocket relay bridge.

---

## Architecture & Modes

The server executable (`dist/bundle/index.mjs`) operates in two primary modes:

### 1. Dual Mode: MCP Stdio + Shared HTTP/WebSocket Relay (Default)
When spawned by an MCP client (such as Claude Code, Claude Desktop, Cursor, or Antigravity):
- Connects MCP stdio JSON-RPC streams (`stdin` / `stdout`).
- Checks if a WebSocket relay daemon is already active on port `3055`:
  - **If port 3055 is free**: Boots the WebSocket bridge and REST HTTP server on port 3055.
  - **If port 3055 is already in use** (e.g. by another MCP client or background daemon): Connects transparently as a client to the existing relay.
- This allows multiple independent AI agents (e.g. Claude Code in terminal AND Claude Desktop AND AGY) to run concurrently without port collision errors!

### 2. Standalone Bridge Relay Mode (`--bridge-only`)
When running as a background daemon or container:
```bash
node dist/bundle/index.mjs --bridge-only
# or
npm run start:bridge
```
- Listens on `http://localhost:3055` and `ws://localhost:3055`.
- Serves REST API endpoints, OpenAPI documentation, and the persistent Figma plugin WebSocket relay.

---

## Agent Detection & Attribution

Every command sent to Figma includes agent identification for real-time visualization in the plugin UI:

```
[Agent Process] ───► [MCP / REST Header] ───► [WebSocket Relay] ───► [Figma Plugin UI]
                                                                        ├─ AGY
                                                                        ├─ Claude Code
                                                                        ├─ Claude Desktop
                                                                        ├─ Codex
                                                                        └─ ChatGPT
```

Attribution is determined via:
1. Explicit CLI flag: `--agent="AGY"` or `--agent="Claude Code"`.
2. Environment variable: `FIGMA_AGENT_NAME`, `CLAUDE_CODE`, `ANTIGRAVITY_CLI`.
3. MCP Client Handshake: Inspects client metadata during `initialize`.
4. HTTP Header: `X-Agent-Name` or `User-Agent`.

---

## Rich Media & Export Pipelines

### Media Resolver (`server/src/shared/media-resolver.ts`)
Figma's internal plugin sandbox enforces strict network policies that block direct outgoing `fetch()` calls. The server bypasses this by pre-processing all media requests:
- **HTTP/HTTPS URLs**: Downloads media buffers and converts them to base64 strings or SVG text.
- **Local Files**: Expands paths (`~/Desktop/image.png`) and reads files directly from disk.
- **Data URLs**: Decodes base64 buffers or SVG text.
- **Declarative Trees**: Recursively resolves any `IMAGE`, `SVG`, or `VIDEO` nodes within `figma_render_layout` specs before dispatching to Figma.

### Export Saver (`server/src/shared/export-saver.ts`)
Post-processes exported documents and frames returned by Figma:
- **Single File Saving (`savePath`)**: Writes vector PDFs or high-res images directly to the host filesystem.
- **Batch Deck Saving (`outputDir`)**: Sanitizes layer names and generates clean, ordered presentation deck files (e.g. `01-Cover.pdf`, `02-Executive_Summary.pdf`).

---

## REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server and Figma connection status |
| `GET` | `/openapi.json` | OpenAPI 3.1 specification |
| `POST` | `/v1/render` | Render declarative Auto Layout JSON trees |
| `POST` | `/v1/media` | Insert images, vector SVGs, GIFs, and videos |
| `POST` | `/v1/export` | Export vector PDFs, frames, and high-res images |
| `POST` | `/v1/update` | In-place node mutation |
| `POST` | `/v1/append` | Append child nodes |
| `POST` | `/v1/replace` | Replace child nodes |
| `POST` | `/v1/delete` | Delete nodes by ID |
| `POST` | `/v1/duplicate` | Clone nodes or frames |
| `POST` | `/v1/screenshot` | Capture visual screenshot |
| `POST` | `/v1/execute` | Execute arbitrary sandbox JavaScript |
| `POST` | `/v1/undo` | Undo last operation |
| `POST` | `/v1/redo` | Redo previously undone operation |

---

## Building the Server

```bash
# Build standalone server bundle
npm run build:server

# Build .mcpb desktop extension bundle
npm run bundle:mcpb
```
