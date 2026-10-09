// routes/pay/done/done.ts — What /pay/done does with the store's return, kept
// out of the page so it can be tested: read `?order=` / `?cancelled=1` with
// readReturn (a malformed id reads as none), then post {type:'paid-check',
// order} on BroadcastChannel('ripple-order') so the chat tab's pay card polls
// the store now. The message is only a nudge; the card trusts the store.

import { readReturn } from '../../live/checkout.js';
import { ORDER_CHANNEL } from '../orders.js';

export type Outcome = 'paid' | 'cancelled' | 'unknown';

type Channel = Pick<BroadcastChannel, 'postMessage' | 'close'>;
const open = (): Channel | null => (typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(ORDER_CHANNEL));

export function announce(search: string, channel: () => Channel | null = open): { outcome: Outcome; order: string | null } {
	const r = readReturn(search);
	const order = r?.order ?? null;
	if (order) {
		try {
			const ch = channel();
			ch?.postMessage({ type: 'paid-check', order });
			ch?.close();
		} catch {
			/* no channel: the card's own poll still finds the payment */
		}
	}
	return { outcome: r?.cancelled ? 'cancelled' : order ? 'paid' : 'unknown', order };
}
