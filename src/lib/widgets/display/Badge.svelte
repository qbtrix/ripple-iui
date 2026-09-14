<!-- src/lib/widgets/display/Badge.svelte
     origin: slev12397/beautiful-ui@ff0f74d components/atoms/StatusPill.tsx

     2026-09-14 (beautiful-ui re-skin, lane A): Badge now wears StatusPill's
     look. Geometry is the source pill — rounded-full, h-6, px-2.5, gap-1.5,
     text-[13px]/font-medium/leading-none — and EVERY variant is a tint
     (coloured text on the same colour at 10%) rather than a solid fill.
     StatusPill's `tone` maps onto the existing `variant` prop per the
     translation doc §7: green→success, orange→warning, red→destructive,
     accent→default, neutral→secondary. No prop added, renamed or removed, so
     the manifest shape is untouched. The source's optional leading dot is
     deliberately dropped — it would be a new prop, i.e. a shape change.
     The geometry/tint classes ride the `class` argument, not a fork of the
     shared shadcn badge, because `cn` is twMerge(clsx(…)): they beat the
     shadcn base for other widgets' Badge usage without editing it.

     2026-06-27: forward node id — bind id + data-ripple-node on root (passed
     through the shadcn Badge restProps) so the visual editor can select this
     widget directly (SP-0 id-forwarding codemod). -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { asText } from '$lib/widgets/text-coerce';

  interface Props {
    id?: string;
    text?: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
    class?: string;
  }

  let { id, text = '', variant = 'default', class: className }: Props = $props();

  // The source pill's geometry and rhythm, overriding the shadcn base
  // (h-5 / rounded-4xl / px-2 / text-xs) through twMerge.
  const pill = 'h-6 gap-1.5 rounded-full px-2.5 text-[13px] leading-none font-medium';

  // Tint per tone. `destructive` is left out on purpose: the shadcn variant is
  // already bg-destructive/10 + text-destructive, i.e. the same tint shape.
  // Known gap (translation doc §7, not fixed here): destructive routes to the
  // host's --destructive while success/warning use ripple tokens, so a
  // rethemed host gets a red that does not match its siblings.
  const variantMap: Record<string, string> = {
    default: 'bg-ripple-accent/10 text-ripple-accent border-transparent',
    secondary: 'bg-ripple-muted text-ripple-muted-foreground border-transparent',
    success: 'bg-ripple-success/10 text-ripple-success border-transparent',
    warning: 'bg-ripple-warning/10 text-ripple-warning border-transparent',
  };

  const shadcnVariant = $derived(
    ['default', 'secondary', 'destructive', 'outline'].includes(variant)
      ? variant as 'default' | 'secondary' | 'destructive' | 'outline'
      : 'outline'
  );

  const extraClass = $derived(variantMap[variant] ?? '');

  // Bindings deliver numbers/booleans as readily as strings ({state.x.score}).
  // Coerce before the emptiness check — .trim() exists only on strings, and a
  // non-string prop must render, not crash the canvas.
  const label = $derived(asText(text));
</script>

<!-- Empty guard: an empty badge (no text) would render as a bare bordered pill —
     a stray-circle artifact in cards. Render nothing when there's no content. -->
{#if label.trim()}
  <Badge {id} data-ripple-node={id} variant={shadcnVariant} class={cn(pill, extraClass, className)}>
    {label}
  </Badge>
{/if}
