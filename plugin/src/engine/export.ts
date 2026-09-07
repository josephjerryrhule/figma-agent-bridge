/**
 * Visual Export Engine.
 * Exports any node, selection, or current frame as PNG or SVG for multimodal AI vision inspection.
 */

import {
  CaptureScreenshotPayload,
  CaptureScreenshotResult,
  ExportNodesPayload,
  ExportNodesResult,
  ExportedItem
} from '../types';

/**
 * Fast Uint8Array to base64 converter compatible with Figma's sandboxed JS environment.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;

  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    // @ts-ignore
    binary += String.fromCharCode.apply(null, chunk as any);
  }

  // Use global btoa
  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  // Pure JS fallback if btoa is unavailable in sandbox
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (b2 >> 4);
    const enc3 = ((b2 & 15) << 2) | (b3 >> 6);
    const enc4 = b3 & 63;

    if (i + 1 >= len) {
      base64 += chars[enc1] + chars[enc2] + '==';
    } else if (i + 2 >= len) {
      base64 += chars[enc1] + chars[enc2] + chars[enc3] + '=';
    } else {
      base64 += chars[enc1] + chars[enc2] + chars[enc3] + chars[enc4];
    }
  }
  return base64;
}

/**
 * Captures screenshot of a target node, selection, or the active page.
 */
export async function captureScreenshot(payload: CaptureScreenshotPayload): Promise<CaptureScreenshotResult> {
  const format = payload.format || 'PNG';
  const scale = payload.scale || (format === 'PDF' || format === 'SVG' ? 1 : 2);

  let targetNode: SceneNode | null = null;

  // 1. If explicit nodeId provided
  if (payload.nodeId) {
    const found = figma.getNodeById(payload.nodeId);
    if (found && 'exportAsync' in found) {
      targetNode = found as SceneNode;
    }
  }

  // 2. Fallback to current selection
  if (!targetNode && figma.currentPage.selection.length > 0) {
    targetNode = figma.currentPage.selection[0];
  }

  // 3. Fallback to first frame on current page
  if (!targetNode) {
    const firstFrame = figma.currentPage.children.find(child => child.type === 'FRAME');
    if (firstFrame) {
      targetNode = firstFrame;
    }
  }

  if (!targetNode || !('exportAsync' in targetNode)) {
    throw new Error('No exportable node found on canvas or selection. Please create or select a frame first.');
  }

  // Export from Figma API
  const exportSetting: ExportSettings =
    format === 'PDF'
      ? { format: 'PDF' }
      : format === 'SVG'
      ? { format: 'SVG' }
      : format === 'JPG'
      ? { format: 'JPG', constraint: { type: 'SCALE', value: scale } }
      : { format: 'PNG', constraint: { type: 'SCALE', value: scale } };

  const bytes = await targetNode.exportAsync(exportSetting);
  const base64 = uint8ArrayToBase64(bytes);
  const mimeType =
    format === 'PDF'
      ? 'application/pdf'
      : format === 'SVG'
      ? 'image/svg+xml'
      : format === 'JPG'
      ? 'image/jpeg'
      : 'image/png';
  const dataUrl = `data:${mimeType};base64,${base64}`;

  return {
    nodeId: targetNode.id,
    nodeName: targetNode.name,
    format,
    scale,
    mimeType,
    base64,
    dataUrl,
    width: Math.round(targetNode.width * scale),
    height: Math.round(targetNode.height * scale)
  };
}

/**
 * High-performance multi-node and multi-frame exporter (PDF, PNG, JPG, SVG).
 */
export async function exportNodes(payload: ExportNodesPayload): Promise<ExportNodesResult> {
  const format = payload.format || 'PDF';
  const scale = payload.scale || (format === 'PDF' || format === 'SVG' ? 1 : 2);

  let targets: SceneNode[] = [];

  // 1. All top-level frames on active page
  if (payload.exportAllFrames) {
    targets = figma.currentPage.children.filter(c => c.type === 'FRAME') as SceneNode[];
  }
  // 2. Explicit array of nodeIds
  else if (payload.nodeIds && payload.nodeIds.length > 0) {
    for (const id of payload.nodeIds) {
      const node = figma.getNodeById(id);
      if (node && 'exportAsync' in node) {
        targets.push(node as SceneNode);
      }
    }
  }
  // 3. Single explicit nodeId
  else if (payload.nodeId) {
    const node = figma.getNodeById(payload.nodeId);
    if (node && 'exportAsync' in node) {
      targets.push(node as SceneNode);
    }
  }
  // 4. Current selection
  else if (figma.currentPage.selection.length > 0) {
    targets = figma.currentPage.selection.filter(n => 'exportAsync' in n) as SceneNode[];
  }
  // 5. Fallback: First frame on current page
  else {
    const firstFrame = figma.currentPage.children.find(c => c.type === 'FRAME');
    if (firstFrame) {
      targets.push(firstFrame as SceneNode);
    }
  }

  if (targets.length === 0) {
    throw new Error('No exportable nodes or frames found on current page or selection.');
  }

  const exportSetting: ExportSettings =
    format === 'PDF'
      ? { format: 'PDF' }
      : format === 'SVG'
      ? { format: 'SVG' }
      : format === 'JPG'
      ? { format: 'JPG', constraint: { type: 'SCALE', value: scale } }
      : { format: 'PNG', constraint: { type: 'SCALE', value: scale } };

  const mimeType =
    format === 'PDF'
      ? 'application/pdf'
      : format === 'SVG'
      ? 'image/svg+xml'
      : format === 'JPG'
      ? 'image/jpeg'
      : 'image/png';

  const items: ExportedItem[] = [];

  for (const node of targets) {
    const bytes = await node.exportAsync(exportSetting);
    const base64 = uint8ArrayToBase64(bytes);
    const dataUrl = `data:${mimeType};base64,${base64}`;

    items.push({
      nodeId: node.id,
      nodeName: node.name,
      format,
      mimeType,
      byteLength: bytes.byteLength,
      base64,
      dataUrl,
      width: Math.round(node.width * scale),
      height: Math.round(node.height * scale)
    });
  }

  return {
    totalCount: items.length,
    format,
    items,
    outputDir: payload.outputDir,
    summary: `Successfully exported ${items.length} node(s) as ${format}`
  };
}
