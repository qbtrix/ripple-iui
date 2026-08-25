// @file core/raw-props.test.ts
// @description Unit surface for the raw-prop registry: which widget props
//   skip expression resolution and reach the widget byte-for-byte.
// @created 2026-08-25 — added with the `embed.srcdoc` mangling fix.
import { describe, it, expect } from 'vitest';
import { getRawPropNames, isRawProp } from './raw-props.js';

describe('raw-prop registry', () => {
  it('marks embed.srcdoc raw', () => {
    expect(isRawProp('embed', 'srcdoc')).toBe(true);
  });

  it('covers the `iframe` alias of the embed widget', () => {
    expect(isRawProp('iframe', 'srcdoc')).toBe(true);
  });

  it('does not mark other embed props raw', () => {
    expect(isRawProp('embed', 'title')).toBe(false);
    expect(isRawProp('embed', 'url')).toBe(false);
  });

  it('returns undefined for widget types with no raw props', () => {
    expect(getRawPropNames('text')).toBeUndefined();
    expect(getRawPropNames(undefined)).toBeUndefined();
  });

  it('returns the set of raw prop names for a registered type', () => {
    expect([...(getRawPropNames('embed') ?? [])]).toEqual(['srcdoc']);
  });

  it('is inert for an unknown widget type', () => {
    expect(isRawProp('not-a-widget', 'srcdoc')).toBe(false);
  });
});
