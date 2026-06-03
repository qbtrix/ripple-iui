<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles.css';

	let { children } = $props();

	let dark = $state(
		typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
	);

	$effect(() => {
		document.documentElement.classList.toggle('dark', dark);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Ripple UI</title>
</svelte:head>

<div class="shell">
	<nav class="topbar">
		<a href="/" class="logo">
			<span class="logo-mark">R</span>
			<span class="logo-text">ripple</span>
		</a>
		<div class="topbar-links">
			<a href="/" class="nav-link">Pockets</a>
			<a href="/showcase" class="nav-link">Showcase</a>
			<a href="/playground" class="nav-link">Playground</a>
			<button class="theme-btn" onclick={() => dark = !dark} title="Toggle theme">
				{#if dark}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
				{:else}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
				{/if}
			</button>
		</div>
	</nav>
	{@render children()}
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
	}
	:global(body) {
		margin: 0;
		font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
	}
	.shell {
		min-height: 100vh;
	}
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 24px;
		border-bottom: 1px solid hsl(var(--border));
		background: hsl(var(--card));
		position: sticky;
		top: 0;
		z-index: 50;
	}
	.logo {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		color: hsl(var(--foreground));
	}
	.logo-mark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 7px;
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		font-weight: 700;
		font-size: 14px;
	}
	.logo-text {
		font-weight: 600;
		font-size: 15px;
		letter-spacing: -0.02em;
	}
	.topbar-links {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.nav-link {
		padding: 5px 12px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		text-decoration: none;
		transition: color 0.15s, background 0.15s;
	}
	.nav-link:hover {
		color: hsl(var(--foreground));
		background: hsl(var(--muted) / 0.5);
	}
	.theme-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: 1px solid hsl(var(--border));
		border-radius: 7px;
		background: transparent;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
		margin-left: 8px;
		transition: color 0.15s, border-color 0.15s;
	}
	.theme-btn:hover {
		color: hsl(var(--foreground));
		border-color: hsl(var(--foreground) / 0.3);
	}
</style>
