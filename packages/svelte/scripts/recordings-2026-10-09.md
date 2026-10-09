# /live recordings, 2026-10-09 (DW-8)

The nine `/live` demos re-recorded with `record-scenario.ts` after the data
widgets landed. The recorder now offers the seven primitive categories plus the
data widgets and summary pieces by name: 144 widgets, 169.5 KB of manifest
(before: 131 widgets, about 126 KB). Bytes are the recorded JSON; nodes count
widget nodes along `children`.

## Sonnet, old vs new (fixtures)

| Demo | Data widget | Old nodes / bytes | New nodes / bytes | Uses it | New widget types |
|---|---|---|---|---|---|
| savings-calculator | growth-projection | 17 / 11,207 | 1 / 604 | yes | growth-projection |
| tokyo-trip | itinerary | 23 / 4,659 | 1 / 5,173 | yes | itinerary |
| meal-plan | meal-plan | 27 / 7,238 | 1 / 5,658 | yes | meal-plan |
| hiit-workout | interval-workout | 22 / 3,576 | 1 / 1,242 | yes | interval-workout |
| flashcards | flashcard-deck | 16 / 2,792 | 1 / 878 | yes | flashcard-deck |
| sales-dashboard | exec-dashboard rows | 14 / 3,676 | 1 / 1,997 | yes (rows, bind filters) | exec-dashboard |
| order-burger | menu-order | 27 / 4,242 | 27 / 4,357 | no, on purpose | card, flex, each, number-input, segmented, input, stat, button |
| bill-splitter | none | 21 / 2,794 | 19 / 2,633 | n/a | card, flex, grid, number-input, slider, stat, switch, button |
| explainer | none | 42 / 5,032 | kept old | n/a | (unchanged) |
| **Total** | | **209 / 45,216** | **94 / 27,574** | 6 of 6 | |

Old widget types were primitives throughout (card, flex, grid, stat, slider,
number-input, each, if, text, button and so on; flashcards used `flashcard`).

- Bytes drop 39% across the nine, 44% across the eight re-recorded (the
  explainer is unchanged). The savings card meets the metric: 5 nodes or
  fewer and 3 KB or less.
- **order-burger** stays on primitives. `/live`'s `checkout.ts` handles the
  `api` checkout contract; `menu-order` checks out through a server-wired
  `on_checkout` that the landing does not handle until DW-10/FL-3. Recorded
  against the tasty-bite-fl6 store (option groups) on port 3947.
- **explainer** keeps the old fixture: the new take repeated the gear ratio
  as a second stat and dropped the preset buttons.
- **tokyo-trip** is the second of three takes. Take 1's verdict said "about
  117,000 yen" against 112,900 planned; take 3 priced the Great Buddha entry,
  which names a real place. Take 2 calls the hotel "5 nights" on a 4-night stay.

## Haiku, same nine prompts (scratch, not fixtures)

8 of 9 valid. Every valid one replays through `streamSpec` to done, passes
`validateCatalog`, and mounts with no console error.

| Demo | Valid | Nodes / bytes | Data widget |
|---|---|---|---|
| savings-calculator | yes | 1 / 478 | growth-projection |
| tokyo-trip | yes | 1 / 8,279 | itinerary |
| meal-plan | yes | 1 / 14,285 | meal-plan |
| hiit-workout | yes | 1 / 1,869 | interval-workout |
| flashcards | yes | 1 / 1,706 | flashcard-deck |
| sales-dashboard | yes | 1 / 3,871 | exec-dashboard rows |
| order-burger | yes | 29 / 6,666 | primitives (as told) |
| bill-splitter | yes | 32 / 4,181 | primitives |
| explainer | no: unknown widget `list` | n/a | n/a |

One run per prompt. The success metric asks for three runs on a cheap model at
90% or better; this run is 89%.
