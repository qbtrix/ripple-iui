// @file ui/host-variants.test.ts
// @description NEW (2026-09-18). Guards against a class that only works inside
//   this repo. styles.css declares Tailwind `@custom-variant` shorthands —
//   data-open, data-checked, data-horizontal and friends — but a consumer
//   imports `@ripple-ui/svelte/theme.css`, not styles.css, so those
//   registrations never reach its build. Tailwind then compiles
//   `group-data-horizontal/tabs:h-8` against a literal `[data-horizontal]`
//   attribute, which bits-ui never writes (it writes data-orientation), and the
//   rule is dead in the consumer with no error and a green build.
//
//   #122 fixed the overlay animations this way once (data-open: → the arbitrary
//   data-[state=open]: form). tabs-list.svelte kept the shorthand and carried
//   the tab strip's ONLY height in it, so paw-enterprise's tab lists had no
//   height at all — found while paw-enterprise deleted its local atom copies.
//
//   Packaged components therefore write the arbitrary form, which needs no
//   host registration. The shorthands stay legal in this repo's own routes and
//   demos, which do load styles.css; only what we ship is scanned.
import { test, expect } from 'vitest';

const PACKAGED = import.meta.glob(['../components/ui/**/*.svelte', '../widgets/**/*.svelte'], {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

/** The shorthands styles.css registers, and which this package must not ship. */
const SHORTHANDS = [
	'data-checked',
	'data-unchecked',
	'data-active',
	'data-inactive',
	'data-open',
	'data-closed',
	'data-vertical',
	'data-horizontal'
];

// A variant use is the name followed by `:` (data-open:flex) or by a group
// suffix (group-data-horizontal/tabs:h-8). `data-[state=open]:` never matches,
// and neither does a plain attribute in markup (data-open="true"), which is
// why the colon or slash is required.
const USE = new RegExp(`(?:group-|peer-)?(${SHORTHANDS.join('|')})(?=[:/])`, 'g');

test('packaged components use the arbitrary data-[…] variant, never a styles.css shorthand', () => {
	const offenders: string[] = [];

	for (const [path, source] of Object.entries(PACKAGED)) {
		const hits = [...source.matchAll(USE)].map((m) => m[0]);
		if (hits.length > 0) {
			offenders.push(`${path}: ${[...new Set(hits)].join(', ')}`);
		}
	}

	expect(
		offenders,
		'These classes resolve here and die in a consumer. Write the arbitrary form ' +
			'instead, e.g. group-data-[orientation=horizontal]/tabs:h-8 or ' +
			'data-[state=open]:animate-in.'
	).toEqual([]);
});
