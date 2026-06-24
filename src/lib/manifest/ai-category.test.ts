// @file manifest/ai-category.test.ts
// @description NEW (AI-native tier, 2026-06-24). Asserts the AI-native display
//   widgets are declared under the `ai` manifest category — the tier a
//   generative-UI engine filters by to find the surfaces that show an agent's
//   work (streaming text, tool calls, reasoning). Mirrors marketing-category.test.ts:
//   pins the category so the pack stays discoverable as a group, and pins each
//   description under the 200-char manifest limit.
import { describe, expect, it } from 'vitest';
import { manifestEntries } from './index.js';

/** The AI-native display widgets a generative-UI engine renders for agent work. */
const AI_TYPES = ['stream-text', 'tool-call', 'reasoning-trace'] as const;

describe('ai manifest category', () => {
  const byType = new Map(manifestEntries.map((e) => [e.type, e]));

  it('every AI-native widget has a manifest entry', () => {
    const missing = AI_TYPES.filter((t) => !byType.has(t));
    expect(missing).toEqual([]);
  });

  it("every AI-native widget carries category 'ai'", () => {
    const offenders = AI_TYPES
      .map((t) => byType.get(t))
      .filter((e): e is NonNullable<typeof e> => Boolean(e))
      .filter((e) => e.category !== 'ai')
      .map((e) => `${e.type} -> ${e.category}`);
    expect(offenders).toEqual([]);
  });

  it('every AI-native description stays under the 200-char manifest limit', () => {
    const tooLong = AI_TYPES
      .map((t) => byType.get(t))
      .filter((e): e is NonNullable<typeof e> => Boolean(e))
      .filter((e) => e.description.length >= 200)
      .map((e) => `${e.type} (${e.description.length})`);
    expect(tooLong).toEqual([]);
  });
});
