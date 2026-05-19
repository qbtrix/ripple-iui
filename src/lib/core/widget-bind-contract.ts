/**
 * @file widget-bind-contract.ts
 * @description Per-widget contract for the node-level `bind` field — which
 * component prop receives the bound value, and which event fires when the
 * widget mutates it. NodeRenderer reads this map to wire two-way bindings.
 *
 * Without this map the renderer would have to assume every bindable widget
 * exposes `value` + `onchange`. That assumption holds for inputs but breaks
 * for composites whose bindable surface is a step id (wizard-layout), an
 * open flag (popover), a checked flag (checkbox/switch), etc.
 *
 * Adding a new widget with a non-default bindable prop: register it here.
 * The manifest entry can describe the same prop for LLM context, but the
 * runtime source of truth lives in this file (the manifest module is too
 * heavy to pull into the rendering bundle).
 */

export interface WidgetBindContract {
  /** Component prop that receives the resolved `bind` value. */
  prop: string;
  /** Component event prop that fires when the widget mutates the value. */
  event: string;
}

export const DEFAULT_BIND_CONTRACT: WidgetBindContract = {
  prop: 'value',
  event: 'onchange',
};

const WIDGET_BIND_CONTRACTS: Readonly<Record<string, WidgetBindContract>> = {
  checkbox: { prop: 'checked', event: 'onchange' },
  switch: { prop: 'checked', event: 'onchange' },
  'wizard-layout': { prop: 'currentStep', event: 'onstepchange' },
  popover: { prop: 'open', event: 'onopenchange' },
};

export function getBindContract(type: string): WidgetBindContract {
  return WIDGET_BIND_CONTRACTS[type] ?? DEFAULT_BIND_CONTRACT;
}
