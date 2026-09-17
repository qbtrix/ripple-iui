<!-- origin: slev12397/beautiful-ui@ff0f74d components/atoms/Switch.tsx

     2026-09-16 — re-skinned to the source atom's geometry: a 40x24 track with a
     20px thumb inset 2px, travelling 16px, on the shared ease over 200ms. The
     shadcn primitive is 32x18.4 with a 16px thumb, so the skin is a set of
     overrides passed down as `class` — components/ui/switch is NOT forked, the
     same call lane A made on Badge.

     Two of those overrides carry `!`. The primitive's own thumb rules are
     variant-prefixed and hardcoded inside switch.svelte, so twMerge never sees
     them and a plain override loses on specificity (its `size-4` is three
     selector levels, an arbitrary-variant override is two). `[&>svg]:size-3!`
     in components/ui/badge is the same shape. `border-2` needs none: it is in
     twMerge's border-width group, so it replaces the primitive's `border`
     outright — and that transparent 2px border is what produces the source's
     2px thumb inset, which makes the travel exactly 16px (40 - 2 - 2 - 20).

     Dropped for glass: the thumb's `0 1px 2px rgba(0,0,0,0.2)`. The track fills
     stay the primitive's `bg-primary` / `bg-input` rather than the source's
     `bg-ink` / `bg-line-strong` — a switch reading in the host's accent is
     ripple's convention and the brief here was geometry.

     Also fixed, not shape: `label for` pointed at an `id` that is undefined
     unless a spec sets one, so the label was not wired to anything. Now
     `$props.id()` backs it, the house rule ToolCall and ReasoningTrace already
     follow.

     Updated: 2026-06-02 — pass a `name` to the bits-ui switch so it renders a
     hidden form input; a static form-action POST then submits the toggled state
     with JS off (ripple-iui #54).
     Updated: 2026-06-09 — svelte-ignore state_referenced_locally on the
     localChecked seed: it's intentionally mutated by handleChange + synced by
     an $effect (controlled input with internal state), so it stays $state. -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Switch } from '$lib/components/ui/switch/index.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    /** Field name for native form submission. Defaults to the bind path via NodeRenderer. */
    name?: string;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, style, checked = false,
    disabled = false, label, name, onchange
  }: Props = $props();

  // Per-instance, so the label's `for` has a real target when no spec id is set.
  const uid = $props.id();
  const switchId = $derived(id ?? uid);

  // Local state that syncs with prop
  // svelte-ignore state_referenced_locally
  let localChecked = $state(checked);

  $effect(() => {
    localChecked = checked;
  });

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function handleChange(value: boolean) {
    localChecked = value;
    onchange?.(value);
  }

  // The source's track and thumb, as overrides on the shadcn primitive. Every
  // class is written out in full: Tailwind scans this file as text, so a class
  // assembled from a template variable is a class that compiles to nothing.
  const skin =
    'h-6! w-10! border-2 duration-200 ease-ripple-out ' +
    '[&_[data-slot=switch-thumb]]:size-5! ' +
    '[&_[data-slot=switch-thumb]]:data-[state=checked]:translate-x-4! ' +
    '[&_[data-slot=switch-thumb]]:rtl:data-[state=checked]:-translate-x-4! ' +
    '[&_[data-slot=switch-thumb]]:duration-200 ' +
    '[&_[data-slot=switch-thumb]]:ease-ripple-out ' +
    '[&_[data-slot=switch-thumb]]:motion-reduce:transition-none';
</script>

{#if label}
  <div class={cn('flex items-center gap-2', className)} style={styleString}>
    <Switch
      id={switchId}
      {name}
      checked={localChecked}
      {disabled}
      class={skin}
      onCheckedChange={handleChange}
    />
    <label for={switchId} class="text-[13px] font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {label}
    </label>
  </div>
{:else}
  <Switch
    id={switchId}
    {name}
    checked={localChecked}
    {disabled}
    class={cn(skin, className)}
    style={styleString}
    onCheckedChange={handleChange}
  />
{/if}
