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
