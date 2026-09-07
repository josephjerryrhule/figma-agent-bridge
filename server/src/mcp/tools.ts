/**
 * MCP Tools Definitions.
 * Exposes the full design suite to AGY, Claude Code, Codex, and Cursor using Zod schemas.
 */

import { z } from 'zod';

export const LayoutNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.discriminatedUnion('type', [
    // FRAME
    z.object({
      type: z.literal('FRAME'),
      name: z.string().optional().describe('Name of the frame layer'),
      layout: z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional().describe('Auto Layout direction'),
      width: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional().describe('Width in px, or HUG, or FILL'),
      height: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional().describe('Height in px, or HUG, or FILL'),
      gap: z.number().optional().describe('Spacing between child items in px'),
      padding: z
        .union([
          z.number(),
          z.object({
            top: z.number().optional(),
            right: z.number().optional(),
            bottom: z.number().optional(),
            left: z.number().optional()
          })
        ])
        .optional()
        .describe('Internal padding in px'),
      alignItems: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional().describe('Primary axis alignment'),
      counterAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'BASELINE']).optional().describe('Cross axis alignment'),
      background: z.string().optional().describe('Background color hex (e.g. #FFFFFF, #1E293B)'),
      opacity: z.number().min(0).max(1).optional().describe('Opacity from 0.0 to 1.0'),
      cornerRadius: z
        .union([z.number(), z.tuple([z.number(), z.number(), z.number(), z.number()])])
        .optional()
        .describe('Corner radius in px'),
      stroke: z
        .object({
          color: z.string().describe('Border color hex'),
          weight: z.number().optional().describe('Border width in px'),
          align: z.enum(['INSIDE', 'OUTSIDE', 'CENTER']).optional()
        })
        .optional(),
      clipsContent: z.boolean().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      children: z.array(LayoutNodeSchema).optional().describe('Nested child elements')
    }),

    // TEXT
    z.object({
      type: z.literal('TEXT'),
      name: z.string().optional(),
      text: z.string().describe('Text content to display'),
      fontFamily: z.string().optional().describe('Font family name (e.g. Inter, Roboto, Poppins, SF Pro)'),
      fontWeight: z.enum(['Thin', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black']).optional(),
      fontSize: z.number().optional().describe('Font size in px (e.g. 14, 16, 24, 32)'),
      color: z.string().optional().describe('Text color hex (e.g. #111827, #FFFFFF)'),
      opacity: z.number().min(0).max(1).optional(),
      textAlign: z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']).optional(),
      letterSpacing: z.number().optional(),
      lineHeight: z.union([z.number(), z.literal('AUTO')]).optional(),
      width: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional(),
      height: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional()
    }),

    // RECTANGLE
    z.object({
      type: z.literal('RECTANGLE'),
      name: z.string().optional(),
      width: z.number().describe('Width in px'),
      height: z.number().describe('Height in px'),
      fill: z.string().optional().describe('Fill color hex (e.g. #E2E8F0)'),
      opacity: z.number().min(0).max(1).optional(),
      cornerRadius: z.number().optional(),
      stroke: z.object({ color: z.string(), weight: z.number().optional() }).optional()
    }),

    // ELLIPSE
    z.object({
      type: z.literal('ELLIPSE'),
      name: z.string().optional(),
      width: z.number().describe('Width in px'),
      height: z.number().describe('Height in px'),
      fill: z.string().optional().describe('Fill color hex'),
      opacity: z.number().min(0).max(1).optional(),
      stroke: z.object({ color: z.string(), weight: z.number().optional() }).optional()
    }),

    // IMAGE
    z.object({
      type: z.literal('IMAGE'),
      name: z.string().optional(),
      url: z.string().optional().describe('URL (https://...) or local file path to image'),
      base64: z.string().optional().describe('Raw base64 data string'),
      width: z.number().optional().describe('Width in px'),
      height: z.number().optional().describe('Height in px'),
      scaleMode: z.enum(['FILL', 'FIT', 'CROP', 'TILE']).optional().default('FILL'),
      cornerRadius: z.union([z.number(), z.array(z.number())]).optional(),
      stroke: z.object({ color: z.string(), weight: z.number().optional() }).optional(),
      opacity: z.number().min(0).max(1).optional()
    }),

    // SVG
    z.object({
      type: z.literal('SVG'),
      name: z.string().optional(),
      svg: z.string().optional().describe('Raw SVG markup string (e.g. <svg>...</svg>)'),
      url: z.string().optional().describe('URL or file path to .svg file'),
      width: z.number().optional().describe('Width in px'),
      height: z.number().optional().describe('Height in px'),
      opacity: z.number().min(0).max(1).optional()
    }),

    // VIDEO
    z.object({
      type: z.literal('VIDEO'),
      name: z.string().optional(),
      url: z.string().optional().describe('URL (https://...) or local file path to video (.mp4/.mov)'),
      base64: z.string().optional().describe('Raw base64 video data'),
      width: z.number().optional().describe('Width in px'),
      height: z.number().optional().describe('Height in px'),
      scaleMode: z.enum(['FILL', 'FIT', 'CROP']).optional().default('FILL'),
      cornerRadius: z.union([z.number(), z.array(z.number())]).optional(),
      opacity: z.number().min(0).max(1).optional()
    })
  ])
);

export const toolsDefinitions = [
  {
    name: 'figma_get_status',
    description: 'Checks if the Figma desktop/web plugin is actively connected, along with current file name and page.',
    inputSchema: z.object({})
  },
  {
    name: 'figma_get_selection',
    description: 'Retrieves the currently selected nodes on the Figma canvas, including layout, styles, dimensions, and text.',
    inputSchema: z.object({
      depth: z.number().min(1).max(6).optional().default(3).describe('Depth of child hierarchy to return')
    })
  },
  {
    name: 'figma_inspect_node',
    description: 'Inspects a specific node by its ID or name, returning full details on layout, padding, gap, typography, and fills.',
    inputSchema: z.object({
      id: z.string().optional().describe('Figma Node ID (e.g. "12:34")'),
      name: z.string().optional().describe('Layer name to match if ID is unknown'),
      depth: z.number().min(1).max(6).optional().default(3)
    })
  },
  {
    name: 'figma_find_nodes',
    description: 'Searches the current page for nodes matching name, type (FRAME, TEXT, RECTANGLE, etc.), or text content.',
    inputSchema: z.object({
      query: z.string().optional().describe('General search term to match against layer names and text'),
      name: z.string().optional().describe('Match layer name'),
      type: z.string().optional().describe('Match layer type (e.g. FRAME, TEXT, COMPONENT)'),
      textContains: z.string().optional().describe('Match text content'),
      limit: z.number().optional().default(20)
    })
  },
  {
    name: 'figma_get_document_info',
    description: 'Extracts document pages, local color styles, typography tokens, and top-level frames.',
    inputSchema: z.object({})
  },
  {
    name: 'figma_render_layout',
    description: 'Creates native Figma designs using a declarative flexbox/Auto Layout JSON tree. Supports nested containers, auto-fonts, responsive sizing, and tokens.',
    inputSchema: z.object({
      root: LayoutNodeSchema.describe('Root node specification'),
      insertPosition: z
        .object({
          x: z.number(),
          y: z.number()
        })
        .optional()
        .describe('Specific (x, y) coordinates to place the frame (defaults to canvas viewport center)'),
      targetParentId: z.string().optional().describe('Optional parent frame ID to append this layout inside'),
      selectAfterCreate: z.boolean().optional().default(true).describe('Whether to select the new frame and scroll to it')
    })
  },
  {
    name: 'figma_update_node',
    description: 'Edits and modifies properties of an existing node by ID or name (change text copy, colors, auto-layout, sizing, corner radius, padding).',
    inputSchema: z.object({
      id: z.string().describe('Target node ID'),
      name: z.string().optional().describe('Rename the node'),
      text: z.string().optional().describe('Update text characters (if TEXT node)'),
      fontFamily: z.string().optional(),
      fontWeight: z.enum(['Thin', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black']).optional(),
      fontSize: z.number().optional(),
      color: z.string().optional().describe('Text color or shape fill hex'),
      background: z.string().optional().describe('Background color hex for frames'),
      opacity: z.number().min(0).max(1).optional(),
      cornerRadius: z.union([z.number(), z.tuple([z.number(), z.number(), z.number(), z.number()])]).optional(),
      stroke: z.object({ color: z.string(), weight: z.number().optional(), align: z.enum(['INSIDE', 'OUTSIDE', 'CENTER']).optional() }).optional(),
      gap: z.number().optional().describe('Auto Layout gap/spacing'),
      padding: z.union([z.number(), z.object({ top: z.number().optional(), right: z.number().optional(), bottom: z.number().optional(), left: z.number().optional() })]).optional(),
      alignItems: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional(),
      counterAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'BASELINE']).optional(),
      width: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional(),
      height: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional(),
      visible: z.boolean().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      imageUrl: z.string().optional().describe('Image URL or local file path to set as node fill')
    })
  },
  {
    name: 'figma_append_children',
    description: 'Appends new declarative child elements to an existing parent frame without deleting or altering existing children.',
    inputSchema: z.object({
      parentId: z.string().describe('Target parent frame ID'),
      children: z.array(LayoutNodeSchema).describe('New child nodes to add')
    })
  },
  {
    name: 'figma_replace_children',
    description: 'Clears and replaces all children inside an existing parent frame with new layout elements.',
    inputSchema: z.object({
      parentId: z.string().describe('Target parent frame ID'),
      children: z.array(LayoutNodeSchema).describe('New replacement child nodes')
    })
  },
  {
    name: 'figma_delete_nodes',
    description: 'Deletes one or more nodes from the canvas by their IDs.',
    inputSchema: z.object({
      ids: z.array(z.string()).describe('Array of node IDs to remove')
    })
  },
  {
    name: 'figma_duplicate_node',
    description: 'Duplicates / clones any existing node, frame, component, or element on the Figma canvas, optionally adjusting its name, position, and placement.',
    inputSchema: z.object({
      nodeId: z.string().describe('ID of the node or frame to duplicate (e.g. "1:15")'),
      name: z.string().optional().describe('Optional new name for the duplicated clone'),
      x: z.number().optional().describe('Optional new X position on canvas'),
      y: z.number().optional().describe('Optional new Y position on canvas'),
      insertAfter: z.boolean().optional().default(true).describe('Whether to place the duplicate right after the original in layer ordering')
    })
  },
  {
    name: 'figma_insert_media',
    description: 'Inserts images (PNG, JPEG, WebP), animated GIFs, vector SVGs, or videos (MP4, MOV) directly into Figma, or replaces an existing layer\'s fill. Supports web URLs, local file paths, raw SVG code, and base64.',
    inputSchema: z.object({
      mediaType: z.enum(['IMAGE', 'SVG', 'VIDEO', 'GIF']).describe('Type of media being inserted'),
      source: z.string().describe('Media source: web URL (https://...), local path (/path/to/file.png), raw SVG (<svg>...), or base64 data string'),
      name: z.string().optional().describe('Name for the media layer'),
      width: z.number().optional().describe('Width in pixels (defaults based on media type)'),
      height: z.number().optional().describe('Height in pixels (defaults based on media type)'),
      x: z.number().optional().describe('Canvas X coordinate'),
      y: z.number().optional().describe('Canvas Y coordinate'),
      scaleMode: z.enum(['FILL', 'FIT', 'CROP', 'TILE']).optional().default('FILL').describe('Image or video scale mode'),
      targetParentId: z.string().optional().describe('Parent Frame ID to nest media inside'),
      targetNodeId: z.string().optional().describe('Existing node ID if you want to replace its fill with this image/video instead of creating a new layer'),
      cornerRadius: z.number().optional().describe('Corner radius in pixels')
    })
  },
  {
    name: 'figma_export',
    description: 'Exports frames, slides, components, or the canvas to PDF, PNG, JPG, or SVG files. Supports single node export, batch exporting an array of nodes, or exporting all top-level frames on the active page (e.g. pitch deck slides). Can save directly to disk at a specific file path or output directory.',
    inputSchema: z.object({
      format: z.enum(['PDF', 'PNG', 'JPG', 'SVG']).optional().default('PDF').describe('Export format (PDF for pitch decks/proposals, PNG/JPG for raster images, SVG for vectors)'),
      nodeId: z.string().optional().describe('ID of specific node or frame to export (defaults to current selection or first frame)'),
      nodeIds: z.array(z.string()).optional().describe('Array of node IDs to batch export multiple frames'),
      exportAllFrames: z.boolean().optional().describe('If true, exports all top-level frames on the active page (e.g. all slides in a presentation deck)'),
      scale: z.number().min(0.5).max(4).optional().describe('Resolution scale factor for PNG/JPG (default 2 for high-res retina, 1 for PDF/SVG)'),
      savePath: z.string().optional().describe('Optional local file path to save a single exported document directly to disk (e.g. "~/Desktop/pitch_deck.pdf")'),
      outputDir: z.string().optional().describe('Optional local directory path to save batch-exported frames into (e.g. "~/Desktop/slides/")')
    })
  },
  {
    name: 'figma_capture_screenshot',
    description: 'Captures and returns a high-resolution PNG, JPG, SVG, or PDF of any frame, node, or selection for visual AI inspection and critique, optionally saving to disk.',
    inputSchema: z.object({
      nodeId: z.string().optional().describe('Node ID to capture (defaults to current selection or active frame)'),
      format: z.enum(['PNG', 'SVG', 'PDF', 'JPG']).optional().default('PNG'),
      scale: z.number().min(0.5).max(4).optional().default(2).describe('Export scale factor (default 2 for high-res retina)'),
      savePath: z.string().optional().describe('Optional local file path to save screenshot directly to disk')
    })
  },
  {
    name: 'figma_execute_code',
    description: 'Executes arbitrary JavaScript/TypeScript directly inside the Figma Plugin sandbox. Accesses figma.* API for power-user operations.',
    inputSchema: z.object({
      code: z.string().describe('JavaScript code to run in Figma sandbox. "figma" is in scope. Return values will be serialized.')
    })
  },
  {
    name: 'figma_get_session_history',
    description: 'Returns the list of all nodes that have been created or modified by the AI agent during the active session.',
    inputSchema: z.object({})
  },
  {
    name: 'figma_undo',
    description: 'Performs an undo operation in Figma.',
    inputSchema: z.object({})
  },
  {
    name: 'figma_redo',
    description: 'Performs a redo operation in Figma.',
    inputSchema: z.object({})
  }
];
