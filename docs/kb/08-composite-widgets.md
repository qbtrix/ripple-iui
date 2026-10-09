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

Multi-step shipment status. Stepper for placed → confirmed → preparing → in-transit → out-for-delivery → delivered. Optional embedded `map` widget (composes the data-category `map` widget under the hood) when origin/destination/tracker are supplied. Optional event timeline beneath the map.

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
A menu the visitor orders from inside the card, in four stages: menu (category chips, a featured pick, photo cards with steppers), customise (option groups with each choice's price change; a required group blocks "Add" and says why), details (pickup or delivery, name, email or phone, address for delivery) and review (lines, options, fee, total). One primary button per stage sits in a sticky bar with the running total.
The model writes `items[].product_id` (plus `name` so rows stream), `featured: { id, reason }` and `preset: [{ id, qty }]`. Server hydration fills `price`, `image`, `groups`, `currency`, `fee`, `fulfilment` and `checkout: true`, and wires `on_checkout`. Without `checkout: true`, or for an item without `product_id`, the menu is display only. Required groups start on their first option; a `many` group caps at `max`.
Bind `cart` (`{ lines, fulfilment, total }`, never the customer's details) so another node can show "2 items". `on_checkout` fires with `{ lines: [{ product_id, name, qty, option_ids, unit_price }], fulfilment, customer: { name, email?, phone?, address? }, total }`. Quantities are 1 to 20 per line, at most 30 lines. The total is display only: the store reprices every line.
### interval-workout
A real interval timer for "give me a 20-minute HIIT workout and walk me through it" (aliases `workout-timer`, `interval-timer`, `hiit-timer`). The model writes `exercises[]` `{ name, cue?, kind? }` with `kind` one of `cardio | strength | core | mobility | rest`, plus `workSec`, `restSec` and `rounds`; the widget builds the session (work, rest, work, ... across rounds) and does the timing.
A ring counts the interval down in seconds (plain digits under reduced motion), the current exercise shows in large type with its cue and the next one below, and back, pause and next sit in one row. The header shows the total time; a bar per round tracks the whole session. A `rest`-kind exercise is a rest block with no automatic rest beside it; `restSec: 0` skips rests. Nothing starts until the visitor presses Start, and the timer pauses when the tab is hidden.
Bind `workSec` (`bind: "{state.workSec}"`): the Work stepper writes it, and a change applies from the next interval, never to the one running. `restSec` has its own stepper. No events.
### flashcard-deck
A study deck for "make me Spanish flip cards and keep my score" (aliases `flashcards`, `study-deck`, `flip-cards`). The model writes `cards[]` `{ front, back, hint?, category? }` and optionally `shuffle: true`; the widget runs the flips, the marks and the score. Use it instead of an `each` over single `flashcard` widgets with hand-written counters.
Progress dots, the card (tap to flip; a 3D turn, a cross-fade under reduced motion), "Show hint" when a card has one, then "Missed it" and "Got it". At the end of a pass a score screen shows cards known out of the deck, lists the missed cards with their answers, and offers "Practise missed", which re-deals only those, and Restart. `shuffle` is seeded from the cards, so every render deals the same order; each restart deals a new one.
Bind `score` (`bind: "{state.score}"`): cards known since the last restart, written by the widget. `on_complete` fires at the end of every pass with `{ score, total }`.

### growth-projection

Savings growth from four numbers (aliases `savings-projection`, `compound-interest`). Answers "save $300 a month at 5% for 10 years, show me how it grows". The model writes the inputs; the widget computes everything, so no hand-built schedule or `set` actions.

- `initial` (starting balance, default 0), `deposit` (added at the end of every month; write `0` for a lump sum), `rate` (percent a year: `5` means 5%), `years` (fractions round to whole months), `compounding` (`monthly` default, or `yearly`, which credits a year's simple interest at year end).
- Optional `goal` (a goal line and the year it is reached), `inflation` (percent; adds the final balance in today's money), `currency` (ISO 4217), `verdict`.
- Renders the final balance and "you put in X; growth adds Y", a stacked area chart of deposits under growth (legend, end labels, crosshair readout by pointer or arrow keys), a yearly table behind a toggle, and sliders plus number boxes for deposit, rate and years.
- Clamps negatives to 0, rate and inflation to 100%, years to 100, and lists what it changed.
- Bind `deposit` (`bind: "{state.deposit}"`); a slider or box edit commits a number on release. Rate and years edits fire `on_ratechange` / `on_yearschange` with the new number (`{ action: "set", target: "rate", value: "{event}" }`).

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
