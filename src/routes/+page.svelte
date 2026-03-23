<script lang="ts">
  import { Ripple } from '$lib/index.js';
  import type { RippleEvent } from '$lib/types.js';

  const statsSpec = {
    version: '1.0' as const,
    state: {},
    ui: {
      type: 'grid',
      props: { columns: 3, gap: '16px' },
      children: [
        {
          type: 'card',
          props: { title: 'Revenue' },
          children: [{ type: 'text', props: { text: '$42,000', size: '2xl', weight: 'bold' } }]
        },
        {
          type: 'card',
          props: { title: 'Users' },
          children: [{ type: 'text', props: { text: '1,200', size: '2xl', weight: 'bold' } }]
        },
        {
          type: 'card',
          props: { title: 'Growth' },
          children: [
            { type: 'text', props: { text: '+12%', size: '2xl', weight: 'bold' } },
            { type: 'progress', props: { value: 72 } }
          ]
        }
      ]
    }
  };

  const chartSpec = {
    version: '1.0' as const,
    state: {},
    ui: {
      type: 'card',
      props: { title: 'Weekly Revenue' },
      children: [{
        type: 'chart',
        props: {
          type: 'bar',
          data: [
            { label: 'Mon', value: 35 },
            { label: 'Tue', value: 52 },
            { label: 'Wed', value: 41 },
            { label: 'Thu', value: 68 },
            { label: 'Fri', value: 59 }
          ]
        }
      }]
    }
  };

  const interactiveSpec = {
    version: '1.0' as const,
    state: { count: 0 },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'heading', props: { text: 'Counter Demo', level: 3 } },
        { type: 'text', props: { text: 'Count: {state.count}', size: 'xl' } },
        {
          type: 'flex',
          props: { gap: '8px' },
          children: [
            {
              type: 'button',
              props: { label: 'Increment' },
              on_click: { action: 'set', target: 'count', value: '{state.count + 1}' }
            },
            {
              type: 'button',
              props: { label: 'Reset', variant: 'outline' },
              on_click: { action: 'set', target: 'count', value: 0 }
            }
          ]
        }
      ]
    }
  };

  function handleEvent(event: RippleEvent) {
    console.log('RippleEvent:', event);
  }
</script>

<div style="max-width: 800px; margin: 2rem auto; display: flex; flex-direction: column; gap: 2rem; padding: 1rem;">
  <h1 style="font-size: 1.5rem; font-weight: bold;">Ripple Dev Playground</h1>

  <section>
    <h2 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Stats Grid (UISpec)</h2>
    <Ripple spec={statsSpec} onEvent={handleEvent} />
  </section>

  <section>
    <h2 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Chart (UISpec)</h2>
    <Ripple spec={chartSpec} onEvent={handleEvent} />
  </section>

  <section>
    <h2 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Interactive Counter (State + Events)</h2>
    <Ripple spec={interactiveSpec} onEvent={handleEvent} />
  </section>
</div>
