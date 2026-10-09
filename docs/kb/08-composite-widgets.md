# Ripple Composite Widgets

Composite widgets are full-pane typed layouts. Emit ONE node and the whole pattern (header + body + actions) renders — don't rebuild these out of `flex` + `card` + inputs. Two flavors:

1. **Composite layouts** (`comparison-layout`, `entity-detail`, `form-layout`, `wizard-layout`, `checklist-layout`, `report-layout`, `invoice-layout`, `order-status`, `booking`, `recipe`, `meal-plan`, the dashboard variants) — pre-composed business surfaces.
2. **Specialized canvases** (`terminal`, `workflow`, `c4`) — niche widgets for CLI output, flow diagrams, and architecture diagrams.

Refer to `dist/manifest.json` (or `get_widget_spec` from an agent) for the exact prop schema of each — this page covers shape and intended use.

## Composite layouts

### comparison-layout

Answers "which should I pick" for 2–6 items. Top to bottom: the `verdict` line, a best-pick card for `winner: {id, reason, runner_up?}` (photo, name, reason, price, Choose), the other items as compact cards (photo, price and its difference from the winner, up to 3 `picks` tags such as "Best for travel", and the `highlight` features as pills), then the detailed comparison: section chips, a "Differences only" filter, and per-item cards below 720px of width or a table with a sticky label column at 720px and wider.

- Features carry `kind`: `text`, `number`, `boolean`, `rating`, `icon`, `price`, `color`. A `type` on a feature still works for old specs, but write `kind`. An `icon`-kind value is a word from the feature icon set (`battery`, `weight`, `display`, `cpu`, `memory`, `storage`, `camera`, `speed`, `price`, `ports`, `wifi`, `keyboard`, `audio`, `security`, `warranty`, `size`, `rating`, `support`) or a list of them; the same words name a feature's `icon`.
- `better: "higher" | "lower"` on a feature marks its best numeric cell with a dot and bold (ties mark all; non-numbers skip; a row where every value is equal marks nothing).
- `price` is a number in `currency` (ISO 4217, default USD); a string price shows as written and gets no difference line.
- An item with `product_id` and no `name` shows a placeholder until the server fills it.
- Choose sets `chosen` (bind it: `bind: "pick"`) and fires `on_choose` with `{id, name, product_id?}`. It makes no network call itself. Legacy per-item `actions` and `learn_more` handlers still fire.

Use when the user asks "compare X vs Y", "which should I get" or "what's the difference between …", NOT when they need a plain feature matrix (that's `comparison-table`).

### entity-detail

Record / profile / entity page. Header (avatar + title + subtitle + status), property strip, optional tabs, optional related-records section. Use for customer detail, ticket detail, asset profile.

Picks this over a flex of metric tiles, which always reads worse for a single-record surface.

### form-layout

Multi-section form. Groups fields into sections with optional headings, validates on submit, renders a primary + cancel action row at the bottom. Use for signup, contact, multi-field intake.

The internal fields are still standard input widgets (`input`, `textarea`, `select`, etc.) so binding follows the normal Mutation Triangle (`bind` + on_change to state).

### wizard-layout

Multi-step setup or onboarding flow. Renders a stepper, the current step body, and Back/Next/Submit actions. Each step has its own children and validation.

Always pick this over a manual stepper + form rebuild.

### checklist-layout

Launch checklist / pre-flight / runbook. Grouped items with completion progress, per-item details, optional owners and due dates. Great for kickoffs, audits, deploy gates.

Always pick this over a flex of `checkbox` + `text` rows.

### report-layout

Long-form report — quarterly review, status report, write-up. Sections with headings, embedded data widgets (chart, table, metric), inline callouts, citations. Use when the deliverable is a *document* with structure, not an interactive surface.

### invoice-layout

Invoice / quote / receipt. Header (issuer, recipient, dates), line items table, computed totals (subtotal/tax/total), download/print actions.

The widget computes totals from the line items — don't pre-sum and pass a number; pass the items.

### order-status

Multi-step shipment status. Stepper for placed → confirmed → preparing → in-transit → out-for-delivery → delivered. Status `ready-for-pickup` or `picked-up` switches to the pickup pipeline (placed → confirmed → preparing → ready-for-pickup → picked-up). When `status` is the last step (or the last step has `completedAt`) it shows done with a check, and the heading uses its label. Optional embedded `map` widget (composes the data-category `map` widget under the hood) when origin/destination/tracker are supplied. Optional event timeline beneath the map.

Live tracking: the host updates `tracker` (for example through state every few seconds). The courier glides linearly from its previous spot over the measured gap between updates (clamped 0.3s to 5s, 3s for the first), and its pulse ring keeps running. With prefers-reduced-motion it jumps.

Use for delivery tracking, courier dispatch, inbound logistics.

### itinerary

Day-by-day trip plan (aliases `trip-plan`, `travel-itinerary`). Answers "plan 5 days in Tokyo" and "what's next today".

- `days[]`: `{ label, when?, theme?, stay?, stops[] }`; each stop `{ time?, title, kind, place?, cost?, minutes?, must?, done? }` with `kind` one of `sight | food | stay | transit | activity | shop | nature | nightlife | flight` (a Lucide icon per kind on the rail; never an icon name or emoji).
- `route[]` (city names; derived from `legs` when omitted), `legs[]` `{ from, to, kind: flight | train | bus | car | ferry | walk, ref?, minutes?, cost? }`, `packing[]` `{ group, items[] }`.
- `budget` and `currency` (ISO 4217, default USD): planned spend (every stop and leg cost) is shown against the budget, warning past 90% and alert when over. `verdict` leads when given.
- `when` and `time` render as written; nothing parses a date. `open` is the expanded day's index (set it to today).
- Bind `days` (`bind: "{state.days}"`): ticking a stop's rail dot or adding a stop (title, time, cost) writes a new days array to state. An added stop slots in by `HH:MM` time.
### booking
A table or service booking inside a chat card, in four stages: what (service, party size), when (a 7-day strip, then that day's slots), details (name, email or phone, notes), review. One main button per stage.
The server fills `services`, `days` and `tz` from the store and attaches `on_book`; the model writes only `party` and `preferred` (`"Friday evening"` is `{ date: "2026-10-16", after: "18:00" }`), which pre-selects the open slot nearest the ask. Slot times and day labels come from the store's own strings, so the browser never parses a date. Full slots stay visible and disabled.
Book fires `on_book` with `{ service_id, start, party?, customer: { name, email?, phone? }, notes? }`, validated on the client the way the host re-validates it. The host answers through props: `confirmed` shows the confirmation (booking reference, date, time, party) with no more actions; `notice` shows a message, and a slot-taken notice (`code: "slot_taken"`, with the slot's `start`) returns to the times with that slot marked Full. `bind` holds `selection`, the request in progress. Aliases: `reservation`, `appointment`.
### menu-order
A menu the visitor orders from inside the card, in four stages: menu (category chips, a featured pick, photo cards with steppers), customise (each option is a tile with an icon, its price change and a check; short single choices form a segmented row; a line under the dish lists what is chosen with the running price; a capped group says when it is full; a required group blocks "Add" and says why), details (pickup or delivery, name, email and phone, address for delivery) and review (lines, options, fee, total). One primary button per stage sits in a sticky bar with the running total.
The model writes `items[].product_id` (plus `name` so rows stream), `featured: { id, reason }` and `preset: [{ id, qty }]`. Server hydration fills `price`, `image`, `groups`, `currency`, `fee`, `fulfilment` and `checkout: true`, and wires `on_checkout`. Without `checkout: true`, or for an item without `product_id`, the menu is display only. Required groups start on their first option; a `many` group caps at `max`. Option icons come from the option's name (cheese, bacon, egg, sauce, "No sauce" and so on), else its group's name; a group or option may set `icon` to one of the data kit's `OPTION_ICONS` keys (`size`, `large`, `cheese`, `bacon`, `egg`, `spicy`, `sauce`, `none`, `extra`, `drink`, ...), and any other value is ignored.
Bind `cart` (`{ lines, fulfilment, total }`, never the customer's details) so another node can show "2 items". `on_checkout` fires with `{ lines: [{ product_id, name, qty, option_ids, unit_price }], fulfilment, customer: { name, email, phone, address? }, total }`. Quantities are 1 to 20 per line, at most 30 lines. The total is display only: the store reprices every line.
### interval-workout
A real interval timer for "give me a 20-minute HIIT workout and walk me through it" (aliases `workout-timer`, `interval-timer`, `hiit-timer`). The model writes `exercises[]` `{ name, cue?, kind? }` with `kind` one of `cardio | strength | core | mobility | rest`, plus `workSec`, `restSec` and `rounds`; the widget builds the session (work, rest, work, ... across rounds) and does the timing.
A ring counts the interval down in seconds (plain digits under reduced motion), the current exercise shows in large type with its cue and the next one below, and back, pause and next sit in one row. The header shows the total time; a bar per round tracks the whole session. A `rest`-kind exercise is a rest block with no automatic rest beside it; `restSec: 0` skips rests. Nothing starts until the visitor presses Start, and the timer pauses when the tab is hidden.
Bind `workSec` (`bind: "{state.workSec}"`): the Work stepper writes it, and a change applies from the next interval, never to the one running. `restSec` has its own stepper. No events.
### flashcard-deck
A study deck for "make me Spanish flip cards and keep my score" (aliases `flashcards`, `study-deck`, `flip-cards`). The model writes `cards[]` `{ front, back, hint?, category? }` and optionally `shuffle: true`; the widget runs the flips, the marks and the score. Use it instead of an `each` over single `flashcard` widgets with hand-written counters.
Progress dots, the card (tap to flip; a 3D turn, a cross-fade under reduced motion), "Show hint" when a card has one, then "Missed it" and "Got it". At the end of a pass a score screen shows cards known out of the deck, lists the missed cards with their answers, and offers "Practise missed", which re-deals only those, and Restart. `shuffle` is seeded from the cards, so every render deals the same order; each restart deals a new one.
Bind `score` (`bind: "{state.score}"`): cards known since the last restart, written by the widget. `on_complete` fires at the end of every pass with `{ score, total }`.
### word-guess
A daily-word style guessing game for "give me a five-letter word game about the kitchen" (aliases `guess-the-word`, `word-game`). The model writes `answer` (4 to 7 letters, A to Z, any case), optionally `hint`, `title` and `max_guesses` (default 6, clamped 1 to 10); the widget runs the board, the scoring and the keyboard. An answer with other characters or the wrong length shows a friendly inline error instead of the board.
The visitor types on a physical keyboard once the board has focus (click it or Tab to it) or taps the on-screen keys; Enter submits and Backspace deletes. Each letter scores correct spot, in word or not in word, with the standard count limit for repeated letters (one E in the answer credits only one E in the guess, an exact match first). Every tile carries a colour, a corner glyph and a label ("R, correct spot"), the on-screen keys show each letter's best state, and a polite live region reads each result. Played rows flip in turn and a short guess shakes; under reduced motion neither moves. "Show hint" reveals the hint and records it. The end screen says won or lost, shows the answer, and has a plain-text share grid of squares (no answer in it) with a Copy button.
`allow_any_word` (default true) is accepted, but no dictionary ships, so any letters count as a guess either way.
Bind `value` (`bind: "{state.game}"`): `{ guesses, status: "playing" | "won" | "lost", hint_used }`, written by the widget on every guess and hint and never read back. A re-sent copy of the spec keeps the game; a new `answer` starts a fresh one. `on_complete` fires once when the game ends, with `{ won, guesses }`.
The answer is plain text in the spec, so anyone who reads the spec can see it. That is fine for a casual game; do not use this widget for anything where the answer must stay secret.
### quiz
A trivia game for "quiz me on space, ten questions" (aliases `trivia`, `trivia-quiz`). The model writes `questions[]` `{ prompt, choices, answer, why?, image? }`: 3 to 12 questions, 2 to 5 short `choices` each, `answer` the 0-based index of the right choice, `why` one sentence shown after the pick, `image` an https photo. A question whose `answer` falls outside its choices is skipped with a console warning; past 12 the rest are dropped. Use it instead of hand-building a quiz out of radio groups and `set` actions. Not the intent system's auto-detected `quiz-question` organism (a single `select` step); this is the whole game in one node.
One question at a time with a progress rail (a check or a cross per answered question), large choice tiles (real radios; press 1 to 5 to answer, Enter for Next), then right or wrong at once: the right tile is marked "Correct answer", a wrong pick "Your pick", and the `why` line shows. A streak counter sits by the score. `seconds_per_question` adds a countdown ring per question; the quiz waits for Start, and running out counts as a miss. `shuffle_choices: true` shuffles each question's choices (seeded, so every render deals the same order; Retry deals a new one). The end screen shows the score, a band (Expert, Sharp, Getting there, Warming up), the best streak, every miss with the right answer and its `why`, and Retry. Motion is a 4px rise, opacity only under reduced motion. Results are announced to screen readers.
Bind `value` (`bind: "{state.quiz}"`): `{ index, answers, score, done }`, where `answers[i]` is the picked choice for the i-th question (null on a timeout) and `done` turns true when the last one is answered. A re-sent spec keeps the progress; new questions start over. `on_complete` fires once per run with `{ score, total }`. The answers sit in the spec, which is fine for casual play and wrong for anything graded.
### memory-match
A card-flip pairs game for "make me a memory game to learn Spanish animals" (aliases `memory-game`, `match-pairs`). The model writes `pairs[]` `{ id, a, b }`, 6 to 12 of them (more than 12 are dropped), plus an optional `title`, `columns` (auto by card count) and `time_limit_s` (no limit by default). Each side is plain text (a word and its translation), a single emoji, or `icon:<key>` with a key from the data kit's icon maps (`coffee`, `flight`, `train`, `car`, `home`, `food`, `fish`, `bread`, ...); an unknown key shows as its text. Text autoscales so a long word fits its card.
The widget deals every side face down in a seeded shuffle (the deck's content plus the game number), so a re-sent spec never reshuffles a game in progress. Flip two at a time: a match stays face up with a check, a miss turns back after about 800ms. A stats row shows moves, time (or time left), pairs found and the best moves this session. Matching every pair shows a win screen with a small burst and Play again; running out of time shows a time-up screen. Every card is a button ("Card 3, face down", then "Card 3, perro"); arrows move focus, Enter or Space flips, and a live region announces matches and misses. Reduced motion swaps the 3D flip for a fade.
Bind `value` (`bind: "{state.game}"`): `{ moves, matched, completed, seconds }`, written by the widget on each move, at the end of a game and on Play again (never on a timer tick); `matched` lists pair ids. `on_complete` fires once per won game with `{ moves, seconds }`; time-up does not fire it.

### growth-projection

Savings growth from four numbers (aliases `savings-projection`, `compound-interest`). Answers "save $300 a month at 5% for 10 years, show me how it grows". The model writes the inputs; the widget computes everything, so no hand-built schedule or `set` actions.

- `initial` (starting balance, default 0), `deposit` (added at the end of every month; write `0` for a lump sum), `rate` (percent a year: `5` means 5%), `years` (fractions round to whole months), `compounding` (`monthly` default, or `yearly`, which credits a year's simple interest at year end).
- Optional `goal` (a goal line and the year it is reached), `inflation` (percent; adds the final balance in today's money), `currency` (ISO 4217), `verdict`.
- Renders the final balance and "you put in X; growth adds Y", a stacked area chart of deposits under growth (legend, end labels, crosshair readout by pointer or arrow keys), a yearly table behind a toggle, and sliders plus number boxes for deposit, rate and years.
- Clamps negatives to 0, rate and inflation to 100%, years to 100, and lists what it changed.
- Bind `deposit` (`bind: "{state.deposit}"`); a slider or box edit commits a number on release. Rate and years edits fire `on_ratechange` / `on_yearschange` with the new number (`{ action: "set", target: "rate", value: "{event}" }`).

### bill-split

Split a bill with tip (aliases `split-bill`, `bill-splitter`). Answers "dinner for 4 came to $186.40, help me split it with tip, and let me adjust who had drinks". The model writes the numbers and the people; the widget does the maths, so no hand-built sliders, `each` rows or `set` actions.

- `subtotal` (the bill before tip and before tax), `tip_percent` (percent: `18` means 18%, default 18), `people[]` `{ id, name, extras? }` (2 to 12; `extras` is what that person had on top of the shared part, such as drinks, as an amount).
- Optional `tax`: ON TOP of `subtotal`, shared in proportion to what each person had. Leave it out when the subtotal already includes tax. The tip is always a percent of `subtotal`, never of the tax.
- Optional `tip_options` (chips, default `[15, 18, 20, 22]`), `extras_label` (default "Drinks"), `currency` (ISO 4217), `title`, `note`.
- Maths: the shared part (subtotal minus everyone's extras) splits evenly; each person pays their share plus their extras, plus tax and tip in proportion to that amount. Everything is in integer cents and the leftover cents go to the first people, so the shares add up to the total exactly. Extras over the bill raise the bill to their sum and the widget says so.
- Renders a verdict ("Everyone pays $60.00", or "Shares range from $48.79 to $62.96"), a card per person with the amount large, then a bill / tip / total row (a polite live region). Two columns of cards in a narrow card, up to four wide, never one card alone in the last row.
- The visitor edits the bill amount, the tip (chips or a custom percent), each name and extras, and adds or removes people (2 to 12). A "Copy summary" button copies a plain-text summary; it needs no handler.
- Bind `value` (`bind: "{state.bill}"`): `{ subtotal, tip_percent, people: [{ id, name, extras }] }`, written on every edit. A host re-sending the same spec keeps the edits; new numbers from the model replace them.

### recipe

One dish you can cook from (alias `recipe-card`). Answers "give me a recipe for X".

- `name`, `serves` (the servings the quantities are written for), `minutes`, `kcal` and `protein_g` PER SERVING, `kind` (`breakfast | lunch | dinner | snack`, the icon when there is no photo), `difficulty`, `tags[]`.
- `ingredients[]` `{ name, qty?, unit?, note?, aisle? }`: `qty` is a NUMBER (1.5, never "1 1/2") with a separate `unit`; the widget prints cook's fractions (1½, ¾, ⅓) and agrees counted units with the number (1 can, 2 cans). Omit `unit` for counted things ("2" eggs).
- `steps[]` `{ text, minutes?, tip? }`: numbered and tickable, `minutes` shows a timer chip, `tip` sits under the step. Ingredients and steps stack below 720px and sit side by side above it; there are no tabs.
- Bind `servings` (`bind: "{state.servings}"`): the stepper multiplies every numeric `qty` by `servings / serves`. Without a usable `serves` nothing scales. Nutrition does not scale. `goal.protein_g` shows a serving's share of the daily goal.

### meal-plan

A week of meals (aliases `meal-planner`, `weekly-meal-plan`). Answers "a high-protein meal plan for the week; let me swap meals, set how many people, keep a shopping list".

- `recipes[]` is the library, each recipe written once (the `recipe` shape, with an `id`). `days[]` `{ day, meals[{ slot, recipe }] }` point into it by id (a name also matches); a day's `label` is read when `day` is missing.
- `goal` `{ protein_g?, kcal? }` is per person per day: each day shows its protein (or calories) against it, and the header shows the daily averages and the week's per-person total.
- Swap: a select per meal offers the recipes of that slot's kind (and kind-less ones). Tap a meal to open its recipe inline, scaled to `people`.
- Shopping list: derived, never written. Every planned meal's ingredients, times `people / serves`, summed by name + unit, grouped by aisle, tickable.
- Bind `people` (`bind: "{state.people}"`). Swaps and ticks stay in the widget (Svelte callers can `bind:days` and `bind:got`), and a host re-rendering the same spec does not undo them. A meal whose recipe has not arrived renders a skeleton row.

### exec-dashboard
A KPI dashboard the model fills with raw records, not tiles (aliases `kpi-dashboard`, `executive-dashboard`). Answers "show me last quarter's sales by month, filterable by region".
- Rows mode: `rows[]` (e.g. orders `{ id, date: "2026-07-14", region, channel, amount }`), `measures[]` `{ key?, label, format: money | number | percent, agg: sum | avg | count, good?: up | down }` (one KPI each; the first also drives the chart and breakdown), `dimensions[]` `{ key, label }` (filter chip rows), `x` (the chart's column), `split` (stack the chart by a column), `compare[]` (last period's rows) with `compareLabel`, `currency`, `verdict`.
- Everything is computed from the filtered rows: KPIs, trends (against `compare`, else the last x group against the one before), the chart, the breakdown (the first dimension not filtered) and the table totals. ISO dates group by day up to a 31-day span, else by month; other x values group as written.
- Chart rules: one colour for one series; a `split` gives each value a fixed `--chart-N` slot from the unfiltered rows, so filtering never repaints, and past five values the rest fold into Other. Columns at most 24px wide on one axis, a readout per column on hover, focus or tap, and a Table view.
- Bind `filters` (`{ region: "West" }`). `on_filter` fires with `{ key, value }` (null for All).
- KPI mode (no `rows`): the prebuilt `kpis` (with `byKey`), `primaryChart`, `charts`, `activity` and `table` props work as before; `on_date_range_change` fires with the picked chip.

### Dashboard variants

`ops-dashboard`, `analytics-dashboard`, `pipeline-dashboard`, `project-dashboard` are pre-composed dashboard surfaces. Each picks an opinionated layout for that domain (status + alerts + load for ops, funnel + retention + cohorts for analytics, etc.). Refer to the manifest for each.

## Specialized canvases

### terminal

CLI-style output display with optional interactive command input. Use for showing logs, build output, or command results.

**Props:**
- `lines`: array of TermLine (default: [])
  - `text`: string (required)
  - `type`: "stdout" | "stderr" | "info" | "command" (default: "stdout")
  - `timestamp`: string (optional)
- `interactive`: boolean — shows command input at bottom
- `maxHeight`: string (default: "300px")
- `title`: string (shown in title bar)

**Events:** none wired for specs. Interactive mode's command callback is a Svelte-only prop and cannot be set from JSON.

**Example:**
```json
{
  "type": "terminal",
  "props": {
    "title": "Build Output",
    "maxHeight": "250px",
    "lines": [
      { "text": "npm run build", "type": "command" },
      { "text": "Building project...", "type": "info" },
      { "text": "✓ Compiled 42 files", "type": "stdout" },
      { "text": "✓ Bundle size: 128kb", "type": "stdout" },
      { "text": "Warning: unused import in utils.ts", "type": "stderr" },
      { "text": "Build complete in 2.3s", "type": "info" }
    ]
  }
}
```

### workflow

Visual node-based workflow diagram. Renders interactive flowcharts with SvelteFlow. Use for process flows, automation pipelines, approval chains.

**Props:**
- `nodes`: array of WorkflowNodeData
  - `id`: string (required)
  - `type`: "trigger" | "action" | "condition" | "approval" | "connector" | "output"
  - `label`: string (displayed text)
  - `icon`: string (optional icon name)
  - `tool`: string (optional tool identifier)
  - `status`: string (optional status indicator)
  - `position`: { x, y } (optional — auto-laid out if omitted)
- `edges`: array of WorkflowEdgeData
  - `from`: string (source node id)
  - `to`: string (target node id)
  - `label`: string (optional edge label, useful for "yes"/"no" on conditions)
  - `animated`: boolean
- `title`: string
- `interactive`: boolean (default: true — enables pan/zoom)
- `minimap`: boolean
- `fitView`: boolean (default: true)

**Example — approval workflow:**
```json
{
  "type": "workflow",
  "props": {
    "title": "Expense Approval",
    "nodes": [
      { "id": "start", "type": "trigger", "label": "Expense Submitted" },
      { "id": "check", "type": "condition", "label": "Amount > $500?" },
      { "id": "auto", "type": "action", "label": "Auto-Approve" },
      { "id": "review", "type": "approval", "label": "Manager Review" },
      { "id": "done", "type": "output", "label": "Processed" }
    ],
    "edges": [
      { "from": "start", "to": "check" },
      { "from": "check", "to": "auto", "label": "No" },
      { "from": "check", "to": "review", "label": "Yes" },
      { "from": "auto", "to": "done" },
      { "from": "review", "to": "done" }
    ]
  }
}
```

### c4 — C4 Architecture Diagram

Renders C4 model system architecture diagrams. Supports all 4 C4 levels (Context, Container, Component, Code) with auto-layout via ELK.js.

**Props:**
- `diagram`: C4Diagram object
  - `level`: "context" | "container" | "component" | "code"
  - `title`: string
  - `description`: string
  - `elements`: array of C4Element
    - `id`: string
    - `type`: "Person" | "System" | "Container" | "Database" | "Queue" | "Component"
    - `name`: string
    - `description`: string
    - `technology`: string (e.g. "Python, FastAPI")
    - `external`: boolean (grayed out for external systems)
    - `children`: nested C4Element array (for container/component grouping)
  - `relationships`: array
    - `from`: string (element id)
    - `to`: string (element id)
    - `label`: string (e.g. "Sends requests to")
    - `technology`: string (e.g. "HTTPS/JSON")
    - `animated`: boolean

**Example — system context diagram:**
```json
{
  "type": "c4",
  "props": {
    "diagram": {
      "level": "context",
      "title": "E-Commerce System",
      "description": "System context view",
      "elements": [
        { "id": "user", "type": "Person", "name": "Customer", "description": "Buys products online" },
        { "id": "ecom", "type": "System", "name": "E-Commerce Platform", "description": "Handles orders, payments, inventory" },
        { "id": "payment", "type": "System", "name": "Payment Gateway", "description": "Processes payments", "external": true },
        { "id": "shipping", "type": "System", "name": "Shipping API", "description": "Tracks deliveries", "external": true }
      ],
      "relationships": [
        { "from": "user", "to": "ecom", "label": "Browses and purchases" },
        { "from": "ecom", "to": "payment", "label": "Processes payments", "technology": "HTTPS" },
        { "from": "ecom", "to": "shipping", "label": "Creates shipments", "technology": "REST API" }
      ]
    }
  }
}
```
