<!--
  @file routes/showcase/w/[type]/+page.svelte
  @description One widget or pattern in the showcase: the shared detail view
    with the docs page's own specs, linking back to its facet and to the docs.
-->
<script lang="ts">
	import ShowcaseDetail from '../../ShowcaseDetail.svelte';

	let { data } = $props();

	const back = $derived(
		data.facet === 'patterns'
			? { href: '/showcase?f=patterns', label: 'Patterns' }
			: { href: `/showcase?f=widgets&c=${data.category.id}`, label: data.category.title }
	);
</script>

<svelte:head>
	<title>{data.title} · Showcase · Ripple</title>
	<meta name="description" content={data.description} />
</svelte:head>

<div data-pagefind-body data-pagefind-meta="title:{data.title}">
	<ShowcaseDetail
		title={data.title}
		line={data.description}
		category={data.facet === 'patterns' ? 'Pattern' : `${data.category.title} widget`}
		{back}
		docs="/docs/widgets/{data.type}"
		specs={data.specs}
	/>
</div>
