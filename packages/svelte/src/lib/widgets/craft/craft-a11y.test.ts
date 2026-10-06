// widgets/craft/craft-a11y.test.ts — every control in the Quick/craft parts has its own accessible
// name: no unnamed button (an icon-only button, a bare colour swatch), and no field named by its
// unit ("pt", "mm") instead of its row's label. Renders craft-a11y.harness.test.svelte, the parts
// wired the way a host wires them, and scans every interactive element.
import { it, expect, afterEach, afterAll } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { computeAccessibleName } from 'dom-accessibility-api';
import Harness from './craft-a11y.harness.test.svelte';
import { drainDeferredOverlayTeardown } from '../../../test-setup.js';

afterEach(cleanup);
afterAll(drainDeferredOverlayTeardown);

const CONTROLS = 'button, input, select, textarea, [role="button"], [role="tab"], [role="option"], [role="combobox"], [role="slider"]';
const UNITS = new Set(['pt', 'mm', 'px', 'in', '%', '°', 'cm']);

it('names every control, and never after its unit', () => {
  render(Harness);
  flushSync();
  const problems: string[] = [];
  let scanned = 0;
  for (const el of document.body.querySelectorAll<HTMLElement>(CONTROLS)) {
    if (el.closest('[aria-hidden="true"]') || (el as HTMLInputElement).type === 'hidden') continue;
    scanned++;
    const name = computeAccessibleName(el).trim();
    const what = `<${el.tagName.toLowerCase()}${el.getAttribute('role') ? ` role=${el.getAttribute('role')}` : ''} data-slot=${el.dataset.slot ?? '-'}>`;
    if (!name) problems.push(`${what} has no accessible name`);
    else if (UNITS.has(name)) problems.push(`${what} is named by its unit "${name}"`);
  }
  expect(problems).toEqual([]);
  expect(scanned).toBeGreaterThan(15); // the scan reached every part, not an empty page
});

it('names inspector fields after their row, so two pt fields are told apart', () => {
  render(Harness);
  flushSync();
  const names = [...document.body.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]')].map((el) => computeAccessibleName(el));
  expect(names).toEqual(expect.arrayContaining(['Size', 'Weight', 'X', 'Y']));
});

it('names colour triggers after their row and their value, not the raw hex', () => {
  render(Harness);
  flushSync();
  const names = [...document.body.querySelectorAll<HTMLElement>('[data-slot="color-picker-trigger"]')].map((el) => computeAccessibleName(el));
  expect(names).toContain('Fill: #7a1f2c');
  expect(names).toContain('Colour: #7a1f2c');
});
