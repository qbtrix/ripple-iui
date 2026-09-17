// src/lib/widgets/input/Switch.fill.test.ts
// Created 2026-09-17 (fix/port-gaps). An unchecked Switch measured ~1.02:1,
// thumb against track, in paw-enterprise light mode. The cause was the fills,
// not the host: the track read `--input` and the thumb read `--background`,
// both washes of the page ground (5% black and a 20%-alpha page tint in that
// host), so in a glass theme the thumb and track were the same near-white. The
// checked thumb had the same problem on the accent track (1.36:1).
//
// jsdom has no Tailwind, so this resolves which token each part fills with from
// the rendered classes — the Switch skin's `[&_[data-slot=switch-thumb]]:`
// overrides first, the primitive's own thumb classes after — and holds two
// rules: the thumb and the track never share a token, and no part of the
// control fills with a page-ground token, which is transparent in a glass host.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Switch from './Switch.svelte';

const THUMB = '[&_[data-slot=switch-thumb]]:';
const GROUND = ['background', 'input'];

/** Light-mode fill token of a class list for a state: last match wins, alpha and `!` dropped. */
function pick(classes: string[], prefixes: string[]): string | undefined {
  for (const p of prefixes) {
    const hit = classes.filter((c) => c.startsWith(`${p}bg-`)).pop();
    if (hit) return hit.slice(p.length + 3).replace(/!$/, '').replace(/\/\d+$/, '');
  }
  return undefined;
}

function fills(checked: boolean) {
  const { container } = render(Switch, { props: { checked } });
  const root = container.querySelector('[role="switch"]')!.getAttribute('class')!.split(/\s+/);
  const thumb = container
    .querySelector('[data-slot="switch-thumb"]')!
    .getAttribute('class')!
    .split(/\s+/);
  const state = checked ? 'checked' : 'unchecked';
  return {
    track: pick(root, [`data-[state=${state}]:`]),
    thumb:
      pick(root, [`${THUMB}data-[state=${state}]:`, THUMB]) ??
      pick(thumb, [`data-[state=${state}]:`, '']),
  };
}

describe('Switch fills', () => {
  it('gives the unchecked thumb and track different tokens, neither the page ground', () => {
    const { track, thumb } = fills(false);
    expect(track).toBeTruthy();
    expect(thumb).toBeTruthy();
    expect(thumb).not.toBe(track);
    expect(GROUND).not.toContain(track);
    expect(GROUND).not.toContain(thumb);
  });

  it('never fills the checked thumb with the page ground', () => {
    const { thumb } = fills(true);
    expect(GROUND).not.toContain(thumb);
  });
});
