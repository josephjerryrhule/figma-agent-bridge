import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { processExportResult, processScreenshotResult, resolveUserPath } from '../server/src/shared/export-saver.js';
import { ExportNodesResult, CaptureScreenshotResult } from '../server/src/shared/protocol.js';

describe('Export Saver', () => {
  const tmpDir = path.join(os.tmpdir(), 'figma-export-test-' + Date.now());

  beforeEach(async () => {
    await fs.promises.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it('resolves ~ paths to user homedir', () => {
    const resolved = resolveUserPath('~/Desktop/test.pdf');
    expect(resolved).toBe(path.join(os.homedir(), 'Desktop/test.pdf'));
  });

  it('saves single exported item to disk at savePath', async () => {
    const dummyPdfContent = '%PDF-1.4 dummy content';
    const b64 = Buffer.from(dummyPdfContent).toString('base64');

    const result: ExportNodesResult = {
      totalCount: 1,
      format: 'PDF',
      summary: 'Exported 1 node as PDF',
      items: [
        {
          nodeId: '1:1',
          nodeName: 'Proposal Deck',
          format: 'PDF',
          mimeType: 'application/pdf',
          byteLength: dummyPdfContent.length,
          base64: b64
        }
      ]
    };

    const targetFile = path.join(tmpDir, 'output.pdf');
    const processed = await processExportResult(result, { savePath: targetFile });

    expect(processed.items[0].filePath).toBe(targetFile);
    expect(fs.existsSync(targetFile)).toBe(true);
    const content = await fs.promises.readFile(targetFile, 'utf-8');
    expect(content).toBe(dummyPdfContent);
  });

  it('batch saves multiple frames to an output directory', async () => {
    const b64 = Buffer.from('image bytes').toString('base64');
    const result: ExportNodesResult = {
      totalCount: 2,
      format: 'PNG',
      summary: 'Exported 2 nodes',
      items: [
        {
          nodeId: '1:1',
          nodeName: 'Slide 1: Intro',
          format: 'PNG',
          mimeType: 'image/png',
          byteLength: 11,
          base64: b64
        },
        {
          nodeId: '1:2',
          nodeName: 'Slide 2: Numbers',
          format: 'PNG',
          mimeType: 'image/png',
          byteLength: 11,
          base64: b64
        }
      ]
    };

    const outDir = path.join(tmpDir, 'deck-slides');
    const processed = await processExportResult(result, { outputDir: outDir });

    expect(processed.outputDir).toBe(outDir);
    expect(fs.existsSync(outDir)).toBe(true);
    const files = await fs.promises.readdir(outDir);
    expect(files.length).toBe(2);
    expect(files[0]).toContain('Slide_1-_Intro.png');
  });

  it('saves screenshot to disk when savePath provided', async () => {
    const b64 = Buffer.from('png content').toString('base64');
    const shot: CaptureScreenshotResult = {
      nodeId: '1:1',
      nodeName: 'Hero Card',
      format: 'PNG',
      scale: 2,
      mimeType: 'image/png',
      base64: b64,
      dataUrl: `data:image/png;base64,${b64}`,
      width: 400,
      height: 300
    };

    const targetShot = path.join(tmpDir, 'card.png');
    const processed = await processScreenshotResult(shot, { savePath: targetShot });

    expect(processed.filePath).toBe(targetShot);
    expect(fs.existsSync(targetShot)).toBe(true);
  });
});
