// lib/site/scrub/model-name.ts — The display name for a recording's model.
// The recorder stores the CLI alias (`sonnet`); captions name the model.
// An alias with no entry prints as-is.

const MODEL_NAMES: Record<string, string> = { sonnet: 'Claude Sonnet' };

export const modelName = (alias: string): string => MODEL_NAMES[alias] ?? alias;
