// text-coerce.ts — re-export of asText, which lives in @ripple-ui/core.
//
// Created 2026-09-17 (ripple #119 merge of main): the implementation moved to
// packages/core/src/core/text-coerce.ts because the engine now calls it and
// core cannot import from the renderer. This file keeps every widget's
// `$lib/widgets/text-coerce` import working, with one source of truth.

export { asText } from '@ripple-ui/core';
