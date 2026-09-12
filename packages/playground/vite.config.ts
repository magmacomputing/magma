import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  esbuild: {
    target: 'esnext',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    dedupe: ['@magmacomputing/tempo'],
  },
  server: {
    port: 5173,
    host: 'localhost',
  },
});
