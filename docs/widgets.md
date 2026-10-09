# Widgets Reference

The widget reference now lives on the site and is generated from the widget
manifest, so it can't drift from the code:

- Browse: https://ripple.pocketpaw.xyz/docs/widgets (one page per widget, with a
  live example, props, events and node fields)
- For agents: https://ripple.pocketpaw.xyz/llms.txt and
  https://ripple.pocketpaw.xyz/docs/widgets/<type>.md
- Source of truth: `packages/svelte/src/lib/manifest/` (one entry per widget in
  `entries/`), served in full at https://ripple.pocketpaw.xyz/manifest.json

Building a master-detail layout? Read
[Layout gotchas](../packages/svelte/src/docs/guides/layout-gotchas.md), also at
https://ripple.pocketpaw.xyz/docs/guides/layout-gotchas
