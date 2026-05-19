import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import Ripple from '$lib/Ripple.svelte';
import { _resetBindContractWarnings, warnUnregisteredBindContract, getBindContract } from '$lib/core/widget-bind-contract.js';

beforeEach(() => {
  _resetBindContractWarnings();
});

afterEach(() => {
  vi.restoreAllMocks();
});

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

test('wizard-layout Next advances bound currentStep state', async () => {
  const onStateChange = vi.fn();
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: { currentStep: 'one' },
        ui: {
          type: 'wizard-layout',
          bind: '{state.currentStep}',
          props: {
            steps: [
              { id: 'one', label: 'One' },
              { id: 'two', label: 'Two' },
              { id: 'three', label: 'Three' },
            ],
          },
        },
      },
      onStateChange,
    },
  });

  const buttons = container.querySelectorAll('button');
  const nextBtn = Array.from(buttons).find((b) => b.textContent?.includes('Next')) as HTMLElement;
  await userEvent.click(nextBtn);

  expect(onStateChange).toHaveBeenLastCalledWith(
    'currentStep',
    'two',
    expect.objectContaining({ currentStep: 'two' })
  );
});

test('wizard finishActions resolve {state.x} at dispatch time, not render time', async () => {
  // Reproduces the "Create account does nothing" bug: action handlers
  // nested inside props (e.g. finishActions) were having their
  // `{state.x}` expressions resolved at render time, turning a
  // validate.condition string into a stale boolean before the user
  // even interacted. The dispatcher then crashed when it tried to
  // re-evaluate a boolean as an expression, silently aborting the flow.
  const events: unknown[] = [];
  const onStateChange = vi.fn();
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: { agreed: false, name: 'Ada' },
        ui: {
          type: 'wizard-layout',
          bind: '{state.currentStep}',
          props: {
            steps: [{ id: 'review', label: 'Review' }],
            finishActions: [
              { action: 'validate', condition: '{state.agreed}', message: 'tick first' },
              { action: 'emit', target: 'chat.send', value: 'done for {state.name}' },
            ],
          },
          children: [{ type: 'checkbox', bind: '{state.agreed}', props: { label: 'Agree' } }],
        },
      },
      onStateChange,
      onEvent: (e) => {
        events.push(e);
      },
    },
  });

  const buttons = container.querySelectorAll('button');
  const finishBtn = Array.from(buttons).find((b) => b.textContent?.match(/Submit|Finish/i)) as HTMLElement;

  // First click: agreed=false → validate aborts, emit must NOT fire.
  await userEvent.click(finishBtn);
  expect(events.some((e: any) => e?.type === 'emit')).toBe(false);
  expect(events.some((e: any) => e?.type === 'toast')).toBe(true);

  // Tick the checkbox.
  const cb = container.querySelector('button[role="checkbox"]') as HTMLElement;
  await userEvent.click(cb);

  // Second click: agreed=true → validate passes, emit fires with resolved name.
  await userEvent.click(finishBtn);
  const emit = events.find((e: any) => e?.type === 'emit') as any;
  expect(emit).toBeDefined();
  expect(emit.payload).toBe('done for Ada');
});

test('order-status uses currentStep/onstepchange bind contract', () => {
  // Regression guard: order-status only exposes `currentStep` (not `value`),
  // so binding through the default contract would silently no-op.
  expect(getBindContract('order-status')).toEqual({
    prop: 'currentStep',
    event: 'onstepchange',
  });
  expect(getBindContract('shipment-tracker')).toEqual({
    prop: 'currentStep',
    event: 'onstepchange',
  });
});

test('warnUnregisteredBindContract fires once per unknown widget type', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  warnUnregisteredBindContract('totally-novel-widget');
  warnUnregisteredBindContract('totally-novel-widget');
  warnUnregisteredBindContract('another-novel-widget');

  // One warning per type, even when called repeatedly.
  expect(warn).toHaveBeenCalledTimes(2);
  expect(warn.mock.calls[0][0]).toMatch(/totally-novel-widget/);
  expect(warn.mock.calls[1][0]).toMatch(/another-novel-widget/);
});

test('warnUnregisteredBindContract stays silent for registered and known-default widgets', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  // Explicitly registered (non-default) contracts.
  warnUnregisteredBindContract('checkbox');
  warnUnregisteredBindContract('wizard-layout');
  warnUnregisteredBindContract('popover');
  warnUnregisteredBindContract('order-status');
  // Known to use the default value/onchange contract.
  warnUnregisteredBindContract('input');
  warnUnregisteredBindContract('select');
  warnUnregisteredBindContract('modal');
  warnUnregisteredBindContract('slider');

  expect(warn).not.toHaveBeenCalled();
});

test('on_input fires on every keystroke', async () => {
  const onStateChange = vi.fn();
  render(Ripple, {
    props: {
      spec: {
        state: { lastInput: '' },
        ui: {
          type: 'input',
          props: { placeholder: 'name' },
          on_input: { action: 'set', target: 'lastInput' },
        },
      },
      onStateChange,
    },
  });

  await userEvent.type(screen.getByPlaceholderText('name'), 'abc');

  const writes = onStateChange.mock.calls.filter((c) => c[0] === 'lastInput');
  expect(writes.length).toBe(3);
  expect(writes.at(-1)![1]).toBe('abc');
});
