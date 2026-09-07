/**
 * Mutator Engine for Figma Agent Bridge.
 * Performs targeted updates, property edits, child appending/replacing, and deletions on existing nodes.
 */

import {
  UpdateNodePayload,
  AppendChildrenPayload,
  ReplaceChildrenPayload,
  DeleteNodesPayload,
  DuplicateNodePayload,
  InsertMediaPayload,
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
  if (payload.imageBase64 && 'fills' in targetNode) {
    try {
      const bytes = figma.base64Decode(payload.imageBase64);
      const image = figma.createImage(bytes);
      (targetNode as any).fills = [{
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: payload.imageScaleMode || 'FILL'
      }];
    } catch (e: any) {
      console.warn('Failed to update node with image fill:', e);
    }
  } else if (payload.background !== undefined && 'fills' in targetNode) {
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

/**
 * Duplicates / clones an existing node.
 */
export async function duplicateNode(payload: DuplicateNodePayload): Promise<SerializedNodeInfo> {
  const node = figma.getNodeById(payload.nodeId);
  if (!node) {
    throw new Error(`Node not found with ID '${payload.nodeId}'`);
  }

  if (!('clone' in node)) {
    throw new Error(`Node '${node.name}' (${node.type}) cannot be cloned.`);
  }

  const clone = (node as SceneNode).clone();

  if (payload.name) {
    clone.name = payload.name;
  }
  if (payload.x !== undefined) {
    clone.x = payload.x;
  }
  if (payload.y !== undefined) {
    clone.y = payload.y;
  }

  if (node.parent && 'children' in node.parent && payload.insertAfter !== false) {
    const parent = node.parent;
    const originalIndex = parent.children.indexOf(node as SceneNode);
    if (originalIndex !== -1 && originalIndex + 1 < parent.children.length) {
      parent.insertChild(originalIndex + 1, clone);
    }
  }

  return serializeNode(clone);
}

/**
 * Inserts media (IMAGE, SVG, VIDEO, or GIF) as a new node or replaces fills of an existing node.
 */
export async function insertMedia(payload: InsertMediaPayload): Promise<SerializedNodeInfo> {
  // If targetNodeId is specified, update that existing node's fills directly
  if (payload.targetNodeId) {
    const targetNode = figma.getNodeById(payload.targetNodeId);
    if (!targetNode) {
      throw new Error(`Target node not found with ID '${payload.targetNodeId}'`);
    }

    if (payload.mediaType === 'VIDEO') {
      if (!payload.base64) throw new Error('Video requires base64 data');
      const bytes = figma.base64Decode(payload.base64);
      const video = await figma.createVideoAsync(bytes);
      (targetNode as any).fills = [{
        type: 'VIDEO',
        videoHash: video.hash,
        scaleMode: payload.scaleMode || 'FILL'
      }];
    } else {
      // IMAGE or GIF
      if (!payload.base64) throw new Error('Image/GIF requires base64 data');
      const bytes = figma.base64Decode(payload.base64);
      const image = figma.createImage(bytes);
      (targetNode as any).fills = [{
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: payload.scaleMode || 'FILL'
      }];
    }
    return serializeNode(targetNode as SceneNode);
  }

  let createdNode: SceneNode;

  if (payload.mediaType === 'SVG') {
    const svgStr = payload.svgString || '<svg viewBox="0 0 24 24"></svg>';
    createdNode = figma.createNodeFromSvg(svgStr);
    if (payload.width && payload.height) {
      createdNode.resize(payload.width, payload.height);
    }
  } else if (payload.mediaType === 'VIDEO') {
    const rect = figma.createRectangle();
    const width = payload.width || 400;
    const height = payload.height || 225;
    rect.resize(width, height);

    if (payload.base64) {
      try {
        const bytes = figma.base64Decode(payload.base64);
        const video = await figma.createVideoAsync(bytes);
        rect.fills = [{
          type: 'VIDEO',
          videoHash: video.hash,
          scaleMode: payload.scaleMode || 'FILL'
        }];
      } catch (e: any) {
        console.warn('Figma video creation failed, using placeholder:', e);
        rect.fills = createSolidPaint('#0F172A');
      }
    } else {
      rect.fills = createSolidPaint('#0F172A');
    }
    createdNode = rect;
  } else {
    // IMAGE or GIF
    const rect = figma.createRectangle();
    const width = payload.width || 300;
    const height = payload.height || 200;
    rect.resize(width, height);

    if (payload.base64) {
      try {
        const bytes = figma.base64Decode(payload.base64);
        const image = figma.createImage(bytes);
        rect.fills = [{
          type: 'IMAGE',
          imageHash: image.hash,
          scaleMode: payload.scaleMode || 'FILL'
        }];
      } catch (e: any) {
        console.warn('Figma image creation failed:', e);
        rect.fills = createSolidPaint('#CBD5E1');
      }
    } else {
      rect.fills = createSolidPaint('#CBD5E1');
    }
    createdNode = rect;
  }

  if (payload.name) {
    createdNode.name = payload.name;
  }

  if (payload.cornerRadius && 'cornerRadius' in createdNode) {
    if (typeof payload.cornerRadius === 'number') {
      (createdNode as any).cornerRadius = payload.cornerRadius;
    } else if (Array.isArray(payload.cornerRadius) && 'topLeftRadius' in createdNode) {
      const [tl, tr, br, bl] = payload.cornerRadius;
      const r = createdNode as RectangleNode;
      r.topLeftRadius = tl;
      r.topRightRadius = tr;
      r.bottomRightRadius = br;
      r.bottomLeftRadius = bl;
    }
  }

  // Insert into parent or current selection or page
  let targetParent: (BaseNode & ChildrenMixin) | null = null;
  if (payload.targetParentId) {
    const found = figma.getNodeById(payload.targetParentId);
    if (found && 'appendChild' in found) {
      targetParent = found as any;
    }
  }

  if (!targetParent && figma.currentPage.selection.length === 1) {
    const sel = figma.currentPage.selection[0];
    if ('appendChild' in sel && sel.type === 'FRAME') {
      targetParent = sel as any;
    }
  }

  if (targetParent) {
    targetParent.appendChild(createdNode);
  } else {
    figma.currentPage.appendChild(createdNode);
  }

  // Position
  if (payload.x !== undefined && payload.y !== undefined) {
    createdNode.x = payload.x;
    createdNode.y = payload.y;
  } else if (!targetParent || targetParent.type !== 'FRAME' || (targetParent as FrameNode).layoutMode === 'NONE') {
    // Center in current viewport
    const center = figma.viewport.center;
    createdNode.x = Math.round(center.x - createdNode.width / 2);
    createdNode.y = Math.round(center.y - createdNode.height / 2);
  }

  if (payload.selectAfterCreate !== false) {
    figma.currentPage.selection = [createdNode];
  }

  return serializeNode(createdNode);
}
