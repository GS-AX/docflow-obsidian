import esbuild from 'esbuild';
import process from 'process';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const prod = process.argv[2] === 'production';
const require = createRequire(import.meta.url);

// Virtual module that exports the swagger-ui CSS as a JS string.
// ApiRenderer imports this and injects it at runtime — keeps styles.css clean.
const SWAGGER_CSS_NS = 'swagger-css-virtual';

const swaggerCssPlugin = {
  name: 'swagger-css',
  setup(build) {
    build.onResolve({ filter: /^swagger-css-text$/ }, () => ({
      path: 'swagger-css-text',
      namespace: SWAGGER_CSS_NS,
    }));
    build.onLoad({ filter: /.*/, namespace: SWAGGER_CSS_NS }, () => {
      const cssPath = require.resolve('swagger-ui-dist/swagger-ui.css');
      const css = readFileSync(cssPath, 'utf8');
      return {
        contents: `export default ${JSON.stringify(css)};`,
        loader: 'js',
      };
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
