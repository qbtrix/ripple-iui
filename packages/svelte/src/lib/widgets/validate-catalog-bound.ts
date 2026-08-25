/**
 * @file widgets/validate-catalog-bound.ts
 * @description `validateCatalog` bound to the Svelte widget registry.
 *
 * The engine's `core/validate-catalog.ts` takes the catalog as a parameter
 * so that @ripple-ui/core does not depend on a renderer's widget registry —
 * that import was the single edge pointing the wrong way through the
 * package boundary. This module supplies the missing half for the Svelte
 * renderer, so every existing caller of `validateCatalog` keeps the exact
 * behaviour it had before the split: no second argument, checked against
 * the built-in 189-widget catalog.
 *
 * `getWidgetTypes()` is read at CALL time, not at import time, so widgets
 * registered later via `registerWidget` are still counted.
 *
 * @changes
 *   - 2026-08-25: created (monorepo split, wave 2).
 */

import {
		validateCatalog as validateCatalogCore,
		type UnknownNode,
		type ValidateCatalogOptions,
		type UINode,
		type UISpec
} from '@ripple-ui/core';
import { getWidgetTypes } from './index.js';

export type { UnknownNode, ValidateCatalogOptions };

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
