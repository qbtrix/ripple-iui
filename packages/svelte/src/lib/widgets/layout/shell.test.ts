// @file widgets/layout/shell.test.ts
// @description NEW 2026-09-25 (shell new-look slice 1). Behaviour tests for the
//   three shell primitives on `./ui`: ListRow, SectionHeader and PanelHeader,
//   plus the optional per-option badge on Segmented. Written red first.
//   Activation by Enter/Space is not simulated: jsdom does not synthesize a
//   click from a key on a <button>, so the tests assert the host element IS a
//   native button/anchor, whose activation the browser owns.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import ListRow from './ListRow.svelte';
import SectionHeader from './SectionHeader.svelte';
import PanelHeader from './PanelHeader.svelte';
import Segmented from '../input/Segmented.svelte';

afterEach(cleanup);

const html = (markup: string) => createRawSnippet(() => ({ render: () => markup }));

describe('ListRow', () => {
  it('renders a <button type=button> when given onclick, and calls it', async () => {
    const onclick = vi.fn();
    const { container } = render(ListRow, { label: 'General', onclick });
    const btn = container.querySelector('button')!;
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('type')).toBe('button');
    expect(container.querySelector('a')).toBeNull();
    await fireEvent.click(btn);
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('renders an <a href> when given href', () => {
    const { container } = render(ListRow, { label: 'Settings', href: '/settings' });
    const a = container.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('/settings');
    expect(container.querySelector('button')).toBeNull();
  });

  it('marks the active row with aria-current and data-active', () => {
    const { container } = render(ListRow, { label: 'Settings', href: '/settings', active: true });
    const a = container.querySelector('a')!;
    expect(a.getAttribute('aria-current')).toBe('page');
    expect(container.querySelector('[data-active]')).not.toBeNull();
  });

  it('inactive rows carry no aria-current', () => {
    const { container } = render(ListRow, { label: 'x', onclick: () => {} });
    expect(container.querySelector('button')!.hasAttribute('aria-current')).toBe(false);
  });

  it('unread=true shows a dot; a number shows the count; 0 shows nothing', async () => {
    const { container, rerender } = render(ListRow, { label: 'x', onclick: () => {}, unread: true });
    expect(container.querySelector('[data-unread-dot]')).not.toBeNull();
    expect(container.querySelector('[data-unread-count]')).toBeNull();
    await rerender({ label: 'x', onclick: () => {}, unread: 7 });
    expect(container.querySelector('[data-unread-count]')!.textContent!.trim()).toBe('7');
    await rerender({ label: 'x', onclick: () => {}, unread: 0 });
    expect(container.querySelector('[data-unread-dot]')).toBeNull();
    expect(container.querySelector('[data-unread-count]')).toBeNull();
  });

  it('renders leading, children and meta, and truncates the label', () => {
    const { container, getByText } = render(ListRow, {
      onclick: () => {},
      leading: html('<span data-testid="lead">L</span>'),
      children: html('<span>A very long room name</span>'),
      meta: html('<span>2m</span>'),
    });
    expect(container.querySelector('[data-testid="lead"]')).not.toBeNull();
    expect(getByText('2m')).toBeTruthy();
    const label = getByText('A very long room name').closest('[data-list-row-label]')!;
    expect(label.className).toContain('truncate');
  });

  it('trailing actions sit outside the row button and can take focus', () => {
    const { container } = render(ListRow, {
      label: 'x',
      onclick: () => {},
      trailing: html('<button type="button" aria-label="Delete">d</button>'),
    });
    const del = container.querySelector('button[aria-label="Delete"]') as HTMLButtonElement;
    const host = container.querySelector('[data-list-row-host]')!;
    expect(host.contains(del)).toBe(false);
    del.focus();
    expect(document.activeElement).toBe(del);
    // Revealed on hover, and kept visible while focus is inside.
    const slot = del.closest('[data-list-row-trailing]')!;
    expect(slot.className).toContain('group-focus-within');
  });

  it('forwards aria-*, data-*, draggable, oncontextmenu and drag events to the host element', async () => {
    const oncontextmenu = vi.fn();
    const ondragstart = vi.fn();
    const { container } = render(ListRow, {
      label: 'x',
      onclick: () => {},
      'aria-label': 'Room x',
      'data-testid': 'room-row',
      draggable: true,
      oncontextmenu,
      ondragstart,
    });
    const btn = container.querySelector('button')!;
    expect(btn.getAttribute('aria-label')).toBe('Room x');
    expect(btn.getAttribute('data-testid')).toBe('room-row');
    expect(btn.getAttribute('draggable')).toBe('true');
    await fireEvent.contextMenu(btn);
    await fireEvent.dragStart(btn);
    expect(oncontextmenu).toHaveBeenCalledOnce();
    expect(ondragstart).toHaveBeenCalledOnce();
  });

  it('class lands on the row wrapper', () => {
    const { container } = render(ListRow, { label: 'x', onclick: () => {}, class: 'fu-row' });
    expect(container.querySelector('.fu-row')!.hasAttribute('data-list-row')).toBe(true);
  });

  it('has a visible focus ring and a size-driven height', async () => {
    const { container, rerender } = render(ListRow, { label: 'x', onclick: () => {}, size: 'sm' });
    expect(container.querySelector('button')!.className).toContain('focus-visible:ring');
    expect(container.querySelector('[data-list-row]')!.className).toContain('h-7');
    await rerender({ label: 'x', onclick: () => {}, size: 'md' });
    expect(container.querySelector('[data-list-row]')!.className).toContain('h-8');
    await rerender({ label: 'x', onclick: () => {}, size: 'touch' });
    expect(container.querySelector('[data-list-row]')!.className).toContain('h-11');
  });

  it('indent sets the level as a CSS variable', () => {
    const { container } = render(ListRow, { label: 'x', onclick: () => {}, indent: 2 });
    const row = container.querySelector('[data-list-row]') as HTMLElement;
    expect(row.style.getPropertyValue('--list-row-indent')).toBe('2');
  });

  it('muted rows are marked', () => {
    const { container } = render(ListRow, { label: 'x', onclick: () => {}, muted: true });
    expect(container.querySelector('[data-muted]')).not.toBeNull();
  });

  it('renaming swaps the button for the host-supplied input snippet', () => {
    const onclick = vi.fn();
    const { container } = render(ListRow, {
      label: 'Old name',
      onclick,
      renaming: true,
      rename: html('<input aria-label="Rename" value="Old name" />'),
    });
    expect(container.querySelector('input[aria-label="Rename"]')).not.toBeNull();
    expect(container.querySelector('[data-list-row-host]')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });
});

describe('SectionHeader', () => {
  it('renders the label and count, not as a button when not collapsible', () => {
    const { container, getByText } = render(SectionHeader, { label: 'Rooms', count: 4 });
    expect(getByText('Rooms')).toBeTruthy();
    expect(container.querySelector('[data-section-count]')!.textContent!.trim()).toBe('4');
    expect(container.querySelector('button')).toBeNull();
  });

  it('with ontoggle it is a disclosure button carrying aria-expanded', async () => {
    const ontoggle = vi.fn();
    const { container, rerender } = render(SectionHeader, { label: 'Rooms', open: true, ontoggle, controls: 'rooms-list' });
    const btn = container.querySelector('button[aria-expanded]')!;
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(btn.getAttribute('aria-controls')).toBe('rooms-list');
    await fireEvent.click(btn);
    expect(ontoggle).toHaveBeenCalledWith(false);
    await rerender({ label: 'Rooms', open: false, ontoggle });
    expect(container.querySelector('button[aria-expanded]')!.getAttribute('aria-expanded')).toBe('false');
  });

  it('uncontrolled collapsible flips its own state', async () => {
    const { container } = render(SectionHeader, { label: 'Rooms', collapsible: true });
    const btn = container.querySelector('button[aria-expanded]')!;
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('the action snippet sits outside the toggle button', () => {
    const { container } = render(SectionHeader, {
      label: 'Rooms',
      ontoggle: () => {},
      action: html('<button type="button" aria-label="New room">+</button>'),
    });
    const toggle = container.querySelector('button[aria-expanded]')!;
    const add = container.querySelector('button[aria-label="New room"]')!;
    expect(toggle.contains(add)).toBe(false);
  });

  it('forwards data-* to the root', () => {
    const { container } = render(SectionHeader, { label: 'Rooms', 'data-testid': 'rooms-head' });
    expect(container.querySelector('[data-testid="rooms-head"]')).not.toBeNull();
  });
});

describe('PanelHeader', () => {
  it('renders title and subtitle', () => {
    const { getByText, container } = render(PanelHeader, { title: 'Thread', subtitle: '3 replies' });
    expect(container.querySelector('h2')!.textContent).toContain('Thread');
    expect(getByText('3 replies')).toBeTruthy();
  });

  it('shows a close button only when onclose is set, with an aria-label', async () => {
    const { container, rerender } = render(PanelHeader, { title: 'Thread' });
    expect(container.querySelector('button')).toBeNull();
    const onclose = vi.fn();
    await rerender({ title: 'Thread', onclose, closeLabel: 'Close thread' });
    const btn = container.querySelector('button[aria-label="Close thread"]')!;
    await fireEvent.click(btn);
    expect(onclose).toHaveBeenCalledOnce();
  });

  it('renders leading and actions snippets, and forwards data-*', () => {
    const { container } = render(PanelHeader, {
      title: 'Artifact',
      leading: html('<button type="button" aria-label="Back">&lt;</button>'),
      actions: html('<button type="button" aria-label="Download">d</button>'),
      'data-testid': 'artifact-head',
    });
    expect(container.querySelector('[aria-label="Back"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Download"]')).not.toBeNull();
    expect(container.querySelector('header[data-testid="artifact-head"]')).not.toBeNull();
  });
});

describe('Segmented badge', () => {
  it('renders an option badge when given, and nothing otherwise', () => {
    const { container } = render(Segmented, {
      options: [
        { value: 'a', label: 'Chat', badge: 3 },
        { value: 'b', label: 'Files' },
      ],
      value: 'a',
    });
    const badges = container.querySelectorAll('[data-segmented-badge]');
    expect(badges.length).toBe(1);
    expect(badges[0].textContent!.trim()).toBe('3');
  });
});
