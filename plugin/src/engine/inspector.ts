/**
 * Inspector & Reader Engine for Figma Agent Bridge.
 * Serializes nodes, canvas selection, pages, and design tokens into clean JSON for LLMs.
 */

import { figmaRgbToHex } from './colors';
import { SerializedNodeInfo, DocumentInfoResult, FindNodesPayload } from '../types';

/**
 * Serializes a Figma node into a clean, structured object without circular references.
 */
export function serializeNode(node: BaseNode, currentDepth = 0, maxDepth = 4): SerializedNodeInfo {
  const result: SerializedNodeInfo = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: 'visible' in node ? (node.visible as boolean) : true,
    x: 'x' in node ? Math.round((node.x as number) * 100) / 100 : 0,
    y: 'y' in node ? Math.round((node.y as number) * 100) / 100 : 0,
    width: 'width' in node ? Math.round((node.width as number) * 100) / 100 : 0,
    height: 'height' in node ? Math.round((node.height as number) * 100) / 100 : 0
  };

  // Text specific properties
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    result.characters = textNode.characters;
    if (typeof textNode.fontSize === 'number') {
      result.fontSize = textNode.fontSize;
    }
    if (typeof textNode.fontName === 'object' && (textNode.fontName as any) !== figma.mixed) {
      result.fontName = textNode.fontName as { family: string; style: string };
    }
  }

  // Fills serialization
  if ('fills' in node && Array.isArray(node.fills)) {
    result.fills = (node.fills as readonly Paint[])
      .filter(p => p.type === 'SOLID' && p.visible !== false)
      .map(p => {
        const solid = p as SolidPaint;
        return {
          type: 'SOLID',
          color: figmaRgbToHex(solid.color),
          opacity: solid.opacity !== undefined ? Math.round(solid.opacity * 100) / 100 : 1
        };
      });
  }

  // Strokes serialization
  if ('strokes' in node && Array.isArray(node.strokes)) {
    result.strokes = (node.strokes as readonly Paint[])
      .filter(p => p.type === 'SOLID' && p.visible !== false)
      .map(p => {
        const solid = p as SolidPaint;
        return {
          type: 'SOLID',
          color: figmaRgbToHex(solid.color),
          opacity: solid.opacity !== undefined ? Math.round(solid.opacity * 100) / 100 : 1
        };
      });
  }

  // Corner radius
  if ('cornerRadius' in node && typeof node.cornerRadius === 'number') {
    result.cornerRadius = node.cornerRadius;
  }

  // Auto Layout & Children
  if ('layoutMode' in node) {
    const frame = node as FrameNode;
    result.layoutMode = frame.layoutMode;
    result.itemSpacing = frame.itemSpacing;
    result.paddingTop = frame.paddingTop;
    result.paddingRight = frame.paddingRight;
    result.paddingBottom = frame.paddingBottom;
    result.paddingLeft = frame.paddingLeft;
    result.primaryAxisAlignItems = frame.primaryAxisAlignItems;
    result.counterAxisAlignItems = frame.counterAxisAlignItems;
    result.layoutSizingHorizontal = frame.layoutSizingHorizontal;
    result.layoutSizingVertical = frame.layoutSizingVertical;
  }

  // Recursive children serialization
  if ('children' in node && Array.isArray(node.children)) {
    result.childCount = node.children.length;
    if (currentDepth < maxDepth) {
      result.children = node.children.map(child => serializeNode(child, currentDepth + 1, maxDepth));
    }
  }

  return result;
}

/**
 * Inspects a specific node by its ID or by exact/partial name match.
 */
export function inspectNode(idOrName?: string, depth = 3): SerializedNodeInfo | null {
  if (!idOrName) {
    const selection = figma.currentPage.selection;
    if (selection.length > 0) {
      return serializeNode(selection[0], 0, depth);
    }
    return null;
  }

  // 1. Find by ID
  const nodeById = figma.getNodeById(idOrName);
  if (nodeById) {
    return serializeNode(nodeById, 0, depth);
  }

  // 2. Find by Name in current page
  const nodeByName = figma.currentPage.findOne(n => n.name.toLowerCase() === idOrName.toLowerCase());
  if (nodeByName) {
    return serializeNode(nodeByName, 0, depth);
  }

  return null;
}

/**
 * Returns serialized information for all currently selected nodes.
 */
export function getSelection(depth = 3): SerializedNodeInfo[] {
  return figma.currentPage.selection.map(node => serializeNode(node, 0, depth));
}

/**
 * Finds nodes in current page matching search criteria.
 */
export function findNodes(payload: FindNodesPayload): SerializedNodeInfo[] {
  const limit = payload.limit || 20;
  const matches: BaseNode[] = [];

  figma.currentPage.findAll(node => {
    if (matches.length >= limit) return false;

    let matched = true;

    if (payload.type && node.type !== payload.type.toUpperCase()) {
      matched = false;
    }

    if (payload.name && !node.name.toLowerCase().includes(payload.name.toLowerCase())) {
      matched = false;
    }

    if (payload.textContains && node.type === 'TEXT') {
      const textNode = node as TextNode;
      if (!textNode.characters.toLowerCase().includes(payload.textContains.toLowerCase())) {
        matched = false;
      }
    } else if (payload.textContains && node.type !== 'TEXT') {
      matched = false;
    }

    if (payload.query) {
      const q = payload.query.toLowerCase();
      const inName = node.name.toLowerCase().includes(q);
      const inText = node.type === 'TEXT' && (node as TextNode).characters.toLowerCase().includes(q);
      if (!inName && !inText) matched = false;
    }

    if (matched) {
      matches.push(node);
    }

    return false;
  });

  return matches.map(node => serializeNode(node, 0, 1));
}

/**
 * Extracts document metadata, pages, local styles, and top-level frames.
 */
export function getDocumentInfo(): DocumentInfoResult {
  const localColorStyles = figma.getLocalPaintStyles().map(style => {
    const solid = style.paints.find(p => p.type === 'SOLID' && p.visible !== false) as SolidPaint | undefined;
    return {
      id: style.id,
      name: style.name,
      colorHex: solid ? figmaRgbToHex(solid.color) : 'none'
    };
  });

  const localTextStyles = figma.getLocalTextStyles().map(style => ({
    id: style.id,
    name: style.name,
    fontSize: style.fontSize,
    fontName: style.fontName
  }));

  const topLevelFrames = figma.currentPage.children
    .filter(child => child.type === 'FRAME')
    .map(frame => ({
      id: frame.id,
      name: frame.name,
      width: Math.round(frame.width),
      height: Math.round(frame.height)
    }));

  return {
    fileName: figma.root.name,
    currentPageName: figma.currentPage.name,
    pages: figma.root.children.map(p => ({ id: p.id, name: p.name })),
    localColorStyles,
    localTextStyles,
    topLevelFrames
  };
}
