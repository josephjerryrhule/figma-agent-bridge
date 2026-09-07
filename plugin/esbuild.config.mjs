import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWatch = process.argv.includes('--watch');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy ui.html to dist
function copyUiHtml() {
  const src = path.join(__dirname, 'src', 'ui.html');
  const dest = path.join(distDir, 'ui.html');
  fs.copyFileSync(src, dest);
  console.log('[esbuild]: Copied ui.html -> dist/ui.html');
}

copyUiHtml();

const buildOptions = {
  entryPoints: [path.join(__dirname, 'src', 'code.ts')],
  bundle: true,
  outfile: path.join(distDir, 'code.js'),
  platform: 'browser',
  target: 'es2020',
  sourcemap: false,
  logLevel: 'info',
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('[esbuild]: Watching plugin code for changes...');
} else {
  await esbuild.build(buildOptions);
  console.log('[esbuild]: Successfully built plugin/dist/code.js');
}
