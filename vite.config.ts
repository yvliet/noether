import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
  optimizeDeps: {
    exclude: ['sql.js'],
  },
  build: {
    target: 'esnext',
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
            '@tiptap/extension-task-item',
            '@tiptap/extension-task-list',
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
});

