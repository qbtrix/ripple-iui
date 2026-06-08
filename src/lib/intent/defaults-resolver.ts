/**
 * @file defaults-resolver.ts
 * @description Genesis V3 Layer 2 (smart auto-fill), ported RIPPLE-NATIVE and
 * PURE. Given a list of form fields + an INJECTED DefaultsContext, resolves a
 * default value per empty field by the genesis priority chain:
 *   profile match → preferences → recent history → time-based → domain → common.
 * @created 2026-06-08
 *
 * LOCKED DECISIONS honoured:
 *   1. PURE renderer — this module NEVER fetches a user profile or calls a
 *      service. The DefaultsContext is INJECTED by the host (paw-enterprise
 *      passes user/time/domain via the spec or the 'ui-defaults-context' Svelte
 *      context). createTimeContext() MAY read the browser `Date` because this is
 *      ripple runtime in the browser — the no-Date rule is only for workflow
 *      scripts, not ripple.
 *   2. Additive + backward-compatible — `resolveDefaults` only fills EMPTIES; a
 *      field's explicit `default` always wins, and user input is never
 *      overridden (FormSection seeds from these only when a value is absent).
 *      With NO DefaultsContext it is a graceful no-op (returns {} / the field's
 *      own default), so the existing raw-ui flow is unaffected.
 *
 * Genesis reference: ocean-flow/src/lib/ui-renderer/intent/core/defaults-resolver.ts.
 * Ported off genesis IntentSpec/FormField onto ripple's local, structural field
 * descriptor so this module has no schema dependency and stays pure.
 */

// =============================================================================
// Types — ripple-local, structural (no genesis IntentSpec import)
// =============================================================================

/** Field types the resolver recognises (superset is fine; unknowns no-op). */
export type DefaultsFieldType =
	| 'text'
	| 'email'
	| 'tel'
	| 'url'
	| 'password'
	| 'number'
	| 'date'
	| 'time'
	| 'textarea'
	| 'select'
	| 'radio'
	| 'checkbox'
	| (string & {});

/**
 * The minimal field shape the resolver reads. Structural on purpose: any object
 * with an `id` (and optionally `type` / `default`) works, so FormLayout's
 * `FormFieldLike`, FormSection's `FormField`, and a genesis FormField all fit.
 */
export interface DefaultsField {
	id: string;
	type?: DefaultsFieldType;
	/** An explicit default authored on the field — always wins over a resolved one. */
	default?: unknown;
}

/** User context for smart defaults resolution (INJECTED by the host). */
export interface UserContext {
	/** User preferences from profile / storage. */
	preferences?: Record<string, unknown>;
	/** Recent selections/interactions for predictive defaults. */
	history?: Array<{ type: string; value: unknown; timestamp: string }>;
	/** User profile data. */
	profile?: {
		name?: string;
		email?: string;
		phone?: string;
		address?: string;
	};
}

/** Time context for time-aware defaults (INJECTED, or built via createTimeContext). */
export interface TimeContext {
	now: Date;
	dayOfWeek: string;
	isWeekend: boolean;
	timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
	season: 'spring' | 'summer' | 'fall' | 'winter';
}

/** Domain context for domain-specific defaults (INJECTED by the host). */
export interface DomainContext {
	/** Current domain (food, travel, booking, ecommerce, fitness, …). */
	domain?: string;
	/** Previous selections in this flow. */
	flowSelections?: Record<string, unknown>;
}

/** Full context for smart defaults resolution. All keys optional → graceful no-op. */
export interface DefaultsContext {
	user?: UserContext;
	time?: TimeContext;
	domain?: DomainContext;
}

// =============================================================================
// Context construction (browser Date is allowed here — ripple runtime)
// =============================================================================

/**
 * Build a TimeContext from a clock. PURE w.r.t. inputs: pass `now` for
 * deterministic tests; defaults to the browser `Date` at runtime.
 */
export function createTimeContext(now: Date = new Date()): TimeContext {
	const hour = now.getHours();
	const month = now.getMonth();

	// Season (Northern hemisphere).
	let season: TimeContext['season'];
	if (month >= 2 && month <= 4) season = 'spring';
	else if (month >= 5 && month <= 7) season = 'summer';
	else if (month >= 8 && month <= 10) season = 'fall';
	else season = 'winter';

	// Time of day.
	let timeOfDay: TimeContext['timeOfDay'];
	if (hour < 6) timeOfDay = 'night';
	else if (hour < 12) timeOfDay = 'morning';
	else if (hour < 17) timeOfDay = 'afternoon';
	else if (hour < 21) timeOfDay = 'evening';
	else timeOfDay = 'night';

	return {
		now,
		dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
		isWeekend: [0, 6].includes(now.getDay()),
		timeOfDay,
		season
	};
}

/**
 * Assemble a DefaultsContext from the pieces a host injects. A convenience for
 * the host; the resolver itself accepts any DefaultsContext. If `time` is
 * omitted it is built from the browser clock (ripple runtime — Date is fine).
 */
export function createDefaultsContext(opts: {
	user?: UserContext;
	domain?: string | DomainContext;
	time?: TimeContext;
	now?: Date;
} = {}): DefaultsContext {
	const domain =
		typeof opts.domain === 'string' ? { domain: opts.domain } : opts.domain;
	return {
		user: opts.user,
		time: opts.time ?? createTimeContext(opts.now),
		domain
	};
}

// =============================================================================
// Resolution — the genesis priority chain
// =============================================================================

/**
 * Resolve smart defaults for a list of fields. Returns a values map keyed by
 * field id, holding ONLY entries the resolver could fill (the field had no
 * explicit `default` and the context produced a value). EMPTIES-ONLY by design:
 * a field with an explicit `default` is skipped here (its own default wins in
 * FormSection.valueOf). With no context → {} (graceful no-op).
 *
 * @param fields the form fields (anything with an `id`).
 * @param context the INJECTED defaults context (host-provided). Optional.
 */
export function resolveDefaults(
	fields: DefaultsField[] | undefined,
	context?: DefaultsContext
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	if (!fields || fields.length === 0) return out;
	if (!context) return out; // no-op without a context — never breaks the flow.

	for (const field of fields) {
		// A field's explicit default wins — leave it to FormSection, skip here.
		if (field.default !== undefined) continue;
		const value = getSmartDefault(field, context);
		if (value !== undefined) out[field.id] = value;
	}
	return out;
}

/**
 * Get the smart default for ONE field, by the genesis priority chain. Returns
 * `undefined` when nothing applies (the field stays empty).
 */
export function getSmartDefault(
	field: DefaultsField,
	context: DefaultsContext
): unknown {
	const { id } = field;
	const type = field.type ?? 'text';

	// 1. User profile (exact-ish matches).
	if (context.user?.profile) {
		const profileValue = getProfileValue(id, context.user.profile);
		if (profileValue !== undefined) return profileValue;
	}

	// 2. User preferences (keyed by field id).
	if (context.user?.preferences && id in context.user.preferences) {
		return context.user.preferences[id];
	}

	// 3. Recent history (most recent matching entry).
	const historyDefault = getHistoryDefault(id, context.user?.history);
	if (historyDefault !== undefined) return historyDefault;

	// 4. Time-based (date / time fields).
	if (type === 'date' || id.includes('date')) {
		return suggestDate(id, context);
	}
	if (type === 'time' || id.includes('time')) {
		return suggestTime(id, context);
	}

	// 5. Domain-specific.
	if (context.domain?.domain) {
		const domainDefault = getDomainDefault(id, context);
		if (domainDefault !== undefined) return domainDefault;
	}

	// 6. Common field patterns.
	return getCommonDefault(id, type, context);
}

// =============================================================================
// Priority-chain helpers (pure)
// =============================================================================

function getProfileValue(
	id: string,
	profile: NonNullable<UserContext['profile']>
): unknown {
	const idLower = id.toLowerCase();
	if (idLower === 'name' || idLower === 'fullname' || idLower === 'full_name') {
		return profile.name;
	}
	if (idLower === 'email' || idLower === 'email_address') {
		return profile.email;
	}
	if (idLower === 'phone' || idLower === 'phone_number' || idLower === 'tel') {
		return profile.phone;
	}
	if (idLower === 'address' || idLower === 'shipping_address') {
		return profile.address;
	}
	return undefined;
}

function getHistoryDefault(
	id: string,
	history?: UserContext['history']
): unknown {
	if (!history || history.length === 0) return undefined;
	const recent = history
		.filter((h) => h.type === id)
		.sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		)[0];
	return recent?.value;
}

function suggestDate(id: string, context: DefaultsContext): string {
	const now = context.time?.now ?? new Date();
	const idLower = id.toLowerCase();
	const formatDate = (date: Date) => date.toISOString().split('T')[0];

	// End-of-range dates → tomorrow.
	if (
		idLower.includes('checkout') ||
		idLower.includes('end') ||
		idLower.includes('return')
	) {
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);
		return formatDate(tomorrow);
	}

	// Travel dates on a weekday → next Friday.
	if (context.domain?.domain === 'travel' && context.time?.isWeekend === false) {
		const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
		const nextFriday = new Date(now);
		nextFriday.setDate(nextFriday.getDate() + daysUntilFriday);
		return formatDate(nextFriday);
	}

	return formatDate(now);
}

function suggestTime(id: string, context: DefaultsContext): string {
	if (!context.time) return '19:00';
	const hour = context.time.now.getHours();
	const idLower = id.toLowerCase();

	if (context.domain?.domain === 'food' || context.domain?.domain === 'booking') {
		if (context.time.timeOfDay === 'morning') {
			return idLower.includes('lunch') ? '12:00' : '19:00';
		}
		if (context.time.timeOfDay === 'afternoon') return '19:00';
		return hour < 20 ? `${Math.max(hour + 1, 18)}:00` : '19:00';
	}

	if (idLower.includes('departure') || idLower.includes('flight')) {
		return context.time.timeOfDay === 'morning' ? '08:00' : '14:00';
	}

	if (hour < 12) return '12:00';
	if (hour < 17) return '17:00';
	return `${Math.min(hour + 1, 23)}:00`;
}

function getDomainDefault(id: string, context: DefaultsContext): unknown {
	const domain = context.domain?.domain;
	const idLower = id.toLowerCase();

	switch (domain) {
		case 'food':
			if (idLower === 'party_size' || idLower === 'guests') return 2;
			if (idLower === 'cuisine') return 'Any';
			break;
		case 'travel':
			if (idLower === 'passengers' || idLower === 'travelers') return 1;
			if (idLower === 'class' || idLower === 'cabin') return 'economy';
			if (idLower === 'rooms') return 1;
			break;
		case 'booking':
			if (idLower === 'duration' || idLower === 'length') return 60;
			break;
		case 'ecommerce':
			if (idLower === 'quantity') return 1;
			break;
		case 'fitness':
			if (idLower === 'duration') return 30;
			if (idLower === 'sets') return 3;
			if (idLower === 'reps') return 10;
			break;
	}
	return undefined;
}

function getCommonDefault(
	id: string,
	type: DefaultsFieldType,
	context: DefaultsContext
): unknown {
	const idLower = id.toLowerCase();

	if (idLower === 'quantity' || idLower === 'qty' || idLower === 'count') {
		return 1;
	}
	if (idLower === 'party_size' || idLower === 'guests' || idLower === 'people') {
		return context.user?.preferences?.party_size ?? 2;
	}
	if (idLower === 'rating' || idLower === 'stars') {
		return 5;
	}
	if (type === 'checkbox') {
		if (idLower === 'notifications' || idLower === 'remember_me') return true;
		return false;
	}
	// Select fields with options — don't guess.
	if (type === 'select') return undefined;

	return undefined;
}

/**
 * All defaults for a field list INCLUDING each field's own explicit `default`
 * (field.default wins). Useful when the host wants the full seeded value map up
 * front. `resolveDefaults` is the empties-only sibling FormSection uses.
 */
export function getAllDefaults(
	fields: DefaultsField[] | undefined,
	context?: DefaultsContext
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	if (!fields) return out;
	for (const field of fields) {
		const value =
			field.default ?? (context ? getSmartDefault(field, context) : undefined);
		if (value !== undefined) out[field.id] = value;
	}
	return out;
}
