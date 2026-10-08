<!--
  ParticipantTile.svelte — one person in a call. NEW 2026-09-30 (call UI new
  look, slice 0). Pure presentation: ripple never owns media.

  Slots (snippets):
    video  — the host renders its own <video> here when the camera is on;
             without it the tile shows the avatar
    avatar — replaces the default ripple Avatar (e.g. an agent's own face)
    badge  — after the name in the pill (e.g. "Agent")
    menu   — top-right corner (e.g. the per-person volume popover trigger)
  State: speaking, muted (mic-off icon + sr-only "muted" in the name pill).
  skin (one per call layout):
    glass   — frosted card, soft accent glow, the speaker leans forward
    focus   — squarer and quieter, a hard accent underline on the speaker
    classic — flat cell, success-coloured ring on the speaker (today's look)
  size: lg | md | sm | orb. The orb is a 44px circle with no pill and no menu;
  the name stays as a title tooltip. Forwards all div attributes. Tokens only.
-->
<script lang="ts">
  import { safeUrl } from '@ripple-ui/core';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import MicOff from '@lucide/svelte/icons/mic-off';
  import { cn } from '$lib/utils.js';
  import Avatar from '../display/Avatar.svelte';

  let {
    name,
    src,
    speaking = false,
    muted = false,
    skin = 'classic',
    size = 'md',
    video,
    avatar,
    badge,
    menu,
    class: className,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & {
    name: string;
    /** Avatar image for the default fallback. */
    src?: string;
    speaking?: boolean;
    muted?: boolean;
    skin?: 'glass' | 'focus' | 'classic';
    size?: 'lg' | 'md' | 'sm' | 'orb';
    video?: Snippet;
    avatar?: Snippet;
    badge?: Snippet;
    menu?: Snippet;
  } = $props();

  const orb = $derived(size === 'orb');
</script>

<div
  data-slot="participant-tile"
  data-skin={skin}
  data-size={size}
  data-speaking={speaking ? '' : undefined}
  data-muted={muted ? '' : undefined}
  title={orb ? name : undefined}
  class={cn('ripple-tile', className)}
  {...rest}
>
  {#if video && !orb}
    <div data-slot="tile-video" class="ripple-tile-video">{@render video()}</div>
  {:else}
    <div data-slot="tile-avatar" class="ripple-tile-face">
      {#if avatar}
        {@render avatar()}
      {:else}
        <Avatar alt={name} src={safeUrl(src, { kind: 'resource' })} class="ripple-tile-avatar size-full" />
      {/if}
    </div>
  {/if}

  {#if menu && !orb}
    <div data-slot="tile-menu" class="ripple-tile-menu">{@render menu()}</div>
  {/if}

  {#if !orb}
    <div data-slot="tile-name" class="ripple-tile-name">
      {#if muted}<MicOff class="ripple-tile-muted" aria-hidden="true" /><span class="sr-only">muted</span>{/if}
      <span class="ripple-tile-label">{name}</span>
      {@render badge?.()}
    </div>
  {/if}
</div>

<style>
  .ripple-tile {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-width: 0;
    overflow: hidden;
    border-radius: 0.75rem;
    color: var(--ripple-surface-foreground);
    background: color-mix(in oklch, var(--ripple-surface-foreground) 7%, transparent);
    transition:
      transform 500ms var(--ripple-ease-out),
      box-shadow 300ms var(--ripple-ease-out);
  }
  .ripple-tile-video {
    position: absolute;
    inset: 0;
  }
  .ripple-tile-video :global(video) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .ripple-tile-face {
    display: grid;
    place-items: center;
    flex: none;
    width: 4rem;
    height: 4rem;
    overflow: hidden;
    border-radius: 999px;
    font-size: 1.25rem;
    font-weight: 600;
  }
  .ripple-tile[data-size='lg'] .ripple-tile-face {
    width: 7.5rem;
    height: 7.5rem;
    font-size: 2.5rem;
  }
  .ripple-tile[data-size='sm'] .ripple-tile-face,
  .ripple-tile[data-size='orb'] .ripple-tile-face {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 0.875rem;
  }
  .ripple-tile-face :global(.ripple-tile-avatar [data-slot='avatar-fallback']) {
    font-size: inherit;
    color: var(--ripple-surface-foreground);
    background: color-mix(in oklch, var(--ripple-accent) 32%, var(--ripple-surface));
  }
  .ripple-tile-menu {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 2;
  }
  .ripple-tile-name {
    position: absolute;
    left: 0.5rem;
    bottom: 0.5rem;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    max-width: calc(100% - 1rem);
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
    color: var(--ripple-surface-foreground);
    background: color-mix(in oklch, var(--ripple-surface) 70%, transparent);
  }
  .ripple-tile-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ripple-tile-name :global(.ripple-tile-muted) {
    width: 0.875rem;
    height: 0.875rem;
    flex: none;
    color: var(--ripple-error-text);
  }
  .ripple-tile[data-size='sm'] .ripple-tile-name {
    left: 0.25rem;
    bottom: 0.25rem;
    font-size: 0.6875rem;
  }
  .ripple-tile[data-size='orb'] {
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 999px;
  }

  /* classic — today's flat cell, success ring on the speaker */
  .ripple-tile[data-skin='classic'][data-speaking] {
    box-shadow: inset 0 0 0 2px var(--ripple-success);
  }

  /* glass — frosted card, the speaker glows and leans forward */
  .ripple-tile[data-skin='glass'] {
    border-radius: 1.5rem;
    border: 1px solid var(--ripple-border);
    background: color-mix(in oklch, var(--ripple-surface) 70%, transparent);
    backdrop-filter: blur(24px) saturate(1.4);
    -webkit-backdrop-filter: blur(24px) saturate(1.4);
  }
  .ripple-tile[data-skin='glass'] .ripple-tile-name {
    left: 50%;
    transform: translateX(-50%);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .ripple-tile[data-skin='glass'][data-speaking] {
    transform: scale(1.03);
    box-shadow:
      0 0 0 1.5px var(--ripple-accent-on-glass, var(--ripple-accent)),
      0 0 48px color-mix(in oklch, var(--ripple-accent) 55%, transparent);
  }
  .ripple-tile[data-skin='glass'][data-size='orb'] {
    border-radius: 999px;
  }

  /* focus — cinema: squarer, quieter, a hard accent edge on the speaker */
  .ripple-tile[data-skin='focus'] {
    border-radius: 0.375rem;
    background: color-mix(in oklch, var(--ripple-surface-foreground) 5%, transparent);
  }
  .ripple-tile[data-skin='focus'] .ripple-tile-name {
    background: none;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.6875rem;
    font-weight: 600;
  }
  .ripple-tile[data-skin='focus'][data-speaking] {
    box-shadow: inset 0 -3px 0 var(--ripple-accent-on-glass, var(--ripple-accent));
  }

  @media (prefers-reduced-motion: reduce) {
    .ripple-tile {
      transition: none;
    }
    .ripple-tile[data-skin='glass'][data-speaking] {
      transform: none;
    }
  }
</style>
