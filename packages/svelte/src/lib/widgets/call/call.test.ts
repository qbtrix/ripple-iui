// @file widgets/call/call.test.ts
// @description NEW 2026-09-30 (call UI new look, slice 0). Behaviour tests for the
//   call parts on `./ui`: ControlButton, ControlBar, CountBadge, ParticipantTile,
//   FloatingDock, IncomingCallCard and BottomSheet, plus the `success` variant on
//   the primitives Button. Written red first. Pure presentation: no media, no
//   LiveKit. Layout (rects) is stubbed where jsdom has none; CSS-only behaviour
//   (the bar label hiding under 640px, the glows) is not asserted here.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import ControlButton from './ControlButton.svelte';
import ControlBar from './ControlBar.svelte';
import CountBadge from './CountBadge.svelte';
import ParticipantTile from './ParticipantTile.svelte';
import FloatingDock from './FloatingDock.svelte';
import IncomingCallCard from './IncomingCallCard.svelte';
import BottomSheet from './BottomSheet.svelte';
import { Button } from '../../components/ui/button/index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const html = (markup: string) => createRawSnippet(() => ({ render: () => markup }));

describe('ControlButton', () => {
  it('is a native button that forwards attrs and fires onclick', async () => {
    const onclick = vi.fn();
    const { container } = render(ControlButton, {
      'aria-label': 'Mute',
      'data-testid': 'mic',
      onclick,
      icon: html('<svg data-icon></svg>'),
    });
    const btn = container.querySelector('button')!;
    expect(btn.getAttribute('type')).toBe('button');
    expect(btn.getAttribute('aria-label')).toBe('Mute');
    expect(btn.getAttribute('data-testid')).toBe('mic');
    expect(btn.querySelector('[data-icon]')).not.toBeNull();
    await fireEvent.click(btn);
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('reflects pressed as aria-pressed on/off, and omits it when unset', async () => {
    const { container, rerender } = render(ControlButton, { 'aria-label': 'Camera', pressed: true });
    const btn = container.querySelector('button')!;
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    await rerender({ 'aria-label': 'Camera', pressed: false });
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    await rerender({ 'aria-label': 'Camera', pressed: undefined });
    expect(btn.hasAttribute('aria-pressed')).toBe(false);
  });

  it('exposes tone, size and variant as data attributes', () => {
    const { container } = render(ControlButton, {
      'aria-label': 'Leave',
      tone: 'danger',
      size: 'compact',
      variant: 'pill',
    });
    const btn = container.querySelector('button')!;
    expect(btn.dataset.tone).toBe('danger');
    expect(btn.dataset.size).toBe('compact');
    expect(btn.dataset.variant).toBe('pill');
  });

  it('shows the text label only in the bar variant', async () => {
    const { container, rerender } = render(ControlButton, { 'aria-label': 'Mute', label: 'Mute', variant: 'bar' });
    expect(container.querySelector('[data-slot="control-label"]')!.textContent).toBe('Mute');
    await rerender({ 'aria-label': 'Mute', label: 'Mute', variant: 'classic' });
    expect(container.querySelector('[data-slot="control-label"]')).toBeNull();
    await rerender({ 'aria-label': 'Mute', label: 'Mute', variant: 'pill' });
    expect(container.querySelector('[data-slot="control-label"]')).toBeNull();
  });

  it('forwards disabled to the native button (the browser then blocks clicks)', () => {
    const { container } = render(ControlButton, { 'aria-label': 'Share', disabled: true });
    expect(container.querySelector('button')!.disabled).toBe(true);
  });

  it('renders a count badge with a caller test id', () => {
    const { container } = render(ControlButton, {
      'aria-label': 'Open chat',
      count: 3,
      badgeTestId: 'call-chat-badge',
    });
    expect(container.querySelector('[data-testid="call-chat-badge"]')!.textContent!.trim()).toBe('3');
  });
});

describe('ControlBar', () => {
  it('is a labelled group carrying its variant and size, and renders children', () => {
    const { container } = render(ControlBar, {
      label: 'Call controls',
      variant: 'bar',
      size: 'compact',
      'data-testid': 'bar',
      children: html('<button>x</button>'),
    });
    const bar = container.querySelector('[data-testid="bar"]')!;
    expect(bar.getAttribute('role')).toBe('group');
    expect(bar.getAttribute('aria-label')).toBe('Call controls');
    expect((bar as HTMLElement).dataset.variant).toBe('bar');
    expect((bar as HTMLElement).dataset.size).toBe('compact');
    expect(bar.querySelector('button')).not.toBeNull();
  });
});

describe('CountBadge', () => {
  it('shows N, 99+ over 99, @ for a mention, and nothing for 0', async () => {
    const { container, rerender } = render(CountBadge, { count: 7, 'data-testid': 'b' });
    const text = () => container.querySelector('[data-testid="b"]')?.textContent?.trim();
    expect(text()).toBe('7');
    await rerender({ count: 99, 'data-testid': 'b' });
    expect(text()).toBe('99');
    await rerender({ count: 100, 'data-testid': 'b' });
    expect(text()).toBe('99+');
    await rerender({ count: 4, mention: true, 'data-testid': 'b' });
    expect(text()).toBe('@');
    expect(container.querySelector('[data-mention]')).not.toBeNull();
    await rerender({ count: 0, mention: false, 'data-testid': 'b' });
    expect(container.querySelector('[data-testid="b"]')).toBeNull();
    await rerender({ count: 0, mention: true, 'data-testid': 'b' });
    expect(text()).toBe('@');
  });
});

describe('ParticipantTile', () => {
  it('shows the video snippet when given, instead of the avatar', () => {
    const { container } = render(ParticipantTile, { name: 'Ada Lovelace', video: html('<video data-v></video>') });
    expect(container.querySelector('[data-v]')).not.toBeNull();
    expect(container.querySelector('[data-slot="tile-avatar"]')).toBeNull();
  });

  it('falls back to the ripple Avatar with initials, or a caller avatar snippet', async () => {
    const { container, rerender } = render(ParticipantTile, { name: 'Ada Lovelace' });
    expect(container.querySelector('[data-slot="tile-avatar"]')!.textContent).toContain('AL');
    await rerender({ name: 'Paw', avatar: html('<i data-paw></i>') });
    expect(container.querySelector('[data-paw]')).not.toBeNull();
  });

  it('marks speaking, carries skin and size, and forwards attrs', () => {
    const { container } = render(ParticipantTile, {
      name: 'Maya',
      speaking: true,
      skin: 'focus',
      size: 'lg',
      'data-testid': 'tile',
    });
    const tile = container.querySelector('[data-testid="tile"]') as HTMLElement;
    expect(tile.hasAttribute('data-speaking')).toBe(true);
    expect(tile.dataset.skin).toBe('focus');
    expect(tile.dataset.size).toBe('lg');
  });

  it('shows the name pill, a muted indicator with text, badge and menu slots', () => {
    const { container } = render(ParticipantTile, {
      name: 'Maya Chen',
      muted: true,
      badge: html('<span data-badge>Agent</span>'),
      menu: html('<button data-menu>…</button>'),
    });
    const pill = container.querySelector('[data-slot="tile-name"]')!;
    expect(pill.textContent).toContain('Maya Chen');
    expect(pill.textContent).toContain('muted');
    expect(pill.querySelector('[data-badge]')).not.toBeNull();
    expect(container.querySelector('[data-menu]')).not.toBeNull();
  });

  it('the orb size hides the name pill and the menu but keeps the name as a title', () => {
    const { container } = render(ParticipantTile, { name: 'Maya', size: 'orb', menu: html('<button data-menu></button>') });
    expect(container.querySelector('[data-slot="tile-name"]')).toBeNull();
    expect(container.querySelector('[data-menu]')).toBeNull();
    expect(container.firstElementChild!.getAttribute('title')).toBe('Maya');
  });
});

/** Stubs layout: a 1000x800 viewport / parent and a 200x100 dock at (100,100). */
function stubLayout(dock: HTMLElement) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this === dock) return { left: 100, top: 100, width: 200, height: 100, right: 300, bottom: 200, x: 100, y: 100 } as DOMRect;
    return { left: 0, top: 0, width: 1000, height: 800, right: 1000, bottom: 800, x: 0, y: 0 } as DOMRect;
  });
  Object.defineProperty(dock, 'offsetWidth', { configurable: true, value: 200 });
  Object.defineProperty(dock, 'offsetHeight', { configurable: true, value: 100 });
  // bounds="window" (the default) measures the viewport.
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
}

describe('FloatingDock', () => {
  it('is a labelled, focusable region starting in the given corner', () => {
    const { container } = render(FloatingDock, { label: 'Call dock', corner: 'top-left', children: html('<p>x</p>') });
    const dock = container.querySelector('[role="region"]') as HTMLElement;
    expect(dock.getAttribute('aria-label')).toBe('Call dock');
    expect(dock.tabIndex).toBe(0);
    expect(dock.dataset.corner).toBe('top-left');
  });

  it('drags, snaps to the nearer side on release and reports the position', async () => {
    const onPositionChange = vi.fn();
    const { container } = render(FloatingDock, { label: 'Call dock', onPositionChange, children: html('<p>x</p>') });
    const dock = container.querySelector('[role="region"]') as HTMLElement;
    stubLayout(dock);
    await fireEvent.pointerDown(dock, { clientX: 150, clientY: 150, button: 0, pointerId: 1 });
    // grab offset 50,50 → move to (250,450) puts the dock's left at 200: nearer the left side.
    await fireEvent.pointerMove(dock, { clientX: 250, clientY: 450, pointerId: 1 });
    await fireEvent.pointerUp(dock, { clientX: 250, clientY: 450, pointerId: 1 });
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 12, y: 400 });
    expect(dock.style.left).toBe('12px');
    expect(dock.style.top).toBe('400px');
  });

  it('snaps right and clamps inside the bounds', async () => {
    const onPositionChange = vi.fn();
    const { container } = render(FloatingDock, { label: 'Call dock', onPositionChange, children: html('<p>x</p>') });
    const dock = container.querySelector('[role="region"]') as HTMLElement;
    stubLayout(dock);
    await fireEvent.pointerDown(dock, { clientX: 150, clientY: 150, button: 0, pointerId: 1 });
    await fireEvent.pointerMove(dock, { clientX: 900, clientY: 5000, pointerId: 1 });
    await fireEvent.pointerUp(dock, { pointerId: 1 });
    // right edge: 1000 - 200 - 12; bottom clamp: 800 - 100 - 12.
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 788, y: 688 });
  });

  it('ignores drags that start on a button', async () => {
    const onPositionChange = vi.fn();
    const { container } = render(FloatingDock, { label: 'Call dock', onPositionChange, children: html('<button data-b>b</button>') });
    const dock = container.querySelector('[role="region"]') as HTMLElement;
    stubLayout(dock);
    const btn = container.querySelector('[data-b]')!;
    await fireEvent.pointerDown(btn, { clientX: 150, clientY: 150, button: 0, pointerId: 1 });
    await fireEvent.pointerMove(dock, { clientX: 400, clientY: 400, pointerId: 1 });
    await fireEvent.pointerUp(dock, { pointerId: 1 });
    expect(onPositionChange).not.toHaveBeenCalled();
    expect(dock.style.left).toBe('');
  });

  it('re-clamps on window resize', async () => {
    const onPositionChange = vi.fn();
    const { container } = render(FloatingDock, { label: 'Call dock', onPositionChange, children: html('<p>x</p>') });
    const dock = container.querySelector('[role="region"]') as HTMLElement;
    stubLayout(dock);
    await fireEvent.pointerDown(dock, { clientX: 150, clientY: 150, button: 0, pointerId: 1 });
    await fireEvent.pointerMove(dock, { clientX: 900, clientY: 700, pointerId: 1 });
    await fireEvent.pointerUp(dock, { pointerId: 1 });
    // The bounds shrink to 500x400.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this === dock) return { left: 0, top: 0, width: 200, height: 100 } as DOMRect;
      return { left: 0, top: 0, width: 500, height: 400, right: 500, bottom: 400, x: 0, y: 0 } as DOMRect;
    });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 });
    await fireEvent(window, new Event('resize'));
    expect(dock.style.left).toBe('288px');
    expect(dock.style.top).toBe('288px');
  });

  it('moves with the arrow keys when the region itself has focus', async () => {
    const onPositionChange = vi.fn();
    const { container } = render(FloatingDock, { label: 'Call dock', onPositionChange, children: html('<p>x</p>') });
    const dock = container.querySelector('[role="region"]') as HTMLElement;
    stubLayout(dock);
    await fireEvent.keyDown(dock, { key: 'ArrowUp' });
    // From the dock's rect (100,100): up by 16.
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 100, y: 84 });
  });
});

describe('IncomingCallCard', () => {
  it('is an alert with title, subtitle, avatar and both action snippets', () => {
    const { container } = render(IncomingCallCard, {
      title: 'Maya Chen',
      subtitle: 'Incoming call',
      'data-testid': 'incoming',
      primary: html('<button data-accept>Accept</button>'),
      secondary: html('<button data-decline>Decline</button>'),
    });
    const card = container.querySelector('[data-testid="incoming"]')!;
    expect(card.getAttribute('role')).toBe('alert');
    expect(card.textContent).toContain('Maya Chen');
    expect(card.textContent).toContain('Incoming call');
    expect(card.querySelector('[data-accept]')).not.toBeNull();
    expect(card.querySelector('[data-decline]')).not.toBeNull();
    expect(card.querySelector('[data-slot="call-card-halo"]')).not.toBeNull();
  });

  it('takes a status role and drops the halo for joinable / rejoin cards', () => {
    const { container } = render(IncomingCallCard, { title: 'Call in progress', role: 'status', halo: false });
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="call-card-halo"]')).toBeNull();
  });
});

describe('Button success variant (primitives)', () => {
  it('paints with the ripple success tokens', () => {
    const { container } = render(Button, { variant: 'success', children: html('<span>Accept</span>') });
    expect(container.querySelector('button')!.className).toContain('bg-ripple-success');
  });
});

describe('BottomSheet', () => {
  const setup = (props: Record<string, unknown> = {}) => {
    const onStopChange = vi.fn();
    const r = render(BottomSheet, {
      label: 'Call chat',
      handleTestId: 'handle',
      onStopChange,
      children: html('<p data-body>body</p>'),
      ...props,
    });
    const sheet = r.container.querySelector('[data-slot="bottom-sheet"]') as HTMLElement;
    const handle = r.container.querySelector('[data-testid="handle"]') as HTMLElement;
    return { ...r, sheet, handle, onStopChange };
  };

  it('is a labelled, non-modal region starting at peek', () => {
    const { sheet } = setup();
    expect(sheet.dataset.state).toBe('peek');
    expect(sheet.getAttribute('aria-label')).toBe('Call chat');
    expect(sheet.getAttribute('role')).toBe('region');
    expect(sheet.hasAttribute('aria-modal')).toBe(false);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('Enter/Space toggle peek → half → full → half and keep the content mounted', async () => {
    const { sheet, handle, container, onStopChange } = setup();
    const body = container.querySelector('[data-body]');
    await fireEvent.keyDown(handle, { key: 'Enter' });
    expect(sheet.dataset.state).toBe('half');
    await fireEvent.keyDown(handle, { key: ' ' });
    expect(sheet.dataset.state).toBe('full');
    await fireEvent.keyDown(handle, { key: 'Enter' });
    expect(sheet.dataset.state).toBe('half');
    expect(onStopChange.mock.calls.map((c) => c[0])).toEqual(['half', 'full', 'half']);
    expect(container.querySelector('[data-body]')).toBe(body);
  });

  it('ArrowUp / ArrowDown step between stops and stop at the ends', async () => {
    const { sheet, handle } = setup({ stop: 'half' });
    await fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(sheet.dataset.state).toBe('full');
    await fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(sheet.dataset.state).toBe('full');
    await fireEvent.keyDown(handle, { key: 'ArrowDown' });
    await fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(sheet.dataset.state).toBe('peek');
    await fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(sheet.dataset.state).toBe('peek');
  });

  it('a drag past 48px moves one stop; under 6px is a tap; in between does nothing', async () => {
    const { sheet, handle } = setup();
    await fireEvent.pointerDown(handle, { clientY: 500, button: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientY: 440, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientY: 440, pointerId: 1 });
    expect(sheet.dataset.state).toBe('half');
    await fireEvent.pointerDown(handle, { clientY: 500, button: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientY: 520, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientY: 520, pointerId: 1 });
    expect(sheet.dataset.state).toBe('half');
    await fireEvent.pointerDown(handle, { clientY: 500, button: 0, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientY: 502, pointerId: 1 });
    expect(sheet.dataset.state).toBe('full');
    await fireEvent.pointerDown(handle, { clientY: 300, button: 0, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientY: 400, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientY: 400, pointerId: 1 });
    expect(sheet.dataset.state).toBe('half');
  });

  it('labels the handle per stop through handleLabel', async () => {
    const { handle } = setup({ handleLabel: (s: string) => `chat ${s}` });
    expect(handle.getAttribute('aria-label')).toBe('chat peek');
    await fireEvent.keyDown(handle, { key: 'Enter' });
    expect(handle.getAttribute('aria-label')).toBe('chat half');
  });
});
