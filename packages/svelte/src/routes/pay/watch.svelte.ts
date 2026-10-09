// routes/pay/watch.svelte.ts — One order's polling, behind the pay and tracking
// cards. start() polls GET /api/orders/<id> at once and then every POLL_MS while
// the order is pending; when the store says `paid` it switches to GET .../track
// every POLL_MS. A `{type:'paid-check', order}` message on
// BroadcastChannel('ripple-order') for this id (from /pay/done) only triggers
// an immediate order poll: its content is never trusted. Polling stops on
// cancelled, delivered or picked-up, after MAX_MS, or on stop() (the card is
// gone). A failed or malformed poll backs off (POLL_MS doubling, capped at
// BACKOFF_MAX_MS) and keeps the last good values. One request in flight; a ping
// that lands during one polls again right after it.

import { fetchOrder, fetchTracking, ORDER_CHANNEL, TRACK_DONE, type Order, type Tracking } from './orders.js';

export const POLL_MS = 3000;
export const BACKOFF_MAX_MS = 30_000;
export const MAX_MS = 15 * 60_000;

export type Phase = 'pending' | 'cancelled' | 'tracking' | 'done' | 'expired';

export interface WatchDeps {
	storeUrl: string;
	fetch?: typeof fetch;
	now?: () => number;
	/** The channel /pay/done posts on; null where BroadcastChannel is missing. */
	channel?: () => Pick<BroadcastChannel, 'addEventListener' | 'close'> | null;
}

const openChannel = () => (typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(ORDER_CHANNEL));

export class OrderWatch {
	phase = $state<Phase>('pending');
	order = $state.raw<Order | null>(null);
	tracking = $state.raw<Tracking | null>(null);
	/** The last poll failed: the card may say it is retrying. */
	trouble = $state(false);
	#timer: ReturnType<typeof setTimeout> | undefined;
	#channel: Pick<BroadcastChannel, 'addEventListener' | 'close'> | null = null;
	#errors = 0;
	#busy = false;
	#again = false;
	#stopped = false;
	#started = 0;

	constructor(
		readonly id: string,
		private readonly deps: WatchDeps
	) {}

	get #now() {
		return (this.deps.now ?? Date.now)();
	}

	start() {
		this.#started = this.#now;
		this.#channel = (this.deps.channel ?? openChannel)();
		this.#channel?.addEventListener('message', (e) => this.ping(e.data));
		void this.#poll();
	}

	stop() {
		this.#stopped = true;
		clearTimeout(this.#timer);
		this.#channel?.close();
		this.#channel = null;
	}

	/** A message from /pay/done: if it names this order while pending, poll now. Nothing else. */
	ping(data: unknown) {
		const d = data as { type?: unknown; order?: unknown } | null;
		if (this.#stopped || this.phase !== 'pending' || d?.type !== 'paid-check' || d.order !== this.id) return;
		if (this.#busy) {
			this.#again = true;
			return;
		}
		clearTimeout(this.#timer);
		void this.#poll();
	}

	async #poll() {
		if (this.#stopped) return;
		if (this.#now - this.#started > MAX_MS) {
			this.phase = 'expired';
			return this.stop();
		}
		this.#busy = true;
		let ok = false;
		try {
			if (this.phase === 'pending') {
				const r = await fetchOrder(this.deps.storeUrl, this.id, this.deps.fetch);
				if ((ok = r.ok)) {
					this.order = r.value;
					if (r.value.status === 'cancelled') this.phase = 'cancelled';
					else if (r.value.status === 'paid') {
						this.phase = 'tracking';
						this.#again = true;
					}
				}
			} else if (this.phase === 'tracking') {
				const r = await fetchTracking(this.deps.storeUrl, this.id, this.deps.fetch);
				if ((ok = r.ok)) {
					this.tracking = r.value;
					if (TRACK_DONE.includes(r.value.status)) this.phase = 'done';
				}
			}
		} finally {
			this.#busy = false;
		}
		this.trouble = !ok;
		this.#errors = ok ? 0 : this.#errors + 1;
		if (this.phase === 'cancelled' || this.phase === 'done') return this.stop();
		if (this.#stopped) return;
		const delay = this.#again && ok ? 0 : this.#errors ? Math.min(POLL_MS * 2 ** this.#errors, BACKOFF_MAX_MS) : POLL_MS;
		this.#again = false;
		this.#timer = setTimeout(() => void this.#poll(), delay);
	}
}
