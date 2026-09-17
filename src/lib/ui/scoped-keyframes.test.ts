// @file ui/scoped-keyframes.test.ts
// @description NEW (2026-09-17). Repo-wide guard for a silent animation bug.
//   PixelLoader shipped with a dead grid: its cells named their keyframe from an
//   inline `style:animation`, Svelte had renamed that keyframe to a hashed name
//   in the scoped stylesheet, and nothing rewrote the inline reference. The
//   browser dropped the animation with no error, and the component tests passed
//   because they only read the inline string.
//
//   This walks every .svelte file under src/lib, collects the text of every
//   inline style it writes (style: directives and style attributes, on elements
//   and components alike), and fails naming the file if any of it names a
//   keyframe that the same component's compiled CSS only declares under a hashed
//   name. The fix for an offender is to keep the name in the stylesheet and pass
//   only per-element values through custom properties, as ToolCall and TaskRows
//   do with --i.
import { test, expect } from 'vitest';
import { parse } from 'svelte/compiler';
import { danglingKeyframes } from './__fixtures__/scoped-keyframes.js';

// Same reach as ui-contract.test.ts's ALL_SVELTE: every packaged component.
const ALL_SVELTE = import.meta.glob('../**/*.svelte', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** The source text of every inline style a component writes, markup only. */
function inlineStyles(source: string): string {
  const found: string[] = [];
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    const n = node as { type?: string; name?: string; start?: number; end?: number };
    if (n.type === 'StyleDirective' || (n.type === 'Attribute' && n.name === 'style')) {
      found.push(source.slice(n.start, n.end));
    }
    for (const child of Object.values(n)) visit(child);
  };
  // ponytail: reads the directive's own text, so a name built in the script and
  // passed as `style:animation={anim}` gets past it. The per-component render
  // checks read the live DOM and catch that case where they exist.
  visit(parse(source, { modern: true }).fragment);
  return found.join('\n');
}

test('no inline style names a keyframe that Svelte scoped to a hashed name', () => {
  expect(Object.keys(ALL_SVELTE).length).toBeGreaterThan(300);
  const offenders = Object.entries(ALL_SVELTE).flatMap(([rel, src]) =>
    danglingKeyframes(src, inlineStyles(src)).map((name) => `${rel} names "${name}"`)
  );
  expect(offenders).toEqual([]);
});
