// ApprovalGate.reason.test.ts — the reason field's keys and the required-reason mode.
// `requireDenyReason` opens the field on Deny (askDenyReason not needed) and keeps the confirm
// button disabled, with a visible "reason is needed" line, until a non-blank reason is typed.
// In the field, Return is a newline and never submits; ⌘↩ (or Ctrl+↩) confirms. The optional
// flow (askDenyReason alone) keeps its label and lets a blank reason through.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ApprovalGate from './ApprovalGate.svelte';

const setup = (extra: Record<string, unknown> = {}) => {
  const ondeny = vi.fn();
  const r = render(ApprovalGate, {
    props: { title: 'Plan', actionId: 'act_1', denyLabel: 'Reject', ondeny, ...extra },
  });
  const decision = () => r.container.querySelector('.ripple-approval-gate')!.getAttribute('data-decision');
  const confirm = () => r.getByText('Confirm reject').closest('button') as HTMLButtonElement;
  return { ...r, ondeny, decision, confirm };
};

describe('ApprovalGate requireDenyReason', () => {
  it('Deny opens a required reason field and confirm stays disabled while blank', async () => {
    const { getByText, getByLabelText, confirm, ondeny, decision } = setup({ requireDenyReason: true });
    await fireEvent.click(getByText('Reject'));
    const field = getByLabelText('Reason for denying (required)');
    expect(confirm().disabled).toBe(true);
    expect(getByText('A reason is needed to reject.')).toBeTruthy();

    await fireEvent.input(field, { target: { value: '   ' } });
    expect(confirm().disabled).toBe(true);
    await fireEvent.click(confirm());
    expect(ondeny).not.toHaveBeenCalled();
    expect(decision()).toBe('pending');
  });

  it('enables confirm once a reason is typed and passes it trimmed', async () => {
    const { getByText, getByLabelText, queryByText, confirm, ondeny, decision } = setup({ requireDenyReason: true });
    await fireEvent.click(getByText('Reject'));
    await fireEvent.input(getByLabelText('Reason for denying (required)'), { target: { value: '  Wrong repo  ' } });
    expect(confirm().disabled).toBe(false);
    expect(queryByText('A reason is needed to reject.')).toBeNull();
    await fireEvent.click(confirm());
    expect(ondeny).toHaveBeenCalledWith({ actionId: 'act_1', reason: 'Wrong repo' });
    expect(decision()).toBe('denied');
  });

  it('⌘↩ with a blank required reason does nothing', async () => {
    const { getByText, getByLabelText, ondeny, decision } = setup({ requireDenyReason: true });
    await fireEvent.click(getByText('Reject'));
    await fireEvent.keyDown(getByLabelText('Reason for denying (required)'), { key: 'Enter', metaKey: true });
    expect(ondeny).not.toHaveBeenCalled();
    expect(decision()).toBe('pending');
  });

  it('is off by default: the optional field confirms with a blank reason', async () => {
    const { getByText, getByLabelText, queryByText, confirm, ondeny } = setup({ askDenyReason: true });
    await fireEvent.click(getByText('Reject'));
    expect(getByLabelText('Reason for denying (optional)')).toBeTruthy();
    expect(queryByText('A reason is needed to reject.')).toBeNull();
    expect(confirm().disabled).toBe(false);
    await fireEvent.click(confirm());
    expect(ondeny).toHaveBeenCalledWith({ actionId: 'act_1' });
  });
});

describe('ApprovalGate reason field keys', () => {
  it.each([{ requireDenyReason: true }, { askDenyReason: true }])('Return alone never submits (%o)', async (mode) => {
    const { getByText, getByLabelText, ondeny, decision } = setup(mode);
    await fireEvent.click(getByText('Reject'));
    const field = getByLabelText(/Reason for denying/);
    await fireEvent.input(field, { target: { value: 'Too broad' } });
    await fireEvent.keyDown(field, { key: 'Enter' });
    expect(ondeny).not.toHaveBeenCalled();
    expect(decision()).toBe('pending');
    expect(getByLabelText(/Reason for denying/)).toBeTruthy();
  });

  it.each([{ metaKey: true }, { ctrlKey: true }])('⌘/Ctrl+↩ confirms with the typed reason (%o)', async (mod) => {
    const { getByText, getByLabelText, ondeny, decision } = setup({ requireDenyReason: true });
    await fireEvent.click(getByText('Reject'));
    const field = getByLabelText('Reason for denying (required)');
    await fireEvent.input(field, { target: { value: 'Too broad' } });
    await fireEvent.keyDown(field, { key: 'Enter', ...mod });
    expect(ondeny).toHaveBeenCalledWith({ actionId: 'act_1', reason: 'Too broad' });
    expect(decision()).toBe('denied');
  });
});
