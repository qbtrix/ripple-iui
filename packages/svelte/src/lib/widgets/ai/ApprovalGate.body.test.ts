// ApprovalGate.body.test.ts — `body` takes a markdown string (the default, what a spec sends)
// or a Snippet, so a Svelte host can put rich content (task rows, a list, a diff of its own) in
// the same gate shell. The snippet renders where the markdown would; with no body, diff or
// tool calls there is no body section at all.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import ApprovalGate from './ApprovalGate.svelte';

const section = (root: ParentNode) => root.querySelector('[data-slot="approval-gate-body"]');

describe('ApprovalGate body', () => {
  it('renders a snippet body in the body section', () => {
    const rich = createRawSnippet(() => ({ render: () => '<ul data-rich><li>Add a variant</li><li>Fix the sort</li></ul>' }));
    const { container } = render(ApprovalGate, { props: { title: 'Plan', body: rich } });
    const body = section(container);
    expect(body).not.toBeNull();
    expect(body!.querySelectorAll('[data-rich] li').length).toBe(2);
  });

  it('keeps a string body as markdown', () => {
    const { container } = render(ApprovalGate, { props: { title: 'Plan', body: 'Ship **two** tasks' } });
    expect(section(container)!.querySelector('strong')?.textContent).toBe('two');
  });

  it('puts the snippet before a diff, as the markdown would be', () => {
    const rich = createRawSnippet(() => ({ render: () => '<p data-rich>Summary</p>' }));
    const { container } = render(ApprovalGate, {
      props: { title: 'Change', body: rich, diff: { before: 'a', after: 'b' } },
    });
    const kids = Array.from(section(container)!.children);
    expect(kids[0].hasAttribute('data-rich')).toBe(true);
    expect(kids.length).toBeGreaterThan(1);
  });

  it('draws no body section when there is nothing to show', () => {
    const { container } = render(ApprovalGate, { props: { title: 'Bare' } });
    expect(section(container)).toBeNull();
  });
});
