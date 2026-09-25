// @file widgets/ai/TaskRows.test.ts
// @description NEW (beautiful-ui re-skin arc, lane C, 2026-09-14). Behaviour
//   coverage for TaskRows: prop → DOM mapping for each status, the pill copy
//   and its `labels` override, the disclosure (aria-expanded / aria-controls,
//   the `open` seed, the `ontoggle` callback and that it does not mutate the
//   caller's rows), the stagger index, and the two variants. TaskRows is not in
//   the spec registry, so there is deliberately no registry-wiring test here —
//   it reaches callers through `$lib/ui` only.
// UPDATED 2026-09-25 (chat new-look slice 1): a block at the bottom for the new
//   `cancelled` status — a pill by text, quieter than failed (no solid red
//   badge, no spinning retry, muted and struck label). Written red first.
// UPDATED 2026-09-25 (fix/taskrows-approvalgate-labels): a row with no details
//   is not a disclosure — plain header, no button, no aria-expanded, no chevron,
//   no panel. The button-count and ontoggle tests now count only rows that have
//   details, and a new block pins the plain header. Written red first.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TaskRows from './TaskRows.svelte';

const rowOf = (c: HTMLElement, key: string) =>
  [...c.querySelectorAll('.ripple-task-row')].find((r) => r.textContent?.includes(key)) as HTMLElement;

const ROWS = [
  {
    key: 'verify',
    label: 'Verified vendor records',
    meta: '12 suppliers',
    status: 'done' as const,
    details: [
      { label: 'Matched tax and contact IDs', meta: '12/12' },
      { label: 'Flagged stale records', meta: '0' },
    ],
  },
  { key: 'index', label: 'Build reorder task list', meta: '7 SKUs', status: 'running' as const, step: 2 },
  { key: 'draft', label: 'Draft supplier emails', status: 'failed' as const, step: 3 },
];

describe('TaskRows — rendering', () => {
  it('renders a disclosure button only for rows with details, with label and meta', () => {
    const { getAllByRole, getByText } = render(TaskRows, { props: { rows: ROWS } });
    // Only `verify` has details; `index` and `draft` are plain rows.
    expect(getAllByRole('button')).toHaveLength(1);
    expect(getByText('Verified vendor records')).toBeTruthy();
    expect(getByText('12 suppliers')).toBeTruthy();
  });

  it('renders nothing but the wrapper when rows is empty', () => {
    const { container } = render(TaskRows, { props: { rows: [] } });
    const wrapper = container.querySelector('.ripple-task-rows');
    expect(wrapper).toBeTruthy();
    expect(wrapper?.children).toHaveLength(0);
  });

  it('shows a status pill for done and failed, and none while running', () => {
    const { getByText, queryByText } = render(TaskRows, { props: { rows: ROWS } });
    expect(getByText('Completed')).toBeTruthy();
    expect(getByText('Failed')).toBeTruthy();
    // The running row carries its step number instead of a pill.
    expect(getByText('2')).toBeTruthy();
    expect(queryByText('Running')).toBeNull();
  });

  it('takes pill copy from labels', () => {
    const { getByText, queryByText } = render(TaskRows, {
      props: { rows: ROWS, labels: { done: 'Done', failed: 'Errored' } },
    });
    expect(getByText('Done')).toBeTruthy();
    expect(getByText('Errored')).toBeTruthy();
    expect(queryByText('Completed')).toBeNull();
  });

  it('marks each row with its status and its stagger index', () => {
    const { container } = render(TaskRows, { props: { rows: ROWS } });
    const rows = [...container.querySelectorAll('.ripple-task-row')];
    expect(rows.map((r) => r.getAttribute('data-state'))).toEqual(['done', 'running', 'failed']);
    // The stagger delay is calc(var(--i) * 80ms) — without --i every row
    // animates at once and the signature entrance is gone.
    expect(rows.map((r) => (r as HTMLElement).style.getPropertyValue('--i'))).toEqual(['0', '1', '2']);
  });

  it('defaults status to pending when a row omits it', () => {
    const { container } = render(TaskRows, { props: { rows: [{ key: 'a', label: 'Waiting' }] } });
    expect(container.querySelector('.ripple-task-row')?.getAttribute('data-state')).toBe('pending');
  });

  it('switches variant on the wrapper', () => {
    const { container } = render(TaskRows, { props: { rows: ROWS, variant: 'list' } });
    expect(container.querySelector('.ripple-task-rows')?.getAttribute('data-variant')).toBe('list');
  });
});

describe('TaskRows — disclosure', () => {
  it('starts collapsed and expands on click', async () => {
    const { getAllByRole, container } = render(TaskRows, { props: { rows: ROWS } });
    const button = getAllByRole('button')[0];
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.ripple-task-panel')?.getAttribute('data-state')).toBe('closed');

    await fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.ripple-task-panel')?.getAttribute('data-state')).toBe('open');
  });

  it('points aria-controls at the panel it opens', () => {
    const { getAllByRole, container } = render(TaskRows, { props: { id: 'tasks', rows: ROWS } });
    const controls = getAllByRole('button')[0].getAttribute('aria-controls');
    expect(controls).toBe('tasks-verify-panel');
    expect(container.querySelector(`#${controls}`)).toBeTruthy();
  });

  it('renders detail lines inside the panel', () => {
    const { getByText } = render(TaskRows, { props: { rows: ROWS } });
    expect(getByText('Matched tax and contact IDs')).toBeTruthy();
    expect(getByText('12/12')).toBeTruthy();
  });

  it('seeds a row open from its own open flag', () => {
    const rows = [{ key: 'a', label: 'Seeded', open: true, details: [{ label: 'inner' }] }];
    const { getByRole } = render(TaskRows, { props: { rows } });
    expect(getByRole('button').getAttribute('aria-expanded')).toBe('true');
  });

  it('fires ontoggle with the row key and the next state', async () => {
    const ontoggle = vi.fn();
    const rows = [...ROWS, { key: 'send', label: 'Send emails', details: [{ label: 'inner' }] }];
    const { getAllByRole } = render(TaskRows, { props: { rows, ontoggle } });
    await fireEvent.click(getAllByRole('button')[1]);
    expect(ontoggle).toHaveBeenCalledWith('send', true);
    await fireEvent.click(getAllByRole('button')[1]);
    expect(ontoggle).toHaveBeenLastCalledWith('send', false);
  });

  it('does not mutate the rows it was given', async () => {
    // TaskRows is read-only by design — it must never grow a value/onchange
    // bind surface (ChecklistLayout owns that job). Toggling is local state.
    const rows = [{ key: 'a', label: 'Row', details: [{ label: 'inner' }] }];
    const snapshot = structuredClone(rows);
    const { getByRole } = render(TaskRows, { props: { rows } });
    await fireEvent.click(getByRole('button'));
    expect(rows).toEqual(snapshot);
  });
});

describe('TaskRows — cancelled', () => {
  const rows = [
    { key: 'draft', label: 'Draft supplier emails', status: 'failed' as const },
    { key: 'send', label: 'Send supplier emails', status: 'cancelled' as const },
  ];

  it('marks the row cancelled and says so in a pill', () => {
    const { container, getByText } = render(TaskRows, { props: { rows } });
    expect(rowOf(container, 'Send').getAttribute('data-state')).toBe('cancelled');
    expect(getByText('Cancelled')).toBeTruthy();
  });

  it('takes the pill copy from labels.cancelled', () => {
    const { getByText, queryByText } = render(TaskRows, {
      props: { rows, labels: { cancelled: 'Skipped' } },
    });
    expect(getByText('Skipped')).toBeTruthy();
    expect(queryByText('Cancelled')).toBeNull();
  });

  it('is quieter than failed: no error tone, no retry spinner, a muted struck label', () => {
    const { container } = render(TaskRows, { props: { rows } });
    const cancelled = rowOf(container, 'Send');
    expect(cancelled.innerHTML).not.toMatch(/ripple-error/);
    expect(cancelled.querySelector('.ripple-task-retry')).toBeNull();
    expect(cancelled.querySelector('.ripple-task-ring')).toBeNull();
    const label = [...cancelled.querySelectorAll('span')].find((s) => s.textContent?.trim() === 'Send supplier emails')!;
    expect(label.className).toContain('line-through');
    expect(label.className).toContain('text-ripple-muted-foreground');
    // And the failed row next to it still reads as failed.
    expect(rowOf(container, 'Draft').innerHTML).toMatch(/ripple-error/);
  });
});

describe('TaskRows — rows without details', () => {

  it.each([
    ['missing', undefined],
    ['empty', []],
  ])('details %s: a plain header, not a disclosure', (_name, details) => {
    const rows = [{ key: 'a', label: 'Plain step', meta: '3 files', status: 'done' as const, details }];
    const { container, queryByRole, getByText } = render(TaskRows, { props: { id: 't', rows } });
    const row = rowOf(container, 'Plain step');
    expect(queryByRole('button')).toBeNull();
    expect(row.querySelector('[aria-expanded]')).toBeNull();
    expect(row.querySelector('[aria-controls]')).toBeNull();
    expect(row.querySelector('.ripple-task-panel')).toBeNull();
    expect(container.querySelector('#t-a-panel')).toBeNull();
    expect(row.querySelector('.ripple-task-chevron')).toBeNull();
    // Same content otherwise: label, meta and the status pill.
    expect(getByText('Plain step')).toBeTruthy();
    expect(getByText('3 files')).toBeTruthy();
    expect(getByText('Completed')).toBeTruthy();
  });

  it('keeps the same header layout classes as a disclosure row', () => {
    const rows = [
      { key: 'a', label: 'Plain step' },
      { key: 'b', label: 'Deep step', details: [{ label: 'inner' }] },
    ];
    const { container } = render(TaskRows, { props: { rows } });
    const plain = rowOf(container, 'Plain step').firstElementChild as HTMLElement;
    const disclosure = rowOf(container, 'Deep step').firstElementChild as HTMLElement;
    expect(plain.tagName).toBe('DIV');
    expect(disclosure.tagName).toBe('BUTTON');
    expect(disclosure.querySelector('.ripple-task-chevron')).toBeTruthy();
    expect(plain.className).toBe(disclosure.className);
  });

  it('ignores a stray open flag on a row with no details', () => {
    const rows = [{ key: 'a', label: 'Plain step', open: true }];
    const { container } = render(TaskRows, { props: { rows } });
    expect(container.querySelector('[aria-expanded]')).toBeNull();
    expect(container.querySelector('.ripple-task-panel')).toBeNull();
  });
});
