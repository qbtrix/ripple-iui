<!-- src/lib/widgets/composite/AvatarGroup.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import * as Avatar from '$lib/components/ui/avatar/index.js';

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
    if (u.fallback) return u.fallback;
    if (u.alt) {
      const parts = u.alt.split(/\s+/).filter(Boolean);
      return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
    }
    return '?';
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
