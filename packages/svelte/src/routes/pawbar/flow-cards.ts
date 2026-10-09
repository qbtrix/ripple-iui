// routes/pawbar/flow-cards.ts — The chat cards scripts/mock-pawbar.ts answers flow asks with.
// Two flow cards in the shape pocketpaw's card_spec.py accepts: the card's `ui`
// is step 1 and carries the flow fields; each step's `ui` is a root node; the
// terminal step's `onComplete` is a plain chat message (no `{`), to which the
// landing appends the visitor's answers (session.svelte.ts flowMessage). Every
// step moves with `emit flow.next` / `flow.submit` from a click, so the steps run
// in the browser with no model call between them. `flowId` comes first in each
// step so a streaming card is detected as a flow early. `laptopAnswerCard` is
// the mock's stand-in for the model's comparison answer (no recording has one), and
// `gearsCard` its answer to the bike gears chip: an animated `illustration` and a
// short text.
// Keep the trigger words of the mock's other routes (step by step, questions,
// book, table, order, burger) out of the onComplete messages.

const pick = (flowId: string, title: string, description: string, verb: 'flow.next' | 'flow.submit', options: [id: string, label: string, icon: string, note: string][]) => ({
	flowId,
	intent: 'select',
	title,
	description,
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '8px' },
		children: options.map(([id, label, icon, note]) => ({
			type: 'button',
			props: { label, icon, description: note, variant: 'outline' },
			on_click: { action: 'emit', target: verb, value: { selection: { id, label } } }
		}))
	}
});

export const tripFlowCard = {
	ui: {
		...pick('trip_style', 'What kind of trip?', 'Pick the one that sounds most like you.', 'flow.next', [
			['relaxed', 'Relaxed', 'sun', 'Slow mornings, beaches and long lunches'],
			['food', 'Food', 'utensils', 'Markets, street food and a few great dinners'],
			['culture', 'Culture', 'landmark', 'Museums, old towns and local history'],
			['outdoors', 'Outdoors', 'mountain', 'Hikes, coastlines and day trips']
		]),
		chain: {
			flowId: 'trip_details',
			title: 'Where, how long, and how much?',
			description: 'Rough numbers are fine.',
			form_fields: [
				{ id: 'city', label: 'City', required: true },
				{ id: 'days', label: 'Days', required: true },
				{ id: 'budget', label: 'Budget', required: true }
			],
			onComplete: { kind: 'chat', message: 'Plan a trip for me with these answers (budget in US dollars).' },
			ui: {
				type: 'flex',
				props: { direction: 'column', gap: '12px' },
				children: [
					{ type: 'input', bind: 'city', props: { label: 'City', placeholder: 'Lisbon' } },
					{ type: 'input', bind: 'days', props: { label: 'How many days?', type: 'number', placeholder: '4' } },
					{ type: 'input', bind: 'budget', props: { label: 'Budget in USD', type: 'number', placeholder: '1500' } },
					{
						type: 'button',
						props: { label: 'Plan my trip' },
						on_click: {
							action: 'emit',
							target: 'flow.submit',
							value: { formData: { city: '{state.city}', days: '{state.days}', budget: '{state.budget}' } }
						}
					}
				]
			}
		}
	}
};

export const laptopFlowCard = {
	ui: {
		...pick('main_use', 'What will you use it for most?', 'One answer is enough.', 'flow.next', [
			['work', 'Work and study', 'briefcase', 'Docs, email, video calls'],
			['creative', 'Creative work', 'palette', 'Photo and video editing, design'],
			['gaming', 'Gaming', 'gamepad-2', 'Recent games at good frame rates'],
			['everyday', 'Everyday browsing', 'globe', 'Web, streaming, a little of everything']
		]),
		chain: {
			...pick('budget', 'What is your budget?', 'In US dollars.', 'flow.next', [
				['low', 'Under $800', 'wallet', 'Good value, fewer extras'],
				['mid', '$800 to $1,500', 'piggy-bank', 'The sweet spot for most people'],
				['high', 'Over $1,500', 'gem', 'The best screen and the most power']
			]),
			chain: {
				...pick('weight_matters', 'Does weight matter?', 'Will you carry it around most days?', 'flow.submit', [
					['yes', 'Yes, I carry it daily', 'feather', 'Light and long battery life first'],
					['no', 'Not really', 'house', 'It mostly stays on a desk']
				]),
				onComplete: { kind: 'chat', message: 'Recommend a laptop for me from these answers.' }
			}
		}
	}
};

/** The comparison the mock answers a laptop follow-up with: three fictional laptops and a winner. */
export const laptopAnswerCard = {
	ui: {
		type: 'comparison-layout',
		props: {
			title: 'Three laptops that fit',
			subtitle: 'Picked from your answers',
			verdict: { text: 'Aero 14 if you carry it daily; Nimbus Pro 15 if you need more power.', status: 'good' },
			currency: 'USD',
			items: [
				{ id: 'aero14', name: 'Aero 14', subtitle: '14 in, 1.2 kg', price: 1199, weight: 1.2, battery: 16, cpu: '10-core', memory: 16 },
				{ id: 'nimbus15', name: 'Nimbus Pro 15', subtitle: '15 in, 1.8 kg', price: 1449, weight: 1.8, battery: 11, cpu: '14-core', memory: 32 },
				{ id: 'tern13', name: 'Tern 13', subtitle: '13 in, 1.1 kg', price: 849, weight: 1.1, battery: 13, cpu: '8-core', memory: 8 }
			],
			features: [
				{ key: 'price', label: 'Price', kind: 'price', better: 'lower', icon: 'price', highlight: true },
				{ key: 'weight', label: 'Weight', kind: 'number', unit: 'kg', better: 'lower', icon: 'weight', highlight: true },
				{ key: 'battery', label: 'Battery', kind: 'number', unit: 'h', better: 'higher', icon: 'battery', highlight: true },
				{ key: 'cpu', label: 'Processor', kind: 'text', icon: 'cpu' },
				{ key: 'memory', label: 'Memory', kind: 'number', unit: 'GB', better: 'higher', icon: 'memory' }
			],
			winner: { id: 'aero14', reason: 'Light, all-day battery and enough power for work.', runner_up: { id: 'nimbus15', reason: 'More power and memory, heavier.' } },
			picks: [
				{ id: 'tern13', label: 'Best value' },
				{ id: 'nimbus15', label: 'Most power' }
			]
		}
	}
};

const gear = (cx: number, r: number, teeth: number, dur: string) => {
	const tooth = ((2 * Math.PI * (r + 4)) / teeth / 2).toFixed(2);
	return (
		`<g><animateTransform attributeName='transform' type='rotate' from='0 ${cx} 70' to='360 ${cx} 70' dur='${dur}' repeatCount='indefinite'/>` +
		`<circle cx='${cx}' cy='70' r='${r + 4}' fill='none' stroke='#475569' stroke-width='8' stroke-dasharray='${tooth} ${tooth}'/>` +
		`<circle cx='${cx}' cy='70' r='${r - 2}' fill='#e2e8f0' stroke='#475569' stroke-width='3'/>` +
		`<line x1='${cx}' y1='${72 - r}' x2='${cx}' y2='${68 + r}' stroke='#475569' stroke-width='4'/>` +
		`<line x1='${cx + 2 - r}' y1='70' x2='${cx + r - 2}' y2='70' stroke='#475569' stroke-width='4'/>` +
		`<circle cx='${cx}' cy='70' r='6' fill='#475569'/></g>`
	);
};

/**
 * The bike gears illustration: a 40-tooth chainring and a 20-tooth cog joined by a
 * chain. Both turn the same way (a chain drive does), the cog twice as fast, and the
 * chain's dashes move at the speed of both rims. Single-quoted attributes, no `{`,
 * no backslash, no url().
 */
export const gearsSvg =
	`<svg viewBox='0 0 260 150' xmlns='http://www.w3.org/2000/svg'><title>A chainring and a rear cog joined by a chain</title>` +
	gear(70, 40, 20, '8s') +
	gear(200, 20, 10, '4s') +
	`<path d='M70 30 L200 50 A20 20 0 0 1 200 90 L70 110 A40 40 0 0 1 70 30 Z' fill='none' stroke='#1877F2' stroke-width='3' stroke-dasharray='6 4'>` +
	`<animate attributeName='stroke-dashoffset' from='0' to='-40' dur='1.27s' repeatCount='indefinite'/></path>` +
	`<text x='70' y='140' font-size='11' text-anchor='middle' fill='#475569'>Chainring, 40 teeth</text>` +
	`<text x='200' y='140' font-size='11' text-anchor='middle' fill='#475569'>Cog, 20 teeth</text></svg>`;

/** The mock's answer to "How bike gears work": the animated gears and a short explanation. */
export const gearsCard = {
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '12px' },
		children: [
			{ type: 'illustration', props: { svg: gearsSvg, title: 'How a bike chain drive turns', caption: 'One pedal turn spins the rear cog twice.', max_height: 240 } },
			{
				type: 'text',
				props: {
					text: 'Your pedals turn the front chainring, and the chain carries that motion to the rear cog on the wheel. With 40 teeth up front and 20 at the back, the cog turns twice for every pedal turn. Shift to a bigger rear cog and pedalling gets easier but each turn covers less ground; a smaller cog is harder to push and takes you further.'
				}
			}
		]
	}
};
