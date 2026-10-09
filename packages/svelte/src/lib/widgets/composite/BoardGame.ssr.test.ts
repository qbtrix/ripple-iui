// widgets/composite/BoardGame.ssr.test.ts: board-game renders through
// svelte/server (the showcase is prerendered): an empty, named board for both
// games, and no computer move on the server even when the computer goes first.
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import BoardGame from './BoardGame.svelte';

describe('board-game SSR', () => {
	it('renders an empty tic-tac-toe board with named squares and the score', () => {
		const { body } = render(BoardGame, { props: { game: 'tic-tac-toe', best_of: 3 } });
		expect(body.match(/aria-label="Row \d, column \d, empty"/g)).toHaveLength(9);
		expect(body).toContain('Your turn');
		expect(body).toContain('Best of 3');
		expect(body).toContain('Draws');
	});

	it('renders seven empty connect-four columns with the legend', () => {
		const { body } = render(BoardGame, { props: { game: 'connect-four', player: 'yellow' } });
		expect(body.match(/aria-label="Column \d, empty, 6 free"/g)).toHaveLength(7);
		expect(body.match(/data-cell="/g)).toHaveLength(42);
		expect(body).toContain('You, yellow');
	});

	it('never moves on the server when the computer goes first', () => {
		const { body } = render(BoardGame, { props: { game: 'tic-tac-toe', first: 'computer' } });
		expect(body).not.toContain('data-mark=');
		expect(body).toContain('Thinking…');
	});
});
