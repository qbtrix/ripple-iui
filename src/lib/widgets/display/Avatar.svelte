<!--
  Avatar.svelte — Ripple avatar widget.
  Updated 2026-06-08 (design polish):
    - Clean fallback: derive tasteful initials from `alt` (e.g. "Ada Lovelace" -> "AL")
      when no explicit `fallback` is given, instead of a bare "?". A neutral
      person glyph is the last resort, never a stray "?".
    - Fixed the "stray floating colored dots" glitch: Avatar.Root paints an
      `after:` blend-mode border (mix-blend-darken/lighten) meant for stacked
      AvatarGroup rings; on a lone avatar over a colored card it renders as a
      faint colored ring/dot artifact. We suppress that pseudo-border on the
      standalone widget (`after:hidden`) and instead give the avatar a crisp,
      theme-driven ring. The AvatarGroup composite keeps its own ring path.
    - Fallback styled with theme tokens (muted surface, medium weight) so it
      reads as an intentional placeholder in light/dark.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import * as Avatar from '$lib/components/ui/avatar/index.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    src?: string;
    alt?: string;
    fallback?: string;
  }

  let {
    id, class: className, style, src, alt = '',
    fallback
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // Derive tasteful initials from the name when no explicit fallback is given.
  const initials = $derived.by(() => {
    if (fallback) return fallback;
    const parts = (alt ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + last).toUpperCase();
  });
</script>

<Avatar.Root
  {id}
  class={cn(
    // Suppress the blend-mode pseudo-border (the source of the stray dots on a
    // lone avatar) and use a crisp, theme-driven ring instead.
    'after:hidden ring-1 ring-border/70',
    className
  )}
  style={styleString}
>
  <Avatar.Image {src} {alt} />
  <Avatar.Fallback class="bg-muted text-muted-foreground font-medium tracking-tight">
    {#if initials}
      {initials}
    {:else}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-[55%]"
        aria-hidden="true"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    {/if}
  </Avatar.Fallback>
</Avatar.Root>
