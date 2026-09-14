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
// Updated: 2026-09-14 — Alias `@ripple-ui/core` (and its subpaths) to
//   packages/core/src. Bun's `file:../core` dependency lands a nested COPY of
//   core in packages/svelte/node_modules that has no dist/ and shadows the root
//   workspace symlink, so vite's resolver hard-failed with "Failed to resolve
//   entry for package @ripple-ui/core" in 62 test files. Resolving straight to
//   source removes the build-order dependency and the stale-copy hazard.
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

const $lib = resolve(__dirname, 'src/lib');
const core = resolve(__dirname, '../core/src');
const alias = [
  { find: '$lib', replacement: $lib },
  // Mirror packages/core/package.json "exports" — `./motion` maps to engine.ts.
  { find: /^@ripple-ui\/core$/, replacement: `${core}/index.ts` },
  { find: /^@ripple-ui\/core\/headless$/, replacement: `${core}/headless/index.ts` },
  { find: /^@ripple-ui\/core\/schema$/, replacement: `${core}/schema/index.ts` },
  { find: /^@ripple-ui\/core\/motion$/, replacement: `${core}/motion/engine.ts` },
];
const sveltePlugin = () => svelte({ compilerOptions: { runes: true }, hot: false });

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [sveltePlugin()],
        resolve: {
          alias,
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
          alias,
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
