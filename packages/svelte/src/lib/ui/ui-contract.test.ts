/**
 * @file ui/ui-contract.test.ts
 * @description The contract behind the `./ui` export: every name listed there
 *   must mount as a plain Svelte component, with no `<Ripple spec>` wrapper and
 *   no renderer context.
 *
 *   This is the guard for the failure that motivated the whole surface. Ripple
 *   had only ever been driven by the spec renderer, so a component could depend
 *   on renderer-supplied context, or on a prop only the renderer passes, and
 *   nothing would notice. Two such defects shipped that way. A component that
 *   reads `getContext('ui-events' | 'ui-state' | 'ui-data')` unguarded throws
 *   here rather than in a consumer's page.
 */
import { render, cleanup } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, expect, test } from 'vitest';
import * as ui from './index.js';

afterEach(cleanup);

const kid = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

/** Minimum props each export needs to render something. Absent = no props. */
const PROPS: Record<string, Record<string, unknown>> = {
  Button: { label: 'Go' },
  Chip: { label: 'tag' },
  Badge: { text: 'new' },
  StatusDot: { status: 'success' },
  Card: { title: 'Card' },
  EmptyState: { title: 'Nothing here' },
  Avatar: { name: 'Ada Lovelace' },
  Segmented: { options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }], value: 'a' },
  Search: { placeholder: 'Search' },
  Tabs: { tabs: [{ value: 'one', label: 'One' }], value: 'one' },
  Collapsible: { title: 'More', children: kid('body') },
  CodeBlock: { code: 'const a = 1;', language: 'ts' },
  Markdown: { content: '# Title' },
  Tooltip: { content: 'hint', children: kid('target') },
  Popover: { children: kid('target') },
  DropdownMenu: { items: [{ label: 'Open' }], children: kid('trigger') },
  // Toast is the container for the toast bus, not a single toast. With an
  // empty bus it correctly renders nothing, so it is exempt from the
  // renders-something assertion below — mounting without throwing is the
  // whole contract for it.
  Toast: {},
  ApprovalGate: { title: 'Deploy to production', actionId: 'act-1' },
  StreamText: { text: 'streaming' },
  ToolCall: { name: 'read_file', status: 'success' },
  ReasoningTrace: { steps: [{ title: 'Thinking' }] },
  Input: { value: '' },
  Textarea: { value: '' },
  Separator: {},
  Skeleton: {},
};

const names = Object.keys(ui).sort();

/**
 * The real context rule, checked statically.
 *
 * A mount test cannot decide this: Svelte's `getContext` returns undefined
 * rather than throwing when no provider is present, so a widget that depends on
 * renderer context still mounts cleanly and only breaks later, on the
 * interaction that uses it. `widgets/data/Table.svelte` is exactly that shape —
 * it reads `ui-events`, `ui-state` and `ui-data`, mounts fine, and falls over
 * when a row is clicked. That is why it is not on this surface.
 *
 * Reading context is not itself disqualifying. Reading it as REQUIRED is. A
 * component earns a place here if every `getContext` is typed `| undefined` and
 * guarded, so the renderer can enrich it while a hand-written caller still gets
 * a working component. Two exports do this today, both deliberately:
 *
 *   Input  — `ui-widget-registry`, to expose programmatic focus to a spec
 *            action. Guarded; a direct caller simply has no spec focusing it.
 *   Toast  — `ui-toasts`, the bus it renders. Guarded; with no bus it renders
 *            nothing, which is why it is exempt from the output assertion.
 */
// Vite's raw glob, not node:fs — ripple's tsconfig carries no node types, and
// the sources are already in the module graph.
const SOURCES = import.meta.glob('../widgets/**/*.svelte', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const INDEX = import.meta.glob('./index.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

test('every context read on the ./ui surface is optional, not required', () => {
  const index = Object.values(INDEX)[0];
  expect(index).toBeTypeOf('string');
  const rels = [...index.matchAll(/from '(\.\.\/[^']+\.svelte)'/g)].map((m) => m[1]);
  expect(rels.length).toBe(names.length);

  const required: string[] = [];
  for (const rel of rels) {
    const key = rel.replace(/^\.\./, '..');
    const src = SOURCES[key];
    expect(src, `source not found for ${rel}`).toBeTypeOf('string');
    for (const m of src.matchAll(/getContext\s*(<[^>]*>)?\s*\(/g)) {
      const typeArg = m[1] ?? '';
      // No type argument, or one that cannot be undefined, means the component
      // assumes the renderer is there.
      if (!/undefined/.test(typeArg)) required.push(`${rel} ${m[0].trim()}`);
    }
  }
  expect(required).toEqual([]);
});

test('the ./ui surface is not empty and every name is a component', () => {
  expect(names.length).toBeGreaterThanOrEqual(25);
  for (const n of names) expect(typeof (ui as never)[n]).toBe('function');
});

/** Bus- or collection-driven containers legitimately render nothing when empty. */
const RENDERS_NOTHING_WHEN_EMPTY = new Set(['Toast']);

test.each(names)('%s mounts standalone, with no renderer context', (name) => {
  const Component = (ui as Record<string, unknown>)[name];
  // Throwing here means the component needs something only <Ripple spec>
  // supplies — renderer context, or a prop the registry always passes. Either
  // way it does not belong on this surface until that dependency is guarded.
  // Not throwing IS the contract; the output check below is the stronger form
  // for everything that should paint on its own.
  const { container } = render(Component as Parameters<typeof render>[0], {
    props: PROPS[name] ?? {},
  });
  if (!RENDERS_NOTHING_WHEN_EMPTY.has(name)) {
    expect(container.firstElementChild).not.toBeNull();
  }
});
