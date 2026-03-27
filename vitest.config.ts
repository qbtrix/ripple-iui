// vitest.config.ts — Vitest configuration for Ripple component library.
// Created: 2026-03-27 — Initial test setup with Svelte 5 rune support.
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: { runes: true },
      // Hot module replacement off for tests
      hot: false,
    }),
  ],
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    globals: true,
  },
});
