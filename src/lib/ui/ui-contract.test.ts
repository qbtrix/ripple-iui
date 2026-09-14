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
 *
 *   Updated 2026-09-14 (overlay canonical): the surface now carries nine overlay
 *   NAMESPACES (`Dialog.Root` …) plus the named `confirmDialog` store, so the
 *   contract has three shapes — component, namespace, store. Namespaces mount
 *   their `Root` standalone; the static context rule scans every source under
 *   the namespace's directory; and an a11y block proves `Dialog.Content` is a
 *   real modal dialog and that `data-testid` reaches the DOM through
 *   `Dialog.Content`, `Sheet.Content` and `DropdownMenu.Content` (the check that
 *   catches a wrapper dropping `{...restProps}`). Focus trap and Escape are
 *   bits-ui's own behaviour and are deliberately not tested here.
 */
import { render, cleanup, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, expect, test } from 'vitest';
import * as ui from './index.js';
import OverlayFixture from './ui-contract-overlay.test.svelte';

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

/** Exported by name but not mountable: the confirm-dialog store. */
const STORES = new Set(['confirmDialog']);
const names = Object.keys(ui).filter((n) => !STORES.has(n)).sort();
/** shadcn composable namespaces: plain objects whose `Root` is the mount entry. */
const namespaces = names.filter((n) => typeof (ui as Record<string, unknown>)[n] === 'object');
const components = names.filter((n) => !namespaces.includes(n));
/** A namespace's standalone entry: its `Root`, or the single component it wraps. */
const entry = (ns: string): unknown => {
  const mod = (ui as unknown as Record<string, Record<string, unknown>>)[ns];
  return mod.Root ?? mod[ns];
};

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
const SOURCES = import.meta.glob(['../widgets/**/*.svelte', '../components/ui/**/*.svelte'], {
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
  expect(rels.length).toBe(components.length);
  // A namespace export names a directory; every .svelte under it is on the surface.
  const dirs = [...index.matchAll(/export \* as \w+ from '(\.\.\/components\/ui\/[^']+)\/index\.js'/g)].map(
    (m) => m[1]
  );
  expect(dirs.length).toBe(namespaces.length);
  // Per-directory, not a total. A floor on the total passes even when one
  // namespace contributes zero files, which is what happens the moment a path
  // move stops the directory prefix from matching the glob keys — the rule
  // below then silently stops covering that namespace. Name the dir that broke.
  for (const dir of dirs) {
    const matched = Object.keys(SOURCES).filter((k) => k.startsWith(dir + '/'));
    expect(matched.length, `no sources found under ${dir} — the glob no longer reaches it`).toBeGreaterThan(0);
  }
  const files = [...rels, ...Object.keys(SOURCES).filter((k) => dirs.some((d) => k.startsWith(d + '/')))];

  const required: string[] = [];
  for (const rel of files) {
    const src = SOURCES[rel];
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

/**
 * The shorthand state variants (`data-open:`, `data-checked:`, `data-vertical:`
 * …) exist only because src/lib/styles.css declares them with
 * `@custom-variant`. A consumer imports `@ripple-ui/svelte/theme.css` and never
 * loads that file, so in the consumer's Tailwind build the shorthand compiles
 * to `[data-open]` — an attribute bits-ui never emits — and the rule is
 * silently dead. Overlay enter/exit animations disappeared in paw-enterprise
 * exactly this way, with no error anywhere. Library sources spell the state out.
 */
test('no library source relies on the shorthand state variants from styles.css', () => {
  const shorthand =
    /\bdata-(open|closed|checked|unchecked|active|inactive|vertical|horizontal):/g;
  const offenders: string[] = [];
  for (const [rel, src] of Object.entries(SOURCES)) {
    for (const m of src.matchAll(shorthand)) offenders.push(`${rel} ${m[0]}`);
  }
  expect(offenders).toEqual([]);
});

test('the ./ui surface is not empty and every name is a component, namespace or store', () => {
  expect(names.length).toBeGreaterThanOrEqual(25);
  for (const n of components) expect(typeof (ui as never)[n]).toBe('function');
  expect(namespaces.sort()).toEqual(
    ['Command', 'ConfirmDialog', 'ContextMenu', 'Dialog', 'DropdownMenu', 'HoverCard', 'Popover', 'Sheet', 'Tooltip']
  );
  for (const n of namespaces) expect(typeof entry(n), `${n} has no Root`).toBe('function');
  expect(typeof ui.confirmDialog).toBe('function');
});

/**
 * Bus- or collection-driven containers legitimately render nothing when empty,
 * and so does every overlay Root: it is a context provider around a closed
 * portal. `Command.Root` is the exception — it paints its own frame.
 */
const RENDERS_NOTHING_WHEN_EMPTY = new Set(['Toast', ...namespaces.filter((n) => n !== 'Command')]);

test.each(names)('%s mounts standalone, with no renderer context', (name) => {
  const Component = namespaces.includes(name) ? entry(name) : (ui as Record<string, unknown>)[name];
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

/* ── a11y: the overlay canonical ──────────────────────────────────────────
   bits-ui portals content to <body>, so query the document, not `container`. */

test('Dialog.Content inside an open Dialog.Root is a modal dialog', () => {
  render(OverlayFixture, { props: { kind: 'dialog', testid: 'dlg' } });
  const dialog = screen.getByRole('dialog');
  expect(dialog.getAttribute('aria-modal')).toBe('true');
});

test.each([
  ['dialog', 'Dialog.Content'],
  ['sheet', 'Sheet.Content'],
  ['dropdown', 'DropdownMenu.Content'],
] as const)('a custom data-testid passed to %s reaches the DOM', (kind, label) => {
  const testid = `overlay-${kind}`;
  render(OverlayFixture, { props: { kind, testid } });
  // A wrapper that drops {...restProps} loses the attribute here.
  expect(document.body.querySelector(`[data-testid="${testid}"]`), `${label} dropped data-testid`).not.toBeNull();
});

test('a caller width on Dialog.Content replaces the default instead of stacking on it', () => {
  // `cn` runs twMerge, so the caller's sm:max-w-[400px] should REPLACE the
  // base sm:max-w-sm rather than stack with it. If both land, the winner is
  // decided by Tailwind's emitted stylesheet order, not by the caller.
  render(OverlayFixture, { props: { kind: 'dialog', testid: 'dlg-w', contentClass: 'sm:max-w-[400px]' } });
  const cls = screen.getByRole('dialog').className;
  expect(cls).toContain('sm:max-w-[400px]');
  expect(cls).not.toMatch(/max-w-sm\b/);
});
