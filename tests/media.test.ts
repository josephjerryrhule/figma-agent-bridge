import { describe, it, expect } from 'vitest';
import { resolveMediaSource, resolveLayoutTreeMedia } from '../server/src/shared/media-resolver.js';
import { LayoutNode } from '../server/src/shared/protocol.js';

describe('Media Resolver', () => {
  it('resolves raw SVG string markup', async () => {
    const rawSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
    const result = await resolveMediaSource(rawSvg);
    expect(result.mediaType).toBe('SVG');
    expect(result.svgString).toBe(rawSvg);
  });

  it('resolves base64 data URLs', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const result = await resolveMediaSource(dataUrl);
    expect(result.mediaType).toBe('IMAGE');
    expect(result.base64).toBe('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
  });

  it('resolves SVG data URLs into svg strings', async () => {
    const raw = '<svg><circle cx="5" cy="5" r="5"/></svg>';
    const b64 = Buffer.from(raw).toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${b64}`;
    const result = await resolveMediaSource(dataUrl);
    expect(result.mediaType).toBe('SVG');
    expect(result.svgString).toBe(raw);
  });

  it('recursively resolves media in a LayoutNode tree', async () => {
    const tree: LayoutNode = {
      type: 'FRAME',
      name: 'Card',
      children: [
        {
          type: 'IMAGE',
          name: 'Hero Image',
          base64: 'fakebase64'
        },
        {
          type: 'SVG',
          name: 'Icon',
          svg: '<svg></svg>'
        }
      ]
    };

    const resolved = await resolveLayoutTreeMedia(tree);
    expect(resolved.type).toBe('FRAME');
    expect((resolved as any).children[0].base64).toBe('fakebase64');
    expect((resolved as any).children[1].svg).toBe('<svg></svg>');
  });
});
