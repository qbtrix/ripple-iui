// routes/playground/model.test.ts — The playground's pure pieces: versions, tail follow, shortcuts, share links.
// Versions run against a real ChatSession fed recorded exchanges, so the
// model is tested on the cards the chat actually makes.

import { describe, expect, test } from 'vitest';
import { ChatSession } from '../pawbar/session.svelte.js';
import { recordedEvents, recordedExchange } from '../pawbar/recorded.js';
import { scenarios } from '../live/scenarios.js';
import { countNodes, currentVersion, pickVersion, versionsOf } from '$lib/site/playground/versions.svelte.js';
import { atBottom, Tail } from '$lib/site/playground/tail.svelte.js';
import { shortcut } from '$lib/site/playground/keys.js';
import { shareLink } from '$lib/site/playground/share.js';
import { specFromUrl, SPEC_URL_MAX } from '$lib/site/specFromUrl.js';

const bill = scenarios.find((s) => s.id === 'bill-splitter')!;
const savings = scenarios.find((s) => s.id === 'savings-calculator')!;

describe('versions', () => {
	test('every card is a version; nothing selected follows the newest', () => {
		const session = new ChatSession(() => recordedEvents(bill, { speed: Infinity }));
		session.seed(bill.fixture.prompt, recordedExchange(bill, 'intro'));
		session.seed(savings.fixture.prompt, recordedExchange(savings, 'intro'));
		const list = versionsOf(session.turns);
		expect(list.map((v) => v.title)).toEqual([bill.title, savings.title]);
		expect(pickVersion(list, null)?.title).toBe(savings.title);
		expect(pickVersion(list, list[0].id)?.title).toBe(bill.title);
		expect(pickVersion(list, 'gone')?.title).toBe(savings.title);
		expect(pickVersion([], null)).toBeNull();
	});

	test('a picked older chip stays shown while a newer card streams; a cleared pick snaps to it', async () => {
		let release!: () => void;
		const gate = new Promise<void>((r) => (release = r));
		const session = new ChatSession(async function* (message, signal) {
			for await (const frame of recordedEvents(savings, { speed: Infinity, signal })) {
				if (frame.event === 'card.final') await gate;
				yield frame;
			}
		});
		session.seed(bill.fixture.prompt, recordedExchange(bill, 'intro'));
		const older = versionsOf(session.turns)[0].id;
		const done = session.send('savings');
		await new Promise((r) => setTimeout(r, 20));
		const list = versionsOf(session.turns);
		expect(list.at(-1)?.status).toBe('streaming');
		expect(pickVersion(list, older)?.id).toBe(older);
		expect(pickVersion(list, null)?.status).toBe('streaming');
		release();
		await done;
		expect(pickVersion(versionsOf(session.turns), null)?.status).toBe('final');
	});

	test('a pick holds until a card arrives after it, which takes the panes', () => {
		const list = [{ id: 'a' }, { id: 'b' }];
		const pick = { id: 'a', count: 2 };
		expect(currentVersion(list, pick)?.id).toBe('a');
		expect(currentVersion([...list, { id: 'c' }], pick)?.id).toBe('c');
		expect(currentVersion(list, null)?.id).toBe('b');
	});

	test('countNodes walks children and else_children', () => {
		expect(countNodes({ type: 'flex', children: [{ type: 'text' }, { type: 'if', children: [{ type: 'a' }], else_children: [{ type: 'b' }] }] })).toBe(5);
		expect(countNodes(null)).toBe(0);
	});
});

describe('Tail', () => {
	const pane = (scrollHeight: number, clientHeight = 100) => ({ scrollTop: 0, scrollHeight, clientHeight });

	test('sticks to the bottom while following', () => {
		const tail = new Tail();
		const el = pane(500);
		tail.stick(el);
		expect(el.scrollTop).toBe(500);
	});

	test('growth between our scroll and its event does not unfollow', () => {
		const tail = new Tail();
		const el = pane(500);
		tail.stick(el); // the browser clamps this to 400
		el.scrollTop = 400;
		tail.stick(el);
		el.scrollHeight = 900; // more lines landed before the scroll event
		expect(atBottom(el)).toBe(false);
		tail.onScroll(el);
		expect(tail.following).toBe(true);
	});

	test('a scroll up unfollows, stops sticking, and resume or a scroll to the end follows again', () => {
		const tail = new Tail();
		const el = pane(500);
		el.scrollTop = 400;
		tail.stick(el);
		el.scrollTop = 400;
		el.scrollTop = 200;
		tail.onScroll(el);
		expect(tail.following).toBe(false);
		el.scrollHeight = 900;
		tail.stick(el);
		expect(el.scrollTop).toBe(200);
		el.scrollTop = 800;
		tail.onScroll(el);
		expect(tail.following).toBe(true);
		el.scrollTop = 100;
		tail.onScroll(el);
		tail.resume(el);
		expect(tail.following).toBe(true);
		expect(el.scrollTop).toBe(900);
	});
});

describe('shortcut', () => {
	const div = { tagName: 'DIV' } as unknown as EventTarget;
	const area = { tagName: 'TEXTAREA' } as unknown as EventTarget;
	const key = (k: string, o: Partial<KeyboardEvent> & { target?: EventTarget } = {}) =>
		shortcut({ key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, defaultPrevented: false, isComposing: false, target: div, ...o });

	test('maps the four shortcuts', () => {
		expect(key('Escape')).toBe('stop');
		expect(key('/')).toBe('focus');
		expect(key('b', { ctrlKey: true })).toBe('chat');
		expect(key('B', { metaKey: true })).toBe('chat');
		expect(key('j', { ctrlKey: true })).toBe('json');
	});

	test('leaves typing, handled keys and docs search alone', () => {
		expect(key('/', { target: area })).toBeNull();
		expect(key('Escape', { defaultPrevented: true })).toBeNull();
		expect(key('k', { ctrlKey: true })).toBeNull();
		expect(key('k', { metaKey: true })).toBeNull();
		expect(key('b')).toBeNull();
		expect(key('j', { ctrlKey: true, shiftKey: true })).toBeNull();
	});
});

describe('shareLink', () => {
	test('round-trips through specFromUrl, unicode included', () => {
		const spec = { version: '1.0', ui: { type: 'text', props: { text: 'Café, 5 €' } } };
		const link = shareLink(spec, 'https://ripple.pocketpaw.xyz/playground?x=1#top')!;
		expect(link.startsWith('https://ripple.pocketpaw.xyz/playground?s=')).toBe(true);
		const back = specFromUrl(new URL(link).search);
		expect(back && 'text' in back && JSON.parse(back.text)).toEqual(spec);
	});

	test('refuses a spec specFromUrl would refuse for size', () => {
		expect(shareLink({ ui: { type: 'text', props: { text: 'x'.repeat(SPEC_URL_MAX) } } }, 'https://x.test/')).toBeNull();
	});
});
