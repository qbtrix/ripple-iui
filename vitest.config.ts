// vitest.config.ts — Vitest configuration for Ripple component library.
// Created: 2026-03-27 — Initial test setup with Svelte 5 rune support.
// Updated: 2026-04-16 — Added $lib alias so tests that reach into the widget
// registry (which fans out to shadcn components using $lib/utils.js) resolve.
// Updated: 2026-05-30 — Split into two projects (RFC 12 motion, Task 1.8):
//   `client` keeps the jsdom + browser-condition setup every existing test
//   relies on; `ssr` runs *.ssr.test.ts under server resolve conditions so
//   `svelte/server` can drive the SERVER build of a component (the browser
//   build throws effect_orphan when the server renderer touches a top-level
//   $effect). This is what makes the load-bearing SSR final-frame test real.
// Updated: 2026-05-30 — RFC 12 motion, Task 1.10: also scan scripts/ for the
//   build-tooling lint-gate test (check-no-toplevel-anim-imports.test.ts) so
//   the workerd-SSR contract gate is asserted as part of `bun run test`.
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

const $lib = resolve(__dirname, 'src/lib');
const sveltePlugin = () => svelte({ compilerOptions: { runes: true }, hot: false });

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [sveltePlugin()],
        resolve: {
          alias: { $lib },
          // Browser build for the bulk of the suite (jsdom component tests +
          // shadcn fan-out via $lib/utils.js needs the browser condition).
          conditions: ['browser'],
        },
        test: {
          name: 'client',
          include: ['src/**/*.{test,spec}.ts', 'scripts/**/*.{test,spec}.ts'],
          exclude: ['src/**/*.ssr.{test,spec}.ts'],
          globals: true,
          environment: 'jsdom',
          setupFiles: ['./src/test-setup.ts'],
        },
      },
      {
        plugins: [sveltePlugin()],
        resolve: {
          alias: { $lib },
          // Server build — svelte/server renders the component with $effect
          // compiled out, so SSR shows the resting/final frame and never
          // throws effect_orphan.
          conditions: ['node'],
        },
        test: {
          name: 'ssr',
          include: ['src/**/*.ssr.{test,spec}.ts'],
          globals: true,
          environment: 'node',
        },
      },
    ],
  },
});
