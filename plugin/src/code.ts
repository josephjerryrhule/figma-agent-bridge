/**
 * Main Figma Plugin Sandbox Thread.
 * Runs inside Figma's sandboxed JavaScript runtime with direct access to the Figma Document Object Model.
 */

import { BridgeRequest, BridgeResponse } from './types';
import { getSelection, inspectNode, findNodes, getDocumentInfo, serializeNode } from './engine/inspector';
import { renderLayout } from './engine/parser';
import { updateNode, appendChildren, replaceChildren, deleteNodes } from './engine/mutator';
import { captureScreenshot } from './engine/export';

// Show compact sidebar UI
figma.showUI(__html__, {
  width: 360,
  height: 520,
  title: 'Agent Canvas Bridge',
  themeColors: true
});

// Track session history for agent context
const sessionTouchedNodeIds = new Set<string>();

/**
 * Main message handler receiving commands forwarded by the UI iframe WebSocket client.
 */
figma.ui.onmessage = async (msg: BridgeRequest) => {
  if (!msg || !msg.command) return;

  const startTime = Date.now();
  const response: BridgeResponse = {
    id: msg.id,
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

      case 'CAPTURE_SCREENSHOT': {
        response.data = await captureScreenshot(msg.payload || {});
        break;
      }

      case 'EXECUTE_CODE': {
        const rawCode = msg.payload?.code;
        if (!rawCode) throw new Error('No code provided in EXECUTE_CODE payload');

        // Safe evaluation inside plugin sandbox with figma in scope
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const fn = new AsyncFunction('figma', rawCode);
        const evalResult = await fn(figma);

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
