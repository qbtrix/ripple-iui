// vitest.config.ts — Vitest configuration for Ripple component library.
// Created: 2026-03-27 — Initial test setup with Svelte 5 rune support.
// Updated: 2026-04-16 — Added $lib alias so tests that reach into the widget
// registry (which fans out to shadcn components using $lib/utils.js) resolve.
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: { runes: true },
      // Hot module replacement off for tests
      hot: false,
    }),
  ],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
    },
    conditions: ['browser'],
  },
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
