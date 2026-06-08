<!--
  Separator.svelte — Ripple divider widget (horizontal / vertical).
  Updated 2026-06-08 (design polish): a horizontal divider now carries a sensible
  DEFAULT vertical margin (12px) so it always has breathing room instead of sitting
  flush against the content above and below — the captain's "dividers too close"
  complaint. The margin is applied via a zero-specificity `:where()` scoped rule, so
  ANY margin utility passed through `class` (e.g. `my-6`, `mt-0`) still wins without
  needing tailwind-merge (our `cn` is plain clsx, so class-string order does not
  resolve Tailwind conflicts — source-order / specificity does). A passed explicit
  margin is also detected and skips the default outright as a belt-and-suspenders.
  Vertical orientation is unaffected (no default block margin; it gets a small
  inline margin instead so a vertical rule in a row breathes too).
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Separator } from '$lib/components/ui/separator/index.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    orientation?: 'horizontal' | 'vertical';
  }

  let { id, class: className, style, orientation = 'horizontal' }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // Belt-and-suspenders: if the spec already states a margin, don't impose the
  // default rhythm at all (lets `m-0` / `my-8` etc. take full control).
  const hasExplicitMargin = $derived(
    /(^|\s)-?m[trblxy]?-/.test(className ?? '')
  );
</script>

<div
  class="ripple-separator"
  data-orientation={orientation}
  data-explicit-margin={hasExplicitMargin ? 'true' : undefined}
>
  <Separator
    {id}
    {orientation}
    class={cn(className)}
    style={styleString}
  />
</div>

<style>
  /* Wrapper carries the default rhythm. `:where()` keeps specificity at 0 so any
     margin utility the spec passes through `class` still wins (our cn is clsx,
     not tailwind-merge, so we cannot rely on class-string order to dedupe). */
  .ripple-separator {
    display: contents;
  }

  /* Horizontal divider: comfortable vertical breathing room (12px each side). */
  :where(.ripple-separator[data-orientation='horizontal']:not([data-explicit-margin])) > :global(*) {
    margin-block: 0.75rem;
  }

  /* Vertical divider in a row: a little inline space so it doesn't kiss its
     neighbours. */
  :where(.ripple-separator[data-orientation='vertical']:not([data-explicit-margin])) > :global(*) {
    margin-inline: 0.75rem;
  }
</style>
