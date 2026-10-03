import { describe, it, expect } from 'vitest';
import { LayoutNodeSchema, toolsDefinitions } from '../server/src/mcp/tools.js';

describe('Declarative Layout Schema & Senior Designer Tools', () => {
  it('preserves an optional file routing field on every regular tool schema', () => {
    for (const tool of toolsDefinitions) {
      if (tool.name === 'figma_set_active_file') continue;
      const fileSchema = (tool.inputSchema as any)._def.shape().file;
      expect(fileSchema.safeParse(undefined).success, tool.name).toBe(true);
      expect(fileSchema.safeParse('Presentation Deck').data, tool.name).toBe('Presentation Deck');
    }
  });

  it('validates a complex nested Auto Layout frame structure with wrap, effects, and responsive sizing', () => {
    const validCard = {
      type: 'FRAME',
      name: 'Hero Card',
      layout: 'VERTICAL',
      layoutWrap: 'NO_WRAP',
      width: 400,
      height: 'HUG',
      gap: 16,
      counterAxisSpacing: 12,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      background: '#FFFFFF',
      cornerRadius: 12,
      stroke: { color: '#E2E8F0', weight: 1 },
      strokesIncludedInLayout: true,
      minWidth: 320,
      maxWidth: 600,
      effects: [
        {
          type: 'DROP_SHADOW',
          color: '#000000',
          opacity: 0.1,
          offset: { x: 0, y: 8 },
          radius: 24,
          spread: -4
        }
      ],
      children: [
        {
          type: 'TEXT',
          name: 'Title',
          text: 'Welcome to Figma Agent Bridge',
          fontFamily: 'Inter',
          fontWeight: 'Bold',
          fontSize: 24,
          color: '#0F172A',
          width: 'FILL'
        },
        {
          type: 'TEXT',
          name: 'Subtitle',
          text: 'Designed autonomously with Senior Figma tools',
          fontSize: 14,
          color: '#64748B',
          width: 'FILL'
        },
        {
          type: 'FRAME',
          name: 'Action Row',
          layout: 'HORIZONTAL',
          layoutWrap: 'WRAP',
          gap: 12,
          counterAxisSpacing: 8,
          children: [
            {
              type: 'FRAME',
              name: 'Button',
              layout: 'HORIZONTAL',
              padding: [10, 16],
              background: '#0D99FF',
              cornerRadius: 6,
              children: [
                {
                  type: 'TEXT',
                  text: 'Get Started',
                  color: '#FFFFFF',
                  fontWeight: 'SemiBold',
                  fontSize: 14
                }
              ]
            },
            {
              type: 'FRAME',
              name: 'Badge',
              layout: 'HORIZONTAL',
              layoutPositioning: 'ABSOLUTE',
              x: 350,
              y: -10,
              padding: [4, 8],
              background: '#EF4444',
              cornerRadius: 12,
              children: [
                {
                  type: 'TEXT',
                  text: 'NEW',
                  color: '#FFFFFF',
                  fontWeight: 'Bold',
                  fontSize: 10
                }
              ]
            }
          ]
        }
      ]
    };

    const parsed = LayoutNodeSchema.safeParse(validCard);
    expect(parsed.success).toBe(true);
  });

  it('validates figma_set_speaker_notes input', () => {
    const tool = toolsDefinitions.find((t: any) => t.name === 'figma_set_speaker_notes') as any;
    expect(tool.inputSchema.safeParse({ notes: [{ nodeId: '1:42', notes: '- **Say:** welcome' }] }).success).toBe(true);
    expect(tool.inputSchema.safeParse({ notes: [] }).success).toBe(false);
    expect(tool.inputSchema.safeParse({ notes: [{ notes: 'missing id' }] }).success).toBe(false);
  });

  it('rejects an invalid node type', () => {
    const invalid = {
      type: 'INVALID_TYPE',
      name: 'Foo'
    };
    const parsed = LayoutNodeSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('has all required core and senior designer MCP tools registered', () => {
    const toolNames = toolsDefinitions.map((t: any) => t.name);

    // Core inspection & layout
    expect(toolNames).toContain('figma_get_status');
    expect(toolNames).toContain('figma_set_active_file');
    expect(toolNames).toContain('figma_get_selection');
    expect(toolNames).toContain('figma_inspect_node');
    expect(toolNames).toContain('figma_find_nodes');
    expect(toolNames).toContain('figma_get_document_info');
    expect(toolNames).toContain('figma_render_layout');
    expect(toolNames).toContain('figma_update_node');
    expect(toolNames).toContain('figma_append_children');
    expect(toolNames).toContain('figma_replace_children');
    expect(toolNames).toContain('figma_delete_nodes');
    expect(toolNames).toContain('figma_duplicate_node');
    expect(toolNames).toContain('figma_insert_media');
    expect(toolNames).toContain('figma_export');
    expect(toolNames).toContain('figma_capture_screenshot');
    expect(toolNames).toContain('figma_execute_code');
    expect(toolNames).toContain('figma_get_session_history');
    expect(toolNames).toContain('figma_undo');
    expect(toolNames).toContain('figma_redo');

    // Figma Slides
    expect(toolNames).toContain('figma_get_speaker_notes');
    expect(toolNames).toContain('figma_set_speaker_notes');

    // Senior Designer toolset
    expect(toolNames).toContain('figma_set_auto_layout');
    expect(toolNames).toContain('figma_create_component');
    expect(toolNames).toContain('figma_create_component_set');
    expect(toolNames).toContain('figma_create_instance');
    expect(toolNames).toContain('figma_create_style');
    expect(toolNames).toContain('figma_apply_style');
    expect(toolNames).toContain('figma_get_variables');
    expect(toolNames).toContain('figma_create_variable');
    expect(toolNames).toContain('figma_group_nodes');
    expect(toolNames).toContain('figma_boolean_operation');
  });
});
