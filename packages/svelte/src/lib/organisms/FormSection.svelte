<!--
  FormSection.svelte — RIPPLE-NATIVE organism (Wave 2: organisms).
  Created 2026-06-07.
  Adapted from ocean-flow's organisms/FormSection.svelte, rewired off the
  raw HTML inputs onto RIPPLE input widgets (Input / Textarea / Select /
  RadioGroup / Checkbox / NumberInput / DatePicker) and design tokens. The
  FormLayout composes this.

  A grouped, titled set of form fields with an optional description. Renders the
  right ripple widget per field descriptor, surfaces label + validation error,
  and emits value changes. Pure presentation — props in, UI out; the host owns
  form state via `values` + `onChange`. No data fetching, no services.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Input from '$lib/widgets/input/Input.svelte';
  import Textarea from '$lib/widgets/input/Textarea.svelte';
  import Select from '$lib/widgets/input/Select.svelte';
  import RadioGroup from '$lib/widgets/input/RadioGroup.svelte';
  import Checkbox from '$lib/widgets/input/Checkbox.svelte';
  import NumberInput from '$lib/widgets/input/NumberInput.svelte';
  import DatePicker from '$lib/widgets/input/DatePicker.svelte';

  type FieldType =
    | 'text'
    | 'email'
    | 'tel'
    | 'url'
    | 'password'
    | 'number'
    | 'date'
    | 'textarea'
    | 'select'
    | 'radio'
    | 'checkbox';

  interface FormField {
    id: string;
    label: string;
    type?: FieldType;
    placeholder?: string;
    required?: boolean;
    description?: string;
    options?: { value: string; label: string }[];
    default?: unknown;
  }

  interface Props {
    title?: string;
    description?: string;
    fields: FormField[];
    /** Current field values, keyed by field id (host-owned). */
    values?: Record<string, unknown>;
    /** Per-field validation errors, keyed by field id. */
    errors?: Record<string, string>;
    onChange?: (id: string, value: unknown) => void;
    class?: string;
  }

  let {
    title,
    description,
    fields,
    values = {},
    errors = {},
    onChange,
    class: className,
  }: Props = $props();

  function valueOf(field: FormField): unknown {
    return values[field.id] ?? field.default;
  }

  function update(id: string, value: unknown) {
    onChange?.(id, value);
  }

  const TEXTUAL = new Set(['text', 'email', 'tel', 'url', 'password', 'date']);
</script>

<div class={cn('flex flex-col gap-6', className)}>
  {#if title}
    <div class="flex flex-col gap-1">
      <h3 class="text-lg font-semibold tracking-tight text-ripple-surface-foreground">
        {title}
      </h3>
      {#if description}
        <p class="text-sm text-muted-foreground">{description}</p>
      {/if}
    </div>
  {/if}

  <div class="flex flex-col gap-4">
    {#each fields as field (field.id)}
      {@const error = errors[field.id]}
      <div class="flex flex-col gap-1.5">
        {#if field.type === 'textarea'}
          <Textarea
            id={field.id}
            label={field.label}
            placeholder={field.placeholder}
            value={String(valueOf(field) ?? '')}
            oninput={(v) => update(field.id, v)}
          />
        {:else if field.type === 'select'}
          <Select
            id={field.id}
            label={field.label}
            placeholder={field.placeholder ?? 'Select…'}
            options={field.options ?? []}
            value={String(valueOf(field) ?? '')}
            onchange={(v) => update(field.id, v)}
          />
        {:else if field.type === 'radio'}
          <RadioGroup
            id={field.id}
            label={field.label}
            options={field.options ?? []}
            value={String(valueOf(field) ?? '')}
            onchange={(v) => update(field.id, v)}
          />
        {:else if field.type === 'checkbox'}
          <Checkbox
            id={field.id}
            label={field.label}
            checked={valueOf(field) === true || valueOf(field) === 'true'}
            onchange={(v) => update(field.id, v)}
          />
        {:else if field.type === 'number'}
          <NumberInput
            id={field.id}
            label={field.label}
            placeholder={field.placeholder}
            value={(valueOf(field) ?? null) as number | null}
            onchange={(v) => update(field.id, v)}
          />
        {:else if field.type === 'date'}
          <DatePicker
            id={field.id}
            label={field.label}
            placeholder={field.placeholder}
            value={(valueOf(field) ?? null) as string | null}
            onchange={(v) => update(field.id, v)}
          />
        {:else}
          <Input
            id={field.id}
            label={field.label}
            type={(TEXTUAL.has(field.type ?? '') ? field.type : 'text') as 'text'}
            placeholder={field.placeholder}
            required={field.required}
            value={String(valueOf(field) ?? '')}
            helper={field.description}
            error={error}
            oninput={(v) => update(field.id, v)}
          />
        {/if}

        {#if field.description && field.type !== 'text' && field.type !== undefined && field.type !== 'email' && field.type !== 'tel' && field.type !== 'url' && field.type !== 'password' && field.type !== 'date'}
          <p class="text-xs text-muted-foreground">{field.description}</p>
        {/if}

        {#if error && field.type !== undefined && field.type !== 'text' && field.type !== 'email' && field.type !== 'tel' && field.type !== 'url' && field.type !== 'password' && field.type !== 'date'}
          <p class="flex items-center gap-1 text-xs font-medium text-ripple-error">
            {error}
          </p>
        {/if}
      </div>
    {/each}
  </div>
</div>
