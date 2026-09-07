import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ExportNodesPayload, ExportNodesResult, CaptureScreenshotPayload, CaptureScreenshotResult } from './protocol.js';

export function resolveUserPath(targetPath: string): string {
  const trimmed = targetPath.trim();
  if (trimmed.startsWith('~/')) {
    return path.join(os.homedir(), trimmed.slice(2));
  }
  return path.resolve(trimmed);
}

/**
 * Saves exported node items to disk if savePath or outputDir are provided in payload.
 */
export async function processExportResult(
  result: ExportNodesResult,
  payload: ExportNodesPayload
): Promise<ExportNodesResult> {
  // 1. Single file export with explicit savePath
  if (payload.savePath && result.items.length > 0) {
    const targetPath = resolveUserPath(payload.savePath);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

    const primaryItem = result.items[0];
    if (primaryItem.base64) {
      await fs.promises.writeFile(targetPath, Buffer.from(primaryItem.base64, 'base64'));
      primaryItem.filePath = targetPath;
      result.summary = `Saved ${primaryItem.nodeName} (${primaryItem.format}) to ${targetPath} [${Math.round(primaryItem.byteLength / 1024)} KB]`;
    }
    return result;
  }

  // 2. Batch export with outputDir
  if (payload.outputDir && result.items.length > 0) {
    const targetDir = resolveUserPath(payload.outputDir);
    await fs.promises.mkdir(targetDir, { recursive: true });

    const ext = result.format.toLowerCase();
    for (let i = 0; i < result.items.length; i++) {
      const item = result.items[i];
      if (item.base64) {
        const safeName = (item.nodeName || `frame-${i + 1}`)
          .replace(/[/\\?%*:|"<>]/g, '-')
          .trim()
          .replace(/\s+/g, '_');
        const filename = `${String(i + 1).padStart(2, '0')}-${safeName}.${ext}`;
        const itemPath = path.join(targetDir, filename);

        await fs.promises.writeFile(itemPath, Buffer.from(item.base64, 'base64'));
        item.filePath = itemPath;
      }
    }

    result.outputDir = targetDir;
    result.summary = `Saved ${result.items.length} frame(s) (${result.format}) to directory: ${targetDir}`;
    return result;
  }

  return result;
}

/**
 * Saves screenshot capture to disk if savePath is provided.
 */
export async function processScreenshotResult(
  result: CaptureScreenshotResult,
  payload: CaptureScreenshotPayload
): Promise<CaptureScreenshotResult> {
  if (payload.savePath && result.base64) {
    const targetPath = resolveUserPath(payload.savePath);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, Buffer.from(result.base64, 'base64'));
    result.filePath = targetPath;
  }
  return result;
}
