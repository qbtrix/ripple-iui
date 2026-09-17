// @file core/validate-catalog.ts
// @description Render-time catalog gate. Walks a UISpec / UINode tree and
//   reports every node whose `type` is not a registered widget — letting a
//   host fail loud (or degrade gracefully) before mounting an unknown spec.
// @created 2026-05-22 — Increment 5 (catalog-as-allowlist). The widget
//   registry is the allowlist of renderable types; anything outside it is
//   an out-of-catalog node. `NodeRenderer` already shows a loud red box at
//   render time — this module lets hosts gate the whole spec up front.
// @changes
//   - 2026-08-25: the widget catalog is now INJECTED rather than imported.
//     This module lives in @ripple-ui/core, which must not depend on a
//     renderer's widget registry — that import was the one edge pointing the
//     wrong way through the package boundary. `@ripple-ui/svelte` re-exports
//     a version bound to its own registry, so callers there are unaffected.

import type { UINode, UISpec } from '../schema/ui-spec.js';

/** A single out-of-catalog node found during a walk. */
export interface UnknownNode {
  /** Dotted path to the node from the spec root, e.g. `ui.children[2]`. */
  path: string;
  /** The offending `type` string. */
  type: string;
}

export interface ValidateCatalogOptions {
  /**
   * Extra widget types to treat as known — for hosts that register custom
   * widgets via `registerWidget` after import, or that resolve types through
   * their own resolver. These are unioned with the catalog.
   */
  extraWidgetTypes?: string[];
  /**
   * The renderable widget types. A renderer passes its own registry here;
   * `@ripple-ui/svelte` binds its `getWidgetTypes()` so its callers never
   * see this option. Omitted, the catalog is empty and only control-flow
   * types are known — which is the honest answer for a bare engine that has
   * no widgets of its own.
   */
  widgetTypes?: Iterable<string>;
}

/**
 * Control-flow node types. These are handled by `NodeRenderer` directly and
 * are never looked up in the widget registry, so they always count as known.
 */
const CONTROL_FLOW_TYPES = ['if', 'each'] as const;

/** Narrow an arbitrary value to something node-shaped (`{ type, children? }`). */
function isNodeLike(value: unknown): value is UINode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

/**
 * Walk a UISpec or a bare UINode tree and return every node whose `type` is
 * not renderable — i.e. not in the widget registry, not a control-flow type
 * (`if` / `each`), and not in `opts.extraWidgetTypes`.
 *
 * An empty array means the spec is fully covered by the catalog. Hosts can
 * call this before `safeParseUISpec` succeeds → mount, and choose to block,
 * warn, or strip unknown nodes.
 */
export function validateCatalog(
  spec: UISpec | UINode | null | undefined,
  opts: ValidateCatalogOptions = {}
): UnknownNode[] {
  if (spec == null || typeof spec !== 'object') return [];

  const known = new Set<string>([
    ...(opts.widgetTypes ?? []),
    ...CONTROL_FLOW_TYPES,
    ...(opts.extraWidgetTypes ?? [])
  ]);

  // Accept either a full UISpec ({ ui: <node> }) or a bare node.
  const root: unknown =
    'ui' in spec && isNodeLike((spec as { ui?: unknown }).ui)
      ? (spec as { ui: UINode }).ui
      : spec;

  const unknown: UnknownNode[] = [];

  function walk(node: unknown, path: string): void {
    if (!isNodeLike(node)) return;

    if (!known.has(node.type)) {
      unknown.push({ path, type: node.type });
    }

    // Recurse into both child collections. `else_children` belongs to `if`.
    const children = (node as { children?: unknown }).children;
    if (Array.isArray(children)) {
      children.forEach((child, i) => walk(child, `${path}.children[${i}]`));
    }
    const elseChildren = (node as { else_children?: unknown }).else_children;
    if (Array.isArray(elseChildren)) {
      elseChildren.forEach((child, i) =>
        walk(child, `${path}.else_children[${i}]`)
      );
    }
  }

  walk(root, 'ui');
  return unknown;
}
