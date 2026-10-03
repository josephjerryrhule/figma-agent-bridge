/**
 * Shared protocol types for Figma Agent Bridge.
 * Synchronizes messages between MCP Server, REST API, WebSocket Relay, and Figma Plugin.
 */

export type BridgeCommandType =
  | 'GET_STATUS'
  | 'GET_SELECTION'
  | 'INSPECT_NODE'
  | 'FIND_NODES'
  | 'GET_DOCUMENT_INFO'
  | 'RENDER_LAYOUT'
  | 'UPDATE_NODE'
  | 'SET_AUTO_LAYOUT'
  | 'CREATE_COMPONENT'
  | 'CREATE_COMPONENT_SET'
  | 'CREATE_INSTANCE'
  | 'CREATE_STYLE'
  | 'APPLY_STYLE'
  | 'GET_VARIABLES'
  | 'CREATE_VARIABLE'
  | 'GROUP_NODES'
  | 'BOOLEAN_OPERATION'
  | 'APPEND_CHILDREN'
  | 'REPLACE_CHILDREN'
  | 'DELETE_NODES'
  | 'DUPLICATE_NODE'
  | 'INSERT_MEDIA'
  | 'EXPORT_NODES'
  | 'CAPTURE_SCREENSHOT'
  | 'EXECUTE_CODE'
  | 'GET_SPEAKER_NOTES'
  | 'SET_SPEAKER_NOTES'
  | 'GET_SESSION_HISTORY'
  | 'UNDO'
  | 'REDO';

export interface BridgeRequest<T = any> {
  id: string;
  command: BridgeCommandType;
  payload: T;
  timestamp: number;
  agent?: string;
}

export interface BridgeResponse<T = any> {
  id: string;
  command?: BridgeCommandType;
  agent?: string;
  success: boolean;
  data?: T;
  error?: string;
  executionTimeMs?: number;
}

export interface PluginConnectionInfo {
  fileName: string;
  fileKey: string | null;
  editorType: string;
  pageName: string;
  instanceId: string;
}

export interface PluginInfoMessage extends PluginConnectionInfo {
  type: 'PLUGIN_INFO';
}

// ==========================================
// Declarative Layout DSL Types
// ==========================================

export type LayoutNodeType = 'FRAME' | 'TEXT' | 'RECTANGLE' | 'ELLIPSE' | 'IMAGE' | 'SVG' | 'VIDEO';

export type LayoutSizing = number | 'HUG' | 'FILL';

export interface EffectSpec {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  color?: string; // hex "#000000" or rgba
  opacity?: number;
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  visible?: boolean;
  blendMode?: string;
}

export interface BaseLayoutNode {
  type: LayoutNodeType;
  name?: string;
  visible?: boolean;
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';
  layoutGrow?: number;
  layoutAlign?: 'INHERIT' | 'STRETCH';
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  effects?: EffectSpec[];
}

export interface TextLayoutNode extends BaseLayoutNode {
  type: 'TEXT';
  text: string;
  fontFamily?: string;
  fontWeight?: 'Thin' | 'Light' | 'Regular' | 'Medium' | 'SemiBold' | 'Bold' | 'ExtraBold' | 'Black';
  fontSize?: number;
  color?: string; // hex "#1E293B" or "rgba(...)"
  opacity?: number;
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  letterSpacing?: number;
  lineHeight?: number | 'AUTO';
  width?: LayoutSizing;
  height?: LayoutSizing;
  x?: number;
  y?: number;
}

export interface ShapeLayoutNode extends BaseLayoutNode {
  type: 'RECTANGLE' | 'ELLIPSE';
  width: number;
  height: number;
  fill?: string;
  opacity?: number;
  cornerRadius?: number | [number, number, number, number];
  stroke?: {
    color: string;
    weight?: number;
    align?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  };
  x?: number;
  y?: number;
}

export interface PaddingConfig {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface FrameLayoutNode extends BaseLayoutNode {
  type: 'FRAME';
  layout?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  width?: LayoutSizing;
  height?: LayoutSizing;
  gap?: number;
  itemSpacing?: number;
  counterAxisSpacing?: number;
  padding?: number | PaddingConfig | [number, number] | [number, number, number, number];
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  alignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  counterAxisAlignContent?: 'AUTO' | 'SPACE_BETWEEN';
  background?: string;
  fill?: string;
  opacity?: number;
  cornerRadius?: number | [number, number, number, number];
  stroke?: {
    color: string;
    weight?: number;
    align?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  };
  clipsContent?: boolean;
  strokesIncludedInLayout?: boolean;
  itemReverseZIndex?: boolean;
  x?: number;
  y?: number;
  children?: LayoutNode[];
}

export interface ImageLayoutNode extends BaseLayoutNode {
  type: 'IMAGE';
  url?: string;
  base64?: string;
  width?: number;
  height?: number;
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  cornerRadius?: number | [number, number, number, number];
  stroke?: {
    color: string;
    weight?: number;
    align?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  };
  opacity?: number;
  x?: number;
  y?: number;
}

export interface SvgLayoutNode extends BaseLayoutNode {
  type: 'SVG';
  svg?: string;
  url?: string;
  width?: number;
  height?: number;
  opacity?: number;
  x?: number;
  y?: number;
}

export interface VideoLayoutNode extends BaseLayoutNode {
  type: 'VIDEO';
  url?: string;
  base64?: string;
  width?: number;
  height?: number;
  scaleMode?: 'FILL' | 'FIT' | 'CROP';
  cornerRadius?: number | [number, number, number, number];
  opacity?: number;
  x?: number;
  y?: number;
}

export type LayoutNode =
  | FrameLayoutNode
  | TextLayoutNode
  | ShapeLayoutNode
  | ImageLayoutNode
  | SvgLayoutNode
  | VideoLayoutNode;

export interface RenderLayoutPayload {
  root: LayoutNode;
  insertPosition?: { x: number; y: number };
  targetParentId?: string;
  selectAfterCreate?: boolean;
}

// ==========================================
// Senior Designer & Auto Layout Types
// ==========================================

export interface SetAutoLayoutPayload {
  nodeId?: string; // If omitted, targets current canvas selection
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  direction?: 'HORIZONTAL' | 'VERTICAL' | 'NONE'; // alias for layoutMode
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  wrap?: boolean | 'NO_WRAP' | 'WRAP'; // alias
  gap?: number;
  itemSpacing?: number; // alias
  counterAxisSpacing?: number;
  padding?: number | PaddingConfig | [number, number] | [number, number, number, number];
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  alignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  counterAxisAlignContent?: 'AUTO' | 'SPACE_BETWEEN';
  width?: LayoutSizing;
  height?: LayoutSizing;
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
  strokesIncludedInLayout?: boolean;
  itemReverseZIndex?: boolean;
}

export interface CreateComponentPayload {
  nodeId?: string; // Convert existing frame to component
  spec?: LayoutNode; // Create component from layout tree
  name?: string;
  description?: string;
  insertPosition?: { x: number; y: number };
}

export interface CreateComponentSetPayload {
  componentIds: string[];
  name?: string;
  description?: string;
}

export interface CreateInstancePayload {
  componentId: string;
  name?: string;
  x?: number;
  y?: number;
  targetParentId?: string;
  variantProperties?: Record<string, string>;
  textOverrides?: Record<string, string>;
  width?: LayoutSizing;
  height?: LayoutSizing;
}

export interface CreateStylePayload {
  styleType: 'PAINT' | 'TEXT' | 'EFFECT';
  name: string;
  description?: string;
  color?: string;
  opacity?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontSize?: number;
  lineHeight?: number | 'AUTO';
  letterSpacing?: number;
  effects?: EffectSpec[];
}

export interface ApplyStylePayload {
  nodeId: string;
  styleType: 'FILL' | 'STROKE' | 'TEXT' | 'EFFECT';
  styleId?: string;
  styleName?: string;
}

export interface GetVariablesPayload {
  collectionId?: string;
}

export interface CreateVariablePayload {
  collectionName?: string;
  name: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  value: any;
  modeName?: string;
}

export interface GroupNodesPayload {
  nodeIds: string[];
  name?: string;
}

export interface BooleanOperationPayload {
  operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';
  nodeIds: string[];
  name?: string;
}

// ==========================================
// Node Mutation / Edit Types
// ==========================================

export interface UpdateNodePayload {
  id?: string;
  name?: string;
  text?: string;
  fontFamily?: string;
  fontWeight?: 'Thin' | 'Light' | 'Regular' | 'Medium' | 'SemiBold' | 'Bold' | 'ExtraBold' | 'Black';
  fontSize?: number;
  color?: string;
  background?: string;
  opacity?: number;
  cornerRadius?: number | [number, number, number, number];
  stroke?: {
    color: string;
    weight?: number;
    align?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  };
  layout?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  wrap?: boolean | 'NO_WRAP' | 'WRAP';
  gap?: number;
  counterAxisSpacing?: number;
  padding?: number | PaddingConfig | [number, number] | [number, number, number, number];
  alignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  counterAxisAlignContent?: 'AUTO' | 'SPACE_BETWEEN';
  width?: LayoutSizing;
  height?: LayoutSizing;
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';
  layoutGrow?: number;
  layoutAlign?: 'INHERIT' | 'STRETCH';
  strokesIncludedInLayout?: boolean;
  itemReverseZIndex?: boolean;
  effects?: EffectSpec[];
  visible?: boolean;
  x?: number;
  y?: number;
  imageUrl?: string;
  imageBase64?: string;
  imageScaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  videoUrl?: string;
  videoBase64?: string;
  videoScaleMode?: 'FILL' | 'FIT' | 'CROP';
}

export interface AppendChildrenPayload {
  parentId: string;
  children: LayoutNode[];
}

export interface ReplaceChildrenPayload {
  parentId: string;
  children: LayoutNode[];
}

export interface DeleteNodesPayload {
  ids: string[];
}

export interface DuplicateNodePayload {
  nodeId: string;
  name?: string;
  x?: number;
  y?: number;
  insertAfter?: boolean;
}

export interface InsertMediaPayload {
  mediaType: 'IMAGE' | 'SVG' | 'VIDEO' | 'GIF';
  source?: string; // URL (http/https), local file path, raw SVG, or base64
  base64?: string; // Prepared base64 string
  svgString?: string; // Prepared raw SVG string
  name?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  targetParentId?: string;
  targetNodeId?: string; // If set, updates/replaces the fill of this existing node
  cornerRadius?: number | [number, number, number, number];
  selectAfterCreate?: boolean;
}

// ==========================================
// Inspection & Query Types
// ==========================================

export interface InspectNodePayload {
  id?: string;
  name?: string;
  includeChildren?: boolean;
  depth?: number;
}

export interface FindNodesPayload {
  query?: string;
  name?: string;
  type?: string;
  textContains?: string;
  limit?: number;
}

export interface SerializedNodeInfo {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  characters?: string;
  fontSize?: number;
  fontName?: { family: string; style: string };
  fills?: any[];
  strokes?: any[];
  cornerRadius?: number;
  layoutMode?: string;
  layoutWrap?: string;
  itemSpacing?: number;
  counterAxisSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  counterAxisAlignContent?: string;
  layoutSizingHorizontal?: string;
  layoutSizingVertical?: string;
  layoutPositioning?: string;
  layoutGrow?: number;
  layoutAlign?: string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  strokesIncludedInLayout?: boolean;
  itemReverseZIndex?: boolean;
  effects?: any[];
  fillStyleId?: string;
  strokeStyleId?: string;
  textStyleId?: string;
  effectStyleId?: string;
  componentPropertyDefinitions?: any;
  variantProperties?: Record<string, string>;
  childCount?: number;
  children?: SerializedNodeInfo[];
}

export interface DocumentInfoResult {
  fileName: string;
  currentPageName: string;
  pages: { id: string; name: string }[];
  localColorStyles: { id: string; name: string; colorHex: string }[];
  localTextStyles: { id: string; name: string; fontSize: number; fontName: any }[];
  localEffectStyles: { id: string; name: string; type: string }[];
  topLevelFrames: { id: string; name: string; width: number; height: number }[];
}

// ==========================================
// Visual Capture & Document Export Types
// ==========================================

export interface CaptureScreenshotPayload {
  nodeId?: string; // If omitted, captures current selection or entire active frame
  format?: 'PNG' | 'SVG' | 'PDF' | 'JPG';
  scale?: number; // default 2
  savePath?: string; // Optional local file path to save directly to disk
}

export interface CaptureScreenshotResult {
  nodeId: string;
  nodeName: string;
  format: 'PNG' | 'SVG' | 'PDF' | 'JPG';
  scale: number;
  mimeType: string;
  base64: string;
  dataUrl: string;
  width: number;
  height: number;
  filePath?: string;
}

export interface ExportNodesPayload {
  nodeId?: string; // Single target node ID
  nodeIds?: string[]; // Multiple target node IDs for batch export
  exportAllFrames?: boolean; // Export all top-level frames on active page (e.g. all slides in a deck)
  format?: 'PDF' | 'PNG' | 'JPG' | 'SVG'; // Default 'PDF'
  scale?: number; // 1, 2, 3, 4 (default 2 for raster, 1 for PDF/SVG)
  savePath?: string; // Optional local path for single export
  outputDir?: string; // Optional directory to save batch exported frames
}

export interface ExportedItem {
  nodeId: string;
  nodeName: string;
  format: 'PDF' | 'PNG' | 'JPG' | 'SVG';
  mimeType: string;
  byteLength: number;
  base64?: string;
  dataUrl?: string;
  filePath?: string;
  width?: number;
  height?: number;
}

export interface ExportNodesResult {
  totalCount: number;
  format: 'PDF' | 'PNG' | 'JPG' | 'SVG';
  items: ExportedItem[];
  outputDir?: string;
  summary: string;
}

// ==========================================
// Arbitrary Sandbox Code Execution
// ==========================================

export interface ExecuteCodePayload {
  code: string;
  timeoutMs?: number;
}
