// src/routes/showcase/moving-indicator/SegmentedControl.test.ts
// @file routes/showcase/moving-indicator/SegmentedControl.test.ts
// @description jsdom wiring coverage for the SegmentedControl — the SECOND
//   consumer of the generic movingIndicator primitive (active source =
//   SELECTION, not hover). Asserts: one tab per segment, the selected segment is
//   aria-selected + tabbable, the gliding pill element is present and driven by
//   the primitive, clicking a segment moves the selection (onchange fires), and
//   arrow keys move the selection. The real pixel glide is proven in Chromium via
//   the Playwright harness (jsdom has no layout).
// @created 2026-05-30 — RFC 12: movingIndicator second consumer.

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SegmentedControl from './SegmentedControl.svelte';

const SEGS = ['Board', 'Timeline', 'Calendar', 'Table'];

describe('SegmentedControl (movingIndicator second consumer)', () => {
  it('renders one role=tab per segment', () => {
    const { container } = render(SegmentedControl, { props: { segments: SEGS } });
    expect(container.querySelectorAll('[role="tab"]').length).toBe(4);
  });

  it('marks the bound value as aria-selected and tabbable', () => {
    const { container } = render(SegmentedControl, { props: { segments: SEGS, value: 'Calendar' } });
    const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
    expect(tabs[2].getAttribute('aria-selected')).toBe('true'); // Calendar
    expect(tabs[2].getAttribute('tabindex')).toBe('0');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[0].getAttribute('tabindex')).toBe('-1');
  });

  it('mounts the gliding pill driven by movingIndicator', async () => {
    const { container } = render(SegmentedControl, { props: { segments: SEGS } });
    const pill = container.querySelector('[data-segmented-pill]') as HTMLElement;
    expect(pill).not.toBeNull();
    // The primitive positions it absolutely (set synchronously on mount).
    expect(pill.style.position).toBe('absolute');
    // It applies the glide on the mount frames (after the container + segments
    // are bound) — flush two rAFs, matching the primitive's mount re-apply.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    // Horizontal (left/width) glide on the FF fast (80ms) token.
    expect(pill.style.transition).toContain('left 80ms');
    expect(pill.style.transition).toContain('width 80ms');
  });

  it('clicking a segment moves the selection (onchange fires with the label)', async () => {
    const onchange = vi.fn();
    const { container } = render(SegmentedControl, { props: { segments: SEGS, value: 'Board', onchange } });
    const tabs = container.querySelectorAll('[role="tab"]');
    await fireEvent.click(tabs[1]); // Timeline
    expect(onchange).toHaveBeenCalledWith('Timeline');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  it('arrow keys move the selection', async () => {
    const onchange = vi.fn();
    const { container } = render(SegmentedControl, { props: { segments: SEGS, value: 'Board', onchange } });
    const tabs = container.querySelectorAll('[role="tab"]');
    await fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(onchange).toHaveBeenCalledWith('Timeline');
  });
});
