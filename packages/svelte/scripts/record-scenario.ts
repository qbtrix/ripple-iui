// scripts/record-scenario.ts — Record a real model stream as a /live replay fixture.
//
//   bun scripts/record-scenario.ts --id bill-splitter --title "Split the bill" \
//     --prompt "Dinner for 4 came to ..." [--model sonnet]
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
const CATEGORIES = new Set(['layout', 'display', 'input', 'data', 'control', 'overlay', 'interactive']);

const here = dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
	options: {
		id: { type: 'string' },
		title: { type: 'string' },
		prompt: { type: 'string' },
		model: { type: 'string', default: 'sonnet' }
	}
});
if (!args.id || !args.title || !args.prompt || !/^[a-z0-9-]+$/.test(args.id)) {
	console.error('usage: bun scripts/record-scenario.ts --id <kebab-id> --title "<title>" --prompt "<text>" [--model sonnet]');
	process.exit(2);
}

const manifest = JSON.parse(readFileSync(resolve(here, '../static/manifest.json'), 'utf-8'));
const allTypes: string[] = manifest.widgets.map((w: { type: string }) => w.type);
const reference = {
	spec: manifest.spec,
	actions: manifest.actions,
	widgets: manifest.widgets
		.filter((w: { category: string }) => CATEGORIES.has(w.category))
		.map(({ pocket: _pocket, ...w }: Record<string, unknown>) => w)
};

const SYSTEM = `You generate Ripple specs. Ripple renders a JSON spec into a live, interactive UI while the JSON is still streaming in.

OUTPUT RULES
- Output ONLY a single JSON object. No markdown code fences, no prose before or after it.
- Shape: {"version":"1.0","state":{...},"ui":{...}}. Write "state" BEFORE "ui" so the UI can render as it arrives.
- Use only widget types from the manifest below, with their documented props and events. Put two-way binds in the node's top-level "bind" field, e.g. "bind": "{state.tipPercent}". Event handlers go at node level, e.g. "on_click": {...}.
- Build a genuinely interactive tool, not a static mockup: seed state with the user's numbers, bind inputs (number-input, slider, segmented, switch, checkbox) to state, derive every output from state with expressions so it updates live, and wire buttons with actions (set, toggle, push, remove, toast).
- Every quantity the user mentions (amounts, counts, percentages) must be adjustable in the UI, and every derived number must follow from state. Never hardcode a copy of a state value in an expression: write state.people.length, not 4.
- Lists the user can grow or shrink live in state as arrays, render with "each", and change with push / remove actions. Inside "each", bind a row field with a templated path ("bind": "people.{index}.drinks") and remove the row with {"action":"remove","target":"people","value":"{item}"} (remove's "index" only accepts a literal number, so never "index": "{index}").
- One clean card-sized layout (roughly 15 to 35 nodes). Short labels, plain language, no lorem ipsum, no invented brand names.

EXPRESSIONS (verified against the engine; follow exactly)
- A prop that is exactly "{expr}" keeps the value's type. "Text {expr} more" builds a string.
- Supported: state paths (state.a.b, state.list[0].x), arithmetic + - * / % with parentheses, comparisons, ternary a ? b : c, || and ??. Inside "each", the loop item is {item.field} and the index is {index} (or the names given by item_as / index_as).
- Keep arithmetic flat: at most one level of parentheses, and start every arithmetic expression with a state path, an item field or a number, never with "(". Works: state.total * (1 + state.tipPercent / 100) / state.people.length. Breaks: (a + b) * (1 + c).
- A method call (.toFixed, .sum, .count, .where(...).count()) must be the ENTIRE expression. Inside arithmetic or a ternary it evaluates wrong. When a calculation needs the count or sum of a list, keep that number in state and refresh it with a set action whose value is the method expression: chain it after the push / remove that changes the list, and put it in the on_change of any input that edits a list item, e.g. "on_change": {"action":"set","target":"drinkers","value":"{state.people.where('drinks', true).count()}"}.
- For an amount that applies only when a flag is true, multiply by the flag (true counts as 1): item.drinks * state.drinksTotal / state.drinkers.
- Use a ternary only as the whole expression (to pick a label or value), never inside arithmetic.
- For money, compute the raw number and show it with the "stat" widget using "format": "currency" (it formats to 2 decimals), e.g. {"type":"stat","props":{"label":"Each pays","value":"{state.total * (1 + state.tipPercent / 100) / state.people.length}","format":"currency"}}.
- Division by zero yields 0. Keep numeric state as numbers, not strings.
- There is no exponent operator (no ** or ^) and no Math functions. Write compound growth as repeated multiplication starting from a state path, e.g. three years at a yearly rate: state.start * (1 + state.rate / 100) * (1 + state.rate / 100) * (1 + state.rate / 100).
- Chart "data" items resolve expressions too, so a chart can follow state: {"label":"Year 5","value":"{state.deposit * 12 * 5}"}.

MANIFEST (spec envelope, action grammar, widgets)
${JSON.stringify(reference)}`;

const cwd = mkdtempSync(join(tmpdir(), 'ripple-record-'));
const cmd = [
	'claude', '-p', args.prompt,
	'--output-format', 'stream-json', '--include-partial-messages', '--verbose',
	'--model', args.model!,
	'--system-prompt', SYSTEM,
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
	model: args.model,
	recordedAt: new Date().toISOString(),
	chunks
};
const out = resolve(here, `../src/routes/live/fixtures/${args.id}.json`);
writeFileSync(out, JSON.stringify(fixture, null, 1) + '\n', 'utf-8');
console.error(`wrote ${out}: ${chunks.length} chunks, ${text.length} chars, ${chunks.at(-1)!.t} ms`);
