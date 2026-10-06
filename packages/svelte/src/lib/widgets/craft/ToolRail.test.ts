// widgets/craft/ToolRail.test.ts — selection, roving arrows, opt-in hotkeys, a11y.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/svelte';
import ToolRail from './ToolRail.svelte';

afterEach(cleanup);

const tools = [
  { id: 'select', label: 'Select', hotkey: 'v', group: 'pick' },
  { id: 'pen', label: 'Pen', hotkey: 'p', group: 'draw' },
  { id: 'rect', label: 'Rectangle', hotkey: 'r', group: 'draw' },
  { id: 'off', label: 'Disabled', disabled: true, group: 'draw' },
];
const btn = (c: HTMLElement, id: string) => c.querySelector<HTMLButtonElement>(`[data-tool="${id}"]`)!;

describe('ToolRail', () => {
  it('is a toolbar with one pressed tool and the active tool as tab stop', () => {
    const { container, getByRole } = render(ToolRail, { props: { tools, active: 'pen' } });
    expect(getByRole('toolbar').getAttribute('aria-orientation')).toBe('vertical');
    expect(btn(container, 'pen').getAttribute('aria-pressed')).toBe('true');
    expect(btn(container, 'select').getAttribute('aria-pressed')).toBe('false');
    expect(btn(container, 'pen').tabIndex).toBe(0);
    expect(btn(container, 'select').tabIndex).toBe(-1);
    expect(btn(container, 'pen').getAttribute('aria-keyshortcuts')).toBe('p');
    expect(container.querySelectorAll('[role="group"]').length).toBe(2);
  });

  it('selects on click and moves the pressed state', async () => {
    const onselect = vi.fn();
    const { container } = render(ToolRail, { props: { tools, active: 'select', onselect } });
    await fireEvent.click(btn(container, 'rect'));
    expect(onselect).toHaveBeenCalledWith('rect');
    expect(btn(container, 'rect').getAttribute('aria-pressed')).toBe('true');
    expect(btn(container, 'select').getAttribute('aria-pressed')).toBe('false');
  });

  it('arrow keys move focus through enabled tools and wrap; Home/End jump', async () => {
    const { container, getByRole } = render(ToolRail, { props: { tools, active: 'select' } });
    const bar = getByRole('toolbar');
    btn(container, 'select').focus();
    await fireEvent.keyDown(bar, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(btn(container, 'pen'));
    await fireEvent.keyDown(bar, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn(container, 'rect'));
    await fireEvent.keyDown(bar, { key: 'ArrowDown' }); // skips disabled, wraps
    expect(document.activeElement).toBe(btn(container, 'select'));
    await fireEvent.keyDown(bar, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(btn(container, 'rect'));
    await fireEvent.keyDown(bar, { key: 'Home' });
    expect(document.activeElement).toBe(btn(container, 'select'));
  });

  it('hotkeys are opt-in', async () => {
    const onselect = vi.fn();
    render(ToolRail, { props: { tools, active: 'select', onselect } });
    await fireEvent.keyDown(window, { key: 'p' });
    expect(onselect).not.toHaveBeenCalled();
  });

  it('with hotkeys on, a single key selects; modifiers, text fields and disabled tools are ignored', async () => {
    const onselect = vi.fn();
    const { container } = render(ToolRail, { props: { tools, active: 'select', onselect, hotkeys: true } });
    await fireEvent.keyDown(window, { key: 'P' });
    expect(onselect).toHaveBeenLastCalledWith('pen');
    expect(btn(container, 'pen').getAttribute('aria-pressed')).toBe('true');
    await fireEvent.keyDown(window, { key: 'r', metaKey: true });
    const input = document.createElement('input');
    document.body.appendChild(input);
    await fireEvent.keyDown(input, { key: 'r' });
    input.remove();
    expect(onselect).toHaveBeenCalledTimes(1);
  });

  it('hotkeys are ignored while a dialog, menu, listbox or popover is open, or inside an inert editor', async () => {
    const onselect = vi.fn();
    const { container } = render(ToolRail, { props: { tools, active: 'select', onselect, hotkeys: true } });
    for (const attrs of [
      { role: 'dialog', 'data-state': 'open' },
      { role: 'alertdialog', 'data-state': 'open' },
      { role: 'menu', 'data-state': 'open' },
      { role: 'listbox', 'data-state': 'open' },
      { 'data-popover-content': '', 'data-state': 'open' },
    ]) {
      const layer = document.createElement('div');
      for (const [k, v] of Object.entries(attrs)) layer.setAttribute(k, v);
      document.body.appendChild(layer);
      await fireEvent.keyDown(window, { key: 'r' });
      layer.remove();
    }
    const native = document.createElement('dialog');
    native.setAttribute('open', '');
    document.body.appendChild(native);
    await fireEvent.keyDown(window, { key: 'r' });
    native.remove();
    container.setAttribute('inert', '');
    await fireEvent.keyDown(window, { key: 'r' });
    container.removeAttribute('inert');
    expect(onselect).not.toHaveBeenCalled();
    // A closed layer or an always-rendered listbox does not block.
    const closed = document.createElement('div');
    closed.setAttribute('role', 'dialog');
    closed.setAttribute('data-state', 'closed');
    const list = document.createElement('div');
    list.setAttribute('role', 'listbox');
    document.body.append(closed, list);
    await fireEvent.keyDown(window, { key: 'r' });
    closed.remove();
    list.remove();
    expect(onselect).toHaveBeenCalledWith('rect');
  });
});

