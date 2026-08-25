/**
 * @file raw-props.ts
 * @description Registry of widget props that must reach their widget
 *   BYTE-FOR-BYTE, skipping expression resolution entirely.
 * @created 2026-08-25
 * @changes
 *   - Initial creation: `embed`/`iframe` → `srcdoc`.
 *
 * WHY THIS EXISTS
 *
 * `NodeRenderer` runs `resolveValue` over every prop of every node.
 * `resolveString` substitutes each `{...}` match with its evaluated value,
 * and a match that is not a valid spec expression evaluates to nothing —
 * so the whole braced block is DELETED from the string.
 *
 * For prose props that is exactly right. For a prop that carries
 * agent-authored source code it is destructive: any JavaScript with a
 * function body contains `{ ... }`, so an `embed` widget's `srcdoc` lost
 * every block and arrived in the DOM as a SyntaxError. Silently — nothing
 * in the console, no handlers bound, a dead widget. A brace-free srcdoc
 * survived untouched, which is why it went unnoticed from the day `embed`
 * shipped (2026-05-22).
 *
 * ACCEPTED TRADE-OFF
 *
 * A raw prop can no longer interpolate `{state.foo}`. That is the correct
 * contract for `srcdoc`: agent-authored code should ask for data through
 * the audited capability bridge, not by reaching into host state through
 * template interpolation. Only mark a prop raw when the same reasoning
 * holds — adding an entry here changes behaviour for anyone who relied on
 * interpolation in that prop.
 *
 * SCOPE
 *
 * This is a per-prop opt-out applied at the `NodeRenderer` chokepoint.
 * It does not change `EXPRESSION_REGEX`, `resolveString`, or `resolveValue`
 * in any way — every prop not listed here resolves exactly as before.
 */

/**
 * Widget type → the props of that widget which skip expression resolution.
 *
 * Keyed by the widget type as it appears in a spec, so every registered
 * ALIAS of a widget needs its own entry (`embed` and `iframe` are the same
 * component, and a spec may use either).
 */
const RAW_PROPS: Readonly<Record<string, ReadonlySet<string>>> = {
	// Sandboxed escape-hatch iframe. `srcdoc` is a complete HTML document,
	// usually containing agent-authored JavaScript.
	embed: new Set(['srcdoc']),
	iframe: new Set(['srcdoc'])
};

/**
 * The raw prop names for a widget type, or `undefined` when the type has
 * none — which is the overwhelmingly common case, so callers can skip all
 * raw-prop handling on a cheap `undefined` check.
 */
export function getRawPropNames(
	nodeType: string | undefined | null
): ReadonlySet<string> | undefined {
	if (typeof nodeType !== 'string') return undefined;
	return RAW_PROPS[nodeType];
}

/** True when `propName` on `nodeType` must pass through unresolved. */
export function isRawProp(
	nodeType: string | undefined | null,
	propName: string
): boolean {
	return getRawPropNames(nodeType)?.has(propName) ?? false;
}
