<script lang="ts">
  import { cn } from '$lib/utils.js';
  import CheckIcon from '@lucide/svelte/icons/check';
  import MinusIcon from '@lucide/svelte/icons/minus';
  import * as Table from '$lib/components/ui/table/index.js';

  interface Column {
    key: string;
    label: string;
    /** Mark this column as the highlighted/recommended option. */
    highlight?: boolean;
  }

  interface Row {
    feature: string;
    /** Each column key maps to a cell value: boolean, string, or number. */
    [key: string]: unknown;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** First column header label (the row label). Default "Feature". */
    label?: string;
    columns?: Column[];
    rows?: Row[];
  }

  let {
    id, class: className, style,
    label = 'Feature', columns = [], rows = []
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div
  {id}
  class={cn('rounded-md border border-border overflow-hidden', className)}
  style={styleString}
>
  <Table.Root>
    <Table.Header>
      <Table.Row>
        <Table.Head>{label}</Table.Head>
        {#each columns as c}
          <Table.Head class={c.highlight ? 'bg-primary/5 font-semibold' : ''}>{c.label}</Table.Head>
        {/each}
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#each rows as row}
        <Table.Row>
          <Table.Cell class="font-medium">{row.feature}</Table.Cell>
          {#each columns as c}
            {@const v = row[c.key]}
            <Table.Cell class={c.highlight ? 'bg-primary/5' : ''}>
              {#if v === true}
                <CheckIcon size={16} class="text-ripple-success" />
              {:else if v === false || v === undefined || v === null}
                <MinusIcon size={16} class="text-muted-foreground" />
              {:else}
                <span class="text-sm">{v}</span>
              {/if}
            </Table.Cell>
          {/each}
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
</div>
