import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Default environment is node — no global DOM.
    // scoring.test.ts: pure TS, no DOM needed.
    // afsl-gate.test.ts: pglite (node-side DB), no DOM needed.
    environment: 'node',
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
