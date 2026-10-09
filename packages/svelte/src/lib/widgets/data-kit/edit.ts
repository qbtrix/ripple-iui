// widgets/data-kit/edit.ts — a widget's own edit of a prop the host also sends
// (a meal swap, a ticked step, a rate slider). A host that re-renders the same
// spec (say on a bound field's change) re-sends the original values for every
// other prop; an Edit survives that re-send and gives way only to a genuinely
// new value. A new value that happens to equal the original is
// indistinguishable from a re-send, so the edit holds.

/** A widget-side edit of a prop: the edited value and the value it was made from. */
export interface Edit<T> {
	from: string;
	value: T;
}

const sig = (v: unknown): string => {
	try {
		return JSON.stringify(v) ?? '';
	} catch {
		return '';
	}
};

/**
 * Whether the edit still stands: `incoming` is the edit itself (assigned
 * locally, or echoed by a bound parent) or the value the edit was made from
 * (a host re-rendering the same spec re-sends the original). Anything else
 * is new data, and the edit gives way.
 */
export function holds<T>(edit: Edit<T> | null, incoming: unknown): edit is Edit<T> {
	return edit !== null && (incoming === edit.value || sig(incoming) === edit.from);
}

/** The next edit; a chain of edits stays anchored to the value the first one was made from. */
export function nextEdit<T>(edit: Edit<T> | null, incoming: unknown, value: T): Edit<T> {
	return { from: holds(edit, incoming) ? edit.from : sig(incoming), value };
}
