// flow-action.test.ts — Chain Flow v2 (§3.3/§5.1) FlowAction union coverage.
// Created 2026-06-15: proves the three original terminal kinds (chat/navigate/
// emit) still parse unchanged AND the three additive v2 kinds (invoke_tool/
// call_binding/create_pocket) parse, including the optional `then` post-action
// self-reference. Guards the additive-only contract: an unknown `kind` is still
// rejected by the discriminated union.

import { describe, it, expect } from 'vitest';
import { FlowAction } from '../universal-spec.js';

describe('FlowAction union — existing kinds (unchanged)', () => {
  it('parses a chat terminal action', () => {
    const res = FlowAction.safeParse({ kind: 'chat', message: 'Intake complete.' });
    expect(res.success).toBe(true);
  });

  it('parses a navigate terminal action', () => {
    const res = FlowAction.safeParse({ kind: 'navigate', url: '/vendors' });
    expect(res.success).toBe(true);
  });

  it('parses an emit terminal action with a payload', () => {
    const res = FlowAction.safeParse({
      kind: 'emit',
      event: 'vendor_filed',
      payload: { id: 'v1' }
    });
    expect(res.success).toBe(true);
  });
});

describe('FlowAction union — Chain Flow v2 additive kinds', () => {
  it('parses invoke_tool with args', () => {
    const res = FlowAction.safeParse({
      kind: 'invoke_tool',
      tool: 'file_vendor',
      args: { vendor: '{flow.payload}' }
    });
    expect(res.success).toBe(true);
  });

  it('parses invoke_tool without optional args', () => {
    const res = FlowAction.safeParse({ kind: 'invoke_tool', tool: 'file_vendor' });
    expect(res.success).toBe(true);
  });

  it('parses call_binding with a then post-action', () => {
    const res = FlowAction.safeParse({
      kind: 'call_binding',
      binding: 'create_vendor',
      path: '/vendors',
      params: { name: 'Acme' },
      then: { kind: 'navigate', url: '/vendors/{result.id}' }
    });
    expect(res.success).toBe(true);
  });

  it('parses create_pocket with seed_from_flow + then', () => {
    const res = FlowAction.safeParse({
      kind: 'create_pocket',
      name: 'Acme — Client',
      template: 'tracker',
      seed_from_flow: true,
      then: { kind: 'navigate', url: '/pockets/{result.id}' }
    });
    expect(res.success).toBe(true);
  });

  it('parses a nested then chain (write -> chat hand-off)', () => {
    const res = FlowAction.safeParse({
      kind: 'invoke_tool',
      tool: 'file_vendor',
      args: { vendor: '{flow.payload}' },
      then: { kind: 'chat', message: 'Vendor filed — confirm and summarize.' }
    });
    expect(res.success).toBe(true);
  });
});

describe('FlowAction union — rejects', () => {
  it('rejects an unknown kind', () => {
    const res = FlowAction.safeParse({ kind: 'teleport', url: '/nope' });
    expect(res.success).toBe(false);
  });

  it('rejects invoke_tool without the required tool field', () => {
    const res = FlowAction.safeParse({ kind: 'invoke_tool', args: {} });
    expect(res.success).toBe(false);
  });

  it('rejects create_pocket without the required name field', () => {
    const res = FlowAction.safeParse({ kind: 'create_pocket', template: 'tracker' });
    expect(res.success).toBe(false);
  });
});
