<script lang="ts">
  import { cn } from '$lib/utils.js';
  import * as Accordion from '$lib/components/ui/accordion/index.js';

  interface Item {
    value?: string;
    title: string;
    content?: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Allow opening multiple items at once. */
    multiple?: boolean;
    /** Currently open value (single) or values (multiple). */
    value?: string | string[];
    items?: Item[];
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, style, multiple = false, value,
    items = [], onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const normalized = $derived(
    items.map((it, i) => ({
      value: it.value ?? `item-${i}`,
      title: it.title,
      content: it.content ?? ''
    }))
  );

  function handleChange(v: string | string[] | undefined) {
    onchange?.(v);
  }
</script>

<div {id} class={cn('w-full', className)} style={styleString}>
  {#if multiple}
    <Accordion.Root
      type="multiple"
      value={Array.isArray(value) ? value : value ? [value] : []}
      onValueChange={handleChange}
    >
      {#each normalized as it (it.value)}
        <Accordion.Item value={it.value}>
          <Accordion.Trigger>{it.title}</Accordion.Trigger>
          <Accordion.Content>{it.content}</Accordion.Content>
        </Accordion.Item>
      {/each}
    </Accordion.Root>
  {:else}
    <Accordion.Root
      type="single"
      value={typeof value === 'string' ? value : ''}
      onValueChange={handleChange}
    >
      {#each normalized as it (it.value)}
        <Accordion.Item value={it.value}>
          <Accordion.Trigger>{it.title}</Accordion.Trigger>
          <Accordion.Content>{it.content}</Accordion.Content>
        </Accordion.Item>
      {/each}
    </Accordion.Root>
  {/if}
</div>
