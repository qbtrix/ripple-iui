/**
 * @file widget-bridge-protocol.test.ts
 * @description Guards for the `invoke_tool/v1` wire types. The host repo
 * validates untrusted frame traffic with these, so the fail-closed cases
 * matter more than the happy one.
 * @created 2026-08-25 — T1 of the widget capability bridge arc.
 * @changes
 *   - Initial creation.
 */

import { describe, it, expect } from 'vitest';
import {
  INVOKE_TOOL_CALL_V1,
  INVOKE_TOOL_RESULT_V1,
  INSTINCT_PENDING_CODE,
  INSTINCT_PENDING_STATUS,
  isInvokeToolCallV1,
  isInvokeToolResultV1,
  classifyInvokeToolResult,
  type InvokeToolResultV1
} from './widget-bridge-protocol.js';

const validCall = {
  paw: INVOKE_TOOL_CALL_V1,
  token: 'tok',
  callId: 'c1',
  tool: 'github.list_issues',
  args: { repo: 'x' }
};

describe('isInvokeToolCallV1', () => {
  it('accepts a well-formed call, with or without args', () => {
    expect(isInvokeToolCallV1(validCall)).toBe(true);
    expect(isInvokeToolCallV1({ ...validCall, args: undefined })).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'invoke_tool/v1'],
    ['an array', [validCall]],
    ['a wrong version tag', { ...validCall, paw: 'invoke_tool/v2' }],
    ['a missing token', { ...validCall, token: undefined }],
    ['an empty token', { ...validCall, token: '' }],
    ['a non-string callId', { ...validCall, callId: 7 }],
    ['an empty tool name', { ...validCall, tool: '' }],
    ['array args', { ...validCall, args: [1, 2] }]
  ])('rejects %s', (_label, value) => {
    expect(isInvokeToolCallV1(value)).toBe(false);
  });
});

describe('isInvokeToolResultV1', () => {
  it('accepts a well-formed reply', () => {
    expect(
      isInvokeToolResultV1({ paw: INVOKE_TOOL_RESULT_V1, callId: 'c1', ok: true, status: 200 })
    ).toBe(true);
  });

  it.each([
    ['a wrong tag', { paw: 'nope', callId: 'c1', ok: true, status: 200 }],
    ['a missing ok', { paw: INVOKE_TOOL_RESULT_V1, callId: 'c1', status: 200 }],
    ['a string status', { paw: INVOKE_TOOL_RESULT_V1, callId: 'c1', ok: true, status: '200' }],
    ['a non-string code', { paw: INVOKE_TOOL_RESULT_V1, callId: 'c1', ok: true, status: 200, code: 1 }]
  ])('rejects %s', (_label, value) => {
    expect(isInvokeToolResultV1(value)).toBe(false);
  });
});

describe('classifyInvokeToolResult', () => {
  const base = { paw: INVOKE_TOOL_RESULT_V1, callId: 'c1' } as const;

  it('classifies ok, error and pending', () => {
    expect(classifyInvokeToolResult({ ...base, ok: true, status: 200 })).toBe('ok');
    expect(classifyInvokeToolResult({ ...base, ok: false, status: 403 })).toBe('error');
    expect(
      classifyInvokeToolResult({
        ...base,
        ok: true,
        status: INSTINCT_PENDING_STATUS,
        code: INSTINCT_PENDING_CODE
      })
    ).toBe('pending');
  });

  it('classifies a parked write as pending regardless of the ok flag', () => {
    const parked: InvokeToolResultV1 = {
      ...base,
      ok: false,
      status: INSTINCT_PENDING_STATUS,
      code: INSTINCT_PENDING_CODE
    };
    expect(classifyInvokeToolResult(parked)).toBe('pending');
  });
});
