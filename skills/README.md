# Figma AI Designer Skills

This directory contains specialised agent skills that teach AI models how to design production-ready, anti-slop user interfaces and presentation decks in Figma.

---

## The `figma-designer` Skill

The core skill is located at [`skills/figma-designer/SKILL.md`](./figma-designer/SKILL.md).

### The 6-Step Design-and-Critique Loop

Never just generate a design once and stop. High-craft UI generation requires an iterative feedback loop:

```
1. Inspect ➔ 2. Draft ➔ 3. Render ➔ 4. Capture & See ➔ 5. Refine & Polish ➔ 6. Export
```

1. **Inspect Canvas & Tokens**: Call `figma_get_status` and `figma_get_document_info` to extract local typography, color tokens, and existing layouts before authoring new elements.
2. **Draft Layout**: Structure clean Auto Layout frames with deliberate hierarchy, padding, and spacing.
3. **Render**: Use `figma_render_layout` or `figma_insert_media` to generate native Figma layers.
4. **Capture & Visually Verify**: Call `figma_capture_screenshot` to inspect the visual output directly in multimodal models (Gemini 3.6 Flash/Pro, Claude 3.7 Sonnet, GPT-4o).
5. **Targeted Mutations**: Use `figma_update_node`, `figma_duplicate_node`, and `figma_append_children` to tweak copy, spacing, and contrast in place without destroying parent frames.
6. **Export Deliverable**: Call `figma_export` to generate production vector PDFs, presentation decks, or high-res retina assets.

---

## Anti-AI-Slop Principles

- **Zero generic purple/pink gradients**: Use disciplined, high-contrast dark mode (`#0D0D0E`, `#161618`) or clean architectural light mode (`#FFFFFF`, `#F8FAFC`).
- **Strict typography hierarchy**: Establish clear scale contrast (Display: 48–64px Bold, Headings: 24–32px SemiBold, Body: 14–16px Regular, Badges: 11–12px Medium).
- **Single primary action per view**: Primary buttons must stand out clearly with deliberate accent color. Secondary actions should be subtle outline or ghost buttons.
- **Unified border radii**: Avoid mixing arbitrary corner radii. Standardise on 6–8px for buttons/inputs and 12–16px for cards/containers.
- **Subtle borders**: Use 1px hairlines (`rgba(255, 255, 255, 0.08)` or `#E2E8F0`) to define depth without visual clutter.

---

## Skill Installation

### Antigravity (AGY)
The skill is automatically discovered by Antigravity if placed in your project's `.gemini/skills/` directory or configured in `AGY_SKILLS_PATH`.

### Claude Code
Add the skill to your project instructions or reference it directly in `.claude/rules/`.
