// TEMPORARY scratch test — proves the new CI gate turns red on a failing test.
// This commit is reverted immediately after the red CI run is captured; it must
// NOT remain in the PR.
import { describe, it, expect } from 'vitest';
describe('CI gate proof', () => {
  it('intentionally fails so we can watch CI go red', () => {
    expect(1).toBe(2);
  });
});
