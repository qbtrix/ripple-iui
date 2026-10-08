/**
 * @file ui/ui-contract.test.ts
 * @description The contract behind the `./ui` export: every name listed there
 *   must mount as a plain Svelte component, with no `<Ripple spec>` wrapper and
 *   no renderer context.
 *
 *   Three export shapes: component, shadcn namespace (mounted through its
 *   `Root`), and the `confirmDialog` store. PROPS holds the minimum props each
 *   export needs to paint; a new export adds an entry, and existing entries
 *   only move when a prop really changes (a re-skin must leave them alone).
 *
 *   Also checked here: every `getContext` on the surface is typed optional
 *   (statically, per file and per namespace directory, so a path move cannot
 *   drop a namespace out of coverage); no packaged source uses the shorthand
 *   state variants that only resolve inside ripple's own build; and the overlay
 *   a11y basics (Dialog.Content is a modal dialog, data-testid reaches the DOM
 *   through Content wrappers, caller widths and overlayClass replace the
 *   defaults, Sheet.Content's `size` replaces its sm cap). Focus trap and Escape are bits-ui's own behaviour and are not
 *   tested here. The ResizeObserver shim lives in src/test-setup.ts.
 */
import { render, cleanup, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, expect, test } from 'vitest';
import * as ui from './index.js';
import OverlayFixture from './ui-contract-overlay.test.svelte';
import SheetWidget from '$lib/widgets/layout/Sheet.svelte';

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
  ColorPicker: { value: '#ff0000' },
  NumberInput: { value: 12 },
  ChoiceGrid: { options: [{ value: 'a4', label: 'A4', detail: '210 × 297 mm', thumb: { width: 210, height: 297 } }], value: 'a4' },
  Segmented: { options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }], value: 'a' },
  Search: { placeholder: 'Search' },
  Tabs: { tabs: [{ value: 'one', label: 'One' }], value: 'one' },
  Collapsible: { title: 'More', children: kid('body') },
  CodeBlock: { code: 'const a = 1;', language: 'ts' },
  // Diff computes its rows after a lazy import, so the mount proves the frame
  // and header; Diff.skin.test.ts covers the rows.
  Diff: { before: 'const a = 1;', after: 'const a = 2;', title: 'a.ts' },
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
  // With `rows: []` TaskRows still renders its (empty) list wrapper, so it is
  // NOT in RENDERS_NOTHING_WHEN_EMPTY. A row here so the mount proves the row
  // markup, not just the wrapper.
  TaskRows: { rows: [{ key: 'verify', label: 'Verified vendor records', status: 'done' }] },
  // PromptBar paints its composer with no props at all; the placeholder just
  // makes the mounted output legible if this ever fails.
  PromptBar: { placeholder: 'Ask anything' },
  // AnswerBlock paints its body wrapper and action row with no props, but a
  // body segment here means the mount proves the StreamText composition too —
  // the part that would break if StreamText's shape ever moved under it.
  AnswerBlock: { body: [{ text: 'Pistachio is the fastest-growing flavor.' }] },
  // PixelLoader paints its grid, label and timer with no props; the label is
  // here so the mounted output names itself if this ever fails.
  PixelLoader: { label: 'Churning' },
  // A removal and an addition, so the mount proves the checkbox column and the
  // footer, not just an empty table.
  DiffTable: {
    columns: [{ key: 'flavor', label: 'Flavor' }],
    rows: [
      { key: 'rocky', cells: { flavor: 'Rocky Road' }, change: 'removed' },
      { key: 'pistachio', cells: { flavor: 'Pistachio' }, change: 'added' },
    ],
  },
  // ContextCards paints its header with no chunks; one chunk here so the mount
  // proves the card and the SourceChip composition as well.
  ContextCards: { chunks: [{ title: 'Vendor rule', body: 'Verify cold-chain first.', source: 'SOP.pdf' }] },
  // RecommendationCard paints its question with no options; one option here so
  // the mount proves the Chip composition and the footer too.
  RecommendationCard: {
    title: 'Place this order?',
    options: [{ key: 'a', body: [{ text: 'Reorder from ' }, { entity: 'Cone King' }], signal: 3 }],
  },
  // FineTuneCard paints its frame, fields and select from defaults alone; the
  // title makes the mounted output legible if this ever fails.
  FineTuneCard: { labels: { title: 'Flavor card' } },
  // SelectionActions renders its passage wrapper; the toolbar only exists once
  // text is selected, so the passage is what proves the mount.
  SelectionActions: { children: kid('Pistachio holds the top slot all weekend.') },
  Input: { value: '' },
  Textarea: { value: '' },
  Separator: {},
  Skeleton: {},
  // Shimmer paints a sweeping gradient through its children's glyphs; with no
  // child it still renders its own span, so it is not exempt below.
  Shimmer: { children: kid('shimmering') },
  // Both paint with no props; these make the mounted output name itself.
  Switch: { label: 'Notifications' },
  Checkbox: { label: 'Include in the merge' },
  ProgressRing: { value: 40 },
  // The shell exports. Each paints with just its label or title.
  Kbd: { keys: ['⌘', 'K'] },
  ListRow: { label: 'General' },
  SectionHeader: { label: 'Rooms', count: 4 },
  PanelHeader: { title: 'Thread' },
  // The feature-page exports.
  PageHeader: { title: 'Agents' },
  InlineAlert: { title: 'Could not load agents', tone: 'error' },
  // The call parts (2026-09-30). CountBadge paints only with a count.
  CountBadge: { count: 3 },
  ControlButton: { 'aria-label': 'Mute' },
  ControlBar: { label: 'Call controls' },
  ParticipantTile: { name: 'Ada Lovelace' },
  IncomingCallCard: { title: 'Maya Chen', subtitle: 'Incoming call' },
  FloatingDock: { label: 'Call dock' },
  BottomSheet: { label: 'Call chat' },
  // The craft editor parts. Each paints its own frame with these alone.
  ToolRail: { tools: [{ id: 'pen', label: 'Pen', hotkey: 'p' }], active: 'pen' },
  PropertyRow: { label: 'Width', children: kid('120') },
  InspectorSection: { title: 'Fill', children: kid('row') },
  CanvasViewport: { docWidth: 800, docHeight: 600 },
  EditorShell: { children: kid('canvas') },
  TransformBox: { rect: { x: 10, y: 10, width: 80, height: 30 }, zoom: 1, panX: 0, panY: 0 },
  Tree: { nodes: [{ id: 'a', label: 'Layer 1', visible: true }] },
  // Closed, the palette is a Dialog.Root around a closed portal: it renders
  // nothing, like the overlay namespaces (see RENDERS_NOTHING_WHEN_EMPTY).
  CommandPalette: { commands: [{ id: 'dup', label: 'Duplicate', group: 'Commands' }] },
  // Docked, so it paints in flow without an anchor or a measured parent.
  ContextToolbar: { variant: 'docked', children: kid('Font') },
  PageStrip: { pages: [{ id: 'p1' }, { id: 'p2' }], current: 'p1' },
  AssetPanel: { tabs: [{ id: 'templates', label: 'Templates' }], items: { templates: [{ id: 't1', label: 'Diwali offer' }] } },
  // bits-ui's Slider.Root is a union on `type`; it paints its track.
  Slider: { type: 'single', value: 1, max: 2 },
};

/** Exported by name but not mountable: the confirm-dialog store. */
const STORES = new Set(['confirmDialog']);
/** Plain helpers and constants beside a component: AssetPanel's drag contract. */
const HELPERS = new Set(['ASSET_MIME', 'readAssetDrop', 'isAssetDrag']);
const names = Object.keys(ui).filter((n) => !STORES.has(n) && !HELPERS.has(n)).sort();
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
// Wider than SOURCES on purpose: `./editor` ships .svelte files too, and every
// packaged component has to carry its own variant meaning, not just the ./ui ones.
const ALL_SVELTE = import.meta.glob('../**/*.svelte', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

test('no library source relies on the shorthand state variants from styles.css', () => {
  const shorthand =
    /\bdata-(open|closed|checked|unchecked|active|inactive|vertical|horizontal):/g;
  expect(Object.keys(ALL_SVELTE).length).toBeGreaterThan(Object.keys(SOURCES).length);
  const offenders: string[] = [];
  for (const [rel, src] of Object.entries(ALL_SVELTE)) {
    for (const m of src.matchAll(shorthand)) offenders.push(`${rel} ${m[0]}`);
  }
  expect(offenders).toEqual([]);
});

test('the ./ui surface is not empty and every name is a component, namespace or store', () => {
  expect(names.length).toBeGreaterThanOrEqual(25);
  for (const n of components) expect(typeof (ui as never)[n]).toBe('function');
  expect(namespaces.sort()).toEqual(
    ['Command', 'ConfirmDialog', 'ContextMenu', 'Dialog', 'DropdownMenu', 'HoverCard', 'Popover', 'Sheet', 'Slider', 'Tooltip']
  );
  for (const n of namespaces) expect(typeof entry(n), `${n} has no Root`).toBe('function');
  expect(typeof ui.confirmDialog).toBe('function');
  expect(typeof ui.ASSET_MIME).toBe('string');
  for (const h of ['readAssetDrop', 'isAssetDrag'] as const) expect(typeof ui[h]).toBe('function');
});

/**
 * Bus- or collection-driven containers legitimately render nothing when empty,
 * and so does every overlay Root (and CommandPalette, a closed Dialog.Root): it is a context provider around a closed
 * portal. `Command.Root` is the exception — it paints its own frame.
 */
const RENDERS_NOTHING_WHEN_EMPTY = new Set(['Toast', 'CommandPalette', ...namespaces.filter((n) => n !== 'Command')]);

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

test('Sheet.Content keeps the sm cap by default and `size` replaces it', () => {
  render(OverlayFixture, { props: { kind: 'sheet', testid: 'sheet-default' } });
  const base = document.body.querySelector('[data-testid="sheet-default"]')!.className;
  expect(base).toContain('data-[side=right]:sm:max-w-sm');
  expect(base).toContain('data-[side=left]:sm:max-w-sm');
  cleanup();

  render(OverlayFixture, { props: { kind: 'sheet', testid: 'sheet-wide', size: '3xl' } });
  const wide = document.body.querySelector('[data-testid="sheet-wide"]')!;
  expect(wide.className).toContain('data-[side=right]:sm:max-w-3xl');
  expect(wide.className).toContain('data-[side=left]:sm:max-w-3xl');
  expect(wide.className).not.toMatch(/max-w-sm\b/);
  expect(wide.getAttribute('data-size')).toBe('3xl');
});

test('the sheet widget forwards `size` to Sheet.Content', () => {
  render(SheetWidget, { props: { open: true, size: 'xl', id: 'sheet-widget' } });
  const cls = document.body.querySelector('[data-slot="sheet-content"]')!.className;
  expect(cls).toContain('data-[side=right]:sm:max-w-xl');
  expect(cls).not.toMatch(/max-w-sm\b/);
});

test('Dialog.Content overlayClass reaches the overlay and can replace its z-index (canon gaps 2)', () => {
  render(OverlayFixture, { props: { kind: 'dialog', testid: 'dlg-z', contentClass: 'z-[100]', overlayClass: 'z-[100] bg-black/40' } });
  const overlay = document.body.querySelector('[data-slot="dialog-overlay"]')!;
  expect(overlay.className).toContain('z-[100]');
  expect(overlay.className).toContain('bg-black/40');
  expect(overlay.className).not.toMatch(/\bz-50\b/);
  expect(screen.getByRole('dialog').className).toContain('z-[100]');
});
