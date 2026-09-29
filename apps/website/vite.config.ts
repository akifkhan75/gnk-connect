import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sitemapXml } from './src/seo';

/** Writes sitemap.xml from the route table in src/seo.ts, so it always matches real pages. */
const sitemap = (): Plugin => ({
  name: 'gnk-sitemap',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml() });
  },
});

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss(), sitemap()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@gnk/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
});
