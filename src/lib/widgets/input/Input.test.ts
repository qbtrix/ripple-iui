import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Input from '$lib/widgets/input/Input.svelte';

test('renders with a placeholder', () => {
  render(Input, { props: { placeholder: 'Search' } });
  expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
});

test('renders label and associates it with the input via for=id', () => {
  render(Input, { props: { id: 'name', label: 'Full name' } });
  const input = screen.getByLabelText('Full name');
  expect(input).toBeInTheDocument();
  expect(input).toHaveAttribute('id', 'name');
});

test('defaults to size=md and state=idle', () => {
  const { container } = render(Input, { props: {} });
  expect(container.querySelector('[data-size="md"]')).not.toBeNull();
  expect(container.querySelector('[data-state="idle"]')).not.toBeNull();
});

test('size data-attribute applied', () => {
  const { container } = render(Input, { props: { size: 'lg' } });
  expect(container.querySelector('[data-size="lg"]')).not.toBeNull();
});

test('type is forwarded to the input element', () => {
  render(Input, { props: { type: 'email', placeholder: 'you@' } });
  expect(screen.getByPlaceholderText('you@')).toHaveAttribute('type', 'email');
});

test('defaults type to text', () => {
  render(Input, { props: { placeholder: 'x' } });
  expect(screen.getByPlaceholderText('x')).toHaveAttribute('type', 'text');
});

test('oninput fires with the current value on typing', async () => {
  const oninput = vi.fn();
  render(Input, { props: { placeholder: 'x', oninput } });
  await userEvent.type(screen.getByPlaceholderText('x'), 'hi');
  expect(oninput).toHaveBeenCalled();
  const lastCall = oninput.mock.calls[oninput.mock.calls.length - 1];
  expect(lastCall[0]).toBe('hi');
});

test('onchange fires on blur with the current value', async () => {
  const onchange = vi.fn();
  render(Input, { props: { placeholder: 'x', onchange } });
  const input = screen.getByPlaceholderText('x');
  await userEvent.type(input, 'bye');
  await userEvent.tab();
  expect(onchange).toHaveBeenCalled();
  const lastCall = onchange.mock.calls[onchange.mock.calls.length - 1];
  expect(lastCall[0]).toBe('bye');
});

test('error state sets data-state=error and aria-invalid', () => {
  const { container } = render(Input, {
    props: { placeholder: 'x', error: 'Required field' },
  });
  expect(container.querySelector('[data-state="error"]')).not.toBeNull();
  expect(screen.getByPlaceholderText('x')).toHaveAttribute('aria-invalid', 'true');
});

test('error message is rendered and linked via aria-describedby', () => {
  const { container } = render(Input, {
    props: { id: 'email', placeholder: 'x', error: 'Invalid email' },
  });
  const msg = container.querySelector('[data-slot="input-error"]');
  expect(msg).not.toBeNull();
  expect(msg!.textContent).toContain('Invalid email');
  const input = screen.getByPlaceholderText('x');
  const describedBy = input.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  expect(describedBy).toBe(msg!.id);
});

test('helper text renders when no error', () => {
  const { container } = render(Input, {
    props: { placeholder: 'x', helper: 'Use your work email' },
  });
  const msg = container.querySelector('[data-slot="input-helper"]');
  expect(msg).not.toBeNull();
  expect(msg!.textContent).toContain('Use your work email');
});

test('error overrides helper when both provided', () => {
  const { container } = render(Input, {
    props: { placeholder: 'x', helper: 'help', error: 'err' },
  });
  expect(container.querySelector('[data-slot="input-error"]')?.textContent).toContain('err');
  expect(container.querySelector('[data-slot="input-helper"]')).toBeNull();
});

test('disabled state reflected in attributes', () => {
  const { container } = render(Input, { props: { placeholder: 'x', disabled: true } });
  expect(screen.getByPlaceholderText('x')).toBeDisabled();
  expect(container.querySelector('[data-state="disabled"]')).not.toBeNull();
});

test('required is forwarded to the input', () => {
  render(Input, { props: { placeholder: 'x', required: true } });
  expect(screen.getByPlaceholderText('x')).toBeRequired();
});

test('readOnly is forwarded to the input', () => {
  render(Input, { props: { placeholder: 'x', readOnly: true } });
  expect(screen.getByPlaceholderText('x')).toHaveAttribute('readonly');
});

test('no prefix slot rendered when prefix snippet is not provided', () => {
  const { container } = render(Input, { props: { placeholder: 'x' } });
  expect(container.querySelector('[data-slot="input-prefix"]')).toBeNull();
});
