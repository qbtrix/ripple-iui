<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import * as Alert from '$lib/components/ui/alert/index.js';
  import InfoIcon from '@lucide/svelte/icons/info';
  import CheckCircleIcon from '@lucide/svelte/icons/circle-check';
  import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
  import AlertCircleIcon from '@lucide/svelte/icons/circle-alert';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    description?: string;
    /** Visual variant — info / success / warning / destructive. */
    variant?: 'info' | 'success' | 'warning' | 'destructive' | 'default';
    /** Hide the leading icon. */
    hideIcon?: boolean;
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style, title, description,
    variant = 'default', hideIcon = false, children, hasChildren = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const Icon = $derived(
    variant === 'success' ? CheckCircleIcon
      : variant === 'warning' ? AlertTriangleIcon
      : variant === 'destructive' ? AlertCircleIcon
      : InfoIcon
  );

  // Underlying alert variant only knows default | destructive.
  const underlyingVariant = $derived(variant === 'destructive' ? 'destructive' : 'default');

  // Tone color for non-destructive variants applied via class.
  const toneClass = $derived(
    variant === 'success' ? 'text-emerald-600 dark:text-emerald-400'
      : variant === 'warning' ? 'text-amber-600 dark:text-amber-500'
      : variant === 'info' ? 'text-blue-600 dark:text-blue-400'
      : ''
  );
</script>

<Alert.Root
  {id}
  variant={underlyingVariant}
  class={cn(toneClass, className)}
  style={styleString}
>
  {#if !hideIcon}
    <Icon />
  {/if}
  {#if title}
    <Alert.Title>{title}</Alert.Title>
  {/if}
  {#if description}
    <Alert.Description>{description}</Alert.Description>
  {:else if hasChildren && children}
    <Alert.Description>{@render children()}</Alert.Description>
  {/if}
</Alert.Root>
