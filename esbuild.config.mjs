import esbuild from 'esbuild';
import process from 'process';

const prod = process.argv[2] === 'production';

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
  loader: {
    '.css': 'text',  // swagger-ui-dist/swagger-ui.css → 문자열로 번들
    '.md':  'text',  // template/*.md → 문자열로 번들
  },
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
