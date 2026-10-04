// @file ui/overlay-theme.test.ts
// @description Overlay surfaces follow the host's light/dark tokens. Every floating layer
//   (dialog, popover, menus, sheet, hover card, command, the floating ContextToolbar) paints
//   the popover material, `bg-ripple-popover text-ripple-popover-foreground`, and theme.css
//   aliases that pair to the host's shadcn `--popover` / `--popover-foreground`. So a light
//   host gets light overlays and a dark host dark ones, with no colour fixed in ripple.
//   Text drawn ON popover material uses the popover ink, not the card's
//   (`text-ripple-surface-foreground`): the two only coincide while a host's popover and card
//   match, and split (dark text on a dark menu) wherever they don't.
//
//   jsdom resolves neither Tailwind utilities nor custom properties, so a computed-style check
//   is not available here; this is a static scan of the class strings, the same approach as
//   ui/status-text.test.ts.
import { test, expect } from 'vitest';

async function read(path: string): Promise<string> {
  // @ts-ignore ripple's tsconfig has no node types.
  const { readFileSync } = await import('node:fs');
  return readFileSync(path, 'utf8');
}

const SURFACES = [
  'src/lib/components/ui/dialog/dialog-content.svelte',
  'src/lib/components/ui/popover/popover-content.svelte',
  'src/lib/components/ui/context-menu/context-menu-content.svelte',
  'src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte',
  'src/lib/components/ui/sheet/sheet-content.svelte',
  'src/lib/components/ui/hover-card/hover-card-content.svelte',
  'src/lib/components/ui/command/command.svelte',
  'src/lib/widgets/craft/ContextToolbar.svelte',
];

/* A colour that ignores the host theme: a palette literal, a raw colour value or a `dark:` fork. */
const FIXED = /\b(?:bg|text|ring|border|fill|stroke)-(?:black|white|zinc|neutral|gray|slate|stone)\b|#[0-9a-fA-F]{3,8}\b|\boklch\(|\brgba?\(|\bdark:/g;

/** The quoted strings in a component's markup and script (class lists live there), header comment dropped. */
function classStrings(src: string): string {
  return (src.replace(/^<!--[\s\S]*?-->/, '').match(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g) ?? []).join('\n');
}

test('theme.css aliases the popover material to the host shadcn popover pair', async () => {
  const css = await read('src/lib/theme.css');
  expect(css).toMatch(/--ripple-popover:\s*var\(--popover\);/);
  expect(css).toMatch(/--ripple-popover-foreground:\s*var\(--popover-foreground\);/);
});

test('every overlay surface paints the popover material and fixes no colour', async () => {
  const problems: string[] = [];
  for (const f of SURFACES) {
    const src = await read(f);
    if (!src.includes('bg-ripple-popover') || !src.includes('text-ripple-popover-foreground')) {
      problems.push(`${f}: does not paint bg-ripple-popover + text-ripple-popover-foreground`);
    }
    for (const m of classStrings(src).match(FIXED) ?? []) problems.push(`${f}: fixed colour ${m}`);
  }
  expect(problems).toEqual([]);
});

test('text drawn on the palette and the floating toolbar uses the popover ink', async () => {
  const palette = await read('src/lib/widgets/overlay/CommandPalette.svelte');
  const toolbar = await read('src/lib/widgets/craft/ContextToolbar.svelte');
  // The palette is always inside a Dialog (popover material).
  expect(palette.match(/text-ripple-surface-foreground\S*/g) ?? []).toEqual([]);
  // The toolbar's own `>>` button sits on popover (floating) or surface (docked) material, so its
  // hover/open ink inherits the bar's instead of naming either one.
  const more = toolbar.match(/class="ml-0\.5 inline-flex[^"]*"/)?.[0] ?? '';
  expect(more).not.toBe('');
  expect(more.match(/text-ripple-surface-foreground/g) ?? []).toEqual([]);
});
