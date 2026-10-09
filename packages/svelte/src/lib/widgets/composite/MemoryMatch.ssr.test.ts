// widgets/composite/MemoryMatch.ssr.test.ts — memory-match renders through
// svelte/server (the showcase is prerendered): every card face down and named,
// the stats row, and a deal identical to the one the client will make.
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import MemoryMatch from './MemoryMatch.svelte';
import { shuffled } from './FlashcardDeck.svelte';

const pairs = [
	{ id: 'dog', a: 'perro', b: '🐶' },
	{ id: 'cat', a: 'gato', b: '🐱' },
	{ id: 'horse', a: 'caballo', b: '🐴' },
	{ id: 'bird', a: 'pájaro', b: '🐦' },
	{ id: 'fish', a: 'pez', b: 'icon:fish' },
	{ id: 'cow', a: 'vaca', b: '🐮' }
];

describe('memory-match SSR', () => {
	it('renders 12 named face-down cards, the title and the stats', () => {
		const { body } = render(MemoryMatch, { props: { title: 'Spanish animals', pairs } });
		expect(body).toContain('Spanish animals');
		expect(body.match(/aria-label="Card \d+, face down"/g)).toHaveLength(12);
		expect(body).toContain('Card 12, face down');
		expect(body).toContain('Moves');
		expect(body).toContain('0 / 6');
		expect(body).toMatch(/<svg[^>]*mm-icon/);
	});

	it('deals the order the client will', () => {
		const sig = JSON.stringify(pairs.map((p) => [p.id, p.a, p.b.replace('icon:', '')]));
		const faces = pairs.flatMap((p) => [p.a, p.b]);
		const first = faces[shuffled(faces.map((_, i) => i), `0|${sig}`)[0]];
		const { body } = render(MemoryMatch, { props: { pairs } });
		const firstCard = body.slice(body.indexOf('data-pos="0"'), body.indexOf('data-pos="1"'));
		expect(firstCard).toContain(first.startsWith('icon:') ? 'mm-icon' : first);
	});
});
