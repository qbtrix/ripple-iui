<!-- Created: 2026-04-16 — Textarea widget wrapping shadcn Textarea primitive.
     Props: placeholder, rows, disabled, value (bind). Events: onchange, onfocus, onblur.
     Updated: 2026-06-02 — render a `name` on the native textarea so a static
     <form action> POST submits the field with JS off (ripple-iui #54). -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    value?: string;
    placeholder?: string;
    rows?: number;
    disabled?: boolean;
    label?: string;
    /** Field name for native form submission. Defaults to the bind path via NodeRenderer. */
    name?: string;
    oninput?: (value?: unknown) => void;
    onchange?: (value?: unknown) => void;
    onfocus?: (value?: unknown) => void;
    onblur?: (value?: unknown) => void;
  }

  let {
    id, class: className, style, value = '', placeholder = '',
    rows = 3, disabled = false, label, name, oninput, onchange, onfocus, onblur
  }: Props = $props();

  // Local state that syncs with incoming prop (matches Switch pattern)
  let localValue = $state(value);

  $effect(() => {
    localValue = value ?? '';
  });

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    localValue = target.value;
    oninput?.(target.value);
    onchange?.(target.value);
  }

  function handleFocus() {
    onfocus?.(localValue);
  }

  function handleBlur() {
    onblur?.(localValue);
  }
</script>

<div class="space-y-2">
  {#if label}
    <label
      for={id}
      class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {label}
    </label>
  {/if}
  <Textarea
    {id}
    {name}
    value={localValue}
    {placeholder}
    {rows}
    {disabled}
    class={cn(className)}
    style={styleString}
    oninput={handleInput}
    onfocus={handleFocus}
    onblur={handleBlur}
  />
</div>
