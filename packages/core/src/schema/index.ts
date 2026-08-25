// Barrel for @ripple-ui/core/schema.
// @changes
//   - 2026-08-25: added brand.js. It was always part of the schema but was
//     reached by direct path from the Svelte package; with the split, the
//     barrel is the public surface, so a missing line is a missing export.
export * from './brand.js';
export * from './event-handler.js';
export * from './widget-types.js';
export * from './motion.js';
export * from './ui-spec.js';
export * from './universal-spec.js';
