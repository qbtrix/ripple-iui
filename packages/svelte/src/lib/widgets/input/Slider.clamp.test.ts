// Slider.clamp.test.ts — a slider never writes a value the user did not choose.
// bits-ui snaps an out-of-range or off-step value into range and reports it
// through onValueChange. A streamed slider can mount with its `bind` before its
// min/max, so that snap ran against the default 0..100 and wrote 100 over a
// bound 250 (or 2100). Clamping is for the thumb; state changes only on input.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Ripple from '$lib/Ripple.svelte';
import { streamSpec } from '$lib/streaming/index.js';
import Slider from './Slider.svelte';

afterEach(cleanup);

describe('Slider does not write back a clamp', () => {
  it('a value above the default max is not reported as a change', async () => {
    const onchange = vi.fn();
    const { getByRole } = render(Slider, { props: { label: 'Deposit', value: 250, onchange } });
    await tick();
    expect(onchange).not.toHaveBeenCalled();
    expect(getByRole('slider').getAttribute('aria-valuenow')).toBe('100');
  });

  it('shows the bound value once min/max arrive, still without a change', async () => {
    const onchange = vi.fn();
    const { getByRole, rerender } = render(Slider, { props: { label: 'Wheel', value: 2100, onchange } });
    await tick();
    await rerender({ label: 'Wheel', value: 2100, min: 1500, max: 2300, step: 10, onchange });
    await tick();
    expect(onchange).not.toHaveBeenCalled();
    expect(getByRole('slider').getAttribute('aria-valuenow')).toBe('2100');
  });

  it('still reports a keyboard change', async () => {
    const onchange = vi.fn();
    const { getByRole } = render(Slider, { props: { label: 'Wheel', value: 2100, min: 1500, max: 2300, step: 10, onchange } });
    await fireEvent.keyDown(getByRole('slider'), { key: 'ArrowRight' });
    expect(onchange).toHaveBeenLastCalledWith(2110);
  });

  it('still reports a pointer change', async () => {
    const onchange = vi.fn();
    const { getByRole } = render(Slider, { props: { label: 'Wheel', value: 2100, min: 1500, max: 2300, step: 10, onchange } });
    await fireEvent.pointerDown(getByRole('slider'), { clientX: 0, clientY: 0 });
    expect(onchange).toHaveBeenCalled();
  });

  it('a bound state value above the default range survives a render', async () => {
    const spec = {
      state: { deposit: 250 },
      ui: { type: 'flex', children: [
        { type: 'slider', bind: '{state.deposit}', props: { label: 'Deposit' } },
        { type: 'text', props: { text: 'D {state.deposit}' } }
      ] }
    };
    const { container } = render(Ripple, { props: { spec } });
    await tick();
    await tick();
    expect(container.textContent).toContain('D 250');
  });

  it('streamed with bind before min/max, keeps the bound value', async () => {
    const chunks = [
      '{"state":{"w":2100},"ui":{"type":"flex","children":[{"type":"text","props":{"text":"W {state.w}"}},',
      '{"type":"slider","bind":"{state.w}","props":{"label":"Wheel",',
      '"min":1500,"max":2300,"step":10}}]}}'
    ];
    async function* source() {
      for (const c of chunks) {
        yield c;
        await new Promise((r) => setTimeout(r, 5));
      }
    }
    const store = streamSpec(source(), { throttleMs: 0 });
    const { container } = render(Ripple, { props: { streaming: store } });
    await vi.waitFor(() => expect(store.done).toBe(true));
    await tick();
    expect(container.textContent).toContain('W 2100');
  });
});
