// text-coerce.test.ts — unit tests for the asText() coercion idiom.
// Created for the non-string-prop sweep: asText is the single guard every
// prop-derived string operation routes through, so its contract (null/undefined
// → '', objects → JSON, everything else → String(v)) is pinned here.
// 2026-09-17: added object / array / circular cases for the JSON-serializing
// asText (oxlint no-base-to-string sweep).
import { describe, it, expect } from 'vitest';
import { asText } from './text-coerce';

describe('asText', () => {
  it('passes strings through unchanged', () => {
    expect(asText('hello')).toBe('hello');
    expect(asText('')).toBe('');
  });

  it('maps null and undefined to empty string', () => {
    expect(asText(null)).toBe('');
    expect(asText(undefined)).toBe('');
  });

  it('stringifies numbers (the core binding case)', () => {
    expect(asText(87)).toBe('87');
    expect(asText(0)).toBe('0');
    expect(asText(-3.5)).toBe('-3.5');
    expect(asText(NaN)).toBe('NaN');
  });

  it('stringifies booleans', () => {
    expect(asText(true)).toBe('true');
    expect(asText(false)).toBe('false');
  });

  it('serializes plain objects as JSON, never "[object Object]"', () => {
    expect(asText({ a: 1 })).toBe('{"a":1}');
    expect(asText({})).toBe('{}');
  });

  it('joins arrays with coerced elements', () => {
    expect(asText([1, 'b'])).toBe('1,b');
    expect(asText([{ a: 1 }])).toBe('{"a":1}');
  });

  it('falls back for circular objects', () => {
    const o: Record<string, unknown> = {};
    o.self = o;
    expect(asText(o)).toBe('[unserializable]');
  });

  it('never throws on the values bindings deliver', () => {
    const values: unknown[] = [null, undefined, 0, 1, true, false, NaN, 'x', -1, {}, [1]];
    for (const v of values) {
      expect(() => asText(v).trim()).not.toThrow();
    }
  });
});
