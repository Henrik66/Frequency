import { defineConfig } from 'vite';

// OpenGame forbids absolute paths in the build, so every URL must be relative.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
});
