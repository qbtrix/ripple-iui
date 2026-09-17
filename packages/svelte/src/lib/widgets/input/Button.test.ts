// Button.test.ts — unit tests for the Button widget.
// Updated 2026-06-08 (Fluid Functionalism redesign): added coverage for the
// layered-depth classes (ripple-solid/ripple-ghost), the motion-primitive-derived
// press spring custom properties (FF 80ms compress / 160ms release), the new
// `pressed` prop (aria-pressed reflection + ghost "lights up in the accent"
// data-active), link's no-light-up exception, and caller-style preservation. The
// original API/variant/size/loading/disabled tests are unchanged.
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Button from '$lib/widgets/input/Button.svelte';

test('renders label text', () => {
  render(Button, { props: { label: 'Save' } });
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
});

test('defaults to variant=default and size=md', () => {
  const { container } = render(Button, { props: { label: 'X' } });
  expect(container.querySelector('[data-variant="default"]')).not.toBeNull();
  expect(container.querySelector('[data-size="md"]')).not.toBeNull();
});

test('applies variant data-attribute', () => {
  const { container } = render(Button, { props: { label: 'X', variant: 'destructive' } });
  expect(container.querySelector('[data-variant="destructive"]')).not.toBeNull();
});

test('applies size data-attribute', () => {
  const { container } = render(Button, { props: { label: 'X', size: 'lg' } });
  expect(container.querySelector('[data-size="lg"]')).not.toBeNull();
});

test('fires onclick', async () => {
  const onclick = vi.fn();
  render(Button, { props: { label: 'go', onclick } });
  await userEvent.click(screen.getByRole('button'));
  expect(onclick).toHaveBeenCalledTimes(1);
});

test('disabled prevents onclick and button element is disabled', async () => {
  const onclick = vi.fn();
  render(Button, { props: { label: 'go', disabled: true, onclick } });
  const btn = screen.getByRole('button');
  expect(btn).toBeDisabled();
  await userEvent.click(btn);
  expect(onclick).not.toHaveBeenCalled();
});

test('loading sets aria-busy and prevents onclick', async () => {
  const onclick = vi.fn();
  render(Button, { props: { label: 'saving', loading: true, onclick } });
  const btn = screen.getByRole('button');
  expect(btn).toHaveAttribute('aria-busy', 'true');
  expect(btn).toBeDisabled();
  await userEvent.click(btn);
  expect(onclick).not.toHaveBeenCalled();
});

test('loading renders spinner slot', () => {
  const { container } = render(Button, { props: { label: 'saving', loading: true } });
  expect(container.querySelector('[data-slot="button-spinner"]')).not.toBeNull();
});

test('type defaults to "button"', () => {
  render(Button, { props: { label: 'X' } });
  expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
});

test('type="submit" forwarded to button element', () => {
  render(Button, { props: { label: 'X', type: 'submit' } });
  expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
});

test('icon-only size applies data-size=icon', () => {
  const { container } = render(Button, { props: { 'aria-label': 'menu', size: 'icon' } });
  expect(container.querySelector('[data-size="icon"]')).not.toBeNull();
});

test('data-state reflects loading vs disabled vs idle', () => {
  const { container: idle } = render(Button, { props: { label: 'x' } });
  expect(idle.querySelector('[data-state="idle"]')).not.toBeNull();

  const { container: disabled } = render(Button, { props: { label: 'x', disabled: true } });
  expect(disabled.querySelector('[data-state="disabled"]')).not.toBeNull();

  const { container: loading } = render(Button, { props: { label: 'x', loading: true } });
  expect(loading.querySelector('[data-state="loading"]')).not.toBeNull();
});

// ── Fluid Functionalism redesign (additive behaviors) ────────────────────────

test('solid variants carry the layered-depth class', () => {
  for (const variant of ['default', 'primary', 'destructive'] as const) {
    const { container } = render(Button, { props: { label: 'x', variant } });
    expect(container.querySelector('.ripple-solid')).not.toBeNull();
  }
});

test('ghost variant carries the ripple-ghost class and is transparent by default', () => {
  const { container } = render(Button, { props: { label: 'x', variant: 'ghost' } });
  const btn = container.querySelector('.ripple-ghost');
  expect(btn).not.toBeNull();
  // not "lit": no data-active until pressed/selected
  expect(btn?.getAttribute('data-active')).toBeNull();
});

test('press spring custom properties are injected from the motion primitive', () => {
  const { container } = render(Button, { props: { label: 'x' } });
  const btn = container.querySelector('button') as HTMLButtonElement;
  // The compress/release timings are templated from FF tokens + spring easing.
  expect(btn.style.cssText).toContain('--ripple-press-compress');
  expect(btn.style.cssText).toContain('--ripple-press-release');
  // FF fast = 80ms compress, FF moderate = 160ms release.
  expect(btn.style.cssText).toContain('80ms');
  expect(btn.style.cssText).toContain('160ms');
});

test('pressed reflects to aria-pressed and lights the ghost (data-active)', () => {
  const { container } = render(Button, {
    props: { label: 'x', variant: 'ghost', pressed: true },
  });
  const btn = container.querySelector('button') as HTMLButtonElement;
  expect(btn.getAttribute('aria-pressed')).toBe('true');
  expect(btn.getAttribute('data-active')).toBe('true');
});

test('pressed=false sets aria-pressed=false without lighting up', () => {
  const { container } = render(Button, {
    props: { label: 'x', variant: 'ghost', pressed: false },
  });
  const btn = container.querySelector('button') as HTMLButtonElement;
  expect(btn.getAttribute('aria-pressed')).toBe('false');
  expect(btn.getAttribute('data-active')).toBeNull();
});

test('omitting pressed leaves aria-pressed unset (plain button)', () => {
  const { container } = render(Button, { props: { label: 'x' } });
  const btn = container.querySelector('button') as HTMLButtonElement;
  expect(btn.getAttribute('aria-pressed')).toBeNull();
});

test('link never lights up even when pressed', () => {
  const { container } = render(Button, {
    props: { label: 'x', variant: 'link', pressed: true },
  });
  const btn = container.querySelector('button') as HTMLButtonElement;
  // aria-pressed still reflects, but the accent "lit" look (data-active) is off.
  expect(btn.getAttribute('data-active')).toBeNull();
});

test('caller style is preserved alongside the injected press vars', () => {
  const { container } = render(Button, {
    props: { label: 'x', style: { 'margin-top': '4px' } },
  });
  const btn = container.querySelector('button') as HTMLButtonElement;
  expect(btn.style.cssText).toContain('margin-top: 4px');
  expect(btn.style.cssText).toContain('--ripple-press-compress');
});
