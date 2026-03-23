<script lang="ts">
  import { cn } from '../../utils.js';
  import { Input } from '../../components/ui/input/index.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    value?: string | number;
    placeholder?: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
    disabled?: boolean;
    label?: string;
    onchange?: (value?: unknown) => void;
  }

  let {
    id, class: className, style, value = '', placeholder = '', type = 'text',
    disabled = false, label, onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    onchange?.(target.value);
  }
</script>

<div class="space-y-2">
  {#if label}
    <label for={id} class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {label}
    </label>
  {/if}
  <Input
    {id}
    {type}
    value={value ?? ''}
    {placeholder}
    {disabled}
    class={cn(className)}
    style={styleString}
    oninput={handleInput}
  />
</div>
