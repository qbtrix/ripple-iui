import { safeParseUniversalSpec, type UniversalSpec } from '../schema/universal-spec.js';

export function normalizeSpec(input: any): UniversalSpec {
  const parseResult = safeParseUniversalSpec(input);
  if (parseResult.success) {
    return parseResult.data;
  }

  if (input && typeof input === 'object' && input.ui && !input.intent) {
    return {
      version: '2.0',
      intent: 'custom',
      lifecycle: { type: 'ephemeral' },
      ui: input.ui,
      data: input.data,
      theme: input.theme,
      selection: 'none'
    } as UniversalSpec;
  }

  return {
    version: '2.0',
    intent: 'custom',
    lifecycle: { type: 'ephemeral' },
    ui: { type: 'container', children: [] },
    selection: 'none'
  } as UniversalSpec;
}
