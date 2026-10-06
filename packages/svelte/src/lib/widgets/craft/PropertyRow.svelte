<!--
  widgets/craft/PropertyRow.svelte
  One compact inspector field: label on the left, control on the right, on a
  fixed label column (`labelWidth`, default 4.5rem) so every row in a panel
  shares one aligned label edge and one control edge. On `./ui` only.
  - The control column is a flex row whose children may shrink (min-w-0);
    compact NumberInputs fill it, so a lone field is exactly as wide as a
    two-up pair below it.
  - `stacked` puts the label above a full-width control (a textarea, a long
    icon group) for rows that need the whole panel width.
  - Pass `for` with the control's id to get a real <label>; otherwise the label
    is a span. Either way the row publishes its label (input/field-name.ts), and
    a NumberInput or ColorPicker inside it with no label of its own takes it as
    its accessible name. `hint` is the row's tooltip. Tokens only.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { provideFieldName } from '../input/field-name.js';

  interface Props {
    label: string;
    /** id of the control, for a <label for>. */
    for?: string;
    hint?: string;
    labelWidth?: string;
    stacked?: boolean;
    children?: Snippet;
    class?: string;
  }

  let { label, for: htmlFor, hint, labelWidth = '4.5rem', stacked = false, children, class: className }: Props = $props();
  provideFieldName(() => label);
</script>

{#snippet text()}
  {#if htmlFor}
    <label for={htmlFor} class="truncate text-ripple-muted-foreground">{label}</label>
  {:else}
    <span class="truncate text-ripple-muted-foreground">{label}</span>
  {/if}
{/snippet}

{#if stacked}
  <div data-slot="property-row" class={cn('flex flex-col gap-1.5 px-3 py-0.5 text-[12px]', className)} title={hint}>
    {@render text()}
    <div class="flex min-w-0 items-center gap-1.5">{@render children?.()}</div>
  </div>
{:else}
  <div
    data-slot="property-row"
    class={cn('grid min-h-7 items-center gap-2 px-3 text-[12px]', className)}
    style:grid-template-columns="{labelWidth} minmax(0, 1fr)"
    title={hint}
  >
    {@render text()}
    <div class="flex min-w-0 items-center gap-1.5">{@render children?.()}</div>
  </div>
{/if}
