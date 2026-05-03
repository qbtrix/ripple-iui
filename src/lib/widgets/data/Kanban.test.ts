// src/lib/widgets/data/Kanban.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Kanban from './Kanban.svelte';

const columns = [
  { id: 'todo', title: 'To do' },
  { id: 'in_progress', title: 'In progress' },
  { id: 'done', title: 'Done' }
];

const cards = [
  { id: 1, title: 'Login bug', status: 'todo' },
  { id: 2, title: 'Search regression', status: 'in_progress' },
  { id: 3, title: 'Slack integration', status: 'todo' },
  { id: 4, title: 'p99 latency', status: 'done' }
];

describe('Kanban', () => {
  it('renders one column container per column definition', () => {
    const { getByText } = render(Kanban, { props: { columns, value: cards } });
    expect(getByText('To do')).not.toBeNull();
    expect(getByText('In progress')).not.toBeNull();
    expect(getByText('Done')).not.toBeNull();
  });

  it('renders cards inside the correct column based on columnKey', () => {
    const { getByText } = render(Kanban, { props: { columns, value: cards } });
    expect(getByText('Login bug')).not.toBeNull();
    expect(getByText('Slack integration')).not.toBeNull();
    expect(getByText('p99 latency')).not.toBeNull();
  });

  it('shows the correct count badge per column', () => {
    const { container } = render(Kanban, { props: { columns, value: cards } });
    const counts = Array.from(container.querySelectorAll('.tabular-nums')).map((el) => el.textContent);
    expect(counts).toContain('2');
    expect(counts).toContain('1');
  });

  it('renders draggable cards', () => {
    const { container } = render(Kanban, { props: { columns, value: cards } });
    const drags = container.querySelectorAll('[draggable="true"]');
    expect(drags.length).toBe(4);
  });
});
