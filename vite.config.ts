import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const tursoUrl = env.VITE_TURSO_DATABASE_URL || env.DATABASE_URL || 'https://flint-ricriya.aws-ap-northeast-1.turso.io';
  const normalizedTursoUrl = tursoUrl.startsWith('turso://')
    ? 'https://' + tursoUrl.slice('turso://'.length)
    : tursoUrl.startsWith('libsql://')
    ? 'https://' + tursoUrl.slice('libsql://'.length)
    : tursoUrl;

  return {
    base: './',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'import.meta.env.VITE_TURSO_DATABASE_URL': JSON.stringify(normalizedTursoUrl),
      'import.meta.env.VITE_TURSO_AUTH_TOKEN': JSON.stringify(env.VITE_TURSO_AUTH_TOKEN || env.TURSO_AUTH_TOKEN || ''),
    },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      // Use polling on Windows to avoid EBUSY errors from chokidar's native fs.watch()
      usePolling: process.platform === 'win32',
      interval: 1000,
      ignored: [
        '**/src-tauri/**',
        '**/src-tauri/target/**',
        '**/.git/**',
        '**/.flint/**',
        '**/*.md',
        '**/*.markdown',
        '**/*.sqlite',
        '**/*.sqlite-journal',
        '**/*.db',
        '**/*.db-journal',
        '**/vaults/**',
        '**/Vault/**',
      ],
    },
  },
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'zustand'],
          'vendor-tiptap': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-highlight',
            '@tiptap/extension-link',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-table',
            '@tiptap/extension-table-cell',
            '@tiptap/extension-table-header',
            '@tiptap/extension-table-row',
            '@tiptap/extension-task-item',
            '@tiptap/extension-task-list',
            '@tiptap/extension-typography',
            '@tiptap/suggestion',
          ],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
          'vendor-fsrs': ['ts-fsrs'],
          'vendor-icons': ['@hugeicons/react'],
          'vendor-math': ['katex', 'mathlive'],
        },
      },
    },
  },
};
});

