import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 900
  },
  server: {
    watch: {
      ignored: ['**/release/**', '**/tools/**', '**/tests/generated/**']
    }
  }
});
