// widgets/data-kit/pair.ts — the pairing rule that kills the empty half
// (design doc 2026-10-09 §2.7). At 720px+ two CONSECUTIVE half-eligible
// sections share a row; a half-eligible section with no eligible neighbour,
// and every other section, spans the full width. The widget decides
// eligibility: list, kv and short stats with content and at most
// MAX_HALF_ROWS rows; tables and timelines never. SectionGrid applies it.

export type Span = 'half' | 'full';

export const MAX_HALF_ROWS = 6;

export function pairSpans<T>(sections: readonly T[], half: (s: T) => boolean): Span[] {
	const out: Span[] = [];
	for (let i = 0; i < sections.length; i++) {
		if (i + 1 < sections.length && half(sections[i]) && half(sections[i + 1])) {
			out.push('half', 'half');
			i++;
		} else out.push('full');
	}
	return out;
}
