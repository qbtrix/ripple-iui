/**
 * @file schema/index.ts
 * @description Compatibility re-export for `@ripple-ui/svelte/schema`.
 *
 * The spec schema moved to `@ripple-ui/core` in the monorepo split — it is
 * pure zod with no framework dependency, so it belongs to the engine. This
 * file keeps the `@ripple-ui/svelte/schema` subpath resolving, because
 * removing a published entry point is a breaking change and the split is
 * meant to be invisible to existing consumers.
 *
 * New code should import from `@ripple-ui/core/schema` directly.
 *
 * @changes
 *   - 2026-08-25: created (monorepo split, wave 2).
 */

export * from '@ripple-ui/core/schema';
