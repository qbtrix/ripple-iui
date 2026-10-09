# Ripple documentation

The documentation lives on the site: https://ripple.pocketpaw.xyz/docs. Its
source is the markdown under [`packages/svelte/src/docs/`](../packages/svelte/src/docs).

- Getting started: [Install](https://ripple.pocketpaw.xyz/docs/getting-started/install), [Render a spec](https://ripple.pocketpaw.xyz/docs/getting-started/render-a-spec), [Stream a spec](https://ripple.pocketpaw.xyz/docs/getting-started/stream-a-spec)
- Concepts: [The spec](https://ripple.pocketpaw.xyz/docs/concepts/the-spec), [State and expressions](https://ripple.pocketpaw.xyz/docs/concepts/state-and-expressions), [Actions and events](https://ripple.pocketpaw.xyz/docs/concepts/actions-and-events), [Flow actions](https://ripple.pocketpaw.xyz/docs/concepts/flow-actions), [Streaming](https://ripple.pocketpaw.xyz/docs/concepts/streaming), [Headless runtime](https://ripple.pocketpaw.xyz/docs/concepts/headless)
- Widgets: [every widget](https://ripple.pocketpaw.xyz/docs/widgets), generated from the manifest
- Guides: [Custom widgets](https://ripple.pocketpaw.xyz/docs/guides/custom-widgets), [Theming](https://ripple.pocketpaw.xyz/docs/guides/theming), [Intents](https://ripple.pocketpaw.xyz/docs/guides/intents), [Layout gotchas](https://ripple.pocketpaw.xyz/docs/guides/layout-gotchas)
- API reference: [@ripple-ui/core](https://ripple.pocketpaw.xyz/docs/api/core), [@ripple-ui/svelte](https://ripple.pocketpaw.xyz/docs/api/svelte)
- Architecture: [How Ripple works](https://ripple.pocketpaw.xyz/docs/architecture/overview)
- For agents: [llms.txt](https://ripple.pocketpaw.xyz/llms.txt), [llms-full.txt](https://ripple.pocketpaw.xyz/llms-full.txt), [manifest.json](https://ripple.pocketpaw.xyz/manifest.json)

Repo-only notes that stay here: [Discover cards](./discover.md), [Publishing](./publishing.md), [Monorepo layout](./monorepo.md).

> **The manifest is the source of truth** for widget props. Every widget's prop
> schema and example ships in `dist/manifest.json`; when a page and the
> manifest disagree, the manifest wins.
