/**
 * Sandbox Helpers & Polyfills for Figma Agent Bridge.
 * Equips agents running arbitrary code in EXECUTE_CODE with first-class Auto Layout,
 * Component, Typography, and Styling utilities matching a Senior Figma Designer's workflow.
 */

import { parseEffects } from './effects';
import { createSolidPaint, parseColor, figmaRgbToHex } from './colors';
import { ensureFontLoaded } from './fonts';
import { LayoutNode, EffectSpec, PaddingConfig, LayoutSizing } from '../types';
import { createNodeFromLayout } from './parser';

export interface CreateAutoLayoutOptions {
  name?: string;
  direction?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE'; // alias
  wrap?: boolean | 'NO_WRAP' | 'WRAP';
  layoutWrap?: 'NO_WRAP' | 'WRAP'; // alias
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
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'; // alias
  counterAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE'; // alias
  counterAxisAlignContent?: 'AUTO' | 'SPACE_BETWEEN';
  width?: LayoutSizing;
  height?: LayoutSizing;
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  background?: string;
  fill?: string; // alias
  opacity?: number;
  stroke?: string | { color: string; weight?: number; align?: 'INSIDE' | 'OUTSIDE' | 'CENTER' };
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  cornerRadius?: number | [number, number, number, number];
  clipsContent?: boolean;
  strokesIncludedInLayout?: boolean;
  itemReverseZIndex?: boolean;
  effects?: EffectSpec[];
  x?: number;
  y?: number;
  parent?: BaseNode & ChildrenMixin;
  targetParentId?: string;
  children?: (SceneNode | LayoutNode | (() => SceneNode | Promise<SceneNode>))[];
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';
  layoutGrow?: number;
  layoutAlign?: 'INHERIT' | 'STRETCH';
}

/**
 * Creates a fully configured Figma Auto Layout frame.
 * Available globally in the sandbox and monkey-patched as `figma.createAutoLayout(...)`.
 */
export async function createAutoLayout(options: CreateAutoLayoutOptions = {}): Promise<FrameNode> {
  const frame = figma.createFrame();

  if (options.name) {
    frame.name = options.name;
  }

  // 1. Layout Mode (defaults to VERTICAL if auto layout is used)
  const mode = options.layoutMode || options.direction || 'VERTICAL';
  frame.layoutMode = mode;

  // 2. Wrap
  if (options.wrap === true || options.wrap === 'WRAP' || options.layoutWrap === 'WRAP') {
    if ('layoutWrap' in frame) {
      frame.layoutWrap = 'WRAP';
    }
  } else if (options.wrap === false || options.wrap === 'NO_WRAP' || options.layoutWrap === 'NO_WRAP') {
    if ('layoutWrap' in frame) {
      frame.layoutWrap = 'NO_WRAP';
    }
  }

  // 3. Gap / Spacing
  const gap = options.itemSpacing !== undefined ? options.itemSpacing : options.gap;
  if (gap !== undefined) {
    frame.itemSpacing = gap;
  }
  if (options.counterAxisSpacing !== undefined && 'counterAxisSpacing' in frame) {
    frame.counterAxisSpacing = options.counterAxisSpacing;
  }

  // 4. Padding
  if (options.padding !== undefined) {
    if (typeof options.padding === 'number') {
      frame.paddingTop = options.padding;
      frame.paddingRight = options.padding;
      frame.paddingBottom = options.padding;
      frame.paddingLeft = options.padding;
    } else if (Array.isArray(options.padding)) {
      if (options.padding.length === 2) {
        // [vertical, horizontal]
        const [v, h] = options.padding;
        frame.paddingTop = v;
        frame.paddingBottom = v;
        frame.paddingRight = h;
        frame.paddingLeft = h;
      } else if (options.padding.length === 4) {
        // [top, right, bottom, left]
        const [t, r, b, l] = options.padding;
        frame.paddingTop = t;
        frame.paddingRight = r;
        frame.paddingBottom = b;
        frame.paddingLeft = l;
      }
    } else if (typeof options.padding === 'object') {
      if (options.padding.top !== undefined) frame.paddingTop = options.padding.top;
      if (options.padding.right !== undefined) frame.paddingRight = options.padding.right;
      if (options.padding.bottom !== undefined) frame.paddingBottom = options.padding.bottom;
      if (options.padding.left !== undefined) frame.paddingLeft = options.padding.left;
    }
  }

  if (options.paddingTop !== undefined) frame.paddingTop = options.paddingTop;
  if (options.paddingRight !== undefined) frame.paddingRight = options.paddingRight;
  if (options.paddingBottom !== undefined) frame.paddingBottom = options.paddingBottom;
  if (options.paddingLeft !== undefined) frame.paddingLeft = options.paddingLeft;
  if (options.paddingHorizontal !== undefined) {
    frame.paddingLeft = options.paddingHorizontal;
    frame.paddingRight = options.paddingHorizontal;
  }
  if (options.paddingVertical !== undefined) {
    frame.paddingTop = options.paddingVertical;
    frame.paddingBottom = options.paddingVertical;
  }

  // 5. Alignment
  const primaryAlign = options.primaryAxisAlignItems || options.alignItems;
  if (primaryAlign) {
    frame.primaryAxisAlignItems = primaryAlign;
  }
  const counterAlign = options.counterAxisAlignItems || options.counterAlignItems;
  if (counterAlign) {
    frame.counterAxisAlignItems = counterAlign;
  }
  if (options.counterAxisAlignContent && 'counterAxisAlignContent' in frame) {
    frame.counterAxisAlignContent = options.counterAxisAlignContent;
  }

  // 6. Background / Fills
  const bg = options.fill || options.background;
  if (bg) {
    frame.fills = createSolidPaint(bg, options.opacity);
  } else {
    frame.fills = [];
  }

  // 7. Strokes / Borders
  if (options.stroke) {
    if (typeof options.stroke === 'string') {
      frame.strokes = createSolidPaint(options.stroke);
      frame.strokeWeight = options.strokeWeight ?? 1;
      if (options.strokeAlign) frame.strokeAlign = options.strokeAlign;
    } else {
      frame.strokes = createSolidPaint(options.stroke.color);
      frame.strokeWeight = options.stroke.weight ?? options.strokeWeight ?? 1;
      frame.strokeAlign = options.stroke.align ?? options.strokeAlign ?? 'INSIDE';
    }
  }

  // 8. Corner Radius
  if (options.cornerRadius !== undefined) {
    if (Array.isArray(options.cornerRadius)) {
      const [tl, tr, br, bl] = options.cornerRadius;
      frame.topLeftRadius = tl;
      frame.topRightRadius = tr;
      frame.bottomRightRadius = br;
      frame.bottomLeftRadius = bl;
    } else {
      frame.cornerRadius = options.cornerRadius;
    }
  }

  // 9. Clips Content
  if (options.clipsContent !== undefined) {
    frame.clipsContent = options.clipsContent;
  }

  // 10. Strokes in Layout & Stacking
  if (options.strokesIncludedInLayout !== undefined && 'strokesIncludedInLayout' in frame) {
    frame.strokesIncludedInLayout = options.strokesIncludedInLayout;
  }
  if (options.itemReverseZIndex !== undefined && 'itemReverseZIndex' in frame) {
    frame.itemReverseZIndex = options.itemReverseZIndex;
  }

  // 11. Min / Max Constraints
  if (options.minWidth !== undefined && 'minWidth' in frame) frame.minWidth = options.minWidth;
  if (options.maxWidth !== undefined && 'maxWidth' in frame) frame.maxWidth = options.maxWidth;
  if (options.minHeight !== undefined && 'minHeight' in frame) frame.minHeight = options.minHeight;
  if (options.maxHeight !== undefined && 'maxHeight' in frame) frame.maxHeight = options.maxHeight;

  // 12. Effects (Shadows & Blurs)
  if (options.effects && options.effects.length > 0) {
    frame.effects = parseEffects(options.effects);
  }

  // Initial size before appending children
  const initW = typeof options.width === 'number' ? options.width : 200;
  const initH = typeof options.height === 'number' ? options.height : 100;
  frame.resize(initW, initH);

  // 13. Children
  if (options.children && options.children.length > 0) {
    for (const childItem of options.children) {
      let childNode: SceneNode | null = null;

      if (typeof childItem === 'function') {
        const res = childItem();
        childNode = res instanceof Promise ? await res : res;
      } else if (childItem && typeof childItem === 'object') {
        if ('type' in childItem && typeof (childItem as any).type === 'string') {
          // Could be LayoutNode or SceneNode
          if ('id' in childItem && 'parent' in childItem) {
            // Native SceneNode
            childNode = childItem as SceneNode;
          } else {
            // LayoutNode spec
            childNode = await createNodeFromLayout(childItem as LayoutNode);
          }
        }
      }

      if (childNode) {
        frame.appendChild(childNode);

        // Child sizing rules
        const childSpec = childItem as any;
        if (childSpec) {
          if (childSpec.layoutPositioning === 'ABSOLUTE' && 'layoutPositioning' in childNode) {
            (childNode as any).layoutPositioning = 'ABSOLUTE';
            if (childSpec.x !== undefined) childNode.x = childSpec.x;
            if (childSpec.y !== undefined) childNode.y = childSpec.y;
          }

          if ('layoutSizingHorizontal' in childNode) {
            if (childSpec.width === 'FILL' || childSpec.layoutSizingHorizontal === 'FILL') {
              (childNode as any).layoutSizingHorizontal = 'FILL';
            } else if (childSpec.width === 'HUG' || childSpec.layoutSizingHorizontal === 'HUG') {
              (childNode as any).layoutSizingHorizontal = 'HUG';
            }
          }

          if ('layoutSizingVertical' in childNode) {
            if (childSpec.height === 'FILL' || childSpec.layoutSizingVertical === 'FILL') {
              (childNode as any).layoutSizingVertical = 'FILL';
            } else if (childSpec.height === 'HUG' || childSpec.layoutSizingVertical === 'HUG') {
              (childNode as any).layoutSizingVertical = 'HUG';
            }
          }

          if (childSpec.layoutGrow !== undefined && 'layoutGrow' in childNode) {
            (childNode as any).layoutGrow = childSpec.layoutGrow;
          }
          if (childSpec.layoutAlign !== undefined && 'layoutAlign' in childNode) {
            (childNode as any).layoutAlign = childSpec.layoutAlign;
          }
        }
      }
    }
  }

  // 14. Parent Frame Sizing
  const targetW = options.layoutSizingHorizontal || options.width;
  if (targetW === 'HUG') {
    frame.layoutSizingHorizontal = 'HUG';
  } else if (targetW === 'FILL') {
    frame.layoutSizingHorizontal = 'FILL';
  } else if (typeof targetW === 'number') {
    frame.layoutSizingHorizontal = 'FIXED';
    frame.resize(targetW, frame.height);
  }

  const targetH = options.layoutSizingVertical || options.height;
  if (targetH === 'HUG') {
    frame.layoutSizingVertical = 'HUG';
  } else if (targetH === 'FILL') {
    frame.layoutSizingVertical = 'FILL';
  } else if (typeof targetH === 'number') {
    frame.layoutSizingVertical = 'FIXED';
    frame.resize(frame.width, targetH);
  }

  // 15. Positioning / Parent Placement
  if (options.x !== undefined) frame.x = options.x;
  if (options.y !== undefined) frame.y = options.y;

  if (options.parent && 'appendChild' in options.parent) {
    options.parent.appendChild(frame);
  } else if (options.targetParentId) {
    const parentNode = figma.getNodeById(options.targetParentId);
    if (parentNode && 'appendChild' in parentNode) {
      (parentNode as any).appendChild(frame);
    } else {
      figma.currentPage.appendChild(frame);
    }
  } else if (!frame.parent) {
    figma.currentPage.appendChild(frame);
  }

  return frame;
}

/**
 * Creates a standard text node with auto font loading.
 */
export async function createText(
  text: string,
  options: {
    name?: string;
    fontFamily?: string;
    fontWeight?: string;
    fontSize?: number;
    color?: string;
    opacity?: number;
    textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
    lineHeight?: number | 'AUTO';
    letterSpacing?: number;
    width?: LayoutSizing;
    height?: LayoutSizing;
    parent?: BaseNode & ChildrenMixin;
  } = {}
): Promise<TextNode> {
  const node = figma.createText();
  if (options.name) node.name = options.name;

  const font = await ensureFontLoaded(options.fontFamily || 'Inter', options.fontWeight || 'Regular');
  node.fontName = font;
  node.characters = text || '';

  if (options.fontSize) node.fontSize = options.fontSize;
  if (options.color) node.fills = createSolidPaint(options.color, options.opacity);
  if (options.textAlign) node.textAlignHorizontal = options.textAlign;
  if (options.lineHeight && options.lineHeight !== 'AUTO') {
    node.lineHeight = { value: options.lineHeight, unit: 'PIXELS' };
  }
  if (options.letterSpacing) {
    node.letterSpacing = { value: options.letterSpacing, unit: 'PIXELS' };
  }

  if (options.parent && 'appendChild' in options.parent) {
    options.parent.appendChild(node);
  }

  return node;
}

/**
 * Creates a rectangle with fills, strokes, and corner radius.
 */
export function createRectangle(options: {
  width: number;
  height: number;
  name?: string;
  fill?: string;
  opacity?: number;
  cornerRadius?: number | [number, number, number, number];
  stroke?: { color: string; weight?: number; align?: 'INSIDE' | 'OUTSIDE' | 'CENTER' };
  parent?: BaseNode & ChildrenMixin;
}): RectangleNode {
  const rect = figma.createRectangle();
  if (options.name) rect.name = options.name;
  rect.resize(options.width, options.height);

  if (options.fill) rect.fills = createSolidPaint(options.fill, options.opacity);
  if (options.cornerRadius !== undefined) {
    if (typeof options.cornerRadius === 'number') {
      rect.cornerRadius = options.cornerRadius;
    } else if (Array.isArray(options.cornerRadius)) {
      const [tl, tr, br, bl] = options.cornerRadius;
      rect.topLeftRadius = tl;
      rect.topRightRadius = tr;
      rect.bottomRightRadius = br;
      rect.bottomLeftRadius = bl;
    }
  }
  if (options.stroke) {
    rect.strokes = createSolidPaint(options.stroke.color);
    if (options.stroke.weight) rect.strokeWeight = options.stroke.weight;
    if (options.stroke.align) rect.strokeAlign = options.stroke.align;
  }

  if (options.parent && 'appendChild' in options.parent) {
    options.parent.appendChild(rect);
  }

  return rect;
}

/**
 * Creates a wrapped proxy around `figma` so that code in EXECUTE_CODE
 * can call `figma.createAutoLayout(...)` without mutating the frozen host `figma` object.
 */
export function createFigmaSandboxProxy(hostFigma: PluginAPI, helpers: any): PluginAPI {
  // Proxy an empty object, not hostFigma: the host object is frozen, so returning a
  // freshly bound function for its non-configurable properties violates Proxy
  // invariants and throws "proxy: inconsistent get" on every create*/async call.
  const bound = new Map<PropertyKey, unknown>();
  return new Proxy({} as PluginAPI, {
    get(_target, prop) {
      if (prop === 'createAutoLayout' || prop === 'createAutoLayoutAsync') {
        return helpers.createAutoLayout;
      }
      const value = Reflect.get(hostFigma, prop);
      if (typeof value !== 'function') return value;
      if (!bound.has(prop)) bound.set(prop, value.bind(hostFigma));
      return bound.get(prop);
    },
    set(_target, prop, value) {
      return Reflect.set(hostFigma, prop, value);
    },
    has(_target, prop) {
      if (prop === 'createAutoLayout' || prop === 'createAutoLayoutAsync') {
        return true;
      }
      return Reflect.has(hostFigma, prop);
    }
  });
}

/**
 * Safe helper (no-op because host figma object is frozen/non-extensible in C++ runtime).
 */
export function installFigmaPolyfills() {
  // Figma's host object is sealed. Polyfills are provided via createFigmaSandboxProxy in EXECUTE_CODE.
}

/**
 * Returns the full bundle of sandbox helper utilities to inject into EXECUTE_CODE.
 */
export function getSandboxHelpers() {
  return {
    createAutoLayout,
    createFrame: createAutoLayout,
    createText,
    createTextNode: createText,
    createRectangle,
    createEllipse: (options: any) => {
      const ellipse = figma.createEllipse();
      if (options.name) ellipse.name = options.name;
      ellipse.resize(options.width || 100, options.height || 100);
      if (options.fill) ellipse.fills = createSolidPaint(options.fill, options.opacity);
      return ellipse;
    },
    createComponent: async (options: any) => {
      const comp = figma.createComponent();
      if (options?.name) comp.name = options.name;
      return comp;
    },
    createInstance: async (componentOrId: any, options: any = {}) => {
      const comp = typeof componentOrId === 'string' ? figma.getNodeById(componentOrId) : componentOrId;
      if (!comp || !('createInstance' in comp)) throw new Error('Target is not a valid Component');
      const inst = (comp as any).createInstance();
      if (options?.name) inst.name = options.name;
      return inst;
    },
    loadFont: ensureFontLoaded,
    solidPaint: createSolidPaint,
    rgb: (hex: string) => {
      const c = parseColor(hex);
      return c ? { r: c.r, g: c.g, b: c.b } : { r: 0, g: 0, b: 0 };
    },
    rgba: (hex: string, a = 1) => {
      const c = parseColor(hex);
      return c ? { r: c.r, g: c.g, b: c.b, a } : { r: 0, g: 0, b: 0, a };
    },
    dropShadow: (options: any) => parseEffects([{ type: 'DROP_SHADOW', ...options }])[0],
    innerShadow: (options: any) => parseEffects([{ type: 'INNER_SHADOW', ...options }])[0],
    blur: (radius: number) => parseEffects([{ type: 'LAYER_BLUR', radius }])[0],
    findNode: (query: string) => figma.currentPage.findOne(n => n.name.toLowerCase().includes(query.toLowerCase())),
    findNodes: (query: string) => figma.currentPage.findAll(n => n.name.toLowerCase().includes(query.toLowerCase()))
  };
}
