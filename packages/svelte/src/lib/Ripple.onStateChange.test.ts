import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';

test('onStateChange fires when a set action runs', async () => {
  const onStateChange = vi.fn();
  const { getByRole } = render(Ripple, {
    props: {
      spec: {
        ui: {
          type: 'button',
          props: { label: 'go' },
          on_click: { action: 'set', target: 'count', value: 7 },
        },
      },
      onStateChange,
    },
  });

  await userEvent.click(getByRole('button', { name: 'go' }));

  expect(onStateChange).toHaveBeenCalledWith(
    'count',
    7,
    expect.objectContaining({ count: 7 })
  );
});

test('onStateChange unsubscribes on destroy', async () => {
  const onStateChange = vi.fn();
  const { getByRole, unmount } = render(Ripple, {
    props: {
      spec: {
        state: { count: 0 },
        ui: {
          type: 'button',
          props: { label: 'go' },
          on_click: { action: 'set', target: 'count', value: 1 },
        },
      },
      onStateChange,
    },
  });

  await userEvent.click(getByRole('button', { name: 'go' }));
  expect(onStateChange).toHaveBeenCalledTimes(1);

  unmount();
  expect(onStateChange).toHaveBeenCalledTimes(1);
});
