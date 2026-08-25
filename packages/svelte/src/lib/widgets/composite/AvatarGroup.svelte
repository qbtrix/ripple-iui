<!--
  AvatarGroup.svelte — stacked avatar row composite.
  Updated 2026-06-08 (design polish): fallbacks derive proper initials (first +
  last) and no longer emit a bare "?" — an empty name yields '' so the muted
  placeholder reads as intentional rather than broken. The stacked ring path
  (avatar-group's ring-background on each avatar) is unchanged.
-->

<script lang="ts">
  import { cn } from '$lib/utils.js';
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import { asText } from '$lib/widgets/text-coerce';

  type Size = 'sm' | 'md' | 'lg';

  interface User {
    src?: string;
    alt?: string;
    fallback?: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    users: User[];
    max?: number;
    size?: Size;
  }

  let { id, class: className, style, users, max = 4, size = 'md' }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // Map widget size to shadcn Avatar.Root size prop
  const rootSize = $derived(
    size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'
  );

  const visible = $derived((users ?? []).slice(0, max));
  const overflow = $derived(Math.max(0, (users ?? []).length - max));

  function initials(u: User): string {
    if (u.fallback) return asText(u.fallback);
    // `alt` comes from item data and can be a number — coerce before .trim/.split.
    const parts = asText(u.alt).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + last).toUpperCase();
  }
</script>

<Avatar.Group {id} class={cn(className)} style={styleString}>
  {#each visible as user, i (i)}
    <Avatar.Root size={rootSize}>
      {#if user.src}
        <Avatar.Image src={user.src} alt={user.alt ?? ''} />
      {/if}
      <Avatar.Fallback>{initials(user)}</Avatar.Fallback>
    </Avatar.Root>
  {/each}
  {#if overflow > 0}
    <Avatar.GroupCount>+{overflow}</Avatar.GroupCount>
  {/if}
</Avatar.Group>
