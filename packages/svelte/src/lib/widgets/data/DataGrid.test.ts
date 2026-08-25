// src/lib/widgets/data/DataGrid.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DataGrid from './DataGrid.svelte';

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role' },
  { key: 'salary', label: 'Salary', sortable: true, align: 'right' as const }
];

const rows = [
  { id: 1, name: 'Ada', role: 'Engineer', salary: 100 },
  { id: 2, name: 'Bob', role: 'Designer', salary: 80 },
  { id: 3, name: 'Carol', role: 'PM', salary: 90 },
  { id: 4, name: 'Dana', role: 'Engineer', salary: 110 }
];

describe('DataGrid', () => {
  it('renders all columns and rows by default', () => {
    const { getByText } = render(DataGrid, { props: { columns, rows, searchable: false } });
    expect(getByText('Ada')).not.toBeNull();
    expect(getByText('Bob')).not.toBeNull();
    expect(getByText('Carol')).not.toBeNull();
    expect(getByText('Dana')).not.toBeNull();
  });

  it('marks the row matching `value` as aria-selected', () => {
    const { container } = render(DataGrid, { props: { columns, rows, value: 2 } });
    const tr = container.querySelector('tr[aria-selected="true"]');
    expect(tr).not.toBeNull();
    expect(tr!.textContent).toContain('Bob');
  });

  it('paginates correctly with pageSize smaller than row count', () => {
    const { container, getByText } = render(DataGrid, {
      props: { columns, rows, pageSize: 2, searchable: false }
    });
    expect(container.textContent).toContain('Page 1 of 2');
    expect(container.textContent).toContain('Ada');
    expect(container.textContent).toContain('Bob');
    expect(container.textContent).not.toContain('Carol');
    // Click next page.
    const nextBtn = container.querySelector('[aria-label="Next page"]') as HTMLElement;
    fireEvent.click(nextBtn);
  });

  it('emits onchange with the row id when a row is clicked', async () => {
    const onchange = vi.fn();
    const { getByText } = render(DataGrid, {
      props: { columns, rows, searchable: false, onchange }
    });
    await fireEvent.click(getByText('Carol'));
    expect(onchange).toHaveBeenCalledWith(3);
  });

  it('renders empty-state copy when there are no matching rows', () => {
    const { container } = render(DataGrid, {
      props: { columns, rows: [], emptyText: 'No data' }
    });
    expect(container.textContent).toContain('No data');
  });

  it('marks sortable columns with aria-sort', () => {
    const { container } = render(DataGrid, {
      props: { columns, rows, searchable: false, defaultSort: 'salary:desc' }
    });
    const ths = container.querySelectorAll('th[aria-sort]');
    expect(ths.length).toBe(3);
    const salaryTh = Array.from(ths).find((el) => el.textContent?.includes('Salary'));
    expect(salaryTh?.getAttribute('aria-sort')).toBe('descending');
  });
});
