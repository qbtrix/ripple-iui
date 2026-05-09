import type { ActionSpec } from './index.js';

/**
 * Grammar reference for every `EventAction` variant the dispatcher accepts.
 * Source-of-truth: `src/lib/schema/event-handler.ts`. Drift-tested in
 * `manifest.test.ts` — every `example` here must parse against the
 * live `EventHandler` zod schema.
 */
export const manifestActions: Record<string, ActionSpec> = {};
