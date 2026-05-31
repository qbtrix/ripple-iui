/**
 * @file flow-spec.ts
 * @description Canonical Chain Flow detection (RFC 13 M1). A spec is a Chain
 *   Flow when it carries any of the flow fields — `chain`, `chain_map`,
 *   `flowId`, or `onComplete` — at the top level OR on its inner `ui` wrapper
 *   node (the chat pipeline normalizes a flow authored as `{version, ui:{…}}`,
 *   leaving the flow fields on the inner node).
 *
 *   This is the one reference for "is this a flow?" so every surface agrees.
 *   `<Ripple>` uses it to decide whether to host the spec in a `FlowRunner`
 *   (multi-step, advances client-side) or render the single step as before;
 *   paw-enterprise's chat frame had its own copy of this predicate (the M1
 *   build predated this export) and can re-point at this one once the dep
 *   refreshes — same shape, same fields, so the two stay in lockstep.
 *
 * @changes
 *   - Created for the every-surface fix: lifted the predicate out of
 *     paw-enterprise's flow-terminal.ts so `<Ripple>` can auto-detect a chain
 *     spec and mount `FlowRunner` itself, instead of only paw-enterprise's
 *     ChatRippleFrame doing it.
 */

/** The four fields that mark a spec (or its `ui` node) as a Chain Flow. */
const FLOW_FIELDS = ['chain', 'chain_map', 'flowId', 'onComplete'] as const;

function hasFlowFields(node: Record<string, unknown>): boolean {
  return FLOW_FIELDS.some((field) => field in node);
}

/**
 * True when `spec` is a Chain Flow (RFC 13) — it carries `chain` / `chain_map`
 * / `flowId` / `onComplete` at the top level, or on a one-level-down `ui`
 * wrapper. Mirrors paw-enterprise's `isFlowSpec` exactly so chat and pockets
 * detect the same shapes.
 */
export function isFlowSpec(spec: unknown): boolean {
  if (!spec || typeof spec !== 'object') return false;
  if (hasFlowFields(spec as Record<string, unknown>)) return true;
  const ui = (spec as Record<string, unknown>).ui;
  if (ui && typeof ui === 'object' && hasFlowFields(ui as Record<string, unknown>)) return true;
  return false;
}
