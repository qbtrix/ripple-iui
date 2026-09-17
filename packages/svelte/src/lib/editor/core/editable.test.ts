// editor/core/editable.test.ts
// @description SP-1b unit tests for the L1 "which prop is editable" policy. Two
//   layers: (1) the PURE resolver over synthetic catalog entries — priority
//   order, string-type filtering, null/empty handling; (2) the manifest-backed
//   bindings against the REAL widget catalog (heading->text, button->label,
//   badge->text, alert->title, …) so the mapping is proven data-driven, not
//   hand-guessed. Plus the inline-edit eligibility gate (kept in lockstep with
//   the catalog) and contenteditable text normalization.
// @created 2026-06-27 (SP-1b — branch spike/editor-domid-overlay)
import { describe, expect, it } from 'vitest';
import {
  TEXT_PROP_PRIORITY,
  resolvePrimaryTextProp,
  resolveEditableTextProps,
  primaryTextProp,
  editableTextProps,
  INLINE_TEXT_WIDGETS,
  isInlineTextWidget,
  normalizeInlineText,
  RICH_TEXT_PROP,
  RICH_TEXT_WIDGETS,
  isRichTextWidget,
  type CatalogEntryLike
} from './editable.js';

const entry = (props: Record<string, { type?: string }>): CatalogEntryLike => ({
  type: 'synthetic',
  props
});

describe('resolvePrimaryTextProp (pure, synthetic entries)', () => {
  it('returns the first priority candidate the entry declares as a string prop', () => {
    expect(resolvePrimaryTextProp(entry({ text: { type: 'string' } }))).toBe('text');
    expect(resolvePrimaryTextProp(entry({ label: { type: 'string' } }))).toBe('label');
    expect(resolvePrimaryTextProp(entry({ title: { type: 'string' } }))).toBe('title');
  });

  it('respects priority order when several candidates exist (text beats label beats title)', () => {
    const e = entry({
      title: { type: 'string' },
      label: { type: 'string' },
      text: { type: 'string' }
    });
    expect(resolvePrimaryTextProp(e)).toBe('text');
  });

  it('skips non-string-typed candidates but admits "number | string"', () => {
    // numeric-only value is skipped...
    expect(resolvePrimaryTextProp(entry({ value: { type: 'number' } }))).toBeNull();
    // ...but a string-ish union qualifies.
    expect(resolvePrimaryTextProp(entry({ value: { type: 'number | string' } }))).toBe('value');
  });

  it('ignores props that are not priority candidates', () => {
    // `variant` is a string prop but not a text candidate -> no primary prop.
    expect(resolvePrimaryTextProp(entry({ variant: { type: 'string' } }))).toBeNull();
  });

  it('returns null for missing / empty / propless entries', () => {
    expect(resolvePrimaryTextProp(null)).toBeNull();
    expect(resolvePrimaryTextProp(undefined)).toBeNull();
    expect(resolvePrimaryTextProp(entry({}))).toBeNull();
    expect(resolvePrimaryTextProp({ type: 'x' })).toBeNull();
  });
});

describe('resolveEditableTextProps (pure, synthetic entries)', () => {
  it('returns all matching candidates in priority order', () => {
    const e = entry({
      description: { type: 'string' },
      title: { type: 'string' },
      value: { type: 'number | string' }
    });
    expect(resolveEditableTextProps(e)).toEqual(['title', 'value', 'description']);
  });

  it('is empty when nothing matches', () => {
    expect(resolveEditableTextProps(entry({ variant: { type: 'string' } }))).toEqual([]);
    expect(resolveEditableTextProps(null)).toEqual([]);
  });
});

describe('TEXT_PROP_PRIORITY', () => {
  it('leads with the headline text props', () => {
    expect(TEXT_PROP_PRIORITY[0]).toBe('text');
    expect(TEXT_PROP_PRIORITY).toContain('label');
    expect(TEXT_PROP_PRIORITY).toContain('title');
    // value sits late so headline props win over it
    expect(TEXT_PROP_PRIORITY.indexOf('value')).toBeGreaterThan(TEXT_PROP_PRIORITY.indexOf('label'));
  });
});

describe('primaryTextProp (real widget catalog)', () => {
  it.each([
    ['heading', 'text'],
    ['text', 'text'],
    ['button', 'label'],
    ['badge', 'text'],
    ['alert', 'title'],
    ['callout', 'text'],
    ['metric', 'label'],
    ['stat', 'label']
  ])('maps %s -> %s', (type, expected) => {
    expect(primaryTextProp(type)).toBe(expected);
  });

  it('returns null for an unknown widget type', () => {
    expect(primaryTextProp('___not_a_widget___')).toBeNull();
  });
});

describe('editableTextProps (real widget catalog)', () => {
  it('alert exposes title then description', () => {
    expect(editableTextProps('alert')).toEqual(['title', 'description']);
  });

  it('callout exposes text then title', () => {
    expect(editableTextProps('callout')).toEqual(['text', 'title']);
  });

  it('heading exposes only text (level is numeric)', () => {
    expect(editableTextProps('heading')).toEqual(['text']);
  });

  it('button exposes only label (variant/type are enums, not text candidates)', () => {
    expect(editableTextProps('button')).toEqual(['label']);
  });
});

describe('inline-edit eligibility gate', () => {
  it('the single-text widgets are inline-editable', () => {
    for (const t of ['heading', 'text', 'badge', 'button']) {
      expect(isInlineTextWidget(t)).toBe(true);
    }
  });

  it('composite / multi-text / structural widgets are NOT inline-editable', () => {
    for (const t of ['card', 'container', 'grid', 'table', 'alert', 'metric', 'form']) {
      expect(isInlineTextWidget(t)).toBe(false);
    }
  });

  it('every widget in INLINE_TEXT_WIDGETS actually has a primary text prop (no drift from catalog)', () => {
    for (const t of INLINE_TEXT_WIDGETS) {
      expect(primaryTextProp(t), `${t} must declare a primary text prop`).not.toBeNull();
    }
  });
});

describe('rich-text edit eligibility gate (TipTap path)', () => {
  it('richtext is a rich-text widget', () => {
    expect(isRichTextWidget('richtext')).toBe(true);
    expect(RICH_TEXT_WIDGETS.has('richtext')).toBe(true);
  });

  it('the rich content prop is `html`', () => {
    expect(RICH_TEXT_PROP).toBe('html');
  });

  it('plain-text / composite widgets are NOT rich-text widgets', () => {
    for (const t of ['heading', 'text', 'badge', 'button', 'card', 'markdown']) {
      expect(isRichTextWidget(t)).toBe(false);
    }
  });

  it('the rich path and the contenteditable text path are disjoint', () => {
    // A widget must not be claimed by both inline edit paths — they round-trip
    // content differently (textContent vs getHTML), so overlap would corrupt.
    for (const t of RICH_TEXT_WIDGETS) {
      expect(isInlineTextWidget(t)).toBe(false);
    }
    for (const t of INLINE_TEXT_WIDGETS) {
      expect(isRichTextWidget(t)).toBe(false);
    }
  });
});

describe('normalizeInlineText', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeInlineText('  hello  ')).toBe('hello');
  });

  it('collapses the non-breaking spaces contenteditable injects', () => {
    expect(normalizeInlineText('a\u00a0b')).toBe('a b');
  });

  it('handles null / undefined as empty string', () => {
    expect(normalizeInlineText(null)).toBe('');
    expect(normalizeInlineText(undefined)).toBe('');
  });
});
