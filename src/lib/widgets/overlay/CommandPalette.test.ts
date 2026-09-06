// src/lib/widgets/overlay/CommandPalette.test.ts
// Updated: 2026-08-03 — added the teardown regression test. This file was the
//   one intermittently emitting an unhandled `ReferenceError: document is not
//   defined` on CI: it mounts an OPEN dialog, and the body-style restore that
//   bits-ui defers past unmount could outlive the jsdom environment. The new
//   test pins the invariant the fix relies on — the restore is deferred, and it
//   settles inside `OVERLAY_TEARDOWN_DRAIN_MS`.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { drainDeferredOverlayTeardown } from '../../../test-setup.js';
import CommandPalette from './CommandPalette.svelte';

const commands = [
  { id: 'new-doc', label: 'New document', group: 'File', shortcut: '⌘N' },
  { id: 'open', label: 'Open file...', group: 'File' },
  { id: 'settings', label: 'Open settings', group: 'App', keywords: ['preferences'] },
  { id: 'theme', label: 'Toggle theme', group: 'App' }
];

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
