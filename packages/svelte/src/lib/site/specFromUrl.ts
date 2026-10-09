// lib/site/specFromUrl.ts — Reads a spec the playground was linked with.
// `?spec=<url-encoded JSON>` or `?s=<base64url JSON>` (spec wins if both).
// The encoded value is size-capped BEFORE decoding, the result goes through
// JSON.parse only (never eval) and must be an object with a `ui` or `intent`.
// Returns null when the URL carries neither param, so the caller keeps its
// default; an error string when it carries a bad one, for an inline message.

export const SPEC_URL_MAX = 64 * 1024;

export type SpecFromUrl = { text: string } | { error: string } | null;

function fromBase64Url(value: string): string {
	const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
	const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
	return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function specFromUrl(search: string): SpecFromUrl {
	const params = new URLSearchParams(search);
	const plain = params.get('spec');
	const packed = plain == null ? params.get('s') : null;
	const raw = plain ?? packed;
	if (raw == null) return null;
	if (!raw.trim()) return { error: 'The link has an empty spec.' };
	if (raw.length > SPEC_URL_MAX) return { error: `The linked spec is over ${SPEC_URL_MAX / 1024} KB, so it was not loaded.` };

	let text: string;
	try {
		text = packed != null ? fromBase64Url(packed.trim()) : raw;
	} catch {
		return { error: 'The linked spec is not valid base64url, so it was not loaded.' };
	}
	let spec: unknown;
	try {
		spec = JSON.parse(text);
	} catch (e) {
		return { error: `The linked spec is not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
	}
	if (spec === null || typeof spec !== 'object' || Array.isArray(spec) || !('ui' in spec || 'intent' in spec)) {
		return { error: 'The linked JSON is not a Ripple spec (it needs a "ui" or an "intent").' };
	}
	return { text: JSON.stringify(spec, null, 2) };
}
