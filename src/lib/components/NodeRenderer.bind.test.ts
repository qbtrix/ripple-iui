import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';

test('input with bind writes user input back to state', async () => {
  const onStateChange = vi.fn();
  render(Ripple, {
    props: {
      spec: {
        state: { username: '' },
        ui: {
          type: 'input',
          bind: '{state.username}',
          props: { placeholder: 'name' },
        },
      },
      onStateChange,
    },
  });

  await userEvent.type(screen.getByPlaceholderText('name'), 'ada');

  const lastCall = onStateChange.mock.calls[onStateChange.mock.calls.length - 1];
  expect(lastCall[0]).toBe('username');
  expect(lastCall[1]).toBe('ada');
});

test('checkbox with bind writes boolean back to state', async () => {
  const onStateChange = vi.fn();
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: { enabled: false },
        ui: {
          type: 'checkbox',
          bind: '{state.enabled}',
          props: { label: 'Enable' },
        },
      },
      onStateChange,
    },
  });

  const cb = container.querySelector('button[role="checkbox"]') as HTMLElement;
  await userEvent.click(cb);

  expect(onStateChange).toHaveBeenLastCalledWith(
    'enabled',
    true,
    expect.objectContaining({ enabled: true })
  );
});

test('bind write-back runs before user on_change handler so handler sees new state', async () => {
  const onStateChange = vi.fn();
  render(Ripple, {
    props: {
      spec: {
        state: { username: '', mirrored: '' },
        ui: {
          type: 'input',
          bind: '{state.username}',
          props: { placeholder: 'name' },
          on_change: { action: 'set', target: 'mirrored', value: '{state.username}' },
        },
      },
      onStateChange,
    },
  });

  await userEvent.type(screen.getByPlaceholderText('name'), 'x');

  const finalState = onStateChange.mock.calls.at(-1)![2];
  expect(finalState).toMatchObject({ username: 'x', mirrored: 'x' });
});

test('on_input fires on every keystroke', async () => {
  const onStateChange = vi.fn();
  render(Ripple, {
    props: {
      spec: {
        state: { keystrokes: 0 },
        ui: {
          type: 'input',
          props: { placeholder: 'name' },
          on_input: {
            action: 'set',
            target: 'keystrokes',
            value: '{state.keystrokes + 1}',
          },
        },
      },
      onStateChange,
    },
  });

  await userEvent.type(screen.getByPlaceholderText('name'), 'abc');

  const writes = onStateChange.mock.calls.filter((c) => c[0] === 'keystrokes');
  expect(writes.length).toBe(3);
  expect(writes.at(-1)![1]).toBe(3);
});
