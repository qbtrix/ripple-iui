<script lang="ts">
  import { Ripple } from '$lib/index.js';
  import type { RippleEvent } from '$lib/types.js';

  const EXAMPLE = JSON.stringify(
    {
      version: '1.0',
      state: { username: '' },
      ui: {
        type: 'flex',
        props: { direction: 'column', gap: '16px' },
        children: [
          { type: 'heading', props: { text: 'Hello, Ripple!', level: 2 } },
          { type: 'text', props: { text: 'Edit the JSON on the left to render a different UI.', size: 'sm' } },
          {
            type: 'grid',
            props: { columns: 3, gap: 3 },
            children: [
              { type: 'stat', props: { label: 'Revenue', value: 12450, format: 'currency', deltaPercent: 3.4, direction: 'up-good' } },
              { type: 'stat', props: { label: 'Signups', value: 247, deltaPercent: 18.2, direction: 'up-good' } },
              { type: 'stat', props: { label: 'Churn', value: 0.034, format: 'percent', deltaPercent: -0.8, direction: 'down-good' } }
            ]
          },
          {
            type: 'flex',
            props: { direction: 'column', gap: '8px' },
            children: [
              { type: 'input', bind: '{state.username}', props: { label: 'Your name', placeholder: 'Type something' } },
              { type: 'text', props: { text: 'Hello, {state.username}!', size: 'sm' } }
            ]
          },
          {
            type: 'button',
            props: { label: 'Click me', variant: 'default' },
            on_click: [{ action: 'toast', message: 'Hello from Ripple!' }]
          }
        ]
      }
    },
    null,
    2
  );

  // ── Truth lives in Svelte; the spec mirrors it via state override ──────
  let source = $state(EXAMPLE);
  let autoRender = $state(true);
  let committedSource = $state(EXAMPLE);
  let events = $state<RippleEvent[]>([]);

  const parsed = $derived.by<{ spec: unknown | null; error: string | null }>(() => {
    const text = autoRender ? source : committedSource;
    if (!text.trim()) return { spec: null, error: 'Spec is empty' };
    try {
      return { spec: JSON.parse(text), error: null };
    } catch (e) {
      return { spec: null, error: e instanceof Error ? e.message : String(e) };
    }
  });

  // Inner ripple-frame events bubble out via the host-controlled onEvent on
  // the OUTER Ripple — but the inner frame has its own onEvent, so we forward.
  function handleEvent(event: RippleEvent) {
    // Custom 'pg' actions are emitted from the spec's toolbar buttons.
    if (event.type === 'emit' && typeof event.target === 'string') {
      if (event.target === 'pg-format') {
        try {
          source = JSON.stringify(JSON.parse(source), null, 2);
        } catch { /* invalid — leave as is */ }
        return;
      }
      if (event.target === 'pg-render') {
        committedSource = source;
        return;
      }
      if (event.target === 'pg-reset') {
        source = EXAMPLE;
        committedSource = EXAMPLE;
        events = [];
        return;
      }
      if (event.target === 'pg-clear-events') {
        events = [];
        return;
      }
    }
    // Anything else: log to events panel.
    events = [event, ...events].slice(0, 50);
  }

  // The state override is recomputed reactively and pushed into the outer
  // Ripple. The Ripple component's own $effect diffs and only re-applies
  // values that actually changed, so the textarea keeps its caret position
  // while typing.
  const stateOverride = $derived({
    source,
    autoRender,
    parsedSpec: parsed.spec,
    error: parsed.error,
    eventsJson: events.map((e) => JSON.stringify(e, null, 2))
  });

  function handleStateChange(path: string, value: unknown) {
    if (path === 'source' && typeof value === 'string') source = value;
    if (path === 'autoRender' && typeof value === 'boolean') autoRender = value;
  }

  // ── Playground shell as a Ripple spec ────────────────────────────────────
  const playgroundSpec = {
    version: '1.0' as const,
    state: {
      source: '',
      autoRender: true,
      parsedSpec: null,
      error: null,
      eventsJson: [] as string[]
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      class: 'playground-page',
      children: [
        // Header + toolbar
        {
          type: 'flex',
          props: { justify: 'between', align: 'end', wrap: 'wrap', gap: '12px' },
          children: [
            {
              type: 'page-header',
              props: { eyebrow: 'PLAYGROUND', title: 'Spec Playground', subtitle: 'Paste or edit a Ripple JSON spec and render it live.' },
              class: 'flex-1 min-w-0'
            },
            {
              type: 'flex',
              props: { gap: '8px', align: 'center' },
              children: [
                { type: 'checkbox', props: { label: 'Auto-render' }, bind: 'autoRender' },
                { type: 'button', props: { label: 'Format', variant: 'outline', size: 'sm' }, on_click: { action: 'emit', target: 'pg-format' } },
                {
                  type: 'if',
                  condition: '{!state.autoRender}',
                  children: [
                    { type: 'button', props: { label: 'Render', size: 'sm' }, on_click: { action: 'emit', target: 'pg-render' } }
                  ]
                },
                { type: 'button', props: { label: 'Reset', variant: 'ghost', size: 'sm' }, on_click: { action: 'emit', target: 'pg-reset' } }
              ]
            }
          ]
        },

        // Two-pane split
        {
          type: 'grid',
          props: { columns: 2, gap: '16px' },
          class: 'playground-split',
          children: [
            // Left: textarea
            {
              type: 'card',
              children: [
                {
                  type: 'flex',
                  props: { justify: 'between', align: 'center' },
                  children: [
                    { type: 'text', props: { text: 'JSON spec', size: 'xs', weight: 'semibold' }, class: 'uppercase tracking-wide' },
                    {
                      type: 'if',
                      condition: '{state.error == null}',
                      children: [{ type: 'badge', props: { text: 'valid', variant: 'secondary' } }],
                      else_children: [{ type: 'badge', props: { text: 'invalid', variant: 'destructive' } }]
                    }
                  ]
                },
                {
                  type: 'textarea',
                  props: { rows: 18, class: 'font-mono text-xs leading-relaxed' },
                  bind: 'source'
                },
                {
                  type: 'if',
                  condition: '{state.error != null}',
                  children: [
                    { type: 'alert', props: { variant: 'destructive', title: 'Parse error', description: '{state.error}' } }
                  ]
                }
              ]
            },

            // Right: preview + events
            {
              type: 'flex',
              props: { direction: 'column', gap: '12px' },
              children: [
                {
                  type: 'card',
                  children: [
                    { type: 'text', props: { text: 'Preview', size: 'xs', weight: 'semibold' }, class: 'uppercase tracking-wide mb-2' },
                    {
                      type: 'if',
                      condition: '{state.parsedSpec != null}',
                      children: [
                        { type: 'ripple-frame', props: { spec: '{state.parsedSpec}' } }
                      ],
                      else_children: [
                        { type: 'empty-state', props: { icon: 'error', title: 'Fix the JSON to see a preview', description: 'The editor is showing a parse error.' } }
                      ]
                    }
                  ]
                },
                {
                  type: 'card',
                  children: [
                    {
                      type: 'flex',
                      props: { justify: 'between', align: 'center' },
                      children: [
                        { type: 'text', props: { text: 'Events ({state.eventsJson.length})', size: 'xs', weight: 'semibold' }, class: 'uppercase tracking-wide' },
                        { type: 'button', props: { label: 'clear', variant: 'ghost', size: 'sm' }, on_click: { action: 'emit', target: 'pg-clear-events' } }
                      ]
                    },
                    {
                      type: 'if',
                      condition: '{state.eventsJson.length == 0}',
                      children: [
                        { type: 'text', props: { text: 'No events yet. Interact with the preview to see them here.', size: 'xs' }, class: 'text-muted-foreground' }
                      ],
                      else_children: [
                        {
                          type: 'each',
                          items: 'eventsJson',
                          item_as: 'evJson',
                          children: [
                            { type: 'code-block', props: { code: '{evJson}', hideCopy: true, hideLanguage: true } }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  };
</script>

<div class="page">
  <Ripple
    spec={playgroundSpec}
    state={stateOverride}
    onStateChange={handleStateChange}
    onEvent={handleEvent}
  />
</div>

<style>
  .page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px 24px 40px;
  }
  :global(.playground-split) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  @media (max-width: 900px) {
    :global(.playground-split) { grid-template-columns: 1fr; }
  }
</style>
