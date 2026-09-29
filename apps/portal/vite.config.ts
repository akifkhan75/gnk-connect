import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const pkg = (name: string, entry = 'src/index.ts') =>
  path.resolve(__dirname, `../../packages/${name}/${entry}`);

export default defineConfig({
  server: { port: 3001 },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@gnk/types': pkg('types'),
      '@gnk/validation': pkg('validation'),
      '@gnk/api-client': pkg('api-client'),
      '@gnk/auth-client': pkg('auth-client', 'src/index.tsx'),
      '@gnk/ui/styles.css': pkg('ui', 'src/styles.css'),
      '@gnk/ui': pkg('ui'),
    },
  },
  build: {
    // The single vendor chunk below is ~640 kB (~200 kB gzipped) and cached across releases.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // All third-party code in one long-cached chunk. Splitting it further (react / vendor /
        // radix…) created a circular import between chunks that left React undefined at start-up.
        // PostHog stays a lazy chunk: it loads only when monitoring is switched on.
        manualChunks(id) {
          if (id.includes('node_modules') && !id.includes('posthog')) return 'vendor';
        },
      },
    },
  },
});
