<script lang="ts">
  import { Ripple } from '$lib/index.js';
  import type { RippleEvent } from '$lib/types.js';

  type ChatMsg = { role: 'user' | 'assistant'; text: string };

  // ── Mock LLM specs ─────────────────────────────────────────────
  // Each spec emits `emit → chat.send` on user actions, so the simulator
  // can decide the next turn purely from the message text.

  const productListSpec = {
    version: '1.0' as const,
    state: {
      products: [
        { id: 'aero', name: 'AeroPress', price: '$39', desc: 'Compact immersion brewer.', emoji: '🫙' },
        { id: 'v60', name: 'Hario V60', price: '$25', desc: 'Spiral pour-over dripper.', emoji: '⏬' },
        { id: 'kalita', name: 'Kalita Wave', price: '$45', desc: 'Flat-bottom wave brewer.', emoji: '🌊' }
      ]
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'text', props: { text: 'Here are three popular options:', size: 'sm' } },
        {
          type: 'grid',
          props: { columns: 3, gap: '12px' },
          children: [
            {
              type: 'each',
              items: 'products',
              item_as: 'product',
              children: [
                {
                  type: 'card',
                  props: { title: '{product.emoji} {product.name}' },
                  children: [
                    { type: 'text', props: { text: '{product.desc}', size: 'xs' } },
                    { type: 'metric', props: { label: 'Price', value: '{product.price}' } },
                    {
                      type: 'flex',
                      props: { gap: '6px' },
                      children: [
                        {
                          type: 'button',
                          props: { label: 'Buy', size: 'sm' },
                          on_click: { action: 'emit', target: 'chat.send', value: 'I want to buy the {product.name}' }
                        },
                        {
                          type: 'button',
                          props: { label: 'Compare', variant: 'outline', size: 'sm' },
                          on_click: { action: 'emit', target: 'chat.send', value: 'Compare the {product.name} to the others' }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'flex',
          props: { gap: '6px', wrap: 'wrap' },
          children: [
            { type: 'chip', props: { label: 'Show me espresso machines instead', variant: 'primary' }, on_click: { action: 'emit', target: 'chat.send', value: 'Show me espresso machines instead' } },
            { type: 'chip', props: { label: 'Sort by price', variant: 'default' }, on_click: { action: 'emit', target: 'chat.send', value: 'Sort by price' } }
          ]
        }
      ]
    }
  };

  function checkoutSpec(productName: string) {
    return {
      version: '1.0' as const,
      state: { qty: 1, address: '' },
      ui: {
        type: 'flex',
        props: { direction: 'column', gap: '10px' },
        children: [
          { type: 'heading', props: { text: 'Checkout — ' + productName, level: 4 } },
          { type: 'number-input', props: { label: 'Quantity', min: 1, max: 99 }, bind: 'qty' },
          { type: 'input', props: { label: 'Shipping address', placeholder: '123 Main St' }, bind: 'address' },
          {
            type: 'flex',
            props: { gap: '8px' },
            children: [
              {
                type: 'button',
                props: { label: 'Confirm purchase' },
                on_click: { action: 'emit', target: 'chat.send', value: 'Confirm purchase: ' + productName + ' x{state.qty} to {state.address}' }
              },
              {
                type: 'button',
                props: { label: 'Cancel', variant: 'ghost' },
                on_click: { action: 'emit', target: 'chat.send', value: 'Cancel checkout' }
              }
            ]
          }
        ]
      }
    };
  }

  const espressoSpec = {
    version: '1.0' as const,
    state: {
      machines: [
        { id: 'gaggia', name: 'Gaggia Classic Pro', price: '$499', emoji: '☕' },
        { id: 'breville', name: 'Breville Bambino', price: '$309', emoji: '🛠️' }
      ]
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '10px' },
      children: [
        { type: 'text', props: { text: "Here are two beginner-friendly espresso machines:", size: 'sm' } },
        {
          type: 'each',
          items: 'machines',
          item_as: 'm',
          children: [
            {
              type: 'card',
              props: { title: '{m.emoji} {m.name}' },
              children: [
                { type: 'metric', props: { label: 'Price', value: '{m.price}' } },
                {
                  type: 'button',
                  props: { label: 'Buy', size: 'sm' },
                  on_click: { action: 'emit', target: 'chat.send', value: 'I want to buy the {m.name}' }
                }
              ]
            }
          ]
        }
      ]
    }
  };

  const confirmSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'alert', props: { variant: 'success', title: 'Order placed', description: 'Confirmation #C-4F3B-9C72.' } },
        {
          type: 'button',
          props: { label: 'Start over', variant: 'outline' },
          on_click: { action: 'emit', target: 'chat.send', value: 'show me products' }
        }
      ]
    }
  };

  const helpSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '10px' },
      children: [
        { type: 'text', props: { text: "Try one of these to see the loop in action:", size: 'sm' } },
        {
          type: 'flex',
          props: { gap: '6px', wrap: 'wrap' },
          children: [
            { type: 'chip', props: { label: 'show me products', variant: 'primary' }, on_click: { action: 'emit', target: 'chat.send', value: 'show me products' } },
            { type: 'chip', props: { label: 'show me espresso machines', variant: 'primary' }, on_click: { action: 'emit', target: 'chat.send', value: 'show me espresso machines' } },
            { type: 'chip', props: { label: 'help', variant: 'default' }, on_click: { action: 'emit', target: 'chat.send', value: 'help' } }
          ]
        }
      ]
    }
  };

  // ── Mock LLM router — picks a reply spec from a user message ────

  function fakeLlm(userText: string): { reply: string; spec: any } {
    const t = userText.toLowerCase();
    if (t.includes('confirm purchase')) {
      return { reply: 'Order placed. Anything else I can help with?', spec: confirmSpec };
    }
    if (t.startsWith('cancel')) {
      return { reply: 'No problem — back to the catalog.', spec: productListSpec };
    }
    if (t.includes('buy ') || t.includes('buy the')) {
      const match = userText.match(/buy(?: the)?\s+(.+?)$/i);
      const name = match ? match[1] : 'item';
      return { reply: `Great choice! Let's get the ${name} on its way.`, spec: checkoutSpec(name) };
    }
    if (t.includes('espresso')) {
      return { reply: 'Switching to espresso machines:', spec: espressoSpec };
    }
    if (t.includes('compare')) {
      return { reply: "Side-by-side coming up — pick any product to start a comparison flow (this demo doesn't go further).", spec: productListSpec };
    }
    if (t.includes('sort')) {
      return { reply: 'Sorted by price (mock):', spec: productListSpec };
    }
    if (t.includes('product')) {
      return { reply: 'Here are some popular brewers:', spec: productListSpec };
    }
    return { reply: "I can show products, run checkout, or restart. Try a chip below.", spec: helpSpec };
  }

  // ── Reactive state ──────────────────────────────────────────────

  let messages = $state<ChatMsg[]>([
    { role: 'assistant', text: 'Hi! Try asking "show me products" — every button you click sends a real message back to me.' }
  ]);
  let currentSpec = $state<any>(helpSpec);
  let currentState = $state<Record<string, unknown>>({});
  let inputValue = $state('');

  // Each spec change brings its own initial state (LLM resets state per turn).
  // Bumping a key forces <Ripple> to remount with the new initial state.
  let specKey = $state(0);

  function send(text: string) {
    if (!text.trim()) return;
    messages = [...messages, { role: 'user', text }];
    inputValue = '';
    // Simulate a brief LLM "thinking" pause for realism.
    setTimeout(() => {
      const { reply, spec } = fakeLlm(text);
      messages = [...messages, { role: 'assistant', text: reply }];
      currentSpec = spec;
      currentState = (spec.state as Record<string, unknown>) ?? {};
      specKey++;
    }, 300);
  }

  function handleRippleEvent(event: RippleEvent) {
    if (event.type === 'emit' && event.target === 'chat.send' && typeof event.payload === 'string') {
      send(event.payload);
    }
  }

  function onSubmit(e: Event) {
    e.preventDefault();
    send(inputValue);
  }

  function reset() {
    messages = [{ role: 'assistant', text: 'Reset. Try a chip to begin.' }];
    currentSpec = helpSpec;
    currentState = {};
    specKey++;
  }
</script>

<svelte:head>
  <title>Ripple — Agentic Chat Loop</title>
</svelte:head>

<main class="mx-auto max-w-3xl p-6 flex flex-col gap-4">
  <header class="flex items-baseline justify-between">
    <div>
      <div class="text-xs uppercase tracking-wider text-muted-foreground">@ripple-ui/svelte</div>
      <h1 class="text-2xl font-bold">Agentic Chat Loop</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Every interactive widget below emits <code>emit → chat.send</code>. The page hosts a fake LLM
        that picks the next spec from the message text. Buttons drive the conversation.
      </p>
    </div>
    <button
      type="button"
      onclick={reset}
      class="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/60"
    >
      Reset
    </button>
  </header>

  <section class="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
    <ol class="flex flex-col gap-2 m-0 p-3 list-none max-h-[280px] overflow-y-auto">
      {#each messages as m, i (i)}
        <li class={m.role === 'user' ? 'self-end max-w-[80%]' : 'self-start max-w-[90%]'}>
          <div
            class={m.role === 'user'
              ? 'rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3 py-1.5 text-sm'
              : 'rounded-2xl rounded-tl-sm bg-muted px-3 py-1.5 text-sm'}
          >
            {m.text}
          </div>
        </li>
      {/each}
    </ol>

    <div class="border-t border-border p-3">
      {#key specKey}
        <Ripple spec={currentSpec} state={currentState} onEvent={handleRippleEvent} />
      {/key}
    </div>

    <form
      class="flex items-center gap-2 border-t border-border p-2 bg-muted/20"
      onsubmit={onSubmit}
    >
      <input
        type="text"
        placeholder="Type a message... e.g. 'show me products'"
        bind:value={inputValue}
        class="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      />
      <button
        type="submit"
        disabled={!inputValue.trim()}
        class="rounded-md bg-primary text-primary-foreground px-3 h-9 text-sm font-medium disabled:opacity-50"
      >
        Send
      </button>
    </form>
  </section>

  <section class="rounded-lg border border-border bg-card/30 p-4 text-xs text-muted-foreground">
    <div class="font-semibold text-foreground mb-1">How this works</div>
    <ol class="list-decimal pl-4 space-y-0.5">
      <li>Every button / chip uses <code>{`{ action: 'emit', target: 'chat.send', value: '...' }`}</code></li>
      <li>This page passes <code>onEvent</code> to <code>&lt;Ripple&gt;</code> and routes <code>chat.send</code> events to <code>send()</code></li>
      <li><code>send()</code> appends to the message log and asks the (mock) LLM for the next spec</li>
      <li>The new spec replaces the current one — no client-side branching, no per-product handlers</li>
    </ol>
    <p class="mt-2">
      In a real app, replace <code>fakeLlm</code> with a streaming call to your model. The contract on the
      Ripple side is identical — see <code>docs/agentic-ui.md</code>.
    </p>
  </section>
</main>
