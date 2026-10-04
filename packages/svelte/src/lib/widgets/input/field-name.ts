/* widgets/input/field-name.ts — the accessible name a labelled row hands to the field inside it.
   PropertyRow publishes its label; NumberInput and ColorPicker read it as the fallback name when
   the host gave them no `label` or `aria-label`, so a compact "pt" field in a "Weight" row is
   announced as "Weight", not by its unit. Read once at component init (Svelte context). */
import { getContext, setContext } from 'svelte';

const KEY = Symbol('ripple:field-name');

/** Called by a labelled row: fields rendered inside it are named `get()`. */
export function provideFieldName(get: () => string): void {
  setContext(KEY, get);
}

/** The enclosing row's label getter, or a getter for undefined outside a row. */
export function useFieldName(): () => string | undefined {
  return getContext<(() => string) | undefined>(KEY) ?? (() => undefined);
}
