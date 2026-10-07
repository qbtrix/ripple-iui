// @file widgets/input/Search.test.ts
// @description Behaviour tests for Search's default suggest mode (a combobox
//   whose listbox opens while you type, "No results" included, result icons
//   from the lazily loaded Lucide barrel) and `mode="filter"`: a plain search
//   box that never opens a listbox, plus the aria-label, autocomplete and
//   spellcheck passthroughs.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import Search from './Search.svelte';

afterEach(cleanup);

describe('Search', () => {
  it('suggest mode (default) is a combobox that opens "No results" while typing', async () => {
    const { container, getByText } = render(Search, { value: 'zzz' });
    const input = container.querySelector('input')!;
    expect(input.getAttribute('role')).toBe('combobox');
    await fireEvent.focus(input);
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();
    expect(getByText('No results')).toBeTruthy();
  });

  it('filter mode never opens a listbox and drops the combobox aria', async () => {
    const oninput = vi.fn();
    const { container, queryByText } = render(Search, { value: 'zzz', mode: 'filter', oninput });
    const input = container.querySelector('input')!;
    expect(input.getAttribute('role')).toBe('searchbox');
    expect(input.hasAttribute('aria-expanded')).toBe(false);
    expect(input.hasAttribute('aria-controls')).toBe(false);
    expect(input.hasAttribute('aria-autocomplete')).toBe(false);
    await fireEvent.focus(input);
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(queryByText('No results')).toBeNull();
    await fireEvent.input(input, { target: { value: 'abc' } });
    expect(oninput).toHaveBeenCalledWith('abc');
  });

  it('filter mode does not swallow Enter (a wrapping form still submits)', async () => {
    const { container } = render(Search, { value: 'x', mode: 'filter' });
    const input = container.querySelector('input')!;
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });

  it('passes aria-label, autocomplete and spellcheck to the input', () => {
    const { container } = render(Search, {
      'aria-label': 'Search prospects',
      autocomplete: 'off',
      spellcheck: false,
    });
    const input = container.querySelector('input')!;
    expect(input.getAttribute('aria-label')).toBe('Search prospects');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.getAttribute('spellcheck')).toBe('false');
  });

  it('leaves aria-label, autocomplete and spellcheck off by default', () => {
    const { container } = render(Search, {});
    const input = container.querySelector('input')!;
    expect(input.hasAttribute('aria-label')).toBe(false);
    expect(input.hasAttribute('autocomplete')).toBe(false);
    expect(input.hasAttribute('spellcheck')).toBe(false);
  });

  // The barrel is ~1,600 Svelte modules, so its first import under vitest takes seconds.
  it('suggest mode draws a result icon named by slug once the icon set loads', async () => {
    const { container } = render(Search, { value: 'in', results: [{ id: 1, label: 'Inbox', icon: 'inbox' }] });
    await fireEvent.focus(container.querySelector('input')!);
    await waitFor(() => expect(container.querySelector('[role="option"] svg')).not.toBeNull(), { timeout: 25000 });
  }, 30000);
});
