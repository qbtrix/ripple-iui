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

import { DEV } from 'esm-env';

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
  wizard: { prop: 'currentStep', event: 'onstepchange' },
  popover: { prop: 'open', event: 'onopenchange' },
  'order-status': { prop: 'currentStep', event: 'onstepchange' },
  'shipment-tracker': { prop: 'currentStep', event: 'onstepchange' },
  'order-tracking': { prop: 'currentStep', event: 'onstepchange' },
  // approval-gate binds its decision ('pending'|'approved'|'denied'), not `value`,
  // and emits the new decision via `ondecision` — so a refresh remembers the call.
  'approval-gate': { prop: 'decision', event: 'ondecision' },
  approval: { prop: 'decision', event: 'ondecision' },
  'approve-card': { prop: 'decision', event: 'ondecision' },
  'human-gate': { prop: 'decision', event: 'ondecision' },
};

/**
 * Widgets that intentionally expose the default `value` / `onchange` bind
 * surface. Listed explicitly so a newly-added widget without a registered
 * contract surfaces a dev warning instead of silently no-op-ing in specs.
 *
 * Aliases are included where they map to the same component, since the
 * renderer keys off the raw `type` string (not the resolved component).
 */
const DEFAULT_BIND_WIDGETS: ReadonlySet<string> = new Set([
  // inputs
  'input', 'textarea', 'select', 'combobox', 'autocomplete',
  'multi-select', 'multiselect', 'tag-input',
  'checkbox-group', 'checkbox-list',
  'radio-group', 'radio', 'segmented', 'toggle-group',
  'slider', 'rating', 'stars',
  'number-input', 'numberinput', 'number',
  'otp-input', 'otp',
  'date-picker', 'datepicker', 'date',
  'time-picker', 'timepicker', 'time',
  'color-picker', 'color',
  'file-upload', 'fileupload', 'dropzone',
  'rich-text', 'richtext', 'wysiwyg',
  'code-editor', 'codeeditor', 'editor',
  'search', 'filter-bar', 'filters',
  'location-picker', 'geo-picker', 'pick-location',
  // interactive consumer widgets (value = full item array)
  'todo-list', 'todo', 'todos',
  'checklist-layout', 'checklist',
  // selectable data
  'tree', 'treeview', 'tree-table', 'treetable', 'nested-rows',
  'kanban', 'board',
  // editable data tables (bind = full rows array; in-place cell edit)
  'table', 'data-table', 'datatable',
  'data-grid', 'datagrid', 'grid_table',
  'calendar',
  'saved-views', 'views',
  'people-picker', 'people',
  'permission-matrix', 'permissions',
  'org-chart', 'orgchart',
  // open/visibility (intentionally `value: boolean` not `open`)
  'modal', 'dialog',
  'sheet', 'drawer',
  'collapsible',
  'accordion',
  'tabs',
  'command-palette', 'cmdk', 'command',
  'coachmark', 'tour',
  'notification-center', 'notifications', 'inbox',
  'dropdown-menu', 'dropdown', 'menu',
  'context-menu', 'contextmenu',
  // layout
  'master-detail', 'list-detail',
  'sidebar', 'nav',
]);

const warnedTypes = new Set<string>();

export function getBindContract(type: string): WidgetBindContract {
  return WIDGET_BIND_CONTRACTS[type] ?? DEFAULT_BIND_CONTRACT;
}

/**
 * Dev-only discoverability check. Call from the renderer when a node
 * declares `bind`, so widgets without an explicit contract entry surface
 * a one-time warning instead of silently no-op-ing on consumers.
 *
 * Silent in production builds (gated on `DEV` from `esm-env`, which works
 * across all bundlers and unbundled consumers).
 */
export function warnUnregisteredBindContract(type: string): void {
  if (!DEV) return;
  if (WIDGET_BIND_CONTRACTS[type] || DEFAULT_BIND_WIDGETS.has(type)) return;
  if (warnedTypes.has(type)) return;
  warnedTypes.add(type);
  console.warn(
    `[ripple] widget "${type}" used with \`bind\` is not registered in widget-bind-contract.ts. ` +
    `Assuming default contract (prop="value", event="onchange"). ` +
    `If the widget exposes a different bind surface, add a WIDGET_BIND_CONTRACTS entry. ` +
    `If it uses the default, add it to DEFAULT_BIND_WIDGETS to silence this warning.`
  );
}

/** Test-only: reset the once-per-type warning memo so tests can re-assert. */
export function _resetBindContractWarnings(): void {
  warnedTypes.clear();
}
