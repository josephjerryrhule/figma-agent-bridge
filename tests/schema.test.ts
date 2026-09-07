import { describe, it, expect } from 'vitest';
import { LayoutNodeSchema, toolsDefinitions } from '../server/src/mcp/tools.js';

describe('Declarative Layout Schema & Tools', () => {
  it('validates a complex nested Auto Layout frame structure', () => {
    const validCard = {
      type: 'FRAME',
      name: 'Hero Card',
      layout: 'VERTICAL',
      width: 400,
      height: 'HUG',
      gap: 16,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      background: '#FFFFFF',
      cornerRadius: 12,
      stroke: { color: '#E2E8F0', weight: 1 },
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
          text: 'Designed autonomously by AGY & Claude',
          fontSize: 14,
          color: '#64748B',
          width: 'FILL'
        },
        {
          type: 'FRAME',
          name: 'Action Row',
          layout: 'HORIZONTAL',
          gap: 12,
          children: [
            {
              type: 'FRAME',
              name: 'Button',
              layout: 'HORIZONTAL',
              padding: { top: 10, right: 16, bottom: 10, left: 16 },
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
            }
          ]
        }
      ]
    };

    const parsed = LayoutNodeSchema.safeParse(validCard);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid node type', () => {
    const invalid = {
      type: 'INVALID_TYPE',
      name: 'Foo'
    };
    const parsed = LayoutNodeSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('has all required MCP tools registered', () => {
    const toolNames = toolsDefinitions.map((t: any) => t.name);
    expect(toolNames).toContain('figma_get_status');
    expect(toolNames).toContain('figma_get_selection');
    expect(toolNames).toContain('figma_inspect_node');
    expect(toolNames).toContain('figma_find_nodes');
    expect(toolNames).toContain('figma_get_document_info');
    expect(toolNames).toContain('figma_render_layout');
    expect(toolNames).toContain('figma_update_node');
    expect(toolNames).toContain('figma_append_children');
    expect(toolNames).toContain('figma_replace_children');
    expect(toolNames).toContain('figma_delete_nodes');
    expect(toolNames).toContain('figma_capture_screenshot');
    expect(toolNames).toContain('figma_execute_code');
    expect(toolNames).toContain('figma_get_session_history');
    expect(toolNames).toContain('figma_undo');
    expect(toolNames).toContain('figma_redo');
  });
});
