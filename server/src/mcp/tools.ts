/**
 * MCP Tools Definitions.
 * Exposes the full design suite to AGY, Claude Code, Codex, and Cursor using Zod schemas.
 * Equips AI agents with Senior Figma Designer capabilities:
 * - Auto Layout v4 (Direction, Wrap, Cross-axis gap, Hug/Fill, Min/Max dimensions, Canvas stacking, Strokes in layout)
 * - Absolute positioning inside Auto Layout containers
 * - Master Components, Variants & Component Sets
 * - Component Instances with variant property and text overrides
 * - Design Tokens & Styles (Paint, Typography, Elevation/Shadow/Blur Effects)
 * - Figma Variables (Token collections and modes)
 * - Grouping and Vector Boolean operations
 */

import { z } from 'zod';

export const EffectSchema = z.object({
  type: z.enum(['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR']).describe('Type of visual effect'),
  color: z.string().optional().describe('Color in hex format (e.g. #000000) or rgba'),
  opacity: z.number().min(0).max(1).optional().describe('Opacity from 0.0 to 1.0'),
  offset: z.object({ x: z.number(), y: z.number() }).optional().describe('Offset {x, y} in pixels'),
  radius: z.number().optional().describe('Blur radius in pixels'),
  spread: z.number().optional().describe('Shadow spread in pixels (for shadows)'),
  visible: z.boolean().optional().describe('Whether effect is visible (default true)')
});

export const LayoutNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.discriminatedUnion('type', [
    // FRAME
    z.object({
      type: z.literal('FRAME'),
      name: z.string().optional().describe('Name of the frame layer'),
      layout: z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional().describe('Auto Layout direction'),
      layoutMode: z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional().describe('Alias for layout'),
      layoutWrap: z.enum(['NO_WRAP', 'WRAP']).optional().describe('Wrap child items onto multiple rows/columns'),
      width: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional().describe('Width in px, or HUG, or FILL'),
      height: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional().describe('Height in px, or HUG, or FILL'),
      gap: z.number().optional().describe('Spacing between child items in px'),
      itemSpacing: z.number().optional().describe('Alias for gap'),
      counterAxisSpacing: z.number().optional().describe('Spacing between wrapped rows/columns in px'),
      padding: z
        .union([
          z.number(),
          z.tuple([z.number(), z.number()]),
          z.tuple([z.number(), z.number(), z.number(), z.number()]),
          z.object({
            top: z.number().optional(),
            right: z.number().optional(),
            bottom: z.number().optional(),
            left: z.number().optional()
          })
        ])
        .optional()
        .describe('Internal padding in px (number, [v, h], [t, r, b, l], or object)'),
      paddingTop: z.number().optional(),
      paddingRight: z.number().optional(),
      paddingBottom: z.number().optional(),
      paddingLeft: z.number().optional(),
      paddingHorizontal: z.number().optional(),
      paddingVertical: z.number().optional(),
      alignItems: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional().describe('Primary axis alignment'),
      primaryAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional(),
      counterAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'BASELINE']).optional().describe('Cross axis alignment'),
      counterAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'BASELINE']).optional(),
      counterAxisAlignContent: z.enum(['AUTO', 'SPACE_BETWEEN']).optional().describe('Align wrapped rows/lines'),
      background: z.string().optional().describe('Background color hex (e.g. #FFFFFF, #1E293B)'),
      fill: z.string().optional().describe('Alias for background'),
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
      strokesIncludedInLayout: z.boolean().optional().describe('Include stroke borders in Auto Layout bounding box'),
      itemReverseZIndex: z.boolean().optional().describe('Reverse canvas stacking order (first on top vs last on top)'),
      minWidth: z.number().optional().describe('Minimum width constraint in px'),
      maxWidth: z.number().optional().describe('Maximum width constraint in px'),
      minHeight: z.number().optional().describe('Minimum height constraint in px'),
      maxHeight: z.number().optional().describe('Maximum height constraint in px'),
      effects: z.array(EffectSchema).optional().describe('Elevation effects: Drop shadows, inner shadows, blurs'),
      layoutPositioning: z.enum(['AUTO', 'ABSOLUTE']).optional().describe('Set to ABSOLUTE for floating badges/icons inside Auto Layout'),
      layoutGrow: z.number().optional().describe('Flex grow in Auto Layout (0 or 1)'),
      layoutAlign: z.enum(['INHERIT', 'STRETCH']).optional().describe('Cross-axis alignment on child item'),
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
      height: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional(),
      layoutPositioning: z.enum(['AUTO', 'ABSOLUTE']).optional(),
      layoutGrow: z.number().optional(),
      layoutAlign: z.enum(['INHERIT', 'STRETCH']).optional(),
      minWidth: z.number().optional(),
      maxWidth: z.number().optional(),
      minHeight: z.number().optional(),
      maxHeight: z.number().optional(),
      effects: z.array(EffectSchema).optional(),
      x: z.number().optional(),
      y: z.number().optional()
    }),

    // RECTANGLE
    z.object({
      type: z.literal('RECTANGLE'),
      name: z.string().optional(),
      width: z.number().describe('Width in px'),
      height: z.number().describe('Height in px'),
      fill: z.string().optional().describe('Fill color hex (e.g. #E2E8F0)'),
      opacity: z.number().min(0).max(1).optional(),
      cornerRadius: z.union([z.number(), z.tuple([z.number(), z.number(), z.number(), z.number()])]).optional(),
      stroke: z.object({ color: z.string(), weight: z.number().optional() }).optional(),
      effects: z.array(EffectSchema).optional(),
      layoutPositioning: z.enum(['AUTO', 'ABSOLUTE']).optional(),
      layoutGrow: z.number().optional(),
      layoutAlign: z.enum(['INHERIT', 'STRETCH']).optional(),
      minWidth: z.number().optional(),
      maxWidth: z.number().optional(),
      minHeight: z.number().optional(),
      maxHeight: z.number().optional(),
      x: z.number().optional(),
      y: z.number().optional()
    }),

    // ELLIPSE
    z.object({
      type: z.literal('ELLIPSE'),
      name: z.string().optional(),
      width: z.number().describe('Width in px'),
      height: z.number().describe('Height in px'),
      fill: z.string().optional().describe('Fill color hex'),
      opacity: z.number().min(0).max(1).optional(),
      stroke: z.object({ color: z.string(), weight: z.number().optional() }).optional(),
      effects: z.array(EffectSchema).optional(),
      layoutPositioning: z.enum(['AUTO', 'ABSOLUTE']).optional(),
      layoutGrow: z.number().optional(),
      layoutAlign: z.enum(['INHERIT', 'STRETCH']).optional(),
      x: z.number().optional(),
      y: z.number().optional()
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
      effects: z.array(EffectSchema).optional(),
      opacity: z.number().min(0).max(1).optional(),
      layoutPositioning: z.enum(['AUTO', 'ABSOLUTE']).optional(),
      layoutGrow: z.number().optional(),
      layoutAlign: z.enum(['INHERIT', 'STRETCH']).optional(),
      minWidth: z.number().optional(),
      maxWidth: z.number().optional(),
      minHeight: z.number().optional(),
      maxHeight: z.number().optional(),
      x: z.number().optional(),
      y: z.number().optional()
    }),

    // SVG
    z.object({
      type: z.literal('SVG'),
      name: z.string().optional(),
      svg: z.string().optional().describe('Raw SVG markup string (e.g. <svg>...</svg>)'),
      url: z.string().optional().describe('URL or file path to .svg file'),
      width: z.number().optional().describe('Width in px'),
      height: z.number().optional().describe('Height in px'),
      opacity: z.number().min(0).max(1).optional(),
      layoutPositioning: z.enum(['AUTO', 'ABSOLUTE']).optional(),
      layoutGrow: z.number().optional(),
      layoutAlign: z.enum(['INHERIT', 'STRETCH']).optional(),
      x: z.number().optional(),
      y: z.number().optional()
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
      effects: z.array(EffectSchema).optional(),
      opacity: z.number().min(0).max(1).optional(),
      layoutPositioning: z.enum(['AUTO', 'ABSOLUTE']).optional(),
      layoutGrow: z.number().optional(),
      layoutAlign: z.enum(['INHERIT', 'STRETCH']).optional(),
      x: z.number().optional(),
      y: z.number().optional()
    })
  ])
);

const baseToolDefinitions = [
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
    description: 'Inspects a specific node by its ID or name, returning full details on layout, padding, gap, typography, fills, effects, and bound styles.',
    inputSchema: z.object({
      id: z.string().optional().describe('Figma Node ID (e.g. "12:34")'),
      name: z.string().optional().describe('Layer name to match if ID is unknown'),
      depth: z.number().min(1).max(6).optional().default(3)
    })
  },
  {
    name: 'figma_find_nodes',
    description: 'Searches the current page for nodes matching name, type (FRAME, TEXT, RECTANGLE, COMPONENT, etc.), or text content.',
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
    description: 'Extracts document pages, local color styles, typography tokens, effect styles, and top-level frames.',
    inputSchema: z.object({})
  },
  {
    name: 'figma_render_layout',
    description: 'Creates native Figma designs using a declarative flexbox/Auto Layout JSON tree. Supports nested containers, wrapping, responsive hug/fill sizing, absolute positioning, elevation shadows, and tokens.',
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
    description: 'Edits and modifies properties of an existing node by ID or name (change text copy, colors, auto-layout direction/wrap/padding, sizing hug/fill, corner radius, elevation effects, min/max constraints).',
    inputSchema: z.object({
      id: z.string().optional().describe('Target node ID'),
      name: z.string().optional().describe('Rename the node or match by layer name if ID is omitted'),
      text: z.string().optional().describe('Update text characters (if TEXT node)'),
      fontFamily: z.string().optional(),
      fontWeight: z.enum(['Thin', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black']).optional(),
      fontSize: z.number().optional(),
      color: z.string().optional().describe('Text color or shape fill hex'),
      background: z.string().optional().describe('Background color hex for frames'),
      opacity: z.number().min(0).max(1).optional(),
      cornerRadius: z.union([z.number(), z.tuple([z.number(), z.number(), z.number(), z.number()])]).optional(),
      stroke: z.object({ color: z.string(), weight: z.number().optional(), align: z.enum(['INSIDE', 'OUTSIDE', 'CENTER']).optional() }).optional(),
      layout: z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional().describe('Change Auto Layout direction'),
      layoutMode: z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional(),
      layoutWrap: z.enum(['NO_WRAP', 'WRAP']).optional().describe('Auto Layout wrap'),
      gap: z.number().optional().describe('Auto Layout gap/spacing'),
      counterAxisSpacing: z.number().optional().describe('Cross-axis spacing when wrapped'),
      padding: z.union([
        z.number(),
        z.tuple([z.number(), z.number()]),
        z.tuple([z.number(), z.number(), z.number(), z.number()]),
        z.object({ top: z.number().optional(), right: z.number().optional(), bottom: z.number().optional(), left: z.number().optional() })
      ]).optional(),
      alignItems: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional(),
      counterAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'BASELINE']).optional(),
      counterAxisAlignContent: z.enum(['AUTO', 'SPACE_BETWEEN']).optional(),
      width: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional(),
      height: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional(),
      layoutSizingHorizontal: z.enum(['FIXED', 'HUG', 'FILL']).optional(),
      layoutSizingVertical: z.enum(['FIXED', 'HUG', 'FILL']).optional(),
      minWidth: z.number().optional(),
      maxWidth: z.number().optional(),
      minHeight: z.number().optional(),
      maxHeight: z.number().optional(),
      layoutPositioning: z.enum(['AUTO', 'ABSOLUTE']).optional().describe('Set to ABSOLUTE for floating badges/close icons inside Auto Layout'),
      layoutGrow: z.number().optional().describe('Flex grow (0 or 1)'),
      layoutAlign: z.enum(['INHERIT', 'STRETCH']).optional(),
      strokesIncludedInLayout: z.boolean().optional(),
      itemReverseZIndex: z.boolean().optional(),
      effects: z.array(EffectSchema).optional().describe('Elevation shadows and blurs'),
      visible: z.boolean().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      imageUrl: z.string().optional().describe('Image URL or local file path to set as node fill'),
      videoUrl: z.string().optional().describe('Video URL (.mp4/.mov) or local file path to set as node fill')
    })
  },
  {
    name: 'figma_set_auto_layout',
    description: 'Enables or configures Auto Layout on any frame, group, or selection (equivalent to pressing Shift+A in Figma). Sets direction (HORIZONTAL/VERTICAL), wrap, gap, padding, alignment, and hug/fill sizing.',
    inputSchema: z.object({
      nodeId: z.string().optional().describe('Target node ID (defaults to active canvas selection if omitted)'),
      layoutMode: z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional().default('VERTICAL').describe('Auto Layout direction'),
      direction: z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional().describe('Alias for layoutMode'),
      layoutWrap: z.enum(['NO_WRAP', 'WRAP']).optional().describe('Wrap child items onto multiple lines'),
      gap: z.number().optional().describe('Spacing between items in px'),
      itemSpacing: z.number().optional().describe('Alias for gap'),
      counterAxisSpacing: z.number().optional().describe('Cross-axis spacing between wrapped rows/columns in px'),
      padding: z.union([
        z.number(),
        z.tuple([z.number(), z.number()]),
        z.tuple([z.number(), z.number(), z.number(), z.number()]),
        z.object({ top: z.number().optional(), right: z.number().optional(), bottom: z.number().optional(), left: z.number().optional() })
      ]).optional().describe('Internal padding in px'),
      alignItems: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional().describe('Primary axis alignment'),
      counterAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'BASELINE']).optional().describe('Cross axis alignment'),
      width: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional().describe('Width: number, HUG, or FILL'),
      height: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional().describe('Height: number, HUG, or FILL'),
      strokesIncludedInLayout: z.boolean().optional(),
      itemReverseZIndex: z.boolean().optional()
    })
  },
  {
    name: 'figma_create_component',
    description: 'Creates a reusable master Component from a declarative layout tree or converts an existing Frame into a master Component.',
    inputSchema: z.object({
      nodeId: z.string().optional().describe('Optional ID of an existing Frame to convert into a master Component'),
      spec: LayoutNodeSchema.optional().describe('Optional declarative layout tree to build directly as a master Component'),
      name: z.string().optional().describe('Component name (e.g. "Button/Primary", "Card/Profile")'),
      description: z.string().optional().describe('Component documentation / description shown in Figma assets panel'),
      insertPosition: z.object({ x: z.number(), y: z.number() }).optional()
    })
  },
  {
    name: 'figma_create_component_set',
    description: 'Combines multiple master Components into a single Variant Component Set (e.g. Button with Type=Primary/Secondary, State=Default/Hover/Active).',
    inputSchema: z.object({
      componentIds: z.array(z.string()).describe('Array of Component node IDs to combine as variants'),
      name: z.string().optional().describe('Name of the component set (e.g. "Button", "Input")'),
      description: z.string().optional().describe('Component set description')
    })
  },
  {
    name: 'figma_create_instance',
    description: 'Creates an instance of an existing master Component or Component Set, with variant property overrides, text overrides, and responsive sizing.',
    inputSchema: z.object({
      componentId: z.string().describe('ID of the master Component or Component Set to instantiate'),
      name: z.string().optional().describe('Optional instance layer name'),
      x: z.number().optional().describe('Canvas X coordinate'),
      y: z.number().optional().describe('Canvas Y coordinate'),
      targetParentId: z.string().optional().describe('Parent Frame ID to nest the instance inside'),
      variantProperties: z.record(z.string(), z.string()).optional().describe('Variant properties to set (e.g. { "State": "Hover", "Size": "Large" })'),
      textOverrides: z.record(z.string(), z.string()).optional().describe('Key-value map of child text layer name -> replacement string (e.g. { "Label": "Sign Up" })'),
      width: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional(),
      height: z.union([z.number(), z.literal('HUG'), z.literal('FILL')]).optional()
    })
  },
  {
    name: 'figma_create_style',
    description: 'Creates a reusable design system style in Figma: Paint (Color) style, Typography Text style, or Effect (Elevation/Shadow/Blur) style.',
    inputSchema: z.object({
      styleType: z.enum(['PAINT', 'TEXT', 'EFFECT']).describe('Type of design system style to create'),
      name: z.string().describe('Style name (e.g. "Brand/Primary", "Typography/H1", "Elevation/Card Shadow")'),
      description: z.string().optional().describe('Style description'),
      color: z.string().optional().describe('Hex color for PAINT style (e.g. "#0D99FF")'),
      opacity: z.number().min(0).max(1).optional().describe('Opacity for PAINT style'),
      fontFamily: z.string().optional().describe('Font family for TEXT style'),
      fontWeight: z.string().optional().describe('Font weight for TEXT style (e.g. "SemiBold", "Bold")'),
      fontSize: z.number().optional().describe('Font size in px for TEXT style'),
      lineHeight: z.union([z.number(), z.literal('AUTO')]).optional(),
      letterSpacing: z.number().optional(),
      effects: z.array(EffectSchema).optional().describe('Array of effects for EFFECT style (e.g. drop shadow)')
    })
  },
  {
    name: 'figma_apply_style',
    description: 'Binds a design system style (by name or ID) to an existing node’s fill, stroke, text, or effects.',
    inputSchema: z.object({
      nodeId: z.string().describe('Target node ID'),
      styleType: z.enum(['FILL', 'STROKE', 'TEXT', 'EFFECT']).describe('Which property to bind the style to'),
      styleId: z.string().optional().describe('Figma style ID (e.g. "S:123...")'),
      styleName: z.string().optional().describe('Figma style name to match (e.g. "Brand/Primary") if ID is unknown')
    })
  },
  {
    name: 'figma_get_variables',
    description: 'Retrieves all Figma Variables and Design Tokens organized by collection and modes (e.g. Light/Dark mode colors, spacing numbers).',
    inputSchema: z.object({
      collectionId: z.string().optional().describe('Optional collection ID to filter variables')
    })
  },
  {
    name: 'figma_create_variable',
    description: 'Creates a Figma Variable (Design Token) in a collection with values for modes (COLOR, FLOAT, STRING, or BOOLEAN).',
    inputSchema: z.object({
      collectionName: z.string().optional().default('Tokens').describe('Variable collection name (e.g. "Tokens", "Colors")'),
      name: z.string().describe('Variable name (e.g. "color/brand/primary", "spacing/md")'),
      resolvedType: z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']).describe('Variable data type'),
      value: z.any().describe('Value for default mode (hex string for COLOR, number for FLOAT, etc.)'),
      modeName: z.string().optional().describe('Optional mode name')
    })
  },
  {
    name: 'figma_group_nodes',
    description: 'Groups multiple nodes on the canvas into a single Group container.',
    inputSchema: z.object({
      nodeIds: z.array(z.string()).describe('Array of node IDs to group together'),
      name: z.string().optional().describe('Optional name for the group')
    })
  },
  {
    name: 'figma_boolean_operation',
    description: 'Performs a vector Boolean operation (UNION, SUBTRACT, INTERSECT, EXCLUDE) on selected shapes or layers.',
    inputSchema: z.object({
      operation: z.enum(['UNION', 'SUBTRACT', 'INTERSECT', 'EXCLUDE']).describe('Boolean operation type'),
      nodeIds: z.array(z.string()).describe('Array of 2 or more shape node IDs to combine'),
      name: z.string().optional().describe('Optional name for the resulting boolean layer')
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
    name: 'figma_get_speaker_notes',
    description: 'Figma Slides only: reads the presenter (speaker) notes of slides. Omit nodeIds to read every slide in deck order.',
    inputSchema: z.object({
      nodeIds: z.array(z.string()).optional().describe('Slide node IDs to read (defaults to all slides in grid order)')
    })
  },
  {
    name: 'figma_set_speaker_notes',
    description: 'Figma Slides only: writes presenter (speaker) notes shown in Presenter View. Accepts markdown (bullet lists, bold, italic, strikethrough). Batch many slides in one call.',
    inputSchema: z.object({
      notes: z.array(z.object({
        nodeId: z.string().describe('SLIDE node ID (e.g. "1:42")'),
        notes: z.string().describe('Markdown notes text; empty string clears the notes')
      })).min(1).describe('One entry per slide to update')
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
    description: 'Executes arbitrary JavaScript/TypeScript directly inside the Figma Plugin sandbox. First-class globals in scope: "figma", "createAutoLayout", "createFrame", "createText", "createRectangle", "createEllipse", "createComponent", "createInstance", "loadFont", "solidPaint", "rgb", "rgba", "dropShadow", "innerShadow", "blur", "findNode", "findNodes".',
    inputSchema: z.object({
      code: z.string().describe('JavaScript code to run in Figma sandbox. "figma" and "createAutoLayout" are in scope. Return values will be serialized.')
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

const targetFileSchema = z.string().optional().describe(
  'Target Figma file when several are connected: file name (or part of it), fileKey, or instance id from figma_get_status. Defaults to the most recently connected file.'
);

export const toolsDefinitions = [
  ...baseToolDefinitions.map(def => ({
    ...def,
    inputSchema: def.inputSchema instanceof z.ZodObject
      ? def.inputSchema.extend({ file: targetFileSchema })
      : def.inputSchema
  })),
  {
    name: 'figma_set_active_file',
    description: 'Sets the default Figma file used by tools that omit the file parameter.',
    inputSchema: z.object({
      file: z.string().describe('Figma file name (or part of it), fileKey, or client id from figma_get_status')
    })
  }
];
