import * as esbuild from 'esbuild';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: [path.join(__dirname, 'src/index.ts')],
  bundle: true,
  outfile: path.join(__dirname, 'dist/main.js'),
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: [
    'react',
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
    'react-dom',
    'zod',
    'flint',
    '@flint/api',
    '@flint/sdk'
  ],
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
};

async function run() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('[Watch] Watching for changes in src/...');
  } else {
    await esbuild.build(buildOptions);
    const stats = fs.statSync(path.join(__dirname, 'dist/main.js'));
    console.log(`[Build] Generated dist/main.js (${(stats.size / 1024).toFixed(1)} KB)`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
