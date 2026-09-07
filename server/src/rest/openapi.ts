/**
 * OpenAPI 3.1 Specification generator for ChatGPT Custom GPT Actions and external REST clients.
 */

export function getOpenApiSpec(serverUrl = 'http://localhost:3055') {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Figma Agent Bridge API',
      description: 'API allowing AI agents like ChatGPT, Codex, and Claude to design, read, edit, and delete elements in Figma.',
      version: '1.0.0'
    },
    servers: [
      {
        url: serverUrl,
        description: 'Local Figma Bridge Server'
      }
    ],
    paths: {
      '/v1/status': {
        get: {
          summary: 'Get bridge and Figma connection status',
          operationId: 'getStatus',
          responses: {
            '200': {
              description: 'Current connection status',
              content: {
                'application/json': {
                  schema: { type: 'object' }
                }
              }
            }
          }
        }
      },
      '/v1/selection': {
        get: {
          summary: 'Get currently selected Figma nodes',
          operationId: 'getSelection',
          responses: {
            '200': {
              description: 'Array of selected nodes with hierarchy and properties',
              content: {
                'application/json': {
                  schema: { type: 'object' }
                }
              }
            }
          }
        }
      },
      '/v1/inspect': {
        post: {
          summary: 'Inspect a node by ID or name',
          operationId: 'inspectNode',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Figma node ID' },
                    name: { type: 'string', description: 'Node name' },
                    depth: { type: 'number', default: 3 }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Detailed node properties' }
          }
        }
      },
      '/v1/find': {
        post: {
          summary: 'Search for nodes on the canvas',
          operationId: 'findNodes',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string' },
                    name: { type: 'string' },
                    type: { type: 'string' },
                    textContains: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Matching nodes' }
          }
        }
      },
      '/v1/render': {
        post: {
          summary: 'Create a new design using declarative Auto Layout JSON',
          operationId: 'renderLayout',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['root'],
                  properties: {
                    root: { type: 'object', description: 'Declarative layout tree' },
                    insertPosition: {
                      type: 'object',
                      properties: {
                        x: { type: 'number' },
                        y: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Created node tree info' }
          }
        }
      },
      '/v1/update': {
        post: {
          summary: 'Update properties of an existing node',
          operationId: 'updateNode',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id'],
                  properties: {
                    id: { type: 'string' },
                    text: { type: 'string' },
                    color: { type: 'string' },
                    background: { type: 'string' },
                    fontSize: { type: 'number' },
                    width: { type: 'number' },
                    height: { type: 'number' },
                    gap: { type: 'number' },
                    cornerRadius: { type: 'number' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Updated node tree info' }
          }
        }
      },
      '/v1/append': {
        post: {
          summary: 'Append new child elements to an existing parent frame',
          operationId: 'appendChildren',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['parentId', 'children'],
                  properties: {
                    parentId: { type: 'string' },
                    children: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Updated parent node info' }
          }
        }
      },
      '/v1/replace': {
        post: {
          summary: 'Replace all children inside an existing parent frame',
          operationId: 'replaceChildren',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['parentId', 'children'],
                  properties: {
                    parentId: { type: 'string' },
                    children: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Updated parent node info' }
          }
        }
      },
      '/v1/delete': {
        post: {
          summary: 'Delete nodes by ID',
          operationId: 'deleteNodes',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['ids'],
                  properties: {
                    ids: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Deletion report' }
          }
        }
      },
      '/v1/screenshot': {
        post: {
          summary: 'Capture a screenshot of a node or selection',
          operationId: 'captureScreenshot',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    nodeId: { type: 'string' },
                    format: { type: 'string', enum: ['PNG', 'SVG'] },
                    scale: { type: 'number', default: 2 }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Screenshot image base64 data' }
          }
        }
      },
      '/v1/execute': {
        post: {
          summary: 'Execute arbitrary JavaScript code in the Figma sandbox',
          operationId: 'executeCode',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['code'],
                  properties: {
                    code: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Execution result' }
          }
        }
      }
    }
  };
}
