// routes/pawbar/play-cards.ts: Hand-written answers for the landing's newer chips
// (memory match, guess the word, space trivia, tic-tac-toe, connect four, habit
// tracker, focus timer, how a heart pumps),
// so mock mode and the offline chat can answer them with no model. Each card is
// the `{state, ui}` wire shape and must pass card-policy.ts (card-policy.test.ts
// holds them to it). `playScenarios` wraps each card as a Scenario whose fixture
// is the card's JSON cut into small timed chunks, so it streams like a recording;
// `fixture.model` is 'hand-written': /live lists them tagged Hand-written, and
// the landing's "Recorded runs", which promise real model output, leave them out. A chip's prompt equals its
// fixture prompt, so pickScenario's exact match routes it. The games carry no
// `on_complete` ask (card-policy.ts refuses it); a "harder round" button shows
// once the bound game is done and asks from a click instead.

import type { Scenario } from '../live/scenarios.js';

const ask = (text: string) => ({ action: 'emit', target: 'ask', value: { text } });

/** The "harder round" button under a game, shown once `when` is true. */
const again = (when: string, label: string, text: string) => ({
	type: 'button',
	show: when,
	props: { label, variant: 'outline', size: 'sm' },
	on_click: ask(text)
});

export const memoryMatchCard = {
	state: {},
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '12px' },
		children: [
			{
				type: 'memory-match',
				bind: '{state.game}',
				props: {
					title: 'Spanish animals',
					pairs: [
						{ id: 'dog', a: 'perro', b: '🐶' },
						{ id: 'cat', a: 'gato', b: '🐱' },
						{ id: 'horse', a: 'caballo', b: '🐴' },
						{ id: 'bird', a: 'pájaro', b: '🐦' },
						{ id: 'fish', a: 'pez', b: '🐟' },
						{ id: 'cow', a: 'vaca', b: '🐮' },
						{ id: 'rabbit', a: 'conejo', b: '🐰' },
						{ id: 'turtle', a: 'tortuga', b: '🐢' }
					]
				}
			},
			again('{state.game.completed}', 'Play a harder round', 'I matched every Spanish animal. Make me a harder memory match with 12 pairs.')
		]
	}
};

export const wordGuessCard = {
	state: {},
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '12px' },
		children: [
			{
				type: 'word-guess',
				bind: '{state.word}',
				props: { title: 'Space words', answer: 'comet', hint: 'An icy visitor with a glowing tail', max_guesses: 6 }
			},
			again("{state.word.status == 'won' || state.word.status == 'lost'}", 'Another space word', 'Give me another 5-letter space word to guess, a little harder this time.')
		]
	}
};

export const quizCard = {
	state: {},
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '12px' },
		children: [
			{
				type: 'quiz',
				bind: '{state.quiz}',
				props: {
					title: 'Space trivia',
					topic: 'Astronomy',
					questions: [
						{ prompt: 'Which planet has the shortest day?', choices: ['Earth', 'Jupiter', 'Mars', 'Venus'], answer: 1, why: 'Jupiter spins once in just under 10 hours, the fastest of any planet.' },
						{ prompt: 'What is the closest star to Earth?', choices: ['The Sun', 'Proxima Centauri', 'Sirius', 'Polaris'], answer: 0, why: 'The Sun is a star, about 8 light minutes away. Proxima Centauri is next, at about 4.2 light years.' },
						{ prompt: 'Which planet is the hottest?', choices: ['Mercury', 'Mars', 'Venus'], answer: 2, why: 'Venus is farther from the Sun than Mercury, but its thick carbon dioxide air traps heat at about 465 °C.' },
						{ prompt: 'How long does sunlight take to reach Earth?', choices: ['About 8 seconds', 'About 8 minutes', 'About 8 hours'], answer: 1, why: 'Light covers the 150 million km in roughly 8 minutes and 20 seconds.' },
						{ prompt: 'Which is the largest moon in the solar system?', choices: ['Titan', 'Europa', 'Our Moon', 'Ganymede'], answer: 3, why: 'Ganymede, one of Jupiter\'s moons, is even wider than the planet Mercury.' },
						{ prompt: 'What are Saturn\'s rings mostly made of?', choices: ['Rock', 'Ice', 'Gas'], answer: 1, why: 'They are mostly chunks of water ice, from grains of dust to pieces the size of a house.' }
					]
				}
			},
			again('{state.quiz.done}', 'Give me a harder round', 'I finished the space trivia. Give me a harder round of 6 questions.')
		]
	}
};

export const habitCard = {
	state: {},
	ui: {
		type: 'habit-tracker',
		bind: '{state.habits}',
		props: {
			title: 'My week',
			week_start: 'mon',
			weeks: 2,
			habits: [
				{ id: 'read', name: 'Read 20 pages', icon: 'read', target_per_week: 5 },
				{ id: 'run', name: 'Run', icon: 'run', target_per_week: 3 },
				{ id: 'water', name: 'Drink 2L of water', icon: 'water', target_per_week: 7 },
				{ id: 'sleep', name: 'In bed by 11', icon: 'sleep', target_per_week: 6 }
			],
			seed: { read: [1, 2, 4], run: [1, 3], water: [0, 1, 2, 3], sleep: [1, 2, 3, 5] }
		}
	}
};

// The heart, as the viewer faces it: the right side (low-oxygen blood, blue) on
// the left. Blood comes in from the body, drops through the tricuspid valve and
// leaves for the lungs; it comes back from the lungs into the left side, drops
// through the mitral valve and leaves for the body. The heart beats (a scale
// about its centre), the valves open and shut on the same 1.2 s beat, dashes run
// along both routes and dots ride them (animateMotion). Labels are currentColor so
// they read on dark and light. Single-quoted attributes, no `{`, no backslash.
const BEAT = "dur='1.2s' repeatCount='indefinite'";
const BLUE_ROUTE = 'M8 112 L84 112 Q104 112 106 128 L106 166 Q108 190 128 186 Q140 182 141 166 L146 76 Q146 38 116 36 L72 36';
const RED_ROUTE = 'M312 112 L236 112 Q216 112 214 128 L214 168 Q212 194 192 190 Q178 186 177 170 L174 70 Q174 30 204 26 L248 26';

/** A two-leaflet valve at (x, y): flat when shut, swung down when open. */
const valve = (id: string, x: number, y: number) =>
	`<g id='${id}' stroke='#fff4f2' stroke-width='3.5' stroke-linecap='round' fill='none'>` +
	`<path d='M${x - 15} ${y} L${x} ${y}'><animate attributeName='d' values='M${x - 15} ${y} L${x} ${y};M${x - 15} ${y} L${x - 4} ${y + 14};M${x - 15} ${y} L${x} ${y};M${x - 15} ${y} L${x} ${y}' keyTimes='0;0.3;0.6;1' ${BEAT}/></path>` +
	`<path d='M${x + 15} ${y} L${x} ${y}'><animate attributeName='d' values='M${x + 15} ${y} L${x} ${y};M${x + 15} ${y} L${x + 4} ${y + 14};M${x + 15} ${y} L${x} ${y};M${x + 15} ${y} L${x} ${y}' keyTimes='0;0.3;0.6;1' ${BEAT}/></path>` +
	`</g>`;

/** Three dots riding a route, a third of the loop apart. */
const riders = (route: string, fill: string, stroke: string) =>
	['0s', '-1.6s', '-3.2s']
		.map((begin) => `<circle r='4' fill='${fill}' stroke='${stroke}' stroke-width='1'><animateMotion dur='4.8s' begin='${begin}' repeatCount='indefinite'><mpath href='#${route}'/></animateMotion></circle>`)
		.join('');

const flow = (id: string, d: string, color: string) =>
	`<path id='${id}' d='${d}' fill='none' stroke='${color}' stroke-width='2.5' stroke-linecap='round' stroke-dasharray='3 9'>` +
	`<animate attributeName='stroke-dashoffset' from='0' to='-24' ${BEAT}/></path>`;

export const heartSvg =
	`<svg viewBox='0 0 320 284' xmlns='http://www.w3.org/2000/svg'><title>A heart pumping blood through its four chambers</title>` +
	`<defs><radialGradient id='muscle-shade' cx='0.38' cy='0.32' r='0.75'><stop offset='0' stop-color='#e57b84'/><stop offset='1' stop-color='#b63f4b'/></radialGradient></defs>` +
	`<g transform='translate(160 150)'><g>` +
	`<animateTransform attributeName='transform' type='scale' values='1;1.04;0.97;1' keyTimes='0;0.15;0.45;1' ${BEAT}/>` +
	`<g transform='translate(-160 -150)'>` +
	// Muscle, then the four chambers.
	`<path id='muscle' d='M160 250 C100 214 54 172 54 120 C54 84 78 62 108 62 C130 62 150 74 160 90 C170 74 190 62 212 62 C242 62 266 84 266 120 C266 172 220 214 160 250 Z' fill='url(#muscle-shade)' stroke='#8f2a35' stroke-width='2'/>` +
	`<ellipse id='right-atrium' cx='106' cy='112' rx='30' ry='24' fill='#3a5bb0'/>` +
	`<path id='right-ventricle' d='M80 150 Q120 144 150 148 L150 206 Q104 196 80 150 Z' fill='#2c4795'/>` +
	`<ellipse id='left-atrium' cx='214' cy='112' rx='30' ry='24' fill='#a8323f'/>` +
	`<path id='left-ventricle' d='M170 148 Q210 144 240 150 Q220 204 168 228 Z' fill='#8e2433'/>` +
	// Vessels: in from the sides, out of the top.
	`<path d='M8 112 L66 112' stroke='#3d63c7' stroke-width='12' stroke-linecap='round'/>` +
	`<path d='M312 112 L254 112' stroke='#d63a48' stroke-width='12' stroke-linecap='round'/>` +
	`<path id='pulmonary-artery' d='M141 160 L146 76 Q146 38 116 36 L72 36' fill='none' stroke='#3d63c7' stroke-width='12' stroke-linecap='round'/>` +
	`<path id='aorta' d='M177 166 L174 70 Q174 30 204 26 L248 26' fill='none' stroke='#d63a48' stroke-width='14' stroke-linecap='round'/>` +
	valve('tricuspid', 106, 142) +
	valve('mitral', 214, 142) +
	flow('blue-route', BLUE_ROUTE, '#b9cdff') +
	flow('red-route', RED_ROUTE, '#ffc4c9') +
	riders('blue-route', '#8fb4ff', '#1e3a8a') +
	riders('red-route', '#ff8a94', '#7f1d1d') +
	`</g></g></g>` +
	// Labels and the key, outside the beat.
	`<g fill='currentColor' font-family='Inter, sans-serif' font-size='11'>` +
	`<text x='8' y='98'>from body</text><text x='62' y='40' text-anchor='end'>to lungs</text>` +
	`<text x='312' y='98' text-anchor='end'>from lungs</text><text x='258' y='30'>to body</text>` +
	`<circle cx='70' cy='272' r='5' fill='#5b84e8'/><text x='80' y='276'>low in oxygen</text>` +
	`<circle cx='186' cy='272' r='5' fill='#e5505c'/><text x='196' y='276'>rich in oxygen</text>` +
	`</g></svg>`;

export const heartCard = {
	state: {},
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '12px' },
		children: [
			{
				type: 'illustration',
				props: {
					svg: heartSvg,
					title: 'How a heart pumps blood',
					caption: 'Tap a number to read about that part. Blue is blood low in oxygen, red is blood rich in it.',
					max_height: 320,
					annotations: [
						{ id: 'ra', label: 'Right atrium', note: 'Blood that has done its work in the body comes back here, low in oxygen. The atrium fills, then squeezes it down into the ventricle below.', target: 'right-atrium' },
						{ id: 'tricuspid', label: 'Tricuspid valve', note: 'Three thin flaps between the right atrium and right ventricle. They swing open to let blood down and snap shut when the ventricle squeezes, so nothing flows back.', target: 'tricuspid' },
						{ id: 'rv', label: 'Right ventricle', note: 'Pushes blood up the pulmonary artery to the lungs, where it drops off carbon dioxide and picks up oxygen. It only has to reach the lungs, so its wall is thinner.', target: 'right-ventricle' },
						{ id: 'la', label: 'Left atrium', note: 'Fresh, oxygen-rich blood returns from the lungs through the pulmonary veins and collects here before it drops into the left ventricle.', target: 'left-atrium' },
						{ id: 'mitral', label: 'Mitral valve', note: 'Two flaps between the left atrium and left ventricle. Like the tricuspid it opens to fill the ventricle and closes on each beat. Its closing is part of the lub in lub-dub.', target: 'mitral' },
						{ id: 'lv', label: 'Left ventricle', note: 'The strongest chamber, with the thickest wall. Each beat it sends blood up the aorta and out to the whole body, around 70 times a minute at rest.', target: 'left-ventricle' }
					]
				}
			},
			{
				type: 'text',
				props: {
					text: 'Your heart is two pumps side by side. The right side sends tired blood to the lungs to pick up oxygen; the left side sends that fresh blood to the rest of you. Valves between the chambers open and shut on every beat so blood only moves one way.'
				}
			},
			{ type: 'button', props: { label: 'Quiz me on the heart', variant: 'outline', size: 'sm' }, on_click: ask('Quiz me with 5 questions on how the heart pumps blood.') }
		]
	}
};

export const ticTacToeCard = {
	state: {},
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '12px' },
		children: [
			{
				type: 'board-game',
				bind: '{state.ttt}',
				props: { game: 'tic-tac-toe', title: 'Tic-tac-toe', player: 'X', first: 'player', difficulty: 'medium' }
			},
			again("{state.ttt.result == 'player'}", 'Play me on hard', 'I beat you at tic-tac-toe on medium. Play me again on hard.')
		]
	}
};

export const connectFourCard = {
	state: {},
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '12px' },
		children: [
			{
				type: 'board-game',
				bind: '{state.c4}',
				props: { game: 'connect-four', title: 'Connect four, best of 3', player: 'red', first: 'player', difficulty: 'medium', best_of: 3 }
			},
			again('{state.c4.series.player >= 2 || state.c4.series.computer >= 2}', 'Play a harder series', 'That best of 3 is over. Play connect four against me again on hard, best of 5.')
		]
	}
};

export const focusTimerCard = {
	state: {},
	ui: {
		type: 'focus-timer',
		bind: '{state.focus}',
		props: { title: 'Focus session', focus_min: 25, short_break_min: 5, long_break_min: 15, rounds_before_long: 4, goal_rounds: 6 }
	}
};

const CHUNK = 64;
const STEP_MS = 18;

/** A card as a Scenario: its JSON (with the version recordings carry) in small chunks on an even beat. */
function handWritten(id: string, title: string, category: string, group: string, prompt: string, card: object): Scenario {
	const text = JSON.stringify({ version: '1.0', ...card });
	const chunks = Array.from({ length: Math.ceil(text.length / CHUNK) }, (_, i) => ({ t: i * STEP_MS, text: text.slice(i * CHUNK, (i + 1) * CHUNK) }));
	return { id, title, category, group, fixture: { id, title, prompt, model: 'hand-written', recordedAt: '2026-10-10T00:00:00Z', chunks } };
}

export const playScenarios: Scenario[] = [
	handWritten('memory-match', 'Memory match', 'Games', 'Play', 'Make me a memory match game pairing Spanish animal words with their emoji', memoryMatchCard),
	handWritten('word-guess', 'Guess the word', 'Games', 'Play', 'Make me a 5-letter word guessing game about space, with a hint', wordGuessCard),
	handWritten('space-trivia', 'Space trivia', 'Games', 'Play', 'Quiz me with 6 space trivia questions, and explain each answer', quizCard),
	handWritten('tic-tac-toe', 'Tic-tac-toe', 'Games', 'Play', "Let's play tic-tac-toe against you, I'm X, medium difficulty", ticTacToeCard),
	handWritten('connect-four', 'Connect four', 'Games', 'Play', 'Play connect four against me, best of 3', connectFourCard),
	handWritten('habit-tracker', 'Habit tracker', 'Habits', 'Track', 'Track my habits this week: reading, running, water and sleep, each with a weekly target', habitCard),
	handWritten('focus-timer', 'Focus timer', 'Habits', 'Track', 'Make me a pomodoro focus timer: 25 minutes focus, 5 minute breaks, 4 rounds, goal of 6 today', focusTimerCard),
	handWritten('heart', 'How a heart pumps', 'Learning', 'Learn', 'How does the heart pump blood? Draw an animated picture with numbered notes on the chambers and valves.', heartCard)
];
