// src/lib/widgets/input/CheckboxGroup.test.ts
// @file widgets/input/CheckboxGroup.test.ts
// @description jsdom unit coverage for the FF-ported CheckboxGroup: one
//   role=checkbox row per option, aria-checked reflects the bound value array,
//   onchange emits the toggled array (add + remove), the gliding hover highlight
//   element appears on pointer hover, and contiguous checked items collapse into
//   a single merged background. jsdom has no layout engine (offset* = 0), so the
//   ACTUAL pixel glide between items is proven in e2e/motion.spec.ts (real
//   Chromium) — here we assert the wiring + the merge logic.
// @created 2026-05-30 — RFC 12 premium pack: FF checkbox-group port (PR #45).

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CheckboxGroup from './CheckboxGroup.svelte';

const OPTS = ['Apples', 'Bananas', 'Cherries', 'Dates'];

describe('CheckboxGroup', () => {
  it('renders one role=checkbox row per option', () => {
    const { container } = render(CheckboxGroup, { props: { options: OPTS } });
    const rows = container.querySelectorAll('[data-checkbox-group-item]');
    expect(rows.length).toBe(4);
    // Each row carries role=checkbox for AT exposure.
    expect(container.querySelectorAll('[role="checkbox"][data-checkbox-group-item]').length).toBe(4);
  });

  it('reflects the bound value array via aria-checked', () => {
    const { container } = render(CheckboxGroup, {
      props: { options: OPTS, value: ['Bananas', 'Dates'] }
    });
    const rows = Array.from(container.querySelectorAll('[data-checkbox-group-item]'));
    expect(rows[0].getAttribute('aria-checked')).toBe('false'); // Apples
    expect(rows[1].getAttribute('aria-checked')).toBe('true'); // Bananas
    expect(rows[2].getAttribute('aria-checked')).toBe('false'); // Cherries
    expect(rows[3].getAttribute('aria-checked')).toBe('true'); // Dates
  });

  it('emits onchange ADDING a value when an unchecked row is clicked', async () => {
    const onchange = vi.fn();
    const { container } = render(CheckboxGroup, {
      props: { options: OPTS, value: ['Apples'], onchange }
    });
    const rows = container.querySelectorAll('[data-checkbox-group-item]');
    await fireEvent.click(rows[2]); // Cherries
    expect(onchange).toHaveBeenCalledWith(['Apples', 'Cherries']);
  });

  it('emits onchange REMOVING a value when a checked row is clicked', async () => {
    const onchange = vi.fn();
    const { container } = render(CheckboxGroup, {
      props: { options: OPTS, value: ['Apples', 'Bananas'], onchange }
    });
    const rows = container.querySelectorAll('[data-checkbox-group-item]');
    await fireEvent.click(rows[0]); // un-check Apples
    expect(onchange).toHaveBeenCalledWith(['Bananas']);
  });

  it('toggles on Space / Enter keydown', async () => {
    const onchange = vi.fn();
    const { container } = render(CheckboxGroup, {
      props: { options: OPTS, value: [], onchange }
    });
    const rows = container.querySelectorAll('[data-checkbox-group-item]');
    await fireEvent.keyDown(rows[1], { key: ' ' });
    expect(onchange).toHaveBeenCalledWith(['Bananas']);
  });

  it('does not emit when disabled', async () => {
    const onchange = vi.fn();
    const { container } = render(CheckboxGroup, {
      props: { options: OPTS, disabled: true, onchange }
    });
    const rows = container.querySelectorAll('[data-checkbox-group-item]');
    await fireEvent.click(rows[0]);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('shows the gliding hover highlight element only while an item is hovered', async () => {
    const { container } = render(CheckboxGroup, { props: { options: OPTS } });
    // No highlight at rest.
    expect(container.querySelector('[data-checkbox-group-highlight]')).toBeNull();
    // Hovering the group activates the nearest item → the highlight mounts.
    const group = container.querySelector('[role="group"]')!;
    await fireEvent.pointerMove(group, { clientY: 10 });
    // rAF-throttled — flush a frame.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(container.querySelector('[data-checkbox-group-highlight]')).not.toBeNull();
  });

  it('renders ONE merged background per contiguous checked RUN (FF parity)', () => {
    // value picks indices 0,1 (a run) and 3 (its own run) → 2 merged backgrounds,
    // not 3. (Index 2 / Cherries is unchecked, breaking the run.)
    const { container } = render(CheckboxGroup, {
      props: { options: OPTS, value: ['Apples', 'Bananas', 'Dates'] }
    });
    const merged = container.querySelectorAll('[data-checkbox-group-merged]');
    expect(merged.length).toBe(2);
  });

  it('the hover highlight transition honors the FF fast token (80ms glide)', async () => {
    const { container } = render(CheckboxGroup, { props: { options: OPTS } });
    const group = container.querySelector('[role="group"]')!;
    await fireEvent.pointerMove(group, { clientY: 10 });
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const hl = container.querySelector('[data-checkbox-group-highlight]') as HTMLElement;
    // The signature 80ms snap must be on the positional properties — this is the
    // "Apple-level" timing the whole port is about. Assert it's wired through.
    const transition = hl.getAttribute('style') ?? '';
    expect(transition).toContain('top 80ms');
    expect(transition).toContain('width 80ms');
  });
});
