// widgets/overlay/CommandPalette.test.ts — palette-search ranking, and the
// palette's sections, recents, caps, keyboard, triggers and async hooks. The last
// test pins the deferred bits-ui body-style restore inside the suite's drain
// window (the old intermittent "document is not defined" CI flake).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { preparePalette, searchPalette, scorePalette } from './palette-search.js';
import { drainDeferredOverlayTeardown } from '../../../test-setup.js';
import CommandPalette from './CommandPalette.svelte';

const commands = [
  { id: 'new-doc', label: 'New document', group: 'File', shortcut: '⌘N' },
  { id: 'open', label: 'Open file...', group: 'File' },
  { id: 'settings', label: 'Open settings', group: 'App', keywords: ['preferences'] },
  { id: 'theme', label: 'Toggle theme', group: 'App' }
];

afterEach(cleanup);

describe('palette-search', () => {
  const items = [
    { id: 'front', label: 'Bring to front', group: 'Commands', menu: 'Object > Arrange', shortcut: '⇧⌘]' },
    { id: 'frontier', label: 'Frontier banner', group: 'Templates' },
    { id: 'del', label: 'Delete', group: 'Commands', aliases: ['remove', 'bin'] },
    { id: 'diya', label: 'Diya lamp', group: 'Elements', keywords: ['diwali', 'festival'] },
    { id: 'hidden', label: 'Front secret', disabled: true },
  ];
  const index = preparePalette(items);
  const ids = (q: string) => searchPalette(index, q).items.map((i) => i.id);

  it('ranks a label prefix above a later word start', () => {
    expect(ids('front')).toEqual(['frontier', 'front']);
    expect(ids('bring')[0]).toBe('front');
  });

  it('matches aliases, the menu path and keywords', () => {
    expect(ids('bin')[0]).toBe('del');
    expect(ids('arrange')).toEqual(['front']);
    expect(ids('diwali')).toEqual(['diya']);
  });

  it('needs every token to match', () => {
    expect(ids('front arrange')).toEqual(['front']);
    expect(ids('front diwali')).toEqual([]);
  });

  it('falls back to an in-order fuzzy match on the label', () => {
    expect(ids('btf')).toEqual(['front']);
    expect(scorePalette(index[0], 'zzz')).toBe(0);
  });

  it('drops disabled items', () => {
    expect(ids('secret')).toEqual([]);
  });

  it('caps a large source at the limit and reports the full count', () => {
    const big = preparePalette(Array.from({ length: 1600 }, (_, i) => ({ id: `c${i}`, label: `Command ${i}`, group: 'Commands' })));
    const r = searchPalette(big, 'command', 50);
    expect(r.items).toHaveLength(50);
    expect(r.total).toBe(1600);
  });
});

describe('CommandPalette', () => {
  it('does not render content when closed', () => {
    const { container } = render(CommandPalette, {
      props: { value: false, commands }
    });
    expect(container.textContent).not.toContain('New document');
  });

  it('renders all commands grouped when open with empty query', () => {
    const { getByText } = render(CommandPalette, {
      props: { value: true, commands }
    });
    expect(getByText('New document')).not.toBeNull();
    expect(getByText('Open file...')).not.toBeNull();
    expect(getByText('Open settings')).not.toBeNull();
    expect(getByText('File')).not.toBeNull();
    expect(getByText('App')).not.toBeNull();
  });

  it('shows shortcut hints when provided', () => {
    const { getByText } = render(CommandPalette, {
      props: { value: true, commands }
    });
    expect(getByText('⌘N')).not.toBeNull();
  });

  const content = [
    { id: 'tpl-diwali', label: 'Diwali offer banner', group: 'Templates', thumb: 'data:image/png;base64,' },
    { id: 'dup', label: 'Duplicate', group: 'Commands', shortcut: '⌘D', aliases: ['copy'] },
    { id: 'el-diya', label: 'Diya', group: 'Elements', keywords: ['lamp'] },
    { id: 'pg-2', label: 'Page 2', group: 'Pages' },
  ];
  const groupOrder = ['Commands', 'Templates', 'Elements', 'Pages'];
  const headings = () => [...document.querySelectorAll('[role="listbox"] [role="group"] > [id*="-g-"]')].map((h) => h.firstElementChild!.textContent);

  it('orders sections by `groups` and shows recents first on an empty query', () => {
    render(CommandPalette, { props: { value: true, commands: content, groups: groupOrder, recent: ['el-diya'] } });
    expect(headings()).toEqual(['Recent', 'Commands', 'Templates', 'Elements', 'Pages']);
  });

  it('limits each section on an empty query and says how many more there are', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, label: `Cmd ${i}`, group: 'Commands' }));
    const { getByText } = render(CommandPalette, { props: { value: true, commands: many, groupLimit: 4 } });
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(4);
    getByText('+5 more, type to search');
  });

  it('renders at most `limit` rows for a query and says how many matched', () => {
    const many = Array.from({ length: 120 }, (_, i) => ({ id: `c${i}`, label: `Cmd ${i}`, group: 'Commands' }));
    const { getByText } = render(CommandPalette, { props: { value: true, commands: many, limit: 20, query: 'cmd' } });
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(20);
    getByText('Showing 20 of 120. Keep typing to narrow.');
  });

  it('arrows move the active option in display order and Enter picks it', async () => {
    const onselect = vi.fn();
    const { getByRole } = render(CommandPalette, { props: { value: true, commands: content, groups: groupOrder, onselect } });
    const input = getByRole('combobox');
    const active = () => document.getElementById(input.getAttribute('aria-activedescendant')!)!.textContent;
    expect(active()).toContain('Duplicate');
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(active()).toContain('Diwali offer banner');
    await fireEvent.keyDown(input, { key: 'ArrowUp' });
    await fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(active()).toContain('Page 2');
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(onselect).toHaveBeenCalledWith('pg-2', expect.objectContaining({ id: 'pg-2' }));
  });

  it('searches aliases and fires onquery as the person types', async () => {
    const onquery = vi.fn();
    const { getByRole } = render(CommandPalette, { props: { value: true, commands: content, onquery } });
    const input = getByRole('combobox') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'copy' } });
    flushSync();
    expect(onquery).toHaveBeenLastCalledWith('copy');
    const opts = document.querySelectorAll('[role="option"]');
    expect(opts).toHaveLength(1);
    expect(opts[0].textContent).toContain('Duplicate');
  });

  it('shows a thumbnail for content items', () => {
    render(CommandPalette, { props: { value: true, commands: content } });
    const row = document.querySelector('[role="option"]')!;
    expect(row.querySelector('img')).not.toBeNull();
  });

  it('`slash` opens on / outside text fields, but not while typing', async () => {
    const onchange = vi.fn();
    render(CommandPalette, { props: { commands: content, slash: true, onchange } });
    const field = document.createElement('input');
    document.body.appendChild(field);
    await fireEvent.keyDown(field, { key: '/' });
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.keyDown(document.body, { key: '/' });
    expect(onchange).toHaveBeenCalledWith(true);
    field.remove();
  });

  it('shows a polite Searching row while loading', () => {
    const { getByRole } = render(CommandPalette, { props: { value: true, commands: [], loading: true, query: 'sh' } });
    expect(getByRole('status').textContent).toBe('Searching…');
  });

  // Regression guard for the CI flake (run 30780187819 / PR #95): unhandled
  // `ReferenceError: document is not defined` with no failing assertion.
  //
  // An open palette holds a bits-ui body-scroll-lock. Releasing that lock does
  // not restore the body style synchronously — it schedules the restore ~24ms
  // out, and the callback reaches for `document.body`. Unmount alone therefore
  // leaves DOM-touching work in flight, and when the file's last test did that,
  // vitest could tear jsdom down first and the timer threw into a dead
  // environment. Rare because it needed the environment to vanish inside a
  // 24ms window; more likely on loaded Linux runners than on a dev machine.
  //
  // If bits-ui ever pushes that deferral past the drain budget, this test goes
  // red deterministically instead of the whole suite going red at random.
  it('finishes its deferred body-style restore inside the drain window', async () => {
    // Settle anything the earlier tests in this file left pending, so the
    // assertions below describe only this mount.
    await drainDeferredOverlayTeardown();

    const { unmount } = render(CommandPalette, {
      props: { value: true, commands }
    });
    await drainDeferredOverlayTeardown();
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    // The leak: still locked. The restore is a pending timer, not part of
    // unmount, so at this point DOM-touching work outlives the component.
    expect(document.body.style.overflow).toBe('hidden');

    // What the suite's `afterAll` now does before vitest destroys jsdom.
    await drainDeferredOverlayTeardown();
    expect(document.body.style.overflow).toBe('');
  });
});
