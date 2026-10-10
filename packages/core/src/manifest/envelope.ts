/**
 * @file manifest/envelope.ts
 * @description The top-level spec envelope contract (`ui`, `state`), shared by
 * the full and the slim manifest. The example leads with `ui` because models
 * copy its key order, and a streamed spec cannot paint until `ui` arrives.
 * The description also keeps specs short (skip default props, one `each`
 * over state rows, bulk data from the host): every model reads it, and a
 * long streamed spec is slow to re-parse. `api` is hedged because slim
 * hosts do not run it.
 */

/**
 * Top-level spec envelope contract — the shape every Ripple spec MUST follow.
 *
 * The agent's most expensive failure mode is inventing the wrong field name
 * for the renderable tree (`root` / `tree` / `view` / `body` / `content`)
 * and shipping a spec the renderer can't mount. Documenting the envelope
 * here, in the same artifact that documents widget shapes, anchors the
 * field names in the LLM context alongside the per-widget reference.
 */
export interface SpecEnvelope {
  /** The required top-level field name for the renderable node tree. */
  uiField: 'ui';
  /** The required top-level field name for the StateManager seed. */
  stateField: 'state';
  /** Current envelope version. */
  version: '1.0';
  /** Aliases the agent sometimes invents — explicitly NOT supported. */
  aliasesNotAllowed: readonly string[];
  /** One-line contract summary suitable for prompt injection. */
  description: string;
  /** A minimal but complete example showing every required field in place. */
  example: Record<string, unknown>;
}

export const specEnvelope: SpecEnvelope = {
  uiField: 'ui',
  stateField: 'state',
  version: '1.0',
  aliasesNotAllowed: ['root', 'tree', 'view', 'body', 'content'],
  description:
    'A Ripple spec is a JSON object with two top-level fields that matter for ' +
    "rendering: `ui` (the node tree the renderer mounts — REQUIRED) and `state` " +
    '(the StateManager seed — required when any node uses `bind` or reads ' +
    '`{state.*}`). The renderable tree field is named `ui` exactly — never ' +
    '`root`, `tree`, `view`, `body`, or `content`. Specs that use those ' +
    'aliases will not render. Write `ui` before `state` so the interface can ' +
    'draw while the rest of the spec streams in, and keep the seed `state` small. ' +
    'Leave out any prop whose value equals the default its widget documents. ' +
    'For repeated rows or cards, keep the records as an array in `state` and ' +
    'render them with one `each` node (`"items": "{state.rows}"`) instead of ' +
    'writing a node per record. Bulk data (more than a few dozen records) ' +
    'should come from the host, through a `sources` binding or an `api` ' +
    'action where the host offers one, not be typed into the spec.',
  example: {
    version: '1.0',
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'input', bind: 'draft', props: { placeholder: 'Add an item' } },
      ],
    },
    state: { draft: '', items: [] },
  },
};
