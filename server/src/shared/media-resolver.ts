import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { InsertMediaPayload, LayoutNode, UpdateNodePayload } from './protocol.js';

export interface ResolvedMedia {
  mediaType: 'IMAGE' | 'SVG' | 'VIDEO' | 'GIF';
  base64?: string;
  svgString?: string;
}

/**
 * Resolves any media input (HTTP URL, local file path, data URL, raw SVG, or base64)
 * into a prepared base64 byte payload or raw SVG string ready for the Figma plugin.
 */
export async function resolveMediaSource(
  source: string,
  mediaTypeHint?: 'IMAGE' | 'SVG' | 'VIDEO' | 'GIF'
): Promise<ResolvedMedia> {
  const trimmed = source.trim();

  // 1. Raw SVG markup
  if (trimmed.startsWith('<svg') || (trimmed.startsWith('<?xml') && trimmed.includes('<svg'))) {
    return {
      mediaType: 'SVG',
      svgString: trimmed
    };
  }

  // 2. Data URLs (e.g. data:image/png;base64,...)
  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:([^;]+);base64,(.*)$/);
    if (match) {
      const mime = match[1].toLowerCase();
      const b64 = match[2];
      if (mime.includes('svg')) {
        const svgString = Buffer.from(b64, 'base64').toString('utf-8');
        return { mediaType: 'SVG', svgString };
      }
      if (mime.includes('video')) {
        return { mediaType: 'VIDEO', base64: b64 };
      }
      if (mime.includes('gif')) {
        return { mediaType: 'GIF', base64: b64 };
      }
      return { mediaType: 'IMAGE', base64: b64 };
    }
  }

  // 3. HTTP / HTTPS URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const res = await fetch(trimmed);
    if (!res.ok) {
      throw new Error(`Failed to download media from URL (${res.status} ${res.statusText}): ${trimmed}`);
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const urlLower = trimmed.split('?')[0].toLowerCase();

    if (contentType.includes('svg') || urlLower.endsWith('.svg')) {
      const svgString = await res.text();
      return { mediaType: 'SVG', svgString };
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    if (contentType.includes('video') || urlLower.endsWith('.mp4') || urlLower.endsWith('.webm') || urlLower.endsWith('.mov')) {
      return { mediaType: 'VIDEO', base64 };
    }

    if (contentType.includes('gif') || urlLower.endsWith('.gif')) {
      return { mediaType: 'GIF', base64 };
    }

    return { mediaType: 'IMAGE', base64 };
  }

  // 4. Local filesystem paths
  let resolvedPath = trimmed;
  if (resolvedPath.startsWith('~/')) {
    resolvedPath = path.join(os.homedir(), resolvedPath.slice(2));
  }

  if (fs.existsSync(resolvedPath)) {
    const ext = path.extname(resolvedPath).toLowerCase();
    if (ext === '.svg') {
      const svgString = await fs.promises.readFile(resolvedPath, 'utf-8');
      return { mediaType: 'SVG', svgString };
    }

    const buffer = await fs.promises.readFile(resolvedPath);
    const base64 = buffer.toString('base64');

    if (ext === '.mp4' || ext === '.mov' || ext === '.webm') {
      return { mediaType: 'VIDEO', base64 };
    }
    if (ext === '.gif') {
      return { mediaType: 'GIF', base64 };
    }
    return { mediaType: 'IMAGE', base64 };
  }

  // 5. Fallback: Treat as raw base64 or SVG text if hint matches
  if (mediaTypeHint === 'SVG' && trimmed.includes('<svg')) {
    return { mediaType: 'SVG', svgString: trimmed };
  }

  return {
    mediaType: mediaTypeHint || 'IMAGE',
    base64: trimmed
  };
}

/**
 * Pre-processes an InsertMediaPayload on the Node bridge server before relaying to Figma plugin.
 */
export async function resolveMediaPayload(payload: InsertMediaPayload): Promise<InsertMediaPayload> {
  const clone = { ...payload };

  if (clone.source && !clone.base64 && !clone.svgString) {
    const resolved = await resolveMediaSource(clone.source, clone.mediaType);
    clone.mediaType = resolved.mediaType;
    if (resolved.base64) clone.base64 = resolved.base64;
    if (resolved.svgString) clone.svgString = resolved.svgString;
  }

  return clone;
}

/**
 * Recursively resolves any image, SVG, or video URLs within a declarative LayoutNode tree.
 */
export async function resolveLayoutTreeMedia(node: LayoutNode): Promise<LayoutNode> {
  if (!node) return node;

  if (node.type === 'IMAGE') {
    if (node.url && !node.base64) {
      const resolved = await resolveMediaSource(node.url, 'IMAGE');
      node.base64 = resolved.base64;
    }
  } else if (node.type === 'SVG') {
    if (node.url && !node.svg) {
      const resolved = await resolveMediaSource(node.url, 'SVG');
      node.svg = resolved.svgString;
    }
  } else if (node.type === 'VIDEO') {
    if (node.url && !node.base64) {
      const resolved = await resolveMediaSource(node.url, 'VIDEO');
      node.base64 = resolved.base64;
    }
  } else if (node.type === 'FRAME' && node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      await resolveLayoutTreeMedia(child);
    }
  }

  return node;
}

/**
 * Resolves image URL on update payloads before sending to Figma.
 */
export async function resolveUpdateNodeMedia(payload: UpdateNodePayload): Promise<UpdateNodePayload> {
  const clone = { ...payload };
  if (clone.imageUrl && !clone.imageBase64) {
    const resolved = await resolveMediaSource(clone.imageUrl, 'IMAGE');
    clone.imageBase64 = resolved.base64;
  }
  return clone;
}
