// lib/site/playground/share.ts — Builds the `?s=` link specFromUrl reads back.
// The spec is minified, UTF-8 encoded and base64url'd. Null when the encoded
// value is over SPEC_URL_MAX, the cap specFromUrl enforces on the way in.

import { SPEC_URL_MAX } from '../specFromUrl.js';

export function toBase64Url(text: string): string {
	let bin = '';
	for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function shareLink(spec: unknown, base: string): string | null {
	const packed = toBase64Url(JSON.stringify(spec));
	if (packed.length > SPEC_URL_MAX) return null;
	const url = new URL(base);
	url.search = `?s=${packed}`;
	url.hash = '';
	return url.href;
}
