# Figma Plugin — Agent Canvas Bridge

The frontend engine of **Figma Agent Bridge**, running directly inside the Figma desktop app or browser environment.

---

## Architecture Overview

Figma plugins operate across two isolated execution contexts:

```
┌────────────────────────────────────────────────────────────┐
│                    Figma Application                       │
│                                                            │
│  ┌──────────────────────┐        ┌──────────────────────┐  │
│  │   UI Iframe Realm    │        │    Sandbox Realm     │  │
│  │     (ui.html)        │        │      (code.ts)       │  │
│  ├──────────────────────┤        ├──────────────────────┤  │
│  │ - WebSocket Client   │◄──────►│ - Native Figma DOM   │  │
│  │ - Live Event Stream  │  post  │ - Auto Layout Engine │  │
│  │ - Agent Attribution  │ Message│ - Font Auto-Loader   │  │
│  │ - Status Indicator   │        │ - Vector SVG Parser  │  │
│  │ - Minimalist UI      │        │ - PDF & Image Export │  │
│  └──────────────────────┘        └──────────────────────┘  │
└───────────────────────────┬────────────────────────────────┘
                            │ WebSocket (ws://localhost:3055)
                            ▼
              Local Bridge Relay / MCP Server
```

### 1. The UI Iframe (`ui.html`)
- Runs in a full browser DOM iframe with WebSocket capabilities.
- Maintains a persistent, resilient connection to the local bridge relay at `ws://localhost:3055` with automatic backoff reconnection (every 1,000 ms).
- Renders the **Swiss Minimalist** utility interface:
  - Matte carbon canvas (`#0D0D0E`), hairline borders (`rgba(255, 255, 255, 0.08)`), and high-contrast typography.
  - Real-time segmented agent indicator track (`AGY`, `Claude`, `Codex`, `ChatGPT`).
  - Active connection badge (`3055 · Live`).
  - Scannable, monospace live activity ledger detailing incoming commands, execution latency, and caller agent attribution.

### 2. The Plugin Sandbox (`code.ts`)
- Runs in Figma's sandboxed JavaScript engine with unrestricted access to `figma.*` APIs.
- Coordinates all document mutations, node inspections, Auto Layout generations, font loading, media insertion, and PDF/image exports.
- Communicates bidirectional messages with the UI iframe via `figma.ui.postMessage()` and `figma.ui.onmessage`.

---

## Key Subsystems (`plugin/src/engine/`)

- **`parser.ts`**: Declarative Auto Layout parser. Converts flexbox-style JSON trees into native Figma Auto Layout frames, nested structures, text layers, shapes, and media fills.
- **`mutator.ts`**: In-place node modification engine. Updates text, fills, corner radii, auto-layout padding/gap, stroke properties, clones layers (`duplicateNode`), and inserts rich media.
- **`export.ts`**: Document and frame exporter. Renders nodes to high-fidelity vector `PDF`, retina `PNG` / `JPG` (1x–4x), or vector `SVG`.
- **`fonts.ts`**: Intelligent font loader. Pre-loads requested font weights (Regular, Medium, SemiBold, Bold) before text assignment and applies graceful fallbacks if a local font is missing.
- **`colors.ts`**: Color parser supporting hex codes (`#111827`, `#FFFFFF`), opacity values, and RGBA paint conversions.
- **`inspector.ts`**: Node serialiser returning clean, LLM-optimised JSON representations of canvas selections, hierarchy trees, and document style tokens.

---

## Development & Building

```bash
# Install dependencies
npm install

# Build the plugin (bundles src/code.ts into dist/code.js and copies ui.html)
npm run build:plugin

# Watch mode for active development
npm run dev:plugin
```

### Loading into Figma

1. Open Figma Desktop or Figma in Chrome/Brave/Edge.
2. Navigate to **Plugins > Development > Import plugin from manifest...**
3. Select `plugin/manifest.json`.
4. Run the plugin anytime with **Plugins > Development > Agent Canvas Bridge** or press **`Cmd + Opt + P`**.
