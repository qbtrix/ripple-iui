// scripts/record-scenario.ts — Record a real model stream as a /live replay fixture.
//
//   bun scripts/record-scenario.ts --id bill-splitter --title "Split the bill" \
//     --prompt "Dinner for 4 came to ..." [--model sonnet] [--store <base-url>] //     [--widgets approval-gate,tool-call] [--context scripts/scenario-context/<id>.md]
//
// --store (store-backed scenarios such as order-burger) fetches the test
// store's real menu from <base-url>/api/menu and appends a STORE section to
// the system prompt: the menu's ids and prices plus the checkout contract the
// /live host understands (routes/live/checkout.ts). Other scenarios are
// recorded with the base prompt unchanged.
//
// Runs the local Claude Code CLI headless (`claude -p --output-format
// stream-json --include-partial-messages`) from an empty temp dir with no
// tools, no settings and no MCP, so nothing from this repo leaks into the
// recording. Keeps only the assistant's text deltas, timestamps each one in
// ms since the first delta, and clamps any single gap to MAX_GAP_MS.
//
// The fixture is written to src/routes/live/fixtures/<id>.json ONLY when the
// recorded text parses as JSON and every node type is in the widget catalog.
// Dev-time only: the site never calls a model at runtime.
// Fixture shape is a contract (see src/routes/live/scenarios.ts).

import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { validateCatalog } from '../../core/src/core/validate-catalog.ts';

const MAX_GAP_MS = 400;
// Widget categories offered to the model. The full manifest is ~250 KB; these
// cover small interactive tools without the marketing/research/vertical sets.
// --widgets adds named widgets from outside them (approval-gate, invoice-lines)
// for a scenario that needs one, without paying for the whole category.
// --context appends what the model already knows when it draws (an agent's
// tool results, a shop's opening hours) as a SCENARIO CONTEXT section, and the
// fixture keeps that text so the page can show what the model was given.
const CATEGORIES = new Set(['layout', 'display', 'input', 'data', 'control', 'overlay', 'interactive']);

const here = dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
	options: {
		id: { type: 'string' },
		title: { type: 'string' },
		prompt: { type: 'string' },
		model: { type: 'string', default: 'sonnet' },
		store: { type: 'string' },
		widgets: { type: 'string' },
		context: { type: 'string' }
	}
});
if (!args.id || !args.title || !args.prompt || !/^[a-z0-9-]+$/.test(args.id)) {
	console.error('usage: bun scripts/record-scenario.ts --id <kebab-id> --title "<title>" --prompt "<text>" [--model sonnet] [--widgets a,b] [--context <file>]');
	process.exit(2);
}

const context = args.context ? readFileSync(resolve(args.context), 'utf-8').trim() : '';
const manifest = JSON.parse(readFileSync(resolve(here, '../static/manifest.json'), 'utf-8'));
const allTypes: string[] = manifest.widgets.map((w: { type: string }) => w.type);
const extra = new Set((args.widgets ?? '').split(',').map((t) => t.trim()).filter(Boolean));
const missing = [...extra].filter((t) => !allTypes.includes(t));
if (missing.length) {
	console.error(`--widgets: not in the manifest: ${missing.join(', ')}`);
	process.exit(2);
}
const reference = {
	spec: manifest.spec,
	actions: manifest.actions,
	widgets: manifest.widgets
		.filter((w: { category: string; type: string }) => CATEGORIES.has(w.category) || extra.has(w.type))
		.map(({ pocket: _pocket, ...w }: Record<string, unknown>) => w)
};

const SYSTEM = `You generate Ripple specs. Ripple renders a JSON spec into a live, interactive UI while the JSON is still streaming in.

OUTPUT RULES
- Output ONLY a single JSON object. No markdown code fences, no prose before or after it.
- Shape: {"version":"1.0","ui":{...},"state":{...}}. Write "ui" BEFORE "state" so the UI can render as it arrives, and keep the seed "state" small.
- Use only widget types from the manifest below, with their documented props and events. Put two-way binds in the node's top-level "bind" field, e.g. "bind": "{state.tipPercent}". Event handlers go at node level, e.g. "on_click": {...}.
- Build a genuinely interactive tool, not a static mockup: seed state with the user's numbers, bind inputs (number-input, slider, segmented, switch, checkbox) to state, derive every output from state with expressions so it updates live, and wire buttons with actions (set, toggle, push, remove, toast).
- Every quantity the user mentions (amounts, counts, percentages) must be adjustable in the UI, and every derived number must follow from state. Never hardcode a copy of a state value in an expression: write state.people.length, not 4.
- Lists the user can grow or shrink live in state as arrays, render with "each", and change with push / remove actions. Inside "each", bind a row field with a templated path ("bind": "people.{index}.drinks") and remove the row with {"action":"remove","target":"people","value":"{item}"} (remove's "index" only accepts a literal number, so never "index": "{index}").
- Write every node's keys in this order: "type", "props", then "bind" and handlers, then "children", so a widget has its props before it binds.
- One clean card-sized layout (roughly 15 to 35 nodes). Short labels, plain language, no lorem ipsum, no invented brand names.
- Never attach a specific price, rating, opening hours or any other claim to a real named business, venue, attraction or brand. Real public places (parks, temples, neighbourhoods) can appear, but an item that names a real place costs 0, even as "<place> entry"; put any cost on a separate unnamed item ("garden entry", "museum ticket", "airport train", "dinner out") with a round estimate. Placeholders and examples use generic words, never real brands.
- Check every displayed number in the finished state too: a 1-based position or counter never runs past its total (show "20 of 20" when done, not 21).

EXPRESSIONS (verified against the engine; follow exactly)
- A prop that is exactly "{expr}" keeps the value's type. "Text {expr} more" builds a string.
- Supported: state paths (state.a.b, state.list[0].x), arithmetic + - * / % with parentheses, comparisons, ternary a ? b : c, || and ??. Inside "each", the loop item is {item.field} and the index is {index} (or the names given by item_as / index_as).
- When a calculation needs the count or sum of a list, keep that number in state and refresh it with a set action whose value is the method expression: chain it after the push / remove that changes the list, and put it in the on_change of any input that edits a list item, e.g. "on_change": {"action":"set","target":"drinkers","value":"{state.people.where('drinks', true).count()}"}. When an edit feeds several kept numbers (a count AND a total), its on_change is a list that refreshes every one of them. Seed every kept number with exactly what its refresh expression would give for the seeded list: add the list up item by item before writing it.
- For an amount that applies only when a flag is true, multiply by the flag (true counts as 1): item.drinks * state.drinksTotal / state.drinkers.
- Use a ternary only as the whole expression (to pick a label or value), never inside arithmetic.
- For money, compute the raw number and show it with the "stat" widget using "format": "currency" (it formats to 2 decimals), e.g. {"type":"stat","props":{"label":"Each pays","value":"{state.total * (1 + state.tipPercent / 100) / state.people.length}","format":"currency"}}.
- A computed number that can have decimals (any division or rate) is shown with a "stat" (format "number", "currency" or "percent"), never inside a text template, which prints every digit.
- Division by zero yields 0. Keep numeric state as numbers, not strings.
- There is no exponent operator (no ** or ^) and no Math functions. Write compound growth as repeated multiplication starting from a state path, e.g. three years at a yearly rate: state.start * (1 + state.rate / 100) * (1 + state.rate / 100) * (1 + state.rate / 100).
- Chart "data" items resolve expressions, and the chart redraws when they change, so a chart can follow state: {"label":"Jul","value":"{state.jul}"}.

LAYOUT
- The tool must also work in a card about 300px wide (phones). Use grid "columns" of 2 at most. A number-input needs about 140px, so give number inputs and sliders a full-width row or a 2-column grid. A flex row with more than two children sets "wrap": true.

MANIFEST (spec envelope, action grammar, widgets)
${JSON.stringify(reference)}${args.store ? await storeSection(args.store) : ''}${context ? `

SCENARIO CONTEXT (what you already know; it overrides the general rules above where they conflict)
${context}` : ''}`;

// The order demo's contract with the /live host. Keep in step with
// src/routes/live/checkout.ts (the host validates and strips prices).
async function storeSection(base: string): Promise<string> {
	const res = await fetch(`${base.replace(/\/$/, '')}/api/menu`);
	if (!res.ok) throw new Error(`GET ${base}/api/menu answered ${res.status}`);
	const { products } = (await res.json()) as { products: { id: string; name: string; price: string; category: string; available: boolean }[] };
	const menu = products.filter((p) => p.available).map((p) => ({ id: p.id, name: p.name, price: Number(p.price), category: p.category }));
	return `

STORE ORDER CONTEXT (this request orders from a real test store; follow exactly)
- The store's menu, with real ids and prices. Use ids, names and prices verbatim; never invent an item:
${JSON.stringify(menu)}
- Offer every Burgers item plus two Appetizers as sides and two or three Drinks. Keep them in state as "menu": an array of {"id","name","price","category","qty","line"} where price is a number, qty is how many the user wants (seed from the request, else 0) and line = price * qty.
- Each menu row: name, price, and a number-input (min 0, max 20) bound to "menu.{index}.qty". Its "on_change" is a list of three set actions, in order: {"action":"set","target":"menu.{index}.line","value":"{state.menu[index].price * state.menu[index].qty}"}, then "total" to "{state.menu.sum('line')}", then "count" to "{state.menu.sum('qty')}". Seed "total" and "count" in state to match the seeded quantities.
- Order type: a segmented control bound to "orderType" with options valued exactly "pickup" and "delivery"; its on_change sets "fee" to "{state.orderType == 'delivery' ? 3.99 : 0}". Delivery costs 3.99.
- Customer: state "customer": {"name":null,"email":null,"phone":null,"address":null} (null, never "": an empty string anywhere in the stream makes a half-streamed "type" look complete); text inputs bound to customer.name, customer.email, customer.phone, and customer.address shown only when orderType is delivery.
- Cart summary: rows for items with qty above 0 (each over menu with show), then stat widgets with "format":"currency" for the subtotal {state.total}, and the order total {state.total + state.fee}.
- The Checkout button's on_click is a "flow": validate steps (conditions "state.count > 0", "state.customer.name", "state.customer.email", "state.customer.phone", each with a short message), then exactly this api step (the host performs the request; body values must stay top-level "{expr}" strings):
  {"action":"api","url":"/api/checkout","method":"POST","body":{"items":"{state.menu}","customer":"{state.customer}","orderType":"{state.orderType}"},"on_error":[{"action":"toast","message":"{state._flow_error.message}","variant":"error"}]}
- Put the menu rows first so the first input on screen is a quantity. This layout may run to 45 nodes.`;
}

const cwd = mkdtempSync(join(tmpdir(), 'ripple-record-'));
// From a file, not argv: the prompt is past Windows' 32k command-line limit.
const systemFile = join(cwd, 'system.txt');
writeFileSync(systemFile, SYSTEM, 'utf-8');
const cmd = [
	'claude', '-p', args.prompt,
	'--output-format', 'stream-json', '--include-partial-messages', '--verbose',
	'--model', args.model!,
	'--system-prompt-file', systemFile,
	'--tools', '',
	'--setting-sources', 'local',
	'--strict-mcp-config',
	'--disable-slash-commands',
	'--no-session-persistence'
];
console.error(`recording ${args.id} with ${args.model} in ${cwd} (${SYSTEM.length} char system prompt)...`);

const proc = Bun.spawn(cmd, { cwd, stdout: 'pipe', stderr: 'inherit' });
const raw: { at: number; text: string }[] = [];
const decoder = new TextDecoder();
let pending = '';
for await (const bytes of proc.stdout) {
	pending += decoder.decode(bytes, { stream: true });
	let nl: number;
	while ((nl = pending.indexOf('\n')) >= 0) {
		const line = pending.slice(0, nl).trim();
		pending = pending.slice(nl + 1);
		if (!line) continue;
		let msg: { type?: string; event?: { type?: string; delta?: { type?: string; text?: string } } };
		try {
			msg = JSON.parse(line);
		} catch {
			continue;
		}
		const d = msg.type === 'stream_event' && msg.event?.type === 'content_block_delta' ? msg.event.delta : null;
		if (d?.type === 'text_delta' && d.text) raw.push({ at: performance.now(), text: d.text });
	}
}
const exit = await proc.exited;
rmSync(cwd, { recursive: true, force: true });
if (exit !== 0 || raw.length === 0) {
	console.error(`claude exited ${exit} with ${raw.length} text deltas; nothing written.`);
	process.exit(1);
}

// Keep only the JSON object: drop any fence or prose outside the outermost braces.
const full = raw.map((c) => c.text).join('');
const start = full.indexOf('{');
const end = full.lastIndexOf('}') + 1;
if (start < 0 || end <= start) {
	console.error('No JSON object in the output:\n' + full.slice(0, 500));
	process.exit(1);
}
const kept: { at: number; text: string }[] = [];
let offset = 0;
for (const c of raw) {
	const from = Math.max(start - offset, 0);
	const to = Math.min(end - offset, c.text.length);
	if (to > from) kept.push({ at: c.at, text: c.text.slice(from, to) });
	offset += c.text.length;
}

// Re-base on the first kept chunk and clamp long gaps.
const chunks: { t: number; text: string }[] = [];
let t = 0;
for (let i = 0; i < kept.length; i++) {
	if (i > 0) t += Math.min(kept[i].at - kept[i - 1].at, MAX_GAP_MS);
	chunks.push({ t: Math.round(t), text: kept[i].text });
}

const text = chunks.map((c) => c.text).join('');
let spec: unknown;
try {
	spec = JSON.parse(text);
} catch (err) {
	console.error(`Output is not valid JSON (${(err as Error).message}); nothing written.\n` + text.slice(0, 800));
	process.exit(1);
}
const unknown = validateCatalog(spec as never, { widgetTypes: allTypes });
if (unknown.length > 0) {
	console.error('Unknown widget types; nothing written:', unknown);
	process.exit(1);
}

const fixture = {
	id: args.id,
	title: args.title,
	prompt: args.prompt,
	...(context && { context }),
	model: args.model,
	recordedAt: new Date().toISOString(),
	chunks
};
const out = resolve(here, `../src/routes/live/fixtures/${args.id}.json`);
writeFileSync(out, JSON.stringify(fixture, null, 1) + '\n', 'utf-8');
console.error(`wrote ${out}: ${chunks.length} chunks, ${text.length} chars, ${chunks.at(-1)!.t} ms`);
