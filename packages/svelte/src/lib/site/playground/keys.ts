// lib/site/playground/keys.ts — The playground's keyboard shortcuts, as a pure mapping.
// Esc stops a stream (unless something already handled it: an open dialog
// closes first), `/` focuses the composer unless the visitor is typing,
// Ctrl/Cmd+B hides the chat, Ctrl/Cmd+J toggles the JSON pane. Ctrl/Cmd+K is
// the site's docs search and is deliberately not taken.

export type Shortcut = 'stop' | 'focus' | 'chat' | 'json';

type KeyLike = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'defaultPrevented' | 'isComposing'> & {
	target: EventTarget | null;
};

const typing = (t: EventTarget | null) => {
	const el = t as { tagName?: string; isContentEditable?: boolean } | null;
	return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || !!el.isContentEditable);
};

export function shortcut(e: KeyLike): Shortcut | null {
	if (e.defaultPrevented || e.isComposing) return null;
	const mod = e.ctrlKey || e.metaKey;
	if (e.key === 'Escape' && !mod) return 'stop';
	if (e.key === '/' && !mod && !e.altKey && !typing(e.target)) return 'focus';
	if (mod && !e.altKey && !e.shiftKey) {
		const k = e.key.toLowerCase();
		if (k === 'b') return 'chat';
		if (k === 'j') return 'json';
	}
	return null;
}
