// Build-time-generated manifest of every Ripple widget the LLM should know
// about. Aggregated into dist/manifest.json by scripts/build-manifest.ts.

import pkg from '../../../package.json' with { type: 'json' };
import { metricEntry } from './entries/metric.js';

export interface WidgetPropSpec {
  type: string;
  required: boolean;
  description: string;
}

export interface WidgetManifestEntry {
  /** Canonical widget type as registered in `widgets/index.ts`. */
  type: string;
  /** Top-level grouping — display | layout | input | data | control | composite | overlay | research | vertical. */
  category: string;
  /** One-line summary, < 200 chars. Long docs stay in the wiki. */
  description: string;
  /** Prop name → spec. Only LLM-relevant props; internal/passthrough props omitted. */
  props: Record<string, WidgetPropSpec>;
  /** A runnable UISpec node the LLM can lift as a starting point. */
  example: { type: string; props: Record<string, unknown>; children?: unknown };
}

export interface WidgetManifest {
  schema: 'ripple.manifest/v1';
  version: string;
  generatedAt: string;
  widgets: WidgetManifestEntry[];
}

export const manifestEntries: WidgetManifestEntry[] = [
  metricEntry,
];

export function buildManifest(): WidgetManifest {
  if (manifestEntries.length === 0) {
    throw new Error('No manifest entries registered');
  }
  return {
    schema: 'ripple.manifest/v1',
    version: pkg.version,
    generatedAt: new Date().toISOString(),
    widgets: manifestEntries,
  };
}
