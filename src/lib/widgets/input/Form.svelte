<!-- src/lib/widgets/input/Form.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';

  type Rule = {
    required?: boolean | string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    /** Friendly label for messages — defaults to the field key. */
    label?: string;
    /** Override messages. */
    messages?: {
      required?: string;
      minLength?: string;
      maxLength?: string;
      min?: string;
      max?: string;
      pattern?: string;
    };
  };

  type FieldRules = Record<string, Rule>;

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Map of state-path → validation rules. */
    fields?: FieldRules;
    /** State path to write the errors object (key → message). Defaults to "errors". */
    errorsTarget?: string;
    /** State path to write a boolean indicating overall validity. Defaults to "valid". */
    validTarget?: string;
    /** When to run validation. */
    validateOn?: 'submit' | 'change';
    /** Force validation now. (Set to a counter to retrigger.) */
    revalidate?: number;
    onsubmit?: () => void;
    onvalidate?: (info: { valid: boolean; errors: Record<string, string> }) => void;
    children?: Snippet;
  }

  let {
    id,
    class: className,
    style,
    fields = {},
    errorsTarget = 'errors',
    validTarget = 'valid',
    validateOn = 'submit',
    revalidate = 0,
    onsubmit,
    onvalidate,
    children
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const stateManager = getContext<StateManager | undefined>('ui-state');

  function getValue(path: string): unknown {
    if (!stateManager) return undefined;
    if (!path.includes('.')) return stateManager.state[path];
    return stateManager.get(path);
  }

  function isEmpty(v: unknown): boolean {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string') return v.trim() === '';
    if (Array.isArray(v)) return v.length === 0;
    return false;
  }

  function validateField(key: string, rule: Rule): string | null {
    const v = getValue(key);
    const m = rule.messages ?? {};
    const label = rule.label ?? key;

    if (rule.required && isEmpty(v)) {
      return typeof rule.required === 'string'
        ? rule.required
        : m.required ?? `${label} is required`;
    }

    if (typeof v === 'string') {
      if (rule.minLength !== undefined && v.length < rule.minLength) {
        return m.minLength ?? `${label} must be at least ${rule.minLength} characters`;
      }
      if (rule.maxLength !== undefined && v.length > rule.maxLength) {
        return m.maxLength ?? `${label} must be at most ${rule.maxLength} characters`;
      }
      if (rule.pattern && !new RegExp(rule.pattern).test(v)) {
        return m.pattern ?? `${label} format is invalid`;
      }
    }

    if (typeof v === 'number') {
      if (rule.min !== undefined && v < rule.min) {
        return m.min ?? `${label} must be ≥ ${rule.min}`;
      }
      if (rule.max !== undefined && v > rule.max) {
        return m.max ?? `${label} must be ≤ ${rule.max}`;
      }
    }

    return null;
  }

  function runValidation(): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    for (const [key, rule] of Object.entries(fields)) {
      const err = validateField(key, rule);
      if (err) errors[key] = err;
    }
    const valid = Object.keys(errors).length === 0;
    if (stateManager) {
      stateManager.set(errorsTarget, errors);
      stateManager.set(validTarget, valid);
    }
    onvalidate?.({ valid, errors });
    return { valid, errors };
  }

  // Live validation on every state change when validateOn === 'change'.
  $effect(() => {
    if (validateOn !== 'change' || !stateManager) return;
    void revalidate;
    // Touch each tracked field to force reactive subscription.
    for (const key of Object.keys(fields)) {
      void getValue(key);
    }
    runValidation();
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    const { valid } = runValidation();
    if (valid) onsubmit?.();
  }
</script>

<form
  {id}
  class={cn('flex flex-col gap-3', className)}
  style={styleString}
  onsubmit={handleSubmit}
  novalidate
>
  {@render children?.()}
</form>
