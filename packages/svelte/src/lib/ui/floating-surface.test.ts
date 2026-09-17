// @file ui/floating-surface.test.ts
// @description NEW (2026-09-17). Guards the fill of every layer that floats
//   over content. The captain's screenshot: PromptBar's `@` list, open in dark
//   mode, let the page text underneath read straight through it. Every floating
//   layer painted `bg-ripple-surface`, which aliases the host's `--card` — an
//   in-flow card tint (6% white in paw-enterprise dark, and fully transparent
//   inside a paw-enterprise `.ripple-root`). The host publishes the right token
//   for a layer over content, `--popover`; ripple never read it.
//
//   jsdom has no Tailwind, so a computed-style check cannot fail here. The
//   source scan can: each floating surface must fill with `bg-ripple-popover`
//   and must not fall back to the card tint, and theme.css must publish the
//   alias the utility compiles from.
import { test, expect } from 'vitest';

const SOURCES = import.meta.glob(
  [
    '../components/ui/popover/popover-content.svelte',
    '../components/ui/dropdown-menu/dropdown-menu-content.svelte',
    '../components/ui/dropdown-menu/dropdown-menu-sub-content.svelte',
    '../components/ui/context-menu/context-menu-content.svelte',
    '../components/ui/context-menu/context-menu-sub-content.svelte',
    '../components/ui/hover-card/hover-card-content.svelte',
    '../components/ui/command/command.svelte',
    '../components/ui/chart/chart-tooltip.svelte',
    '../components/ui/dialog/dialog-content.svelte',
    '../components/ui/sheet/sheet-content.svelte',
    '../widgets/ai/PromptBar.svelte',
  ],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;

/** Class text only: string literals in markup and script, not the header comment. */
const classText = (src: string) => src.replace(/<!--[\s\S]*?-->/g, '');

test('theme.css aliases the host popover token and exposes it to Tailwind', async () => {
  // vitest empties every .css import, `?raw` included, so read the file itself.
  // Tests run from the package root. ripple's tsconfig carries no node types.
  // @ts-ignore
  const { readFileSync } = await import('node:fs');
  const css: string = readFileSync('src/lib/theme.css', 'utf8');
  expect(css.length).toBeGreaterThan(0);
  expect(css).toMatch(/--ripple-popover:\s*var\(--popover\)/);
  expect(css).toMatch(/--ripple-popover-foreground:\s*var\(--popover-foreground\)/);
  expect(css).toMatch(/--color-ripple-popover:\s*var\(--ripple-popover\)/);
  expect(css).toMatch(/--color-ripple-popover-foreground:\s*var\(--ripple-popover-foreground\)/);
});

test('every floating surface fills with the popover token, not the card tint', () => {
  expect(Object.keys(SOURCES)).toHaveLength(11);
  const offenders: string[] = [];
  for (const [rel, src] of Object.entries(SOURCES)) {
    const body = classText(src);
    // PromptBar's composer body is in-flow and stays on the surface token; only
    // its listbox floats, so read that element's class alone.
    const scope = rel.endsWith('PromptBar.svelte')
      ? (body.match(/role="listbox"[\s\S]*?class="([^"]*)"/)?.[1] ?? '')
      : body;
    if (!/\bbg-ripple-popover\b/.test(scope)) offenders.push(`${rel}: no bg-ripple-popover`);
    if (/\bbg-ripple-surface\b(?!-)/.test(scope)) offenders.push(`${rel}: still bg-ripple-surface`);
  }
  expect(offenders).toEqual([]);
});
