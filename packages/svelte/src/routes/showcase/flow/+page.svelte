<!--
  Created: 2026-04-21 — Flow actions showcase. Renders the form-submit
  example from docs/flow-actions.md so the captain can visually verify
  flow, branch, confirm, validate, delay, invoke and async api chaining
  against a mocked host.
-->
<script lang="ts">
  import Ripple from '$lib/Ripple.svelte';
  import type { RippleEvent, RippleEventResult } from '@ripple-ui/core';

  // Simulated host. Returns a RippleEventResult so the dispatcher can
  // exercise on_success / on_error chains.
  let log = $state<string[]>([]);
  function push(msg: string) {
    log = [...log, `${new Date().toLocaleTimeString()}  ${msg}`];
  }

  async function handleEvent(e: RippleEvent): Promise<RippleEventResult | void> {
    push(`${e.type}  ${e.message ?? e.url ?? e.name ?? ''}`);

    if (e.type === 'api') {
      // Simulate a 400ms network call. If the body email ends with
      // @fail.test, return an error so the on_error branch runs.
      await new Promise((r) => setTimeout(r, 400));
      const email = (e.body as { email?: string } | undefined)?.email ?? '';
      if (email.endsWith('@fail.test')) {
        return { ok: false, error: { message: 'Email rejected by server', status: 400 } };
      }
      return { ok: true, data: { id: `ord_${Math.floor(Math.random() * 1e6)}`, email } };
    }

    if (e.type === 'toast') {
      // Toasts are side-effects — just log them.
      return;
    }

    if (e.type === 'navigate') {
      push(`(would navigate to ${e.url})`);
      return;
    }
  }

  // The form-submit spec from docs/flow-actions.md, adapted for live demo.
  const spec = {
    state: { name: '', email: '', submitting: false, lastOrder: null },
    ui: {
      type: 'container',
      class: 'mx-auto max-w-lg space-y-4 p-6',
      children: [
        {
          type: 'card',
          props: {
            title: 'Place order',
            description: 'Try submitting with an empty field, a @fail.test email, and a real email.'
          },
          children: [
            {
              type: 'container',
              class: 'space-y-3',
              children: [
                {
                  type: 'input',
                  id: 'nameInput',
                  props: { label: 'Name', placeholder: 'Your name' },
                  bind: 'state.name',
                  on_change: [{ action: 'set', target: 'name' }]
                },
                {
                  type: 'input',
                  id: 'emailInput',
                  props: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
                  bind: 'state.email',
                  on_change: [{ action: 'set', target: 'email' }]
                },
                {
                  type: 'flex',
                  props: { gap: '2' },
                  children: [
                    {
                      type: 'button',
                      props: { label: 'Place order', disabled: '{state.submitting}' },
                      on_click: {
                        action: 'flow',
                        steps: [
                          {
                            action: 'validate',
                            condition: 'state.name',
                            message: 'Name is required.'
                          },
                          {
                            action: 'validate',
                            condition: 'state.email',
                            message: 'Email is required.'
                          },
                          {
                            action: 'confirm',
                            title: 'Submit?',
                            message: 'We will email {state.email} with the receipt.',
                            confirm_label: 'Place order',
                            cancel_label: 'Keep editing',
                            on_confirm: [
                              { action: 'set', target: 'submitting', value: true },
                              {
                                action: 'api',
                                url: '/api/orders',
                                method: 'POST',
                                body: { name: '{state.name}', email: '{state.email}' },
                                response_key: 'lastOrder',
                                on_success: [
                                  { action: 'set', target: 'submitting', value: false },
                                  {
                                    action: 'toast',
                                    message: 'Order placed.',
                                    variant: 'success'
                                  },
                                  { action: 'delay', ms: 200 },
                                  { action: 'invoke', target: 'nameInput', method: 'focus' }
                                ],
                                on_error: [
                                  { action: 'set', target: 'submitting', value: false },
                                  {
                                    action: 'toast',
                                    message: 'Could not place order.',
                                    variant: 'error'
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    },
                    {
                      type: 'button',
                      props: { label: 'Focus name', variant: 'outline' },
                      on_click: {
                        action: 'invoke',
                        target: 'nameInput',
                        method: 'focus'
                      }
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'card',
          props: { title: 'Last order' },
          children: [
            { type: 'text', props: { text: '{state.lastOrder}', variant: 'body' } }
          ]
        }
      ]
    }
  };
</script>

<div class="min-h-screen bg-background p-8">
  <header class="mx-auto max-w-3xl pb-4">
    <h1 class="text-2xl font-semibold">Flow actions — showcase</h1>
    <p class="mt-1 text-sm text-muted-foreground">
      Exercises flow, branch, confirm, validate, delay, invoke and async api chaining
      against a mocked host. Watch the event log on the right.
    </p>
  </header>

  <div class="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_22rem]">
    <Ripple {spec} onEvent={handleEvent} />

    <aside class="space-y-2">
      <h2 class="text-sm font-medium text-muted-foreground">Event log</h2>
      <div
        class="max-h-[30rem] overflow-auto rounded-md border border-border bg-card p-3 font-mono text-[11px]"
      >
        {#if log.length === 0}
          <p class="text-muted-foreground">No events yet. Submit the form to see the flow fire.</p>
        {:else}
          <ul class="space-y-1">
            {#each log as line (line)}
              <li>{line}</li>
            {/each}
          </ul>
        {/if}
      </div>
    </aside>
  </div>
</div>
