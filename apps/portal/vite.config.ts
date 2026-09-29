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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id))
            return 'react';
          if (/[\\/](zod|react-hook-form|@hookform)[\\/]/.test(id)) return 'forms';
          if (/[\\/](@radix-ui|@floating-ui)[\\/]/.test(id)) return 'radix';
          if (/[\\/]@tanstack[\\/]/.test(id)) return 'query';
          return 'vendor';
        },
      },
    },
  },
});
