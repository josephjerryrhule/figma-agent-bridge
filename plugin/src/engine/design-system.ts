/**
 * Design System, Auto Layout & Tokens Engine for Figma Agent Bridge.
 * Equips agents with Senior Figma User capabilities:
 * - Shift+A Auto Layout conversions and granular configuration
 * - Master Components, Variants & Component Sets
 * - Component Instances with variant property overrides
 * - Paint, Text & Effect Styles
 * - Figma Variables (Tokens)
 * - Grouping and Boolean Operations
 */

import {
  SetAutoLayoutPayload,
  CreateComponentPayload,
  CreateComponentSetPayload,
  CreateInstancePayload,
  CreateStylePayload,
  ApplyStylePayload,
  CreateVariablePayload,
  GroupNodesPayload,
  BooleanOperationPayload,
  SerializedNodeInfo
} from '../types';
import { serializeNode } from './inspector';
import { createSolidPaint, parseColor, figmaRgbToHex } from './colors';
import { ensureFontLoaded } from './fonts';
import { parseEffects } from './effects';
import { createNodeFromLayout } from './parser';

/**
 * Converts a frame or selection into Auto Layout or updates Auto Layout properties.
 */
export async function setAutoLayout(payload: SetAutoLayoutPayload): Promise<SerializedNodeInfo> {
  let targetNode: BaseNode | null = null;

  if (payload.nodeId) {
    targetNode = figma.getNodeById(payload.nodeId);
  } else if (figma.currentPage.selection.length > 0) {
    targetNode = figma.currentPage.selection[0];
  }

  if (!targetNode) {
    throw new Error('No target node found. Provide a "nodeId" or select a frame on the canvas.');
  }

  let frame: FrameNode;

  if (targetNode.type === 'FRAME' || targetNode.type === 'COMPONENT') {
    frame = targetNode as FrameNode;
  } else if ('parent' in targetNode && targetNode.parent) {
    // If selecting a non-frame node (e.g. rectangle or text), wrap it in an Auto Layout frame
    const parent = targetNode.parent as BaseNode & ChildrenMixin;
    frame = figma.createFrame();
    frame.name = `${targetNode.name} Container`;
    frame.x = (targetNode as any).x || 0;
    frame.y = (targetNode as any).y || 0;
    parent.appendChild(frame);
    frame.appendChild(targetNode as SceneNode);
  } else {
    throw new Error(`Node type '${targetNode.type}' cannot be converted to Auto Layout.`);
  }

  // Set layout mode
  const mode = payload.layoutMode || payload.direction || 'VERTICAL';
  frame.layoutMode = mode;

  // Wrap
  if (payload.layoutWrap || payload.wrap !== undefined) {
    const isWrap = payload.layoutWrap === 'WRAP' || payload.wrap === 'WRAP' || payload.wrap === true;
    if ('layoutWrap' in frame) {
      frame.layoutWrap = isWrap ? 'WRAP' : 'NO_WRAP';
    }
  }

  // Spacing / Gap
  const gap = payload.gap !== undefined ? payload.gap : payload.itemSpacing;
  if (gap !== undefined) {
    frame.itemSpacing = gap;
  }
  if (payload.counterAxisSpacing !== undefined && 'counterAxisSpacing' in frame) {
    frame.counterAxisSpacing = payload.counterAxisSpacing;
  }

  // Padding
  if (payload.padding !== undefined) {
    if (typeof payload.padding === 'number') {
      frame.paddingTop = payload.padding;
      frame.paddingRight = payload.padding;
      frame.paddingBottom = payload.padding;
      frame.paddingLeft = payload.padding;
    } else if (Array.isArray(payload.padding)) {
      if (payload.padding.length === 2) {
        const [v, h] = payload.padding;
        frame.paddingTop = v;
        frame.paddingBottom = v;
        frame.paddingRight = h;
        frame.paddingLeft = h;
      } else if (payload.padding.length === 4) {
        const [t, r, b, l] = payload.padding;
        frame.paddingTop = t;
        frame.paddingRight = r;
        frame.paddingBottom = b;
        frame.paddingLeft = l;
      }
    } else if (typeof payload.padding === 'object') {
      if (payload.padding.top !== undefined) frame.paddingTop = payload.padding.top;
      if (payload.padding.right !== undefined) frame.paddingRight = payload.padding.right;
      if (payload.padding.bottom !== undefined) frame.paddingBottom = payload.padding.bottom;
      if (payload.padding.left !== undefined) frame.paddingLeft = payload.padding.left;
    }
  }

  if (payload.paddingTop !== undefined) frame.paddingTop = payload.paddingTop;
  if (payload.paddingRight !== undefined) frame.paddingRight = payload.paddingRight;
  if (payload.paddingBottom !== undefined) frame.paddingBottom = payload.paddingBottom;
  if (payload.paddingLeft !== undefined) frame.paddingLeft = payload.paddingLeft;
  if (payload.paddingHorizontal !== undefined) {
    frame.paddingLeft = payload.paddingHorizontal;
    frame.paddingRight = payload.paddingHorizontal;
  }
  if (payload.paddingVertical !== undefined) {
    frame.paddingTop = payload.paddingVertical;
    frame.paddingBottom = payload.paddingVertical;
  }

  // Alignment
  const primaryAlign = payload.primaryAxisAlignItems || payload.alignItems;
  if (primaryAlign) {
    frame.primaryAxisAlignItems = primaryAlign;
  }
  const counterAlign = payload.counterAxisAlignItems || payload.counterAlignItems;
  if (counterAlign) {
    frame.counterAxisAlignItems = counterAlign;
  }
  if (payload.counterAxisAlignContent && 'counterAxisAlignContent' in frame) {
    frame.counterAxisAlignContent = payload.counterAxisAlignContent;
  }

  // Sizing
  const targetW = payload.layoutSizingHorizontal || payload.width;
  if (targetW === 'HUG') {
    frame.layoutSizingHorizontal = 'HUG';
  } else if (targetW === 'FILL') {
    frame.layoutSizingHorizontal = 'FILL';
  } else if (typeof targetW === 'number') {
    frame.layoutSizingHorizontal = 'FIXED';
    frame.resize(targetW, frame.height);
  }

  const targetH = payload.layoutSizingVertical || payload.height;
  if (targetH === 'HUG') {
    frame.layoutSizingVertical = 'HUG';
  } else if (targetH === 'FILL') {
    frame.layoutSizingVertical = 'FILL';
  } else if (typeof targetH === 'number') {
    frame.layoutSizingVertical = 'FIXED';
    frame.resize(frame.width, targetH);
  }

  if (payload.strokesIncludedInLayout !== undefined && 'strokesIncludedInLayout' in frame) {
    frame.strokesIncludedInLayout = payload.strokesIncludedInLayout;
  }
  if (payload.itemReverseZIndex !== undefined && 'itemReverseZIndex' in frame) {
    frame.itemReverseZIndex = payload.itemReverseZIndex;
  }

  return serializeNode(frame);
}

/**
 * Creates a reusable Figma Component or converts an existing Frame to a Component.
 */
export async function createComponent(payload: CreateComponentPayload): Promise<SerializedNodeInfo> {
  let component: ComponentNode;

  if (payload.nodeId) {
    const existing = figma.getNodeById(payload.nodeId);
    if (!existing) {
      throw new Error(`Node not found with ID '${payload.nodeId}'`);
    }

    if (existing.type === 'FRAME') {
      const frame = existing as FrameNode;
      component = figma.createComponent();
      component.name = payload.name || frame.name;
      component.x = frame.x;
      component.y = frame.y;
      component.resize(frame.width, frame.height);

      if (frame.layoutMode !== 'NONE') {
        component.layoutMode = frame.layoutMode;
        if ('layoutWrap' in frame && 'layoutWrap' in component) {
          component.layoutWrap = frame.layoutWrap;
        }
        component.itemSpacing = frame.itemSpacing;
        component.paddingTop = frame.paddingTop;
        component.paddingRight = frame.paddingRight;
        component.paddingBottom = frame.paddingBottom;
        component.paddingLeft = frame.paddingLeft;
        component.primaryAxisAlignItems = frame.primaryAxisAlignItems;
        component.counterAxisAlignItems = frame.counterAxisAlignItems;
      }

      component.fills = frame.fills;
      component.strokes = frame.strokes;
      component.strokeWeight = frame.strokeWeight;
      component.cornerRadius = frame.cornerRadius;
      component.effects = frame.effects;

      const children = [...frame.children];
      for (const child of children) {
        component.appendChild(child);
      }

      if (frame.parent) {
        frame.parent.appendChild(component);
      }
      frame.remove();
    } else {
      component = figma.createComponent();
      component.name = payload.name || `${existing.name} Component`;
      component.x = (existing as any).x || 0;
      component.y = (existing as any).y || 0;
      if (existing.parent) existing.parent.appendChild(component);
      component.appendChild(existing as SceneNode);
    }
  } else if (payload.spec) {
    const root = await createNodeFromLayout(payload.spec);
    if (root.type === 'FRAME') {
      const frame = root as FrameNode;
      component = figma.createComponent();
      component.name = payload.name || frame.name || 'Component';
      component.resize(frame.width, frame.height);

      if (frame.layoutMode !== 'NONE') {
        component.layoutMode = frame.layoutMode;
        if ('layoutWrap' in frame && 'layoutWrap' in component) {
          component.layoutWrap = frame.layoutWrap;
        }
        component.itemSpacing = frame.itemSpacing;
        component.paddingTop = frame.paddingTop;
        component.paddingRight = frame.paddingRight;
        component.paddingBottom = frame.paddingBottom;
        component.paddingLeft = frame.paddingLeft;
        component.primaryAxisAlignItems = frame.primaryAxisAlignItems;
        component.counterAxisAlignItems = frame.counterAxisAlignItems;
      }

      component.fills = frame.fills;
      component.strokes = frame.strokes;
      component.strokeWeight = frame.strokeWeight;
      component.cornerRadius = frame.cornerRadius;
      component.effects = frame.effects;

      const children = [...frame.children];
      for (const child of children) {
        component.appendChild(child);
      }
      frame.remove();
      figma.currentPage.appendChild(component);
    } else {
      component = figma.createComponent();
      component.name = payload.name || 'Component';
      figma.currentPage.appendChild(component);
      component.appendChild(root);
    }
  } else {
    component = figma.createComponent();
    component.name = payload.name || 'Component';
    component.resize(120, 48);
    figma.currentPage.appendChild(component);
  }

  if (payload.description) {
    component.description = payload.description;
  }

  if (payload.insertPosition) {
    component.x = payload.insertPosition.x;
    component.y = payload.insertPosition.y;
  }

  figma.currentPage.selection = [component];
  return serializeNode(component);
}

/**
 * Combines multiple ComponentNodes into a Variant ComponentSet.
 */
export async function createComponentSet(payload: CreateComponentSetPayload): Promise<SerializedNodeInfo> {
  if (!payload.componentIds || payload.componentIds.length < 2) {
    throw new Error('ComponentSet requires at least 2 component IDs to combine into variants.');
  }

  const components: ComponentNode[] = [];
  for (const id of payload.componentIds) {
    const node = figma.getNodeById(id);
    if (!node || node.type !== 'COMPONENT') {
      throw new Error(`Node ID '${id}' is not a valid Component`);
    }
    components.push(node as ComponentNode);
  }

  const componentSet = figma.combineAsVariants(components, figma.currentPage);
  if (payload.name) {
    componentSet.name = payload.name;
  }
  if (payload.description) {
    componentSet.description = payload.description;
  }

  figma.currentPage.selection = [componentSet];
  return serializeNode(componentSet);
}

/**
 * Instantiates a component with optional variant property and text overrides.
 */
export async function createInstance(payload: CreateInstancePayload): Promise<SerializedNodeInfo> {
  const componentNode = figma.getNodeById(payload.componentId);
  if (!componentNode) {
    throw new Error(`Component not found with ID '${payload.componentId}'`);
  }

  let instance: InstanceNode;

  if (componentNode.type === 'COMPONENT') {
    instance = (componentNode as ComponentNode).createInstance();
  } else if (componentNode.type === 'COMPONENT_SET') {
    const defaultVariant = (componentNode as ComponentSetNode).defaultVariant;
    instance = defaultVariant.createInstance();
  } else {
    throw new Error(`Node '${payload.componentId}' is neither a COMPONENT nor a COMPONENT_SET`);
  }

  if (payload.name) {
    instance.name = payload.name;
  }

  if (payload.x !== undefined) instance.x = payload.x;
  if (payload.y !== undefined) instance.y = payload.y;

  // Apply variant properties if specified
  if (payload.variantProperties && 'setProperties' in instance) {
    try {
      instance.setProperties(payload.variantProperties);
    } catch (e: any) {
      console.warn('Failed to set instance variant properties:', e);
    }
  }

  // Apply text overrides to child layers
  if (payload.textOverrides) {
    for (const [layerName, newText] of Object.entries(payload.textOverrides)) {
      const textChild = instance.findOne(n => n.type === 'TEXT' && n.name.toLowerCase() === layerName.toLowerCase()) as TextNode | null;
      if (textChild) {
        try {
          const font = (textChild.fontName !== figma.mixed
            ? textChild.fontName
            : { family: 'Inter', style: 'Regular' }) as FontName;
          await figma.loadFontAsync(font);
          textChild.characters = newText;
        } catch (e: any) {
          console.warn(`Failed to override text on layer '${layerName}':`, e);
        }
      }
    }
  }

  // Sizing
  if (payload.width === 'FILL' && 'layoutSizingHorizontal' in instance) {
    (instance as any).layoutSizingHorizontal = 'FILL';
  } else if (typeof payload.width === 'number') {
    instance.resize(payload.width, instance.height);
  }

  if (payload.height === 'FILL' && 'layoutSizingVertical' in instance) {
    (instance as any).layoutSizingVertical = 'FILL';
  } else if (typeof payload.height === 'number') {
    instance.resize(instance.width, payload.height);
  }

  // Parent insertion
  if (payload.targetParentId) {
    const parent = figma.getNodeById(payload.targetParentId);
    if (parent && 'appendChild' in parent) {
      (parent as any).appendChild(instance);
    } else {
      figma.currentPage.appendChild(instance);
    }
  } else {
    figma.currentPage.appendChild(instance);
  }

  figma.currentPage.selection = [instance];
  return serializeNode(instance);
}

/**
 * Creates a local Paint, Text, or Effect style.
 */
export async function createStyle(payload: CreateStylePayload): Promise<any> {
  switch (payload.styleType) {
    case 'PAINT': {
      const style = figma.createPaintStyle();
      style.name = payload.name;
      if (payload.description) style.description = payload.description;
      style.paints = createSolidPaint(payload.color || '#000000', payload.opacity);
      return { id: style.id, name: style.name, styleType: 'PAINT' };
    }

    case 'TEXT': {
      const style = figma.createTextStyle();
      style.name = payload.name;
      if (payload.description) style.description = payload.description;
      const font = await ensureFontLoaded(payload.fontFamily || 'Inter', payload.fontWeight || 'Regular');
      style.fontName = font;
      if (payload.fontSize) style.fontSize = payload.fontSize;
      if (payload.lineHeight && payload.lineHeight !== 'AUTO') {
        style.lineHeight = { value: payload.lineHeight, unit: 'PIXELS' };
      }
      if (payload.letterSpacing) {
        style.letterSpacing = { value: payload.letterSpacing, unit: 'PIXELS' };
      }
      return { id: style.id, name: style.name, styleType: 'TEXT', fontSize: style.fontSize };
    }

    case 'EFFECT': {
      const style = figma.createEffectStyle();
      style.name = payload.name;
      if (payload.description) style.description = payload.description;
      if (payload.effects) {
        style.effects = parseEffects(payload.effects);
      }
      return { id: style.id, name: style.name, styleType: 'EFFECT' };
    }

    default:
      throw new Error(`Unsupported styleType '${payload.styleType}'`);
  }
}

/**
 * Binds an existing style (by name or ID) to a node's fill, stroke, text, or effects.
 */
export async function applyStyle(payload: ApplyStylePayload): Promise<SerializedNodeInfo> {
  const node = figma.getNodeById(payload.nodeId);
  if (!node) {
    throw new Error(`Node not found with ID '${payload.nodeId}'`);
  }

  let styleId = payload.styleId;

  if (!styleId && payload.styleName) {
    const nameMatch = payload.styleName.toLowerCase();
    if (payload.styleType === 'FILL' || payload.styleType === 'STROKE') {
      const styles = figma.getLocalPaintStyles();
      const found = styles.find(s => s.name.toLowerCase() === nameMatch);
      if (found) styleId = found.id;
    } else if (payload.styleType === 'TEXT') {
      const styles = figma.getLocalTextStyles();
      const found = styles.find(s => s.name.toLowerCase() === nameMatch);
      if (found) styleId = found.id;
    } else if (payload.styleType === 'EFFECT') {
      const styles = figma.getLocalEffectStyles();
      const found = styles.find(s => s.name.toLowerCase() === nameMatch);
      if (found) styleId = found.id;
    }
  }

  if (!styleId) {
    throw new Error(`Style could not be found with ID '${payload.styleId}' or name '${payload.styleName}'`);
  }

  switch (payload.styleType) {
    case 'FILL':
      if ('fillStyleId' in node) {
        (node as any).fillStyleId = styleId;
      }
      break;
    case 'STROKE':
      if ('strokeStyleId' in node) {
        (node as any).strokeStyleId = styleId;
      }
      break;
    case 'TEXT':
      if ('textStyleId' in node) {
        (node as any).textStyleId = styleId;
      }
      break;
    case 'EFFECT':
      if ('effectStyleId' in node) {
        (node as any).effectStyleId = styleId;
      }
      break;
  }

  return serializeNode(node);
}

/**
 * Returns Figma Variables (Design Tokens) from the active document.
 */
export function getVariables(payload?: any): any {
  if (!('variables' in figma) || !figma.variables) {
    return {
      supported: false,
      message: 'Figma Variables API is not supported in this runtime version.',
      collections: []
    };
  }

  try {
    const collections = figma.variables.getLocalVariableCollections();
    const result = collections.map(col => {
      const variables = col.variableIds.map(varId => {
        const v = figma.variables.getVariableById(varId);
        if (!v) return null;
        return {
          id: v.id,
          name: v.name,
          resolvedType: v.resolvedType,
          valuesByMode: v.valuesByMode
        };
      }).filter(Boolean);

      return {
        id: col.id,
        name: col.name,
        modes: col.modes,
        defaultModeId: col.defaultModeId,
        variableCount: variables.length,
        variables
      };
    });

    return {
      supported: true,
      collections: result
    };
  } catch (err: any) {
    return {
      supported: false,
      error: err.message,
      collections: []
    };
  }
}

/**
 * Creates a Figma Variable (Design Token).
 */
export function createVariable(payload: CreateVariablePayload): any {
  if (!('variables' in figma) || !figma.variables) {
    throw new Error('Figma Variables API is not supported in this Figma environment.');
  }

  const collections = figma.variables.getLocalVariableCollections();
  let collection = collections.find(c => c.name.toLowerCase() === (payload.collectionName || 'Tokens').toLowerCase());

  if (!collection) {
    collection = figma.variables.createVariableCollection(payload.collectionName || 'Tokens');
  }

  const variable = figma.variables.createVariable(payload.name, collection, payload.resolvedType);

  // Set mode value
  const modeId = collection.modes[0]?.modeId;
  if (modeId) {
    if (payload.resolvedType === 'COLOR') {
      const parsed = parseColor(payload.value);
      if (parsed) {
        variable.setValueForMode(modeId, { r: parsed.r, g: parsed.g, b: parsed.b, a: parsed.a });
      }
    } else {
      variable.setValueForMode(modeId, payload.value);
    }
  }

  return {
    id: variable.id,
    name: variable.name,
    resolvedType: variable.resolvedType,
    collectionId: collection.id
  };
}

/**
 * Groups multiple nodes into a single group container.
 */
export function groupNodes(payload: GroupNodesPayload): SerializedNodeInfo {
  const nodes = payload.nodeIds.map(id => figma.getNodeById(id)).filter(Boolean) as SceneNode[];
  if (nodes.length === 0) {
    throw new Error('No valid nodes found to group.');
  }

  const group = figma.group(nodes, figma.currentPage);
  if (payload.name) {
    group.name = payload.name;
  }

  figma.currentPage.selection = [group];
  return serializeNode(group);
}

/**
 * Executes a Boolean operation (Union, Subtract, Intersect, Exclude) on selected vector shapes.
 */
export function booleanOperation(payload: BooleanOperationPayload): SerializedNodeInfo {
  const nodes = payload.nodeIds.map(id => figma.getNodeById(id)).filter(Boolean) as SceneNode[];
  if (nodes.length < 2) {
    throw new Error('Boolean operations require at least 2 valid nodes.');
  }

  let result: BooleanOperationNode;
  switch (payload.operation) {
    case 'SUBTRACT':
      result = figma.subtract(nodes, figma.currentPage);
      break;
    case 'INTERSECT':
      result = figma.intersect(nodes, figma.currentPage);
      break;
    case 'EXCLUDE':
      result = figma.exclude(nodes, figma.currentPage);
      break;
    case 'UNION':
    default:
      result = figma.union(nodes, figma.currentPage);
      break;
  }

  if (payload.name) {
    result.name = payload.name;
  }

  figma.currentPage.selection = [result];
  return serializeNode(result);
}
