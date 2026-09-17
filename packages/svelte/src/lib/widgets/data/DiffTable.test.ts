// @file widgets/data/DiffTable.test.ts
// @description NEW (beautiful-ui re-skin arc, skin-diff lane, 2026-09-17).
//   Behaviour coverage for DiffTable's accept/reject layer: the per-row toggle
//   (by checkbox and by clicking the row's text), the live counts, the Apply
//   report, the lock after applying, and the non-colour cues. The staged
//   entrance is CSS-only, so its reduced-motion guard is asserted against the
//   source text.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import DiffTable from './DiffTable.svelte';
import source from './DiffTable.svelte?raw';

const columns = [
  { key: 'flavor', label: 'Flavor' },
  { key: 'supplier', label: 'Supplier' },
];
const rows = [
  { key: 'rocky', cells: { flavor: 'Rocky Road', supplier: 'aurora-scoops' }, change: 'removed' as const },
  { key: 'bubblegum', cells: { flavor: 'Bubblegum', supplier: 'kumo-creamery' }, change: 'removed' as const },
  { key: 'mint', cells: { flavor: 'Mint Chip', supplier: 'maple-orbit' } },
  { key: 'pistachio', cells: { flavor: 'Pistachio', supplier: 'maple-orbit' }, change: 'added' as const },
];

const setup = (props: Record<string, unknown> = {}) =>
  render(DiffTable, { props: { title: 'Proposed menu cleanup', columns, rows, ...props } });
const box = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement;
const row = (c: Element, key: string) => c.querySelectorAll('tbody tr')[rows.findIndex((r) => r.key === key)];

describe('DiffTable — toggling', () => {
  it('gives each changed row a named checkbox, included by default, and none to unchanged rows', () => {
    setup();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(box('Include removing Rocky Road').checked).toBe(true);
    expect(box('Include adding Pistachio').checked).toBe(true);
    expect(screen.getByText('2 removals · 1 addition')).toBeTruthy();
  });

  it('excludes a change from its checkbox and updates the counts and the button', async () => {
    setup();
    await fireEvent.click(box('Include removing Rocky Road'));
    expect(box('Include removing Rocky Road').checked).toBe(false);
    expect(screen.getByText('1 removal · 1 addition')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Apply 2 changes' })).toBeTruthy();
  });

  it('toggles when the row text is clicked, not only the box', async () => {
    const { container } = setup();
    await fireEvent.click(screen.getByText('Pistachio'));
    expect(box('Include adding Pistachio').checked).toBe(false);
    expect(row(container, 'pistachio').getAttribute('data-included')).toBe('false');
    await fireEvent.click(screen.getByText('aurora-scoops'));
    expect(box('Include removing Rocky Road').checked).toBe(false);
  });

  it('seeds a change excluded with included:false', () => {
    render(DiffTable, {
      props: { columns, rows: rows.map((r) => (r.key === 'bubblegum' ? { ...r, included: false } : r)) },
    });
    expect(box('Include removing Bubblegum').checked).toBe(false);
    expect(screen.getByText('1 removal · 1 addition')).toBeTruthy();
  });

  it('disables Apply when every change is excluded', async () => {
    setup();
    for (const name of ['Include removing Rocky Road', 'Include removing Bubblegum', 'Include adding Pistachio']) {
      await fireEvent.click(box(name));
    }
    expect((screen.getByRole('button', { name: 'Apply 0 changes' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('DiffTable — applying', () => {
  it('reports the included keys once and locks the rows', async () => {
    const onapply = vi.fn();
    setup({ onapply });
    await fireEvent.click(box('Include removing Bubblegum'));
    await fireEvent.click(screen.getByRole('button', { name: 'Apply 2 changes' }));
    expect(onapply).toHaveBeenCalledTimes(1);
    expect(onapply).toHaveBeenCalledWith(['rocky', 'pistachio']);
    expect(screen.getByText(/2 edits applied/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Apply/ })).toBeNull();
    expect(screen.getAllByRole('checkbox').every((b) => (b as HTMLInputElement).disabled)).toBe(true);
    expect(screen.getByText(/2 edits applied/).closest('[aria-live="polite"]')).toBeTruthy();
  });
});

describe('DiffTable — cues beyond colour', () => {
  it('strikes an included removal and lifts the strike when it is excluded', async () => {
    setup();
    const cell = () => screen.getByText('Rocky Road');
    expect(cell().className).toContain('line-through');
    expect(screen.getByText('Mint Chip').className).not.toContain('line-through');
    await fireEvent.click(box('Include removing Rocky Road'));
    expect(cell().className).not.toContain('line-through');
  });

  it('never strikes an addition', () => {
    setup();
    expect(screen.getByText('Pistachio').className).not.toContain('line-through');
  });

  it('renders a caller cell snippet in place of the value', async () => {
    const { createRawSnippet } = await import('svelte');
    const cell = createRawSnippet((arg: () => { value: unknown }) => ({
      render: () => `<b>${String(arg().value).toUpperCase()}</b>`,
    }));
    setup({ cell });
    expect(screen.getByText('ROCKY ROAD').tagName).toBe('B');
  });

  it('turns every entrance animation off under reduced motion', () => {
    const guard = source.slice(source.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const cls of ['mark', 'reveal', 'fade-in', 'fade-up', 'pop-in']) {
      expect(guard).toContain(`.ripple-difftable-${cls}`);
    }
    expect(guard).toContain('animation: none');
  });
});
