/**
 * Declarative Layout Parser & Builder for Figma Agent Bridge.
 * Translates modern flexbox-style JSON layout trees into native Figma Auto Layout node structures.
 * Supports Auto Layout v4 (wrap, cross-axis spacing), responsive sizing (FILL/HUG),
 * absolute positioning in Auto Layout, min/max constraints, and elevation effects.
 */

import {
  LayoutNode,
  FrameLayoutNode,
  TextLayoutNode,
  ShapeLayoutNode,
  ImageLayoutNode,
  SvgLayoutNode,
  VideoLayoutNode,
  RenderLayoutPayload,
  SerializedNodeInfo
} from '../types';
import { createSolidPaint } from './colors';
import { ensureFontLoaded } from './fonts';
import { serializeNode } from './inspector';
import { parseEffects } from './effects';

/**
 * Recursively creates a native Figma node tree from a declarative LayoutNode spec.
 */
export async function createNodeFromLayout(spec: LayoutNode): Promise<SceneNode> {
  let node: SceneNode;
  switch (spec.type) {
    case 'TEXT':
      node = await createTextNode(spec);
      break;
    case 'RECTANGLE':
      node = createRectangleNode(spec);
      break;
    case 'ELLIPSE':
      node = createEllipseNode(spec);
      break;
    case 'IMAGE':
      node = await createImageNode(spec);
      break;
    case 'SVG':
      node = await createSvgNode(spec);
      break;
    case 'VIDEO':
      node = await createVideoNode(spec);
      break;
    case 'FRAME':
    default:
      node = await createFrameNode(spec);
      break;
  }

  if ((spec as any).x !== undefined && 'x' in node) {
    node.x = (spec as any).x;
  }
  if ((spec as any).y !== undefined && 'y' in node) {
    node.y = (spec as any).y;
  }

  if (spec.layoutPositioning === 'ABSOLUTE' && 'layoutPositioning' in node) {
    (node as any).layoutPositioning = 'ABSOLUTE';
  }

  if (spec.layoutGrow !== undefined && 'layoutGrow' in node) {
    (node as any).layoutGrow = spec.layoutGrow;
  }

  if (spec.layoutAlign !== undefined && 'layoutAlign' in node) {
    (node as any).layoutAlign = spec.layoutAlign;
  }

  if (spec.minWidth !== undefined && 'minWidth' in node) (node as any).minWidth = spec.minWidth;
  if (spec.maxWidth !== undefined && 'maxWidth' in node) (node as any).maxWidth = spec.maxWidth;
  if (spec.minHeight !== undefined && 'minHeight' in node) (node as any).minHeight = spec.minHeight;
  if (spec.maxHeight !== undefined && 'maxHeight' in node) (node as any).maxHeight = spec.maxHeight;

  return node;
}

async function createTextNode(spec: TextLayoutNode): Promise<TextNode> {
  const textNode = figma.createText();
  if (spec.name) textNode.name = spec.name;

  const fontName = await ensureFontLoaded(spec.fontFamily || 'Inter', spec.fontWeight || 'Regular');
  textNode.fontName = fontName;

  textNode.characters = spec.text || '';

  if (spec.fontSize) {
    textNode.fontSize = spec.fontSize;
  }

  if (spec.color) {
    textNode.fills = createSolidPaint(spec.color, spec.opacity);
  }

  if (spec.textAlign) {
    textNode.textAlignHorizontal = spec.textAlign;
  }

  if (spec.letterSpacing) {
    textNode.letterSpacing = { value: spec.letterSpacing, unit: 'PIXELS' };
  }

  if (spec.lineHeight && spec.lineHeight !== 'AUTO') {
    textNode.lineHeight = { value: spec.lineHeight, unit: 'PIXELS' };
  }

  if (spec.effects && spec.effects.length > 0) {
    textNode.effects = parseEffects(spec.effects);
  }

  if (spec.visible !== undefined) {
    textNode.visible = spec.visible;
  }

  return textNode;
}

function createRectangleNode(spec: ShapeLayoutNode): RectangleNode {
  const rect = figma.createRectangle();
  if (spec.name) rect.name = spec.name;
  rect.resize(spec.width, spec.height);

  if (spec.fill) {
    rect.fills = createSolidPaint(spec.fill, spec.opacity);
  }

  if (spec.cornerRadius) {
    if (typeof spec.cornerRadius === 'number') {
      rect.cornerRadius = spec.cornerRadius;
    } else if (Array.isArray(spec.cornerRadius)) {
      rect.topLeftRadius = spec.cornerRadius[0] ?? 0;
      rect.topRightRadius = spec.cornerRadius[1] ?? 0;
      rect.bottomRightRadius = spec.cornerRadius[2] ?? 0;
      rect.bottomLeftRadius = spec.cornerRadius[3] ?? 0;
    }
  }

  if (spec.stroke) {
    rect.strokes = createSolidPaint(spec.stroke.color);
    if (spec.stroke.weight) rect.strokeWeight = spec.stroke.weight;
  }

  if (spec.effects && spec.effects.length > 0) {
    rect.effects = parseEffects(spec.effects);
  }

  if (spec.visible !== undefined) {
    rect.visible = spec.visible;
  }

  return rect;
}

function createEllipseNode(spec: ShapeLayoutNode): EllipseNode {
  const ellipse = figma.createEllipse();
  if (spec.name) ellipse.name = spec.name;
  ellipse.resize(spec.width, spec.height);

  if (spec.fill) {
    ellipse.fills = createSolidPaint(spec.fill, spec.opacity);
  }

  if (spec.stroke) {
    ellipse.strokes = createSolidPaint(spec.stroke.color);
    if (spec.stroke.weight) ellipse.strokeWeight = spec.stroke.weight;
  }

  if (spec.effects && spec.effects.length > 0) {
    ellipse.effects = parseEffects(spec.effects);
  }

  if (spec.visible !== undefined) {
    ellipse.visible = spec.visible;
  }

  return ellipse;
}

async function createImageNode(spec: ImageLayoutNode): Promise<RectangleNode> {
  const rect = figma.createRectangle();
  if (spec.name) rect.name = spec.name;
  const width = typeof spec.width === 'number' ? spec.width : 200;
  const height = typeof spec.height === 'number' ? spec.height : 200;
  rect.resize(width, height);

  if (spec.base64) {
    try {
      const bytes = figma.base64Decode(spec.base64);
      const image = figma.createImage(bytes);
      rect.fills = [{
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: spec.scaleMode || 'FILL'
      }];
    } catch (e: any) {
      console.warn('Failed to decode/create image fill:', e);
      rect.fills = createSolidPaint('#E2E8F0');
    }
  } else {
    rect.fills = createSolidPaint('#E2E8F0');
  }

  if (spec.cornerRadius) {
    if (typeof spec.cornerRadius === 'number') {
      rect.cornerRadius = spec.cornerRadius;
    } else if (Array.isArray(spec.cornerRadius)) {
      rect.topLeftRadius = spec.cornerRadius[0] ?? 0;
      rect.topRightRadius = spec.cornerRadius[1] ?? 0;
      rect.bottomRightRadius = spec.cornerRadius[2] ?? 0;
      rect.bottomLeftRadius = spec.cornerRadius[3] ?? 0;
    }
  }

  if (spec.stroke) {
    rect.strokes = createSolidPaint(spec.stroke.color);
    if (spec.stroke.weight) rect.strokeWeight = spec.stroke.weight;
  }

  if (spec.effects && spec.effects.length > 0) {
    rect.effects = parseEffects(spec.effects);
  }

  if (spec.opacity !== undefined) {
    rect.opacity = spec.opacity;
  }

  if (spec.visible !== undefined) {
    rect.visible = spec.visible;
  }

  if (spec.x !== undefined && spec.y !== undefined) {
    rect.x = spec.x;
    rect.y = spec.y;
  }

  return rect;
}

async function createSvgNode(spec: SvgLayoutNode): Promise<SceneNode> {
  const svg = spec.svg || '<svg viewBox="0 0 24 24"></svg>';
  const node = figma.createNodeFromSvg(svg);
  if (spec.name) node.name = spec.name;

  if (spec.width && spec.height) {
    node.resize(spec.width, spec.height);
  }

  if (spec.opacity !== undefined) {
    node.opacity = spec.opacity;
  }

  if (spec.visible !== undefined) {
    node.visible = spec.visible;
  }

  if (spec.x !== undefined && spec.y !== undefined) {
    node.x = spec.x;
    node.y = spec.y;
  }

  return node;
}

async function createVideoNode(spec: VideoLayoutNode): Promise<RectangleNode> {
  const rect = figma.createRectangle();
  if (spec.name) rect.name = spec.name;
  const width = typeof spec.width === 'number' ? spec.width : 400;
  const height = typeof spec.height === 'number' ? spec.height : 225;
  rect.resize(width, height);

  if (spec.base64) {
    try {
      const bytes = figma.base64Decode(spec.base64);
      const video = await figma.createVideoAsync(bytes);
      rect.fills = [{
        type: 'VIDEO',
        videoHash: video.hash,
        scaleMode: spec.scaleMode || 'FILL'
      }];
    } catch (e: any) {
      console.warn('Figma video creation failed, using placeholder:', e);
      rect.fills = createSolidPaint('#0F172A');
    }
  } else {
    rect.fills = createSolidPaint('#0F172A');
  }

  if (spec.cornerRadius) {
    if (typeof spec.cornerRadius === 'number') {
      rect.cornerRadius = spec.cornerRadius;
    } else if (Array.isArray(spec.cornerRadius)) {
      rect.topLeftRadius = spec.cornerRadius[0] ?? 0;
      rect.topRightRadius = spec.cornerRadius[1] ?? 0;
      rect.bottomRightRadius = spec.cornerRadius[2] ?? 0;
      rect.bottomLeftRadius = spec.cornerRadius[3] ?? 0;
    }
  }

  if (spec.opacity !== undefined) {
    rect.opacity = spec.opacity;
  }

  if (spec.visible !== undefined) {
    rect.visible = spec.visible;
  }

  return rect;
}

async function createFrameNode(spec: FrameLayoutNode): Promise<FrameNode> {
  const frame = figma.createFrame();
  if (spec.name) frame.name = spec.name;

  // Background fills
  const bg = spec.fill || spec.background;
  if (bg) {
    frame.fills = createSolidPaint(bg, spec.opacity);
  } else {
    frame.fills = [];
  }

  // Strokes / borders
  if (spec.stroke) {
    frame.strokes = createSolidPaint(spec.stroke.color);
    if (spec.stroke.weight) frame.strokeWeight = spec.stroke.weight;
    if (spec.stroke.align) frame.strokeAlign = spec.stroke.align;
  }

  // Corner radius
  if (spec.cornerRadius !== undefined) {
    if (Array.isArray(spec.cornerRadius)) {
      const [tl, tr, br, bl] = spec.cornerRadius;
      frame.topLeftRadius = tl;
      frame.topRightRadius = tr;
      frame.bottomRightRadius = br;
      frame.bottomLeftRadius = bl;
    } else {
      frame.cornerRadius = spec.cornerRadius;
    }
  }

  if (spec.clipsContent !== undefined) {
    frame.clipsContent = spec.clipsContent;
  }

  // Auto Layout configuration
  const layoutMode = spec.layoutMode || spec.layout;
  if (layoutMode && layoutMode !== 'NONE') {
    frame.layoutMode = layoutMode;

    // Wrap
    if (spec.layoutWrap && 'layoutWrap' in frame) {
      frame.layoutWrap = spec.layoutWrap;
    }

    // Spacing
    const gap = spec.gap !== undefined ? spec.gap : spec.itemSpacing;
    if (gap !== undefined) {
      frame.itemSpacing = gap;
    }
    if (spec.counterAxisSpacing !== undefined && 'counterAxisSpacing' in frame) {
      frame.counterAxisSpacing = spec.counterAxisSpacing;
    }

    // Padding
    if (spec.padding !== undefined) {
      if (typeof spec.padding === 'number') {
        frame.paddingTop = spec.padding;
        frame.paddingRight = spec.padding;
        frame.paddingBottom = spec.padding;
        frame.paddingLeft = spec.padding;
      } else if (Array.isArray(spec.padding)) {
        if (spec.padding.length === 2) {
          const [v, h] = spec.padding;
          frame.paddingTop = v;
          frame.paddingBottom = v;
          frame.paddingRight = h;
          frame.paddingLeft = h;
        } else if (spec.padding.length === 4) {
          const [t, r, b, l] = spec.padding;
          frame.paddingTop = t;
          frame.paddingRight = r;
          frame.paddingBottom = b;
          frame.paddingLeft = l;
        }
      } else {
        if (spec.padding.top !== undefined) frame.paddingTop = spec.padding.top;
        if (spec.padding.right !== undefined) frame.paddingRight = spec.padding.right;
        if (spec.padding.bottom !== undefined) frame.paddingBottom = spec.padding.bottom;
        if (spec.padding.left !== undefined) frame.paddingLeft = spec.padding.left;
      }
    }

    if (spec.paddingTop !== undefined) frame.paddingTop = spec.paddingTop;
    if (spec.paddingRight !== undefined) frame.paddingRight = spec.paddingRight;
    if (spec.paddingBottom !== undefined) frame.paddingBottom = spec.paddingBottom;
    if (spec.paddingLeft !== undefined) frame.paddingLeft = spec.paddingLeft;
    if (spec.paddingHorizontal !== undefined) {
      frame.paddingLeft = spec.paddingHorizontal;
      frame.paddingRight = spec.paddingHorizontal;
    }
    if (spec.paddingVertical !== undefined) {
      frame.paddingTop = spec.paddingVertical;
      frame.paddingBottom = spec.paddingVertical;
    }

    // Alignment
    const primaryAlign = spec.primaryAxisAlignItems || spec.alignItems;
    if (primaryAlign) {
      frame.primaryAxisAlignItems = primaryAlign;
    }
    const counterAlign = spec.counterAxisAlignItems || spec.counterAlignItems;
    if (counterAlign) {
      frame.counterAxisAlignItems = counterAlign;
    }
    if (spec.counterAxisAlignContent && 'counterAxisAlignContent' in frame) {
      frame.counterAxisAlignContent = spec.counterAxisAlignContent;
    }

    if (spec.strokesIncludedInLayout !== undefined && 'strokesIncludedInLayout' in frame) {
      frame.strokesIncludedInLayout = spec.strokesIncludedInLayout;
    }
    if (spec.itemReverseZIndex !== undefined && 'itemReverseZIndex' in frame) {
      frame.itemReverseZIndex = spec.itemReverseZIndex;
    }
  }

  // Min / Max Dimensions
  if (spec.minWidth !== undefined && 'minWidth' in frame) frame.minWidth = spec.minWidth;
  if (spec.maxWidth !== undefined && 'maxWidth' in frame) frame.maxWidth = spec.maxWidth;
  if (spec.minHeight !== undefined && 'minHeight' in frame) frame.minHeight = spec.minHeight;
  if (spec.maxHeight !== undefined && 'maxHeight' in frame) frame.maxHeight = spec.maxHeight;

  // Elevation Effects (Shadows & Blurs)
  if (spec.effects && spec.effects.length > 0) {
    frame.effects = parseEffects(spec.effects);
  }

  // Initial sizing before appending children
  const initialW = typeof spec.width === 'number' ? spec.width : 100;
  const initialH = typeof spec.height === 'number' ? spec.height : 100;
  frame.resize(initialW, initialH);

  // Recursively process children
  if (spec.children && spec.children.length > 0) {
    for (const childSpec of spec.children) {
      const childNode = await createNodeFromLayout(childSpec);
      frame.appendChild(childNode);

      // Child sizing relative to Auto Layout parent
      if (layoutMode && layoutMode !== 'NONE') {
        if (childSpec.layoutPositioning === 'ABSOLUTE' && 'layoutPositioning' in childNode) {
          (childNode as any).layoutPositioning = 'ABSOLUTE';
          if (childSpec.x !== undefined) childNode.x = childSpec.x;
          if (childSpec.y !== undefined) childNode.y = childSpec.y;
        }

        if ('layoutSizingHorizontal' in childNode) {
          const childWidth = (childSpec as any).width;
          if (childWidth === 'FILL') {
            (childNode as any).layoutSizingHorizontal = 'FILL';
          } else if (childWidth === 'HUG') {
            (childNode as any).layoutSizingHorizontal = 'HUG';
          } else if (typeof childWidth === 'number') {
            (childNode as any).layoutSizingHorizontal = 'FIXED';
          }
        }

        if ('layoutSizingVertical' in childNode) {
          const childHeight = (childSpec as any).height;
          if (childHeight === 'FILL') {
            (childNode as any).layoutSizingVertical = 'FILL';
          } else if (childHeight === 'HUG') {
            (childNode as any).layoutSizingVertical = 'HUG';
          } else if (typeof childHeight === 'number') {
            (childNode as any).layoutSizingVertical = 'FIXED';
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

  // Set parent layout sizing
  if (layoutMode && layoutMode !== 'NONE') {
    if (spec.width === 'HUG') {
      frame.layoutSizingHorizontal = 'HUG';
    } else if (spec.width === 'FILL') {
      frame.layoutSizingHorizontal = 'FILL';
    } else if (typeof spec.width === 'number') {
      frame.layoutSizingHorizontal = 'FIXED';
      frame.resize(spec.width, frame.height);
    }

    if (spec.height === 'HUG') {
      frame.layoutSizingVertical = 'HUG';
    } else if (spec.height === 'FILL') {
      frame.layoutSizingVertical = 'FILL';
    } else if (typeof spec.height === 'number') {
      frame.layoutSizingVertical = 'FIXED';
      frame.resize(frame.width, spec.height);
    }
  }

  if (spec.visible !== undefined) {
    frame.visible = spec.visible;
  }

  return frame;
}

/**
 * Main entry point: Renders declarative layout into active document.
 */
export async function renderLayout(payload: RenderLayoutPayload): Promise<SerializedNodeInfo> {
  const rootNode = await createNodeFromLayout(payload.root);

  // Position the node
  if (payload.insertPosition) {
    rootNode.x = payload.insertPosition.x;
    rootNode.y = payload.insertPosition.y;
  } else if (!payload.targetParentId) {
    // Center in current viewport
    const center = figma.viewport.center;
    rootNode.x = Math.round(center.x - rootNode.width / 2);
    rootNode.y = Math.round(center.y - rootNode.height / 2);
  }

  // Append to target parent or current page
  if (payload.targetParentId) {
    const parent = figma.getNodeById(payload.targetParentId);
    if (parent && 'appendChild' in parent) {
      (parent as any).appendChild(rootNode);
    } else {
      figma.currentPage.appendChild(rootNode);
    }
  } else {
    figma.currentPage.appendChild(rootNode);
  }

  // Select and scroll into view if requested
  if (payload.selectAfterCreate !== false) {
    figma.currentPage.selection = [rootNode];
    figma.viewport.scrollAndZoomIntoView([rootNode]);
  }

  return serializeNode(rootNode);
}
