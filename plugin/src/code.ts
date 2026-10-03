/**
 * Main Figma Plugin Sandbox Thread.
 * Runs inside Figma's sandboxed JavaScript runtime with direct access to the Figma Document Object Model.
 * Equips AI agents with full Senior Figma User capabilities:
 * Auto Layout (wrap, gap, padding, hug/fill), Master Components, Variants, Instances,
 * Styles, Variables (Design Tokens), Groups, Booleans, and global sandbox helpers.
 */

import { BridgeRequest, BridgeResponse, PluginConnectionInfo } from './types';
import { getSelection, inspectNode, findNodes, getDocumentInfo, serializeNode } from './engine/inspector';
import { renderLayout } from './engine/parser';
import { updateNode, appendChildren, replaceChildren, deleteNodes, duplicateNode, insertMedia } from './engine/mutator';
import { captureScreenshot, exportNodes } from './engine/export';
import {
  setAutoLayout,
  createComponent,
  createComponentSet,
  createInstance,
  createStyle,
  applyStyle,
  getVariables,
  createVariable,
  groupNodes,
  booleanOperation
} from './engine/design-system';
import { getSandboxHelpers, createFigmaSandboxProxy } from './engine/sandbox-helpers';
import { getSpeakerNotes, setSpeakerNotes } from './engine/slides';

// Show compact sidebar UI
figma.showUI(__html__, {
  width: 360,
  height: 520,
  title: 'Agent Canvas Bridge',
  themeColors: true
});

const pluginInstanceId = `plugin_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const getPluginInfo = (): PluginConnectionInfo => ({
  fileName: figma.root.name,
  fileKey: figma.fileKey ?? null,
  editorType: figma.editorType,
  pageName: figma.currentPage.name,
  instanceId: pluginInstanceId
});
const postPluginInfo = () => figma.ui.postMessage({ type: 'PLUGIN_INFO', ...getPluginInfo() });

// Track session history for agent context
const sessionTouchedNodeIds = new Set<string>();

/**
 * Main message handler receiving commands forwarded by the UI iframe WebSocket client.
 */
figma.ui.onmessage = async (msg: BridgeRequest | { type?: string }) => {
  if ((msg as { type?: string })?.type === 'UI_READY') {
    postPluginInfo();
    return;
  }
  if (!msg || !('command' in msg) || !msg.command) return;

  const startTime = Date.now();
  const response: BridgeResponse = {
    id: msg.id,
    command: msg.command,
    agent: msg.agent,
    success: true
  };

  try {
    switch (msg.command) {
      case 'GET_STATUS': {
        response.data = {
          online: true,
          documentName: figma.root.name,
          currentPageId: figma.currentPage.id,
          currentPageName: figma.currentPage.name,
          selectedCount: figma.currentPage.selection.length,
          sessionHistoryCount: sessionTouchedNodeIds.size
        };
        break;
      }

      case 'GET_SELECTION': {
        const depth = msg.payload?.depth || 3;
        response.data = getSelection(depth);
        break;
      }

      case 'INSPECT_NODE': {
        const targetId = msg.payload?.id || msg.payload?.name;
        const depth = msg.payload?.depth || 3;
        const inspected = inspectNode(targetId, depth);
        if (!inspected) {
          throw new Error(`Node not found with identifier '${targetId}'`);
        }
        response.data = inspected;
        break;
      }

      case 'FIND_NODES': {
        response.data = findNodes(msg.payload || {});
        break;
      }

      case 'GET_DOCUMENT_INFO': {
        response.data = getDocumentInfo();
        break;
      }

      case 'RENDER_LAYOUT': {
        const created = await renderLayout(msg.payload);
        sessionTouchedNodeIds.add(created.id);
        response.data = created;
        break;
      }

      case 'UPDATE_NODE': {
        const updated = await updateNode(msg.payload);
        sessionTouchedNodeIds.add(updated.id);
        response.data = updated;
        break;
      }

      case 'SET_AUTO_LAYOUT': {
        const result = await setAutoLayout(msg.payload || {});
        sessionTouchedNodeIds.add(result.id);
        response.data = result;
        break;
      }

      case 'CREATE_COMPONENT': {
        const result = await createComponent(msg.payload || {});
        sessionTouchedNodeIds.add(result.id);
        response.data = result;
        break;
      }

      case 'CREATE_COMPONENT_SET': {
        const result = await createComponentSet(msg.payload || {});
        sessionTouchedNodeIds.add(result.id);
        response.data = result;
        break;
      }

      case 'CREATE_INSTANCE': {
        const result = await createInstance(msg.payload);
        sessionTouchedNodeIds.add(result.id);
        response.data = result;
        break;
      }

      case 'CREATE_STYLE': {
        response.data = await createStyle(msg.payload);
        break;
      }

      case 'APPLY_STYLE': {
        const result = await applyStyle(msg.payload);
        sessionTouchedNodeIds.add(result.id);
        response.data = result;
        break;
      }

      case 'GET_VARIABLES': {
        response.data = getVariables(msg.payload);
        break;
      }

      case 'CREATE_VARIABLE': {
        response.data = createVariable(msg.payload);
        break;
      }

      case 'GROUP_NODES': {
        const result = groupNodes(msg.payload);
        sessionTouchedNodeIds.add(result.id);
        response.data = result;
        break;
      }

      case 'BOOLEAN_OPERATION': {
        const result = booleanOperation(msg.payload);
        sessionTouchedNodeIds.add(result.id);
        response.data = result;
        break;
      }

      case 'APPEND_CHILDREN': {
        const result = await appendChildren(msg.payload);
        sessionTouchedNodeIds.add(result.id);
        response.data = result;
        break;
      }

      case 'REPLACE_CHILDREN': {
        const result = await replaceChildren(msg.payload);
        sessionTouchedNodeIds.add(result.id);
        response.data = result;
        break;
      }

      case 'DELETE_NODES': {
        const result = await deleteNodes(msg.payload);
        for (const id of result.deletedIds) {
          sessionTouchedNodeIds.delete(id);
        }
        response.data = result;
        break;
      }

      case 'DUPLICATE_NODE': {
        const result = await duplicateNode(msg.payload);
        sessionTouchedNodeIds.add(result.id);
        response.data = result;
        break;
      }

      case 'INSERT_MEDIA': {
        const result = await insertMedia(msg.payload);
        sessionTouchedNodeIds.add(result.id);
        response.data = result;
        break;
      }

      case 'EXPORT_NODES': {
        response.data = await exportNodes(msg.payload || {});
        break;
      }

      case 'CAPTURE_SCREENSHOT': {
        response.data = await captureScreenshot(msg.payload || {});
        break;
      }

      case 'GET_SPEAKER_NOTES': {
        response.data = getSpeakerNotes(msg.payload || {});
        break;
      }

      case 'SET_SPEAKER_NOTES': {
        const result = setSpeakerNotes(msg.payload);
        for (const id of result.updatedIds) sessionTouchedNodeIds.add(id);
        response.data = result;
        break;
      }

      case 'EXECUTE_CODE': {
        const rawCode = msg.payload?.code;
        if (!rawCode) throw new Error('No code provided in EXECUTE_CODE payload');

        // Safe evaluation inside plugin sandbox with figma and rich senior-designer helpers in scope
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const helpers = getSandboxHelpers();
        const fn = new AsyncFunction(
          'figma',
          'createAutoLayout',
          'createFrame',
          'createTextNode',
          'createText',
          'createRectangle',
          'createEllipse',
          'createComponent',
          'createInstance',
          'loadFont',
          'solidPaint',
          'rgb',
          'rgba',
          'dropShadow',
          'innerShadow',
          'blur',
          'findNode',
          'findNodes',
          rawCode
        );

        const figmaProxy = createFigmaSandboxProxy(figma, helpers);

        const evalResult = await fn(
          figmaProxy,
          helpers.createAutoLayout,
          helpers.createFrame,
          helpers.createTextNode,
          helpers.createText,
          helpers.createRectangle,
          helpers.createEllipse,
          helpers.createComponent,
          helpers.createInstance,
          helpers.loadFont,
          helpers.solidPaint,
          helpers.rgb,
          helpers.rgba,
          helpers.dropShadow,
          helpers.innerShadow,
          helpers.blur,
          helpers.findNode,
          helpers.findNodes
        );

        // If returned node, serialize it
        if (evalResult && typeof evalResult === 'object' && 'id' in evalResult) {
          sessionTouchedNodeIds.add(evalResult.id);
          response.data = serializeNode(evalResult);
        } else {
          response.data = evalResult;
        }
        break;
      }

      case 'GET_SESSION_HISTORY': {
        const historyNodes = [];
        for (const id of sessionTouchedNodeIds) {
          const node = figma.getNodeById(id);
          if (node) {
            historyNodes.push(serializeNode(node, 0, 1));
          }
        }
        response.data = {
          total: historyNodes.length,
          nodes: historyNodes
        };
        break;
      }

      case 'UNDO': {
        // @ts-ignore
        if (typeof figma.undo === 'function') figma.undo();
        response.data = { undone: true };
        break;
      }

      case 'REDO': {
        // @ts-ignore
        if (typeof figma.redo === 'function') figma.redo();
        response.data = { redone: true };
        break;
      }

      default:
        throw new Error(`Unknown command: ${(msg as any).command}`);
    }
  } catch (err: any) {
    response.success = false;
    response.error = err?.message || String(err);
  } finally {
    response.executionTimeMs = Date.now() - startTime;
    figma.ui.postMessage(response);
  }
};

figma.on('currentpagechange', postPluginInfo);
