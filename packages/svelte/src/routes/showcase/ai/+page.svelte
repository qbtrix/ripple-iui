<!--
  Created: 2026-06-24 — AI-native display tier showcase. Renders the 3 new
  read-only widgets a generative-UI engine uses to show an agent's work:
  stream-text (streaming vs done), tool-call (pending/running/success/error +
  collapsed/expanded), reasoning-trace (collapsed summary vs expanded steps).
  Each panel is one declarative <Ripple {spec} onEvent={...} />, matching the
  card/stat/premium sub-route pattern. Display-only — no write-back.
  Updated: 2026-06-24 — added the approval-gate organism (human-in-the-loop
  approve/deny/diff-review): pending across each risk level, a gate composing a
  diff + tool-call body, and pre-resolved approved/denied states. The last gate
  is BOUND (decision persists via state) so the panel demos the full
  click → state → onStateChange round-trip.
-->
<script lang="ts">
  import { Ripple } from '$lib/index.js';
  import type { RippleEvent } from '@ripple-ui/core';

  function handleEvent(event: RippleEvent) {
    console.log('RippleEvent:', event);
  }

  function handleStateChange(path: string, value: unknown) {
    console.log('onStateChange:', path, value);
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

  // 4 ── approval-gate — pending across each risk level
  const riskSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'approval-gate',
          props: {
            title: 'Tag 12 leads as "warm"',
            summary: 'A reversible CRM update on 12 records.',
            risk: 'low',
            actionId: 'act_low',
          },
        },
        {
          type: 'approval-gate',
          props: {
            title: 'Send the renewal email to 48 customers',
            summary: 'Outbound to 48 recipients — cannot be unsent.',
            risk: 'medium',
            actionId: 'act_med',
          },
        },
        {
          type: 'approval-gate',
          props: {
            title: 'Delete 3 inactive workspaces',
            summary: 'Destructive — removes all data in those workspaces.',
            risk: 'high',
            actionId: 'act_high',
          },
        },
      ],
    },
  };

  // 5 ── approval-gate — a rich gate composing a diff + a proposed tool call
  const richGateSpec = {
    version: '1.0' as const,
    ui: {
      type: 'approval-gate',
      props: {
        title: 'Upgrade 3 accounts to the Pro tier',
        summary: 'Reviews the config change and the write the agent will run.',
        risk: 'high',
        actionId: 'act_upgrade',
        body: 'The agent matched **3 accounts** over the seat threshold and proposes a tier change. Review the diff and the write before approving.',
        diff: {
          before: 'acme:\n  tier: free\n  seats: 12\nbeta:\n  tier: free\n  seats: 9',
          after: 'acme:\n  tier: pro\n  seats: 12\nbeta:\n  tier: pro\n  seats: 9',
          title: 'accounts.yaml',
        },
        toolCalls: [
          {
            name: 'update_accounts',
            status: 'pending',
            args: { ids: ['acme', 'beta', 'gamma'], tier: 'pro' },
          },
        ],
      },
    },
  };

  // 6 ── approval-gate — pre-resolved states (approved / denied), controls dimmed
  const resolvedSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'approval-gate',
          props: {
            title: 'Refund order #4821',
            summary: '$240 refund to the customer.',
            risk: 'medium',
            decision: 'approved',
            decidedBy: 'Ada',
          },
        },
        {
          type: 'approval-gate',
          props: {
            title: 'Wipe the staging database',
            summary: 'Irreversible.',
            risk: 'high',
            decision: 'denied',
            decidedBy: 'Ada',
          },
        },
      ],
    },
  };

  // 7 ── approval-gate — BOUND: the decision persists to state on click.
  const boundGateSpec = {
    version: '1.0' as const,
    state: { gateDecision: 'pending' },
    ui: {
      type: 'approval-gate',
      bind: '{state.gateDecision}',
      props: {
        title: 'Publish the new pricing page',
        summary: 'Click Approve/Deny — the decision is written to state.gateDecision.',
        risk: 'medium',
        actionId: 'act_publish',
      },
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

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase tracking-wide text-muted-foreground">approval-gate — risk levels</h2>
    <Ripple spec={riskSpec} onEvent={handleEvent} />
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase tracking-wide text-muted-foreground">approval-gate — diff + tool-call body</h2>
    <Ripple spec={richGateSpec} onEvent={handleEvent} />
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase tracking-wide text-muted-foreground">approval-gate — resolved (approved / denied)</h2>
    <Ripple spec={resolvedSpec} onEvent={handleEvent} />
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-medium uppercase tracking-wide text-muted-foreground">approval-gate — bound (decision persists)</h2>
    <Ripple spec={boundGateSpec} onEvent={handleEvent} onStateChange={handleStateChange} />
  </section>
</div>
