/**
 * @file editor/core/inspector-fields.test.ts
 * @description Unit tests for the manifest-driven inspector field inference
 *   (parseEnumOptions / inferFieldKind / coerceFieldValue / inferFields). Pure
 *   logic over synthetic specs — no Svelte, no DOM.
 * @created 2026-06-29 (editor chrome — properties panel)
 */
import { describe, it, expect } from 'vitest';
import {
  parseEnumOptions,
  inferFieldKind,
  coerceFieldValue,
  inferFields,
  type InspectorField
} from './inspector-fields.js';
import type { UINode } from '@ripple-ui/core';

describe('parseEnumOptions', () => {
  it('parses a single-quoted literal union', () => {
    expect(parseEnumOptions("'sm' | 'md' | 'lg'")).toEqual(['sm', 'md', 'lg']);
  });
  it('parses a double-quoted literal union', () => {
    expect(parseEnumOptions('"info" | "success" | "default"')).toEqual(['info', 'success', 'default']);
  });
  it('parses a numeric-literal union', () => {
    expect(parseEnumOptions('1 | 2 | 3 | 4')).toEqual(['1', '2', '3', '4']);
  });
  it('returns [] for plain primitives and mixed unions', () => {
    expect(parseEnumOptions('string')).toEqual([]);
    expect(parseEnumOptions('number | string')).toEqual([]);
    expect(parseEnumOptions("number | 'a'")).toEqual([]); // mixed → not a clean enum
    expect(parseEnumOptions(undefined)).toEqual([]);
  });
});

describe('inferFieldKind', () => {
  it('classifies literal unions as select', () => {
    expect(inferFieldKind("'a' | 'b'")).toBe('select');
    expect(inferFieldKind('1 | 2 | 3')).toBe('select');
  });
  it('classifies primitives', () => {
    expect(inferFieldKind('number')).toBe('number');
    expect(inferFieldKind('boolean')).toBe('boolean');
    expect(inferFieldKind('string')).toBe('text');
    expect(inferFieldKind('number | string')).toBe('text');
  });
  it('classifies collections/objects/callables as readonly', () => {
    expect(inferFieldKind('string[]')).toBe('readonly');
    expect(inferFieldKind('Record<string, unknown>')).toBe('readonly');
    expect(inferFieldKind('{ key: string }')).toBe('readonly');
    expect(inferFieldKind('() => void')).toBe('readonly');
    expect(inferFieldKind(undefined)).toBe('readonly');
  });
});

describe('coerceFieldValue', () => {
  it('coerces numbers (number field + numeric select)', () => {
    expect(coerceFieldValue('number', '42')).toBe(42);
    expect(coerceFieldValue('select', '3', true)).toBe(3);
    expect(coerceFieldValue('number', 'nope')).toBe(0);
  });
  it('coerces booleans from checkbox-ish inputs', () => {
    expect(coerceFieldValue('boolean', true)).toBe(true);
    expect(coerceFieldValue('boolean', 'on')).toBe(true);
    expect(coerceFieldValue('boolean', false)).toBe(false);
  });
  it('stringifies text/textarea and non-numeric selects', () => {
    expect(coerceFieldValue('text', 'hi')).toBe('hi');
    expect(coerceFieldValue('select', 'md', false)).toBe('md');
    expect(coerceFieldValue('text', null)).toBe('');
  });
});

describe('inferFields', () => {
  const entry = {
    type: 'demo',
    props: {
      title: { type: 'string', description: 'The title.' },
      description: { type: 'string' }, // → textarea (prose prop name)
      variant: { type: "'a' | 'b' | 'c'" }, // → select
      level: { type: '1 | 2 | 3' }, // → numeric select
      count: { type: 'number' },
      hidden: { type: 'boolean' },
      columns: { type: 'Column[]' } // → readonly, omitted
    }
  };
  const node = { type: 'demo', id: 'n1', props: { title: 'Hi', level: 2, hidden: true } } as unknown as UINode;

  it('omits readonly (collection) props', () => {
    const fields = inferFields(node, entry);
    expect(fields.find((f) => f.prop === 'columns')).toBeUndefined();
  });
  it('infers each editable kind and pulls current values with spec fallbacks', () => {
    const by = Object.fromEntries(inferFields(node, entry).map((f) => [f.prop, f])) as Record<string, InspectorField>;
    expect(by.title).toMatchObject({ kind: 'text', value: 'Hi', description: 'The title.' });
    expect(by.description.kind).toBe('textarea');
    expect(by.variant).toMatchObject({ kind: 'select', options: ['a', 'b', 'c'], numeric: false });
    expect(by.level).toMatchObject({ kind: 'select', options: ['1', '2', '3'], numeric: true, value: 2 });
    expect(by.count).toMatchObject({ kind: 'number', value: 0 }); // not set → fallback
    expect(by.hidden).toMatchObject({ kind: 'boolean', value: true });
  });
  it('returns [] for a null node or an unknown/propless type', () => {
    expect(inferFields(null)).toEqual([]);
    expect(inferFields({ type: 'demo', id: 'x' } as unknown as UINode, { type: 'demo', props: null })).toEqual([]);
  });
});
