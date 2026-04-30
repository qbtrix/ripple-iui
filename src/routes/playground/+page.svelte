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
          {
            type: 'text',
            props: {
              text: 'Edit the JSON on the left to render a different UI.',
              size: 'sm'
            }
          },
          {
            type: 'grid',
            props: { columns: 3, gap: 3 },
            children: [
              {
                type: 'stat',
                props: {
                  label: 'Revenue',
                  value: 12450,
                  format: 'currency',
                  deltaPercent: 3.4,
                  direction: 'up-good'
                }
              },
              {
                type: 'stat',
                props: {
                  label: 'Signups',
                  value: 247,
                  deltaPercent: 18.2,
                  direction: 'up-good'
                }
              },
              {
                type: 'stat',
                props: {
                  label: 'Churn',
                  value: 0.034,
                  format: 'percent',
                  deltaPercent: -0.8,
                  direction: 'down-good'
                }
              }
            ]
          },
          {
            type: 'flex',
            props: { direction: 'column', gap: '8px' },
            children: [
              {
                type: 'input',
                bind: '{state.username}',
                props: { label: 'Your name', placeholder: 'Type something' }
              },
              {
                type: 'text',
                props: { text: 'Hello, {state.username}!', size: 'sm' }
              }
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

  let source = $state(EXAMPLE);
  let autoRender = $state(true);
  let committedSource = $state(EXAMPLE);

  const parsed = $derived.by<{ spec: any | null; error: string | null }>(() => {
    const text = autoRender ? source : committedSource;
    if (!text.trim()) return { spec: null, error: 'Spec is empty' };
    try {
      return { spec: JSON.parse(text), error: null };
    } catch (e) {
      return { spec: null, error: e instanceof Error ? e.message : String(e) };
    }
  });

  const events = $state<RippleEvent[]>([]);

  function handleEvent(event: RippleEvent) {
    events.unshift(event);
    if (events.length > 50) events.length = 50;
  }

  function format() {
    try {
      source = JSON.stringify(JSON.parse(source), null, 2);
    } catch {
      // leave as-is if invalid
    }
  }

  function render() {
    committedSource = source;
  }

  function reset() {
    source = EXAMPLE;
    committedSource = EXAMPLE;
    events.length = 0;
  }

  function clearEvents() {
    events.length = 0;
  }
</script>

<div class="page">
  <header class="header">
    <div>
      <h1>Spec Playground</h1>
      <p>Paste or edit a Ripple JSON spec and render it live.</p>
    </div>
    <div class="toolbar">
      <label class="toggle">
        <input type="checkbox" bind:checked={autoRender} />
        Auto-render
      </label>
      <button class="btn" onclick={format}>Format</button>
      <button class="btn" onclick={render} disabled={autoRender}>Render</button>
      <button class="btn" onclick={reset}>Reset</button>
    </div>
  </header>

  <div class="split">
    <section class="pane">
      <div class="pane-head">
        <span>JSON spec</span>
        {#if parsed.error}
          <span class="err">invalid</span>
        {:else}
          <span class="ok">valid</span>
        {/if}
      </div>
      <textarea
        class="editor"
        spellcheck="false"
        bind:value={source}
      ></textarea>
      {#if parsed.error}
        <pre class="error">{parsed.error}</pre>
      {/if}
    </section>

    <section class="pane">
      <div class="pane-head">
        <span>Preview</span>
      </div>
      <div class="preview">
        {#if parsed.spec}
          {#key parsed.spec}
            <Ripple spec={parsed.spec} onEvent={handleEvent} />
          {/key}
        {:else}
          <div class="empty">Fix the JSON to see a preview.</div>
        {/if}
      </div>

      <div class="pane-head events-head">
        <span>Events ({events.length})</span>
        <button class="link" onclick={clearEvents} disabled={events.length === 0}>clear</button>
      </div>
      <div class="events">
        {#if events.length === 0}
          <div class="empty">No events yet. Interact with the preview to see them here.</div>
        {:else}
          {#each events as ev, i (i)}
            <pre class="event">{JSON.stringify(ev, null, 2)}</pre>
          {/each}
        {/if}
      </div>
    </section>
  </div>
</div>

<style>
  .page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px 24px 40px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .header h1 {
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .header p {
    margin: 0;
    font-size: 13px;
    color: hsl(var(--muted-foreground));
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: hsl(var(--muted-foreground));
    user-select: none;
  }
  .btn {
    padding: 6px 12px;
    font-size: 13px;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--card));
    color: hsl(var(--foreground));
    border-radius: 7px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn:hover:not(:disabled) {
    background: hsl(var(--muted) / 0.6);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
    min-height: 70vh;
  }
  @media (max-width: 900px) {
    .split { grid-template-columns: 1fr; }
  }
  .pane {
    display: flex;
    flex-direction: column;
    border: 1px solid hsl(var(--border));
    border-radius: 10px;
    background: hsl(var(--card));
    overflow: hidden;
    min-height: 0;
  }
  .pane-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid hsl(var(--border));
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: hsl(var(--muted-foreground));
    background: hsl(var(--muted) / 0.3);
  }
  .events-head {
    border-top: 1px solid hsl(var(--border));
  }
  .ok { color: hsl(142 70% 40%); text-transform: none; letter-spacing: 0; }
  .err { color: hsl(var(--destructive)); text-transform: none; letter-spacing: 0; }
  .link {
    background: none;
    border: none;
    font: inherit;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    padding: 0;
    text-transform: none;
    letter-spacing: 0;
    text-decoration: underline;
  }
  .link:disabled { opacity: 0.4; cursor: not-allowed; text-decoration: none; }
  .editor {
    flex: 1;
    min-height: 400px;
    padding: 12px 14px;
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 12.5px;
    line-height: 1.5;
    border: 0;
    outline: none;
    resize: none;
    background: transparent;
    color: hsl(var(--foreground));
    white-space: pre;
    tab-size: 2;
  }
  .error {
    margin: 0;
    padding: 10px 14px;
    border-top: 1px solid hsl(var(--border));
    background: hsl(var(--destructive) / 0.08);
    color: hsl(var(--destructive));
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 12px;
    white-space: pre-wrap;
  }
  .preview {
    padding: 16px;
    flex: 1;
    overflow: auto;
    min-height: 300px;
  }
  .events {
    max-height: 240px;
    overflow: auto;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .event {
    margin: 0;
    padding: 8px 10px;
    background: hsl(var(--muted) / 0.4);
    border-radius: 6px;
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 11.5px;
    line-height: 1.45;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .empty {
    padding: 16px;
    text-align: center;
    font-size: 13px;
    color: hsl(var(--muted-foreground));
  }
</style>
