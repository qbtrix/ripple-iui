<!--
  IncomingCallCard.svelte — a persistent call action card: incoming, joinable
  or rejoin. NEW 2026-09-30 (call UI new look, slice 0).
  Avatar (ripple Avatar from `name`/`src`, or an `avatar` snippet), title,
  subtitle, and two action snippets: `secondary` (Decline / Dismiss) then
  `primary` (Accept / Join / Rejoin; pair it with the primitives Button's
  `success` variant). role defaults to "alert" for a ringing call; pass
  role="status" for joinable / rejoin. `halo` (default on) rings the avatar
  with a pulse on Tailwind's shared `animate-ping` keyframe, motion-safe only.
  One look: the shared glass card. Forwards all div attributes. Tokens only.
-->
<script lang="ts">
  import { safeUrl } from '@ripple-ui/core';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils.js';
  import Avatar from '../display/Avatar.svelte';

  let {
    title,
    subtitle,
    name,
    src,
    halo = true,
    role = 'alert',
    avatar,
    primary,
    secondary,
    class: className,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & {
    title: string;
    subtitle?: string;
    /** Name for the default avatar's initials; defaults to the title. */
    name?: string;
    src?: string;
    halo?: boolean;
    avatar?: Snippet;
    primary?: Snippet;
    secondary?: Snippet;
  } = $props();
</script>

<div {role} data-slot="call-card" class={cn('ripple-call-card', className)} {...rest}>
  {#if halo || avatar || name || src}
    <span class="ripple-call-card-face">
      {#if avatar}
        {@render avatar()}
      {:else}
        <Avatar alt={name ?? title} src={safeUrl(src, { kind: 'resource' })} class="size-11" />
      {/if}
      {#if halo}
        <span
          data-slot="call-card-halo"
          aria-hidden="true"
          class="ripple-call-card-halo motion-safe:animate-ping"
        ></span>
      {/if}
    </span>
  {/if}
  <div class="ripple-call-card-text">
    <span class="ripple-call-card-title">{title}</span>
    {#if subtitle}<span class="ripple-call-card-sub">{subtitle}</span>{/if}
  </div>
  {#if primary || secondary}
    <div class="ripple-call-card-acts">
      {@render secondary?.()}
      {@render primary?.()}
    </div>
  {/if}
</div>

<style>
  .ripple-call-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 1.5rem;
    border: 1px solid var(--ripple-border);
    color: var(--ripple-surface-foreground);
    background: color-mix(in oklch, var(--ripple-surface) 80%, transparent);
    backdrop-filter: blur(28px) saturate(1.5);
    -webkit-backdrop-filter: blur(28px) saturate(1.5);
    box-shadow: 0 16px 40px color-mix(in oklch, var(--ripple-surface) 60%, transparent);
  }
  .ripple-call-card-face {
    position: relative;
    display: grid;
    place-items: center;
    flex: none;
  }
  .ripple-call-card-halo {
    position: absolute;
    inset: -4px;
    border-radius: 999px;
    pointer-events: none;
    box-shadow:
      0 0 0 2px var(--ripple-accent-on-glass, var(--ripple-accent)),
      0 0 24px color-mix(in oklch, var(--ripple-accent) 60%, transparent);
    animation-duration: 1.6s;
  }
  .ripple-call-card-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .ripple-call-card-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .ripple-call-card-sub {
    font-size: 0.8125rem;
    color: var(--ripple-muted-foreground);
  }
  .ripple-call-card-acts {
    display: flex;
    flex: none;
    align-items: center;
    gap: 0.375rem;
  }
</style>
