/**
 * Figma Slides helpers: read and write presenter (speaker) notes.
 * `speakerNotes` only exists on SLIDE nodes while the plugin runs in a Slides file,
 * which requires "slides" in the manifest's editorType.
 */

export interface SpeakerNotesEntry {
  nodeId: string;
  notes: string;
}

function assertSlidesEditor(): void {
  if (figma.editorType !== 'slides') {
    throw new Error(
      `Speaker notes are only available in Figma Slides files (current editor: "${figma.editorType}"). Open the Slides file and run the bridge plugin there.`
    );
  }
}

function allSlides(): SceneNode[] {
  return (figma as any).getSlideGrid().flat() as SceneNode[];
}

function resolveSlide(nodeId: string): SceneNode {
  const node = figma.getNodeById(nodeId) as SceneNode | null;
  if (!node) throw new Error(`Node ${nodeId} not found`);
  if (node.type !== ('SLIDE' as any)) {
    throw new Error(`Node ${nodeId} is a ${node.type}, not a SLIDE`);
  }
  return node;
}

export function getSpeakerNotes(payload: { nodeIds?: string[] } = {}) {
  assertSlidesEditor();
  const slides = payload.nodeIds?.length ? payload.nodeIds.map(resolveSlide) : allSlides();
  return {
    slides: slides.map((slide, index) => ({
      id: slide.id,
      name: slide.name,
      index,
      speakerNotes: ((slide as any).speakerNotes as string | undefined) ?? ''
    }))
  };
}

export function setSpeakerNotes(payload: { notes: SpeakerNotesEntry[] }) {
  assertSlidesEditor();
  if (!Array.isArray(payload?.notes) || payload.notes.length === 0) {
    throw new Error('No notes provided. Pass notes: [{ nodeId, notes }]');
  }
  const updatedIds: string[] = [];
  const errors: { nodeId: string; error: string }[] = [];
  for (const entry of payload.notes) {
    try {
      const slide = resolveSlide(entry.nodeId);
      if (!('speakerNotes' in slide)) {
        throw new Error(
          'This Figma build does not expose speakerNotes to plugins (it is not in the public Plugin API). Use the official Figma MCP (use_figma) or enter notes in Figma.'
        );
      }
      (slide as any).speakerNotes = entry.notes ?? '';
      updatedIds.push(slide.id);
    } catch (err: any) {
      errors.push({ nodeId: entry.nodeId, error: err?.message || String(err) });
    }
  }
  return { updatedCount: updatedIds.length, updatedIds, errors };
}
