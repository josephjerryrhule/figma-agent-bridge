---
name: figma-designer
description: Expert AI UI/UX design workflow for Figma using figma-agent-bridge. Allows agents to create, inspect, edit, delete, and visually verify Figma designs.
---

# Figma AI Designer Workflow

Use this skill whenever you need to design, view, critique, edit, or modify components and layouts in Figma.

## 1. The Design-and-Critique Loop

Never just create once and stop. High-quality UI generation requires an iterative loop:

```
1. Inspect ➔ 2. Draft ➔ 3. Render ➔ 4. Capture & See ➔ 5. Refine & Polish
```

### Step 1: Inspect Canvas & Tokens First
Before creating something new, discover existing design context:
- Call `figma_get_status` to ensure Figma is open and connected.
- Call `figma_get_document_info` to extract local color styles, typography tokens, and existing components.
- Call `figma_get_selection` if the user is pointing at an existing card/frame.

### Step 2: Render Using Declarative Layouts
Use `figma_render_layout` with standard Auto Layout:
- Always use **Auto Layout** (`layout: 'VERTICAL'` or `'HORIZONTAL'`).
- Set explicit `gap` and `padding`.
- Use responsive sizing:
  - Children should usually have `width: 'FILL'` if stretching across a column.
  - Buttons and badges should use `width: 'HUG'`.
- Typography scale:
  - Display / Hero: 48-64px (Bold)
  - Section Headings: 24-32px (Bold or SemiBold)
  - Subheadings / Card Titles: 18-20px (SemiBold)
  - Body Text: 14-16px (Regular)
  - Captions / Badges: 11-12px (Medium)

### Step 3: Capture & Visually Verify
- Call `figma_capture_screenshot({ nodeId: result.id, scale: 2 })`.
- Review the returned image content:
  - Is the visual hierarchy clear?
  - Is the padding generous and consistent (16/24/32px)?
  - Is text contrast sufficient against the background?
  - Are buttons clearly interactive?

### Step 4: Targeted Mutations (Edit & Change)
Instead of deleting and re-creating from scratch:
- Call `figma_update_node` to tweak copy, colors, spacing, corner radius, or layout.
- Call `figma_append_children` to add new elements inside an existing container.
- Call `figma_delete_nodes` to clean up unwanted layers.
- Call `figma_duplicate_node` to duplicate/clone existing frames or elements.

### Step 5: Rich Media (Images, SVGs, Videos & GIFs)
Agents can insert and manipulate visual media with first-class tools:
- **`figma_insert_media`**:
  - `IMAGE` (PNG, JPEG, WebP): From web URL, local disk path, or base64.
  - `SVG` (Vector icons & illustrations): From raw SVG markup (`<svg>...</svg>`) or file. Parsed directly into native vector layers!
  - `GIF` (Animated GIFs): Placed into image fills; animates in Figma Prototype/Presentation mode.
  - `VIDEO` (MP4, MOV): Placed into native video fills.
  - Can be added as a standalone element, appended into any parent frame (`targetParentId`), or used to replace an existing layer's fill (`targetNodeId`).
- **Declarative Layout Trees (`figma_render_layout`)**:
  - Directly nest `{ type: 'IMAGE', url: 'https://...', width: 320, height: 200, cornerRadius: 8 }`
  - Directly nest `{ type: 'SVG', svg: '<svg>...</svg>', width: 24, height: 24 }`
  - Directly nest `{ type: 'VIDEO', url: 'https://...', width: 480, height: 270 }`
  The bridge automatically resolves web URLs and disk files into byte buffers before sending them to the Figma canvas.

### Step 6: Document & Frame Export (PDF, PNG, JPG, SVG)
Agents have full native export capabilities to generate production deliverables:
- **`figma_export`**:
  - `PDF`: Exports high-fidelity, vector PDF documents (perfect for pitch decks, proposals, presentation slides, design specs).
  - `PNG` & `JPG`: High-resolution raster images with custom retina scale (1x, 2x, 3x, 4x).
  - `SVG`: Vector graphics with path outlines.
  - **Batch Deck Export**: Pass `exportAllFrames: true` to export every top-level slide/frame on the active page.
  - **Direct Disk Saving**:
    - `savePath`: Saves a single PDF/image directly to a local path (e.g. `savePath: "~/Desktop/deck.pdf"`).
    - `outputDir`: Saves an entire series of slides/frames into a folder with clean numbering (e.g. `outputDir: "~/Desktop/slides/"` -> `01-Cover.pdf`, `02-Summary.pdf`, etc.).

## 2. Anti-Slop Design Principles
- **No generic purple/pink AI gradients** unless explicitly requested. Use purposeful, high-contrast dark mode (`#0B0F19`, `#1E293B`) or clean light mode (`#FFFFFF`, `#F8FAFC`).
- **One primary action per view**: Primary buttons must stand out with strong accent color (`#0D99FF`, `#2563EB`). Secondary buttons should be outline or ghost.
- **Consistent border radii**: Don't mix 4px, 12px, and 30px randomly. Standardize on 6-8px for buttons/inputs, 12-16px for cards/containers.
- **Subtle borders**: Use `#E2E8F0` or `#334155` at 1px weight to define depth without clutter.
