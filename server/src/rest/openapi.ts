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
      '/v1/files': {
        get: {
          summary: 'List connected Figma files and the default routing target',
          operationId: 'listFiles',
          responses: {
            '200': { description: 'Connected plugin instances' }
          }
        }
      },
      '/v1/files/active': {
        post: {
          summary: 'Set the default Figma file for requests without X-Figma-File',
          operationId: 'setActiveFile',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['file'],
                  properties: { file: { type: 'string', description: 'File name, file key, or client id' } }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Selected file' },
            '400': { description: 'Missing file target' }
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
      '/v1/auto-layout': {
        post: {
          summary: 'Configure Auto Layout on a node or selection (Shift+A)',
          operationId: 'setAutoLayout',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    nodeId: { type: 'string' },
                    layoutMode: { type: 'string', enum: ['HORIZONTAL', 'VERTICAL', 'NONE'] },
                    layoutWrap: { type: 'string', enum: ['NO_WRAP', 'WRAP'] },
                    gap: { type: 'number' },
                    padding: { type: 'number' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Updated node' }
          }
        }
      },
      '/v1/component': {
        post: {
          summary: 'Create a master Component from a frame or layout spec',
          operationId: 'createComponent',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    nodeId: { type: 'string' },
                    spec: { type: 'object' },
                    name: { type: 'string' },
                    description: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Created master component' }
          }
        }
      },
      '/v1/component-set': {
        post: {
          summary: 'Combine components into a Variant Component Set',
          operationId: 'createComponentSet',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['componentIds'],
                  properties: {
                    componentIds: { type: 'array', items: { type: 'string' } },
                    name: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Created component set' }
          }
        }
      },
      '/v1/instance': {
        post: {
          summary: 'Create an instance of a Component',
          operationId: 'createInstance',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['componentId'],
                  properties: {
                    componentId: { type: 'string' },
                    name: { type: 'string' },
                    variantProperties: { type: 'object' },
                    textOverrides: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Created component instance' }
          }
        }
      },
      '/v1/style': {
        post: {
          summary: 'Create a Paint, Text, or Effect style',
          operationId: 'createStyle',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['styleType', 'name'],
                  properties: {
                    styleType: { type: 'string', enum: ['PAINT', 'TEXT', 'EFFECT'] },
                    name: { type: 'string' },
                    color: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Created style info' }
          }
        }
      },
      '/v1/apply-style': {
        post: {
          summary: 'Apply a style to a node',
          operationId: 'applyStyle',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['nodeId', 'styleType'],
                  properties: {
                    nodeId: { type: 'string' },
                    styleType: { type: 'string', enum: ['FILL', 'STROKE', 'TEXT', 'EFFECT'] },
                    styleId: { type: 'string' },
                    styleName: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Updated node' }
          }
        }
      },
      '/v1/variables': {
        get: {
          summary: 'Get all Figma Variables and Design Tokens',
          operationId: 'getVariables',
          responses: {
            '200': { description: 'List of variable collections and modes' }
          }
        }
      },
      '/v1/variable': {
        post: {
          summary: 'Create a Figma Variable (Design Token)',
          operationId: 'createVariable',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'resolvedType', 'value'],
                  properties: {
                    collectionName: { type: 'string' },
                    name: { type: 'string' },
                    resolvedType: { type: 'string', enum: ['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'] },
                    value: {}
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Created variable' }
          }
        }
      },
      '/v1/group': {
        post: {
          summary: 'Group multiple nodes together',
          operationId: 'groupNodes',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['nodeIds'],
                  properties: {
                    nodeIds: { type: 'array', items: { type: 'string' } },
                    name: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Group node' }
          }
        }
      },
      '/v1/boolean': {
        post: {
          summary: 'Perform a boolean operation on vector nodes',
          operationId: 'booleanOperation',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['operation', 'nodeIds'],
                  properties: {
                    operation: { type: 'string', enum: ['UNION', 'SUBTRACT', 'INTERSECT', 'EXCLUDE'] },
                    nodeIds: { type: 'array', items: { type: 'string' } },
                    name: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Boolean result node' }
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
