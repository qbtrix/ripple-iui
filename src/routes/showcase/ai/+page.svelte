<!--
  Created: 2026-06-24 — AI-native display tier showcase. Renders the 3 new
  read-only widgets a generative-UI engine uses to show an agent's work:
  stream-text (streaming vs done), tool-call (pending/running/success/error +
  collapsed/expanded), reasoning-trace (collapsed summary vs expanded steps).
  Each panel is one declarative <Ripple {spec} onEvent={...} />, matching the
  card/stat/premium sub-route pattern. Display-only — no write-back.
-->
<script lang="ts">
  import { Ripple } from '$lib/index.js';
  import type { RippleEvent } from '$lib/types.js';

  function handleEvent(event: RippleEvent) {
    console.log('RippleEvent:', event);
  }

  // 1 ── stream-text — streaming (caret + aria-busy) vs done
  const streamingSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      children: [
        {
          type: 'stream-text',
          props: {
            text: 'The agent is drafting a response and the caret keeps blinking while tokens arrive',
            streaming: true,
          },
        },
        {
          type: 'stream-text',
          props: {
            text: 'This message finished streaming — no caret, aria-busy is false.',
            streaming: true,
            done: true,
          },
        },
        {
          type: 'stream-text',
          props: {
            markdown: true,
            streaming: true,
            text: '**Markdown** streaming: render `inline code`, lists, and emphasis as the text grows.',
          },
        },
      ],
    },
  };

  // 2 ── tool-call — the four statuses + collapsed/expanded defaults
  const toolCallSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'tool-call',
          props: { name: 'plan_request', status: 'pending', args: { goal: 'build the page' } },
        },
        {
          type: 'tool-call',
          props: { name: 'search_web', status: 'running', args: { query: 'ripple widget catalog' }, time: 'now' },
        },
        {
          type: 'tool-call',
          props: {
            name: 'read_file',
            status: 'success',
            args: { path: 'src/lib/widgets/index.ts' },
            result: 'Read 437 lines.',
            durationMs: 420,
            time: '2s ago',
          },
        },
        {
          type: 'tool-call',
          props: {
            name: 'write_file',
            status: 'error',
            args: { path: '/etc/hosts' },
            error: 'EACCES: permission denied, open \'/etc/hosts\'',
            durationMs: 12,
          },
        },
      ],
    },
  };

  // 3 ── reasoning-trace — collapsed summary vs pre-expanded steps + streaming
  const reasoningSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'reasoning-trace',
          props: {
            steps: [
              { title: 'Parse the request', status: 'done' },
              { title: 'Search the widget catalog', status: 'done' },
              { title: 'Compose the spec', status: 'done' },
            ],
          },
        },
        {
          type: 'reasoning-trace',
          props: {
            streaming: true,
            collapsed: false,
            steps: [
              { title: 'Parse the request', detail: 'User wants a streaming-text primitive.', status: 'done' },
              { title: 'Search the widget catalog', detail: 'Looking for an existing match before building.', status: 'thinking' },
            ],
          },
        },
      ],
    },
  };
</script>

<div class="mx-auto max-w-2xl space-y-10 p-8">
  <header class="space-y-1">
    <h1 class="text-2xl font-semibold">AI-native display tier</h1>
    <p class="text-sm text-muted-foreground">
      Read-only widgets a generative-UI engine renders to show an agent's work.
    </p>
  </header>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase tracking-wide text-muted-foreground">stream-text</h2>
    <Ripple spec={streamingSpec} onEvent={handleEvent} />
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase tracking-wide text-muted-foreground">tool-call</h2>
    <Ripple spec={toolCallSpec} onEvent={handleEvent} />
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase tracking-wide text-muted-foreground">reasoning-trace</h2>
    <Ripple spec={reasoningSpec} onEvent={handleEvent} />
  </section>
</div>
