// non-string-props.test.ts — the non-string-prop sweep regression suite.
//
// Pocket bindings ({state.x.score}, day counts, booleans, null) routinely hand
// a widget a non-string where the prop type says `string`. Before this sweep,
// any widget that then called a string method (.trim / .split / .toLowerCase /
// .startsWith / .charAt / ...) threw, and because NodeRenderer has no error
// boundary, ONE throwing widget took down the whole pocket canvas. Two live
// crashes proved it: Text's linkify on a number, Badge's text?.trim() on a
// number.
//
// Each widget below is rendered with a NUMBER (and, where the empty-render
// contract matters, null) in a string-typed prop. The bar is simple: it must
// NOT throw, and a number must render as its string form.
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';

import Badge from './display/Badge.svelte';
import Metric from './display/Metric.svelte';
import Highlight from './display/Highlight.svelte';
import Avatar from './display/Avatar.svelte';
import Mention from './display/Mention.svelte';
import ArticleMeta from './display/ArticleMeta.svelte';
import Icon from './display/Icon.svelte';
import Diff from './display/Diff.svelte';
import TextWidget from './display/Text.svelte';
import CompanyHeader from './research/CompanyHeader.svelte';
import Ticker from './research/Ticker.svelte';
import AvatarGroup from './composite/AvatarGroup.svelte';
import OrgChart from './vertical/OrgChart.svelte';
import CommentThread from './vertical/CommentThread.svelte';
import PeoplePicker from './vertical/PeoplePicker.svelte';
import ApiKey from './vertical/ApiKey.svelte';
import TextEffect from './premium/TextEffect.svelte';
import DataGrid from './data/DataGrid.svelte';

/** Render and return the trimmed text content; fails the test if render throws. */
function renderText(Component: any, props: Record<string, unknown>): string {
  const { container } = render(Component, { props });
  return (container.textContent ?? '').trim();
}

describe('non-string props do not crash widgets', () => {
  it('Badge renders a numeric text instead of crashing', () => {
    expect(renderText(Badge, { text: 87 as unknown as string })).toContain('87');
  });

  it('Badge renders nothing for null (empty-guard preserved)', () => {
    expect(renderText(Badge, { text: null as unknown as string })).toBe('');
  });

  it('Metric tolerates a numeric trend', () => {
    expect(() => render(Metric, { props: { label: 'Rev', value: 12, trend: -3 as unknown as string } })).not.toThrow();
  });

  it('Highlight tolerates a numeric delta', () => {
    expect(() => render(Highlight, { props: { value: 42, delta: -5 as unknown as string } })).not.toThrow();
  });

  it('Avatar derives initials from a numeric alt without crashing', () => {
    expect(() => render(Avatar, { props: { alt: 123 as unknown as string } })).not.toThrow();
  });

  it('AvatarGroup tolerates numeric alt in a user item', () => {
    expect(() =>
      render(AvatarGroup, { props: { users: [{ alt: 7 as unknown as string }] } })
    ).not.toThrow();
  });

  it('Mention tolerates a numeric name', () => {
    expect(() => render(Mention, { props: { name: 42 as unknown as string } })).not.toThrow();
  });

  it('ArticleMeta tolerates a numeric author', () => {
    expect(() => render(ArticleMeta, { props: { author: 99 as unknown as string } })).not.toThrow();
  });

  it('Icon tolerates a numeric name', () => {
    expect(() => render(Icon, { props: { name: 5 as unknown as string } })).not.toThrow();
  });

  it('Diff tolerates numeric before/after', () => {
    expect(() => render(Diff, { props: { before: 1 as unknown as string, after: 2 as unknown as string } })).not.toThrow();
  });

  it('Text renders a numeric value and tolerates a numeric color', () => {
    expect(renderText(TextWidget, { text: 87 as unknown as string, color: 0 as unknown as string })).toContain('87');
  });

  it('CompanyHeader tolerates numeric name and change', () => {
    expect(() =>
      render(CompanyHeader, { props: { name: 7 as unknown as string, change: -2 as unknown as string } })
    ).not.toThrow();
  });

  it('Ticker tolerates a numeric change in an item', () => {
    expect(() =>
      render(Ticker, { props: { items: [{ symbol: 'X', price: '1', change: -1 as unknown as string }] } })
    ).not.toThrow();
  });

  it('OrgChart tolerates a numeric node name', () => {
    expect(() =>
      render(OrgChart, { props: { root: { id: 1, name: 5 as unknown as string } } })
    ).not.toThrow();
  });

  it('CommentThread tolerates a numeric author', () => {
    expect(() =>
      render(CommentThread, { props: { comments: [{ id: 1, author: 9 as unknown as string, body: 'hi' }] } })
    ).not.toThrow();
  });

  it('PeoplePicker tolerates numeric name/email/role in a person', () => {
    expect(() =>
      render(PeoplePicker, {
        props: { people: [{ id: 1, name: 9 as unknown as string, email: 8 as unknown as string, role: 7 as unknown as string }] }
      })
    ).not.toThrow();
  });

  it('ApiKey tolerates a numeric value', () => {
    expect(() => render(ApiKey, { props: { value: 1234567890 as unknown as string } })).not.toThrow();
  });

  it('TextEffect renders a numeric text without crashing', () => {
    expect(() => render(TextEffect, { props: { text: 42 as unknown as string } })).not.toThrow();
  });

  it('DataGrid tolerates a numeric defaultSort', () => {
    expect(() =>
      render(DataGrid, { props: { columns: [{ key: 'a', label: 'A' }], rows: [{ a: 1 }], defaultSort: 5 as unknown as string } })
    ).not.toThrow();
  });
});
