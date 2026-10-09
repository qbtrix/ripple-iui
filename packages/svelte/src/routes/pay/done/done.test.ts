// routes/pay/done/done.test.ts — /pay/done's announce(): a valid order posts
// {type:'paid-check', order} on 'ripple-order'; a malformed id posts nothing.

import { expect, test, vi } from 'vitest';
import { announce } from './done.js';

const channel = () => {
	const ch = { postMessage: vi.fn(), close: vi.fn() };
	return { ch, open: vi.fn(() => ch) };
};

test('a paid return posts paid-check for the order and closes the channel', () => {
	const { ch, open } = channel();
	expect(announce('?order=mock_6f1c2a4e-9b7d-4c3e-8a21-5d0f7e9b1c33', open)).toEqual({ outcome: 'paid', order: 'mock_6f1c2a4e-9b7d-4c3e-8a21-5d0f7e9b1c33' });
	expect(ch.postMessage).toHaveBeenCalledWith({ type: 'paid-check', order: 'mock_6f1c2a4e-9b7d-4c3e-8a21-5d0f7e9b1c33' });
	expect(ch.close).toHaveBeenCalled();
	expect(announce('?order=cs_test_a1B2', open).outcome).toBe('paid');
});

test('a cancel says cancelled and still nudges the card when it names the order', () => {
	const { ch, open } = channel();
	expect(announce('?cancelled=1', open)).toEqual({ outcome: 'cancelled', order: null });
	expect(ch.postMessage).not.toHaveBeenCalled();
	expect(announce('?cancelled=1&order=cs_test_1', open)).toEqual({ outcome: 'cancelled', order: 'cs_test_1' });
	expect(ch.postMessage).toHaveBeenCalledWith({ type: 'paid-check', order: 'cs_test_1' });
});

test.each(['?order=<b>x</b>', '?order=a%2Fb', `?order=${'a'.repeat(256)}`, '?order=', ''])('%s posts nothing', (q) => {
	const { ch, open } = channel();
	expect(announce(q, open)).toEqual({ outcome: 'unknown', order: null });
	expect(open).not.toHaveBeenCalled();
	expect(ch.postMessage).not.toHaveBeenCalled();
});

test('a missing BroadcastChannel is not an error', () => {
	expect(announce('?order=cs_test_1', () => null).outcome).toBe('paid');
});
