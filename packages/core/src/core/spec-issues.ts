// @file core/spec-issues.ts
// @description Turns a broken UISpec into a list of plain-English problems a
//   host can hand back to the model on its next turn. Two checks feed it:
//   the zod schema (`safeParseUISpec`) and the widget catalog
//   (`validateCatalog`). Every path uses validateCatalog's style
//   (`ui.children[2].props`), so a model sees one notation whichever check
//   found the problem. The catalog is injected exactly as validateCatalog
//   takes it; the engine has no widgets of its own.

import { safeParseUISpec } from '../schema/ui-spec.js';
import { validateCatalog, type ValidateCatalogOptions } from './validate-catalog.js';

/** One problem in a spec, located and worded for the model that wrote it. */
export interface SpecIssue {
  /**
   * Where the problem is, e.g. `ui.children[2].props`. A problem with the
   * spec as a whole (not an object at all) has the path `spec`.
   */
  path: string;
  /** What is wrong, in a sentence the model can act on. */
  message: string;
}

/** `['ui', 'children', 2, 'props']` → `ui.children[2].props`. */
function toPath(segments: readonly PropertyKey[]): string {
  let out = '';
  for (const seg of segments) {
    if (typeof seg === 'number') out += `[${seg}]`;
    else out += out ? `.${String(seg)}` : String(seg);
  }
  return out || 'spec';
}

/**
 * Every problem in a Gen-1 `UISpec`: schema violations first, then nodes
 * whose widget type the catalog does not know. An empty array means the spec
 * parses and every node is renderable. Pass the same options as
 * `validateCatalog` (`widgetTypes`, `extraWidgetTypes`); with no
 * `widgetTypes`, only `if` and `each` count as known.
 */
export function specIssues(spec: unknown, opts: ValidateCatalogOptions = {}): SpecIssue[] {
  const issues: SpecIssue[] = [];

  const parsed = safeParseUISpec(spec);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({ path: toPath(issue.path), message: issue.message });
    }
  }

  if (spec !== null && typeof spec === 'object') {
    for (const node of validateCatalog(spec as never, opts)) {
      issues.push({
        path: node.path,
        message: `widget type "${node.type}" isn't in the catalog`
      });
    }
  }

  return issues;
}

/**
 * Render issues as a short text block to append to the model's next turn.
 * Returns `''` for no issues, so a host can write `if (text) ...`.
 */
export function formatSpecIssues(issues: readonly SpecIssue[]): string {
  if (issues.length === 0) return '';
  const lines = issues.map((i) => `- ${i.path}: ${i.message}`);
  const noun = issues.length === 1 ? 'problem' : 'problems';
  return `The last UI spec has ${issues.length} ${noun}. Fix them in the next spec:\n${lines.join('\n')}`;
}
