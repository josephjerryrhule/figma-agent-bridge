#!/bin/bash
set -e

echo "=== 1. Bundling MCP Server with Esbuild ==="
mkdir -p dist/bundle build/tmp-mcpb/server
npx -y esbuild server/src/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=esm \
  --outfile=build/tmp-mcpb/server/index.mjs \
  --banner:js="import{createRequire}from'module';const require=createRequire(import.meta.url);"

# Copy to dist/bundle
cp build/tmp-mcpb/server/index.mjs dist/bundle/index.mjs
chmod +x dist/bundle/index.mjs

echo "=== 2. Creating manifest.json ==="
cat << 'MANIFEST' > build/tmp-mcpb/manifest.json
{
  "manifest_version": "0.2",
  "name": "figma-agent-bridge",
  "display_name": "Figma Agent Bridge",
  "version": "1.0.0",
  "description": "Universal AI design bridge connecting Claude, AGY, Codex, and ChatGPT to Figma with full Auto Layout, visual screenshots, and node editing.",
  "author": {
    "name": "Joseph Jerry Rhule"
  },
  "icon": "icon.png",
  "server": {
    "type": "node",
    "entry_point": "server/index.mjs",
    "mcp_config": {
      "command": "node",
      "args": [
        "${__dirname}/server/index.mjs"
      ]
    }
  },
  "tools_generated": true
}
MANIFEST

echo "=== 3. Copying Assets ==="
cp icon.png build/tmp-mcpb/icon.png

echo "=== 4. Packaging .mcpb ZIP Bundle ==="
rm -f build/figma-agent-bridge.mcpb
cd build/tmp-mcpb
zip -r ../figma-agent-bridge.mcpb manifest.json icon.png server/
cd ../..

echo "=== 5. Cleaning Up Temp Files ==="
rm -rf build/tmp-mcpb

echo "=== Build Complete! File: build/figma-agent-bridge.mcpb ==="
ls -lh build/figma-agent-bridge.mcpb
