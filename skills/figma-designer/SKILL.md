---
name: figma-designer
description: Expert AI UI/UX design workflow for Figma using figma-agent-bridge. Allows agents to create, inspect, edit, delete, and visually verify Figma designs with Senior Designer tools.
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
- Call `figma_get_document_info` to extract local color styles, typography tokens, effect styles, and existing components.
- Call `figma_get_variables` to discover design token collections, variable modes (e.g. Light/Dark mode), and values.
- Call `figma_get_selection` if the user is pointing at an existing card/frame.

### Step 2: Render Using Senior Auto Layout Standards
Always use native **Auto Layout** (`layout: 'VERTICAL'` or `'HORIZONTAL'`):
- **Responsive Sizing**:
  - Columns / containers: Set child elements to `width: 'FILL'` to stretch dynamically.
  - Buttons / badges / tags: Set `width: 'HUG'` and `height: 'HUG'`.
  - Min / Max constraints: Set `minWidth`, `maxWidth`, `minHeight`, or `maxHeight` to prevent layout collapse.
- **Auto Layout Wrapping & Cross-Axis Spacing**:
  - Set `layoutWrap: 'WRAP'` for tag clouds, pill filters, badge lists, and multi-row grids.
  - Set `counterAxisSpacing` to control the cross-axis row gap.
- **Absolute Positioning in Auto Layout**:
  - For notification badges on avatars, floating "X" close buttons on modals, or decorative status dots, nest inside the Auto Layout frame with `layoutPositioning: 'ABSOLUTE'` and specify `x` and `y`.
- **Elevation & Shadows**:
  - Add realistic depth with `effects: [{ type: 'DROP_SHADOW', color: '#000000', opacity: 0.08, offset: { x: 0, y: 4 }, radius: 16 }]`.
  - For glassmorphism, use `effects: [{ type: 'BACKGROUND_BLUR', radius: 12 }]` and semi-transparent fills (`#FFFFFF` with `opacity: 0.7`).
- **Typography Scale**:
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
- Call `figma_update_node` to tweak copy, colors, spacing, corner radius, layout direction, wrap, or padding.
- Call `figma_set_auto_layout` to instantly turn on Auto Layout or reconfigure alignment and spacing on any frame or selection (equivalent to Shift+A).
- Call `figma_append_children` to add new elements inside an existing container.
- Call `figma_delete_nodes` to clean up unwanted layers.
- Call `figma_duplicate_node` to duplicate/clone existing frames or elements.

### Step 5: Design Systems (Components, Variants & Styles)
Senior Figma designers build reusable Design Systems, not one-off artboards:
- **`figma_create_component`**: Turn any layout spec or existing frame into a reusable master Component (`nodeId` or `spec`).
- **`figma_create_component_set`**: Combine multiple components into a Variant Set with customizable properties (e.g. `Type=Primary/Secondary`, `Size=SM/MD/LG`, `State=Default/Hover/Active`).
- **`figma_create_instance`**: Instantiate master components with variant property overrides (`variantProperties: { State: 'Hover' }`) and layer text overrides (`textOverrides: { Label: 'Get Started' }`).
- **`figma_create_style` & `figma_apply_style`**: Create document-level Paint, Text, and Effect styles and bind them to nodes.
- **`figma_create_variable`**: Create design tokens with mode values (colors, spacing numbers, booleans).

### Step 6: Code Execution Sandbox (`createAutoLayout` Globals)
When running custom scripts via `figma_execute_code`, a full suite of senior design helpers is in scope:
- **`createAutoLayout(options)` & `figma.createAutoLayout(options)`**:
  Natively creates auto layout frames with direction, wrap, gap, counterAxisSpacing, padding, alignment, hug/fill sizing, and children.
- **`createFrame(options)`**, **`createText(text, options)`**, **`createRectangle(options)`**, **`createEllipse(options)`**, **`createComponent(options)`**, **`createInstance(comp, options)`**.
- **`solidPaint(hex, opacity)`**, **`rgb(hex)`**, **`rgba(hex, opacity)`**, **`dropShadow(options)`**, **`innerShadow(options)`**, **`blur(radius)`**.
- **`loadFont(family, style)`**, **`findNode(query)`**, **`findNodes(query)`**.

### Step 7: Rich Media (Images, SVGs, Videos & GIFs)
- **`figma_insert_media`**:
  - `IMAGE` (PNG, JPEG, WebP): From web URL, local disk path, or base64.
  - `SVG` (Vector icons & illustrations): From raw SVG markup (`<svg>...</svg>`) or file. Parsed directly into native vector layers!
  - `GIF` (Animated GIFs): Placed into image fills; animates in Figma Prototype mode.
  - `VIDEO` (MP4, MOV): Placed into native video fills.
- **Declarative Layout Trees (`figma_render_layout`)**:
  - Directly nest `{ type: 'IMAGE', url: 'https://...', width: 320, height: 200, cornerRadius: 8 }`
  - Directly nest `{ type: 'SVG', svg: '<svg>...</svg>', width: 24, height: 24 }`
  - Directly nest `{ type: 'VIDEO', url: 'https://...', width: 480, height: 270 }`

### Step 8: Document & Frame Export (PDF, PNG, JPG, SVG)
- **`figma_export`**:
  - `PDF`: Exports high-fidelity, vector PDF documents (pitch decks, presentation slides, design specs).
  - `PNG` & `JPG`: High-resolution raster images with custom retina scale (1x, 2x, 3x, 4x).
  - `SVG`: Vector graphics with path outlines.
  - `exportAllFrames: true`: Exports all top-level frames on active page.
  - `savePath` or `outputDir`: Saves directly to local disk.

## 2. Anti-Slop Design Principles
- **No generic purple/pink AI gradients** unless explicitly requested. Use purposeful, high-contrast dark mode (`#0B0F19`, `#1E293B`) or clean light mode (`#FFFFFF`, `#F8FAFC`).
- **One primary action per view**: Primary buttons must stand out with strong accent color (`#0D99FF`, `#2563EB`). Secondary buttons should be outline or ghost.
- **Consistent border radii**: Standardize on 6-8px for buttons/inputs, 12-16px for cards/containers.
- **Subtle borders**: Use `#E2E8F0` or `#334155` at 1px weight to define depth without clutter.
- **Elevation over thick borders**: Use soft drop shadows (`offset: {x: 0, y: 8}, radius: 24, opacity: 0.08`) instead of heavy black borders.
