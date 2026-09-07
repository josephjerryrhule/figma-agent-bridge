/**
 * Mutator Engine for Figma Agent Bridge.
 * Performs targeted updates, property edits, child appending/replacing, and deletions on existing nodes.
 */

import {
  UpdateNodePayload,
  AppendChildrenPayload,
  ReplaceChildrenPayload,
  DeleteNodesPayload,
  SerializedNodeInfo
} from '../types';
import { createSolidPaint } from './colors';
import { ensureFontLoaded } from './fonts';
import { serializeNode } from './inspector';
import { createNodeFromLayout } from './parser';

/**
 * Updates properties of an existing node by ID or name.
 */
export async function updateNode(payload: UpdateNodePayload): Promise<SerializedNodeInfo> {
  let targetNode: BaseNode | null = null;

  if (payload.id) {
    targetNode = figma.getNodeById(payload.id);
  }

  if (!targetNode && payload.name) {
    targetNode = figma.currentPage.findOne(n => n.name.toLowerCase() === payload.name!.toLowerCase());
  }

  if (!targetNode) {
    throw new Error(`Node not found with ID '${payload.id}' or name '${payload.name}'.`);
  }

  // Name update
  if (payload.name) {
    targetNode.name = payload.name;
  }

  // Text specific updates
  if (targetNode.type === 'TEXT') {
    const textNode = targetNode as TextNode;

    // Font loading if font or style or characters changing
    const currentFont = (textNode.fontName !== figma.mixed
      ? textNode.fontName
      : { family: 'Inter', style: 'Regular' }) as FontName;

    const targetFamily = payload.fontFamily || currentFont.family;
    const targetStyle = payload.fontWeight || currentFont.style;

    if (payload.text !== undefined || payload.fontFamily || payload.fontWeight) {
      const font = await ensureFontLoaded(targetFamily, targetStyle);
      textNode.fontName = font;
    }

    if (payload.text !== undefined) {
      textNode.characters = payload.text;
    }

    if (payload.fontSize !== undefined) {
      textNode.fontSize = payload.fontSize;
    }

    if (payload.color !== undefined) {
      textNode.fills = createSolidPaint(payload.color, payload.opacity);
    }
  }

  // Fills & background updates
  if (payload.background !== undefined && 'fills' in targetNode) {
    (targetNode as any).fills = createSolidPaint(payload.background, payload.opacity);
  } else if (payload.color !== undefined && 'fills' in targetNode && targetNode.type !== 'TEXT') {
    (targetNode as any).fills = createSolidPaint(payload.color, payload.opacity);
  }

  // Opacity
  if (payload.opacity !== undefined && 'opacity' in targetNode) {
    (targetNode as any).opacity = payload.opacity;
  }

  // Corner radius
  if (payload.cornerRadius !== undefined && 'cornerRadius' in targetNode) {
    if (Array.isArray(payload.cornerRadius) && 'topLeftRadius' in targetNode) {
      const [tl, tr, br, bl] = payload.cornerRadius;
      const f = targetNode as FrameNode;
      f.topLeftRadius = tl;
      f.topRightRadius = tr;
      f.bottomRightRadius = br;
      f.bottomLeftRadius = bl;
    } else if (typeof payload.cornerRadius === 'number') {
      (targetNode as any).cornerRadius = payload.cornerRadius;
    }
  }

  // Stroke updates
  if (payload.stroke && 'strokes' in targetNode) {
    (targetNode as any).strokes = createSolidPaint(payload.stroke.color);
    if (payload.stroke.weight !== undefined) {
      (targetNode as any).strokeWeight = payload.stroke.weight;
    }
    if (payload.stroke.align && 'strokeAlign' in targetNode) {
      (targetNode as any).strokeAlign = payload.stroke.align;
    }
  }

  // Auto Layout mutations
  if (targetNode.type === 'FRAME') {
    const frame = targetNode as FrameNode;

    if (payload.gap !== undefined) {
      frame.itemSpacing = payload.gap;
    }

    if (payload.padding !== undefined) {
      if (typeof payload.padding === 'number') {
        frame.paddingTop = payload.padding;
        frame.paddingRight = payload.padding;
        frame.paddingBottom = payload.padding;
        frame.paddingLeft = payload.padding;
      } else {
        if (payload.padding.top !== undefined) frame.paddingTop = payload.padding.top;
        if (payload.padding.right !== undefined) frame.paddingRight = payload.padding.right;
        if (payload.padding.bottom !== undefined) frame.paddingBottom = payload.padding.bottom;
        if (payload.padding.left !== undefined) frame.paddingLeft = payload.padding.left;
      }
    }

    if (payload.alignItems) {
      frame.primaryAxisAlignItems = payload.alignItems;
    }
    if (payload.counterAlignItems) {
      frame.counterAxisAlignItems = payload.counterAlignItems;
    }

    // Sizing
    if (payload.width === 'HUG') {
      frame.layoutSizingHorizontal = 'HUG';
    } else if (payload.width === 'FILL') {
      frame.layoutSizingHorizontal = 'FILL';
    } else if (typeof payload.width === 'number') {
      frame.layoutSizingHorizontal = 'FIXED';
      frame.resize(payload.width, frame.height);
    }

    if (payload.height === 'HUG') {
      frame.layoutSizingVertical = 'HUG';
    } else if (payload.height === 'FILL') {
      frame.layoutSizingVertical = 'FILL';
    } else if (typeof payload.height === 'number') {
      frame.layoutSizingVertical = 'FIXED';
      frame.resize(frame.width, payload.height);
    }
  } else if ('resize' in targetNode) {
    if (typeof payload.width === 'number' && typeof payload.height === 'number') {
      (targetNode as any).resize(payload.width, payload.height);
    } else if (typeof payload.width === 'number') {
      (targetNode as any).resize(payload.width, (targetNode as any).height);
    } else if (typeof payload.height === 'number') {
      (targetNode as any).resize((targetNode as any).width, payload.height);
    }
  }

  // Position
  if (payload.x !== undefined && 'x' in targetNode) {
    (targetNode as any).x = payload.x;
  }
  if (payload.y !== undefined && 'y' in targetNode) {
    (targetNode as any).y = payload.y;
  }

  // Visibility
  if (payload.visible !== undefined && 'visible' in targetNode) {
    (targetNode as any).visible = payload.visible;
  }

  return serializeNode(targetNode);
}

/**
 * Appends new declarative children into an existing parent frame.
 */
export async function appendChildren(payload: AppendChildrenPayload): Promise<SerializedNodeInfo> {
  const parent = figma.getNodeById(payload.parentId);
  if (!parent || !('appendChild' in parent)) {
    throw new Error(`Parent frame not found or cannot contain children (ID: '${payload.parentId}')`);
  }

  for (const childSpec of payload.children) {
    const childNode = await createNodeFromLayout(childSpec);
    (parent as any).appendChild(childNode);
  }

  return serializeNode(parent);
}

/**
 * Replaces all children of an existing parent frame with new declarative children.
 */
export async function replaceChildren(payload: ReplaceChildrenPayload): Promise<SerializedNodeInfo> {
  const parent = figma.getNodeById(payload.parentId);
  if (!parent || !('children' in parent) || !('appendChild' in parent)) {
    throw new Error(`Parent frame not found or cannot contain children (ID: '${payload.parentId}')`);
  }

  // Remove existing children
  const existingChildren = [...(parent as any).children];
  for (const child of existingChildren) {
    child.remove();
  }

  // Add new children
  for (const childSpec of payload.children) {
    const childNode = await createNodeFromLayout(childSpec);
    (parent as any).appendChild(childNode);
  }

  return serializeNode(parent);
}

/**
 * Deletes nodes by ID.
 */
export async function deleteNodes(payload: DeleteNodesPayload): Promise<{ deletedCount: number; deletedIds: string[] }> {
  const deletedIds: string[] = [];

  for (const id of payload.ids) {
    const node = figma.getNodeById(id);
    if (node) {
      node.remove();
      deletedIds.push(id);
    }
  }

  return {
    deletedCount: deletedIds.length,
    deletedIds
  };
}
