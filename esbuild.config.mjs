import esbuild from 'esbuild';
import process from 'process';
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';

const prod = process.argv[2] === 'production';
const require = createRequire(import.meta.url);

const SWAGGER_MARKER = '/* @@docflow-swagger-inject@@ */';

const swaggerCssPlugin = {
  name: 'swagger-css',
  setup(build) {
    build.onEnd(() => {
      const swaggerCssPath = require.resolve('swagger-ui-dist/swagger-ui.css');
      const swaggerCss = readFileSync(swaggerCssPath, 'utf8');
      let styles = readFileSync('styles.css', 'utf8');
      // Strip previously injected section so watch-mode rebuilds are idempotent
      const markerIdx = styles.indexOf(SWAGGER_MARKER);
      if (markerIdx >= 0) styles = styles.slice(0, markerIdx).trimEnd();
      writeFileSync('styles.css', `${styles}\n${SWAGGER_MARKER}\n${swaggerCss}`);
    });
  },
};

const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    // Node.js built-ins — Obsidian runs in Electron so these are available at runtime
    'path', 'fs', 'os', 'crypto', 'http', 'https', 'url', 'stream',
    'assert', 'buffer', 'events', 'util', 'querystring', 'zlib',
    'child_process', 'net', 'tls', 'dns', 'readline',
    // CodeMirror packages bundled inside Obsidian
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
  ],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  plugins: [swaggerCssPlugin],
  loader: {
    '.md': 'text',  // template/*.md → string for bundling
  },
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
