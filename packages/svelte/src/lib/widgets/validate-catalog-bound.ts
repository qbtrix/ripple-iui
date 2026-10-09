/**
 * @file widgets/validate-catalog-bound.ts
 * @description `validateCatalog` and `specIssues` bound to the Svelte widget
 * registry.
 *
 * The engine's versions take the catalog as a parameter so that
 * @ripple-ui/core does not depend on a renderer's widget registry. This
 * module supplies the missing half for the Svelte renderer: callers pass no
 * catalog and are checked against the built-in widget catalog.
 *
 * `getWidgetTypes()` is read at CALL time, not at import time, so widgets
 * registered later via `registerWidget` are still counted.
 */

import {
		validateCatalog as validateCatalogCore,
		specIssues as specIssuesCore,
		type SpecIssue,
		type UnknownNode,
		type ValidateCatalogOptions,
		type UINode,
		type UISpec
} from '@ripple-ui/core';
import { getWidgetTypes } from './index.js';

export type { SpecIssue, UnknownNode, ValidateCatalogOptions };

/**
 * Walk a spec and report every node whose `type` is not renderable by this
 * renderer. Identical signature and behaviour to the pre-split function.
 */
export function validateCatalog(
	spec: UISpec | UINode | null | undefined,
	opts: ValidateCatalogOptions = {}
): UnknownNode[] {
	return validateCatalogCore(spec, {
		...opts,
		widgetTypes: opts.widgetTypes ?? getWidgetTypes()
	});
}

/**
 * Schema and catalog problems in a spec, one model-actionable message each,
 * checked against this renderer's widget catalog. Pair with
 * `formatSpecIssues` to feed them back to the model.
 */
export function specIssues(spec: unknown, opts: ValidateCatalogOptions = {}): SpecIssue[] {
	return specIssuesCore(spec, {
		...opts,
		widgetTypes: opts.widgetTypes ?? getWidgetTypes()
	});
}
