// routes/pawbar/PayCard.test.ts — The chat's pay card against contract
// fixtures on fake timers: the Pay link is the allowlisted url in a new tab,
// it waits while pending, a paid poll swaps in the tracking card (order-status,
// updated in place on the next poll), cancelled offers a retry, a
// BroadcastChannel ping only triggers a poll, and unmounting stops polling.

import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import PayCard from './PayCard.svelte';
import { ORDER_ID, orderBody, storeFetch, trackBody } from '../pay/fixtures.js';
import { POLL_MS } from '../pay/watch.svelte.js';

const STORE = 'https://shop.example/test-store';
const URL_ = 'https://checkout.stripe.com/c/pay/cs_test_1';
const pay = {
	url: URL_,
	sessionId: ORDER_ID,
	summary: { lines: [{ name: 'Classic Cheeseburger', qty: 1, price: 13.49 }], orderType: 'delivery' as const, total: 13.49 }
};

let orderStatus: 'pending' | 'paid' | 'cancelled';
let trackStatus: string;
let fetch: ReturnType<typeof vi.fn>;
let listeners: ((e: MessageEvent) => void)[];
const channel = () => ({ addEventListener: (_t: string, fn: (e: MessageEvent) => void) => void listeners.push(fn), close: vi.fn() });
const ping = (data: unknown) => listeners.forEach((fn) => fn({ data } as MessageEvent));

beforeEach(() => {
	vi.useFakeTimers();
	orderStatus = 'pending';
	trackStatus = 'preparing';
	listeners = [];
	fetch = vi.fn(
		storeFetch({
			[`/api/orders/${ORDER_ID}`]: () => ({ body: orderBody(orderStatus) }),
			[`/api/orders/${ORDER_ID}/track`]: () => ({ body: trackBody(trackStatus) })
		})
	);
});
afterEach(() => vi.useRealTimers());

const mount = (onretry?: () => void) => render(PayCard, { pay, storeUrl: STORE, fetch: fetch as never, channel: channel as never, onretry });

test('the Pay link opens the allowlisted url in a new tab and the card waits', async () => {
	const view = mount();
	const link = view.getByRole('link', { name: /^Pay \$/ });
	expect(link.getAttribute('href')).toBe(URL_);
	expect(link.getAttribute('target')).toBe('_blank');
	expect(link.getAttribute('rel')).toContain('noopener');
	expect(view.getByRole('status').textContent).toContain('Waiting for payment');
	// The store's total replaces the card's estimate once it answers.
	await vi.waitFor(() => expect(view.getByRole('link').textContent).toBe('Pay $17.48'));
	expect(view.getByText('1 × Fresh Lemonade')).toBeTruthy();
});

test('a ping triggers a poll but does nothing on its own; a paid poll turns the card into tracking, updated in place', async () => {
	const view = mount();
	await vi.advanceTimersByTimeAsync(1);
	const n = fetch.mock.calls.length;
	ping({ type: 'paid-check', order: ORDER_ID, status: 'paid' });
	await vi.advanceTimersByTimeAsync(1);
	expect(fetch.mock.calls.length).toBe(n + 1);
	expect(view.getByText(/Waiting for payment/)).toBeTruthy();

	orderStatus = 'paid';
	ping({ type: 'paid-check', order: ORDER_ID });
	await vi.waitFor(() => expect(view.getByText('The kitchen is on it')).toBeTruthy());
	expect(view.queryByRole('link', { name: /^Pay/ })).toBeNull();
	const card = view.container.querySelector('.rorder');
	expect(card).toBeTruthy();

	trackStatus = 'out-for-delivery';
	await vi.advanceTimersByTimeAsync(POLL_MS);
	await vi.waitFor(() => expect(view.getByText('On the way', { selector: 'h2' })).toBeTruthy());
	expect(view.container.querySelector('.rorder')).toBe(card);
	expect(view.getByText('9 min')).toBeTruthy();
});

test('cancelled shows a retry that starts a new checkout', async () => {
	orderStatus = 'cancelled';
	const onretry = vi.fn();
	const view = mount(onretry);
	await vi.waitFor(() => expect(view.getByText(/Payment cancelled/)).toBeTruthy());
	expect(view.queryByRole('link', { name: /^Pay/ })).toBeNull();
	await fireEvent.click(view.getByRole('button', { name: 'Start a new checkout' }));
	expect(onretry).toHaveBeenCalledOnce();
});

test('polling stops on delivered and on unmount', async () => {
	orderStatus = 'paid';
	trackStatus = 'delivered';
	const view = mount();
	await vi.waitFor(() => expect(view.getByText('Delivered', { selector: 'h2' })).toBeTruthy());
	let n = fetch.mock.calls.length;
	await vi.advanceTimersByTimeAsync(POLL_MS * 5);
	expect(fetch.mock.calls.length).toBe(n);
	view.unmount();

	orderStatus = 'pending';
	const again = mount();
	await vi.advanceTimersByTimeAsync(1);
	n = fetch.mock.calls.length;
	again.unmount();
	await vi.advanceTimersByTimeAsync(POLL_MS * 5);
	ping({ type: 'paid-check', order: ORDER_ID });
	await vi.advanceTimersByTimeAsync(1);
	expect(fetch.mock.calls.length).toBe(n);
});

test('an HTML label from the store renders as text, never markup', async () => {
	orderStatus = 'paid';
	const label = '<img src=x onerror="alert(1)">Grill';
	fetch = vi.fn(
		storeFetch({
			[`/api/orders/${ORDER_ID}`]: () => ({ body: orderBody('paid') }),
			[`/api/orders/${ORDER_ID}/track`]: () => ({ body: trackBody('preparing', { restaurant: { lat: 40.7128, lng: -74.006, label } }) })
		})
	);
	const view = mount();
	// The place panel, and the map pin when Leaflet is up, both show it as text.
	await vi.waitFor(() => expect(view.getAllByText(label).length).toBeGreaterThan(0));
	expect(view.container.querySelector('img[onerror]')).toBeNull();
});
