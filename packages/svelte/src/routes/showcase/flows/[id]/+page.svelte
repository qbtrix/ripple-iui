<!--
  @file routes/showcase/flows/[id]/+page.svelte
  @description One flow in the showcase: the shared detail view, no docs link
    (flows are compositions, not manifest widgets).
-->
<script lang="ts">
	import ShowcaseDetail from '../../ShowcaseDetail.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title} · Showcase · Ripple</title>
	<meta name="description" content={data.line} />
</svelte:head>

<div data-pagefind-body data-pagefind-meta="title:{data.title}">
	<ShowcaseDetail
		title={data.title}
		line={data.line}
		category="Flow"
		back={{ href: '/showcase?f=flows', label: 'Flows' }}
		specs={data.specs}
	/>
</div>
