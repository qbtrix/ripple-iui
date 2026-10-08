// ApprovalGate.risk.test.ts — the risk badge is opt-in: a gate given no `risk` draws no badge
// and carries no data-risk, so a host that has no risk to state does not get an invented
// "Medium risk". A given risk still renders as text.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ApprovalGate from './ApprovalGate.svelte';

const root = (c: ParentNode) => c.querySelector('.ripple-approval-gate')!;

describe('ApprovalGate risk badge', () => {
  it('draws no badge and no data-risk when risk is omitted', () => {
    const { container } = render(ApprovalGate, { props: { title: 'Plan' } });
    expect(container.textContent).not.toMatch(/risk/i);
    expect(root(container).hasAttribute('data-risk')).toBe(false);
  });

  it.each([
    ['low', 'Low risk'],
    ['medium', 'Medium risk'],
    ['high', 'High risk'],
  ] as const)('draws the %s badge as text when given', (risk, label) => {
    const { getByText, container } = render(ApprovalGate, { props: { title: 'Plan', risk } });
    expect(getByText(label)).toBeTruthy();
    expect(root(container).getAttribute('data-risk')).toBe(risk);
  });
});
