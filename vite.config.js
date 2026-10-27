import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  optimizeDeps: { exclude: ['three'] },
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { output: { manualChunks: { 'three-vendor': ['three'] } } } },
});


