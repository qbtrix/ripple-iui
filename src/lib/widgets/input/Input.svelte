<script lang="ts">
  // Updated: 2026-04-21 — opts into the WidgetRegistry when `id` is set so
  // the `invoke` flow action can call `focus` remotely.
  import type { Snippet } from 'svelte';
  import { getContext } from 'svelte';
  import { tv } from 'tailwind-variants';
  import { cn } from '$lib/utils.js';
  import type { WidgetRegistry } from '$lib/core/widget-registry.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    value?: string | number;
    placeholder?: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    name?: string;
    autocomplete?: HTMLInputElement['autocomplete'];
    error?: string;
    helper?: string;
    prefix?: Snippet;
    suffix?: Snippet;
    oninput?: (value: string) => void;
    onchange?: (value: string) => void;
    onfocus?: (e: FocusEvent) => void;
    onblur?: (e: FocusEvent) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    value = '',
    placeholder = '',
    type = 'text',
    size = 'md',
    disabled = false,
    readOnly = false,
    required = false,
    name,
    autocomplete,
    error,
    helper,
    prefix,
    suffix,
    oninput,
    onchange,
    onfocus,
    onblur,
  }: Props = $props();

  const uid = $props.id();
  const resolvedId = $derived(id ?? `ripple-input-${uid}`);
  const msgId = $derived(`${resolvedId}-msg`);

  const state = $derived(
    error ? 'error' : disabled ? 'disabled' : readOnly ? 'readonly' : 'idle'
  );

  const shell = tv({
    base: 'flex items-center gap-2 rounded-[8px] border bg-background text-foreground transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
    variants: {
      size: {
        sm: 'h-8 px-2.5 text-[13px]',
        md: 'h-9 px-3 text-sm',
        lg: 'h-10 px-3.5 text-[15px]',
      },
      state: {
        idle: 'border-border',
        disabled: 'border-border opacity-50 pointer-events-none',
        readonly: 'border-border bg-muted/40',
        error: 'border-destructive',
      },
    },
    defaultVariants: { size: 'md', state: 'idle' },
  });

  const field = tv({
    base: 'flex-1 min-w-0 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed',
  });

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function handleInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    oninput?.(v);
    onchange?.(v);
  }

  function handleChange(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    onchange?.(v);
  }

  // Bound on the real <input> below so the registry can focus it remotely.
  // The variable is a plain mutable ref — `bind:this` writes into it
  // synchronously on mount, so we don't need $state reactivity here.
  let inputEl: HTMLInputElement | null = null;

  const widgetRegistry = getContext<WidgetRegistry | undefined>('ui-widget-registry');
  $effect(() => {
    if (!id || !widgetRegistry) return;
    return widgetRegistry.register(id, 'focus', () => {
      inputEl?.focus();
    });
  });
</script>

<div
  class={cn('flex flex-col gap-1.5', className)}
  style={styleString}
  data-size={size}
  data-state={state}
>
  {#if label}
    <label
      for={resolvedId}
      class="text-[13px] font-medium leading-none text-foreground"
    >
      {label}
      {#if required}<span class="text-destructive" aria-hidden="true">*</span>{/if}
    </label>
  {/if}

  <div class={shell({ size, state })}>
    {#if prefix}
      <span data-slot="input-prefix" class="inline-flex shrink-0 text-muted-foreground">
        {@render prefix()}
      </span>
    {/if}
    <input
      bind:this={inputEl}
      id={resolvedId}
      {type}
      {name}
      {placeholder}
      {disabled}
      readonly={readOnly}
      {required}
      {autocomplete}
      value={value ?? ''}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={(error || helper) ? msgId : undefined}
      class={field()}
      oninput={handleInput}
      onchange={handleChange}
      {onfocus}
      {onblur}
    />
    {#if suffix}
      <span data-slot="input-suffix" class="inline-flex shrink-0 text-muted-foreground">
        {@render suffix()}
      </span>
    {/if}
  </div>

  {#if error}
    <span id={msgId} data-slot="input-error" class="text-[12px] text-destructive">
      {error}
    </span>
  {:else if helper}
    <span id={msgId} data-slot="input-helper" class="text-[12px] text-muted-foreground">
      {helper}
    </span>
  {/if}
</div>
