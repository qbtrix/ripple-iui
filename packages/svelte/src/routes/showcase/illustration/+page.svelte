<!--
  routes/showcase/illustration/+page.svelte — dev preview of the illustration
  widget for screenshots and visual QA: three fictional animated drawings
  written the way the model is told to write them (single-quoted attributes,
  animate/animateTransform/animateMotion, every dur 0.5s or more), a heart
  diagram with four numbered notes (three on svg ids, one on a viewBox point),
  plus a truncated string showing the streaming placeholder. URL-only (not linked
  from the showcase index).
-->
<script lang="ts">
	import Illustration from '$lib/widgets/display/Illustration.svelte';

	const sunrise =
		"<svg viewBox='0 0 240 140'>" +
		"<defs><linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#9fd3ff'/><stop offset='1' stop-color='#fff1cc'/></linearGradient>" +
		"<radialGradient id='glow'><stop offset='0' stop-color='#ffd166' stop-opacity='0.9'/><stop offset='1' stop-color='#ffd166' stop-opacity='0'/></radialGradient></defs>" +
		"<rect width='240' height='140' fill='url(#sky)'/>" +
		"<g id='sun'><circle cx='120' cy='0' r='34' fill='url(#glow)'/><circle cx='120' cy='0' r='16' fill='#ffb703'/>" +
		"<g stroke='#ffb703' stroke-width='2.5' stroke-linecap='round'><line x1='120' y1='-24' x2='120' y2='-30'/><line x1='120' y1='24' x2='120' y2='30'/><line x1='96' y1='0' x2='90' y2='0'/><line x1='144' y1='0' x2='150' y2='0'/>" +
		"<animateTransform attributeName='transform' type='rotate' from='0 120 0' to='360 120 0' dur='12s' repeatCount='indefinite'/></g>" +
		"<animateTransform attributeName='transform' type='translate' from='0 140' to='0 52' dur='4s' fill='freeze'/></g>" +
		"<path d='M0 140 Q60 84 120 118 T240 104 V140 Z' fill='#7cb518'/>" +
		"<path d='M0 140 Q70 104 140 126 T240 120 V140 Z' fill='#4f772d'/>" +
		'</svg>';

	const bars =
		"<svg viewBox='0 0 200 120'>" +
		"<line x1='16' y1='100' x2='188' y2='100' stroke='#94a3b8' stroke-width='1'/>" +
		"<g fill='#1877f2'>" +
		"<rect x='28' y='100' width='26' height='0' rx='3'><animate attributeName='height' from='0' to='34' dur='0.8s' fill='freeze'/><animate attributeName='y' from='100' to='66' dur='0.8s' fill='freeze'/></rect>" +
		"<rect x='68' y='100' width='26' height='0' rx='3'><animate attributeName='height' from='0' to='52' dur='0.8s' begin='0.2s' fill='freeze'/><animate attributeName='y' from='100' to='48' dur='0.8s' begin='0.2s' fill='freeze'/></rect>" +
		"<rect x='108' y='100' width='26' height='0' rx='3'><animate attributeName='height' from='0' to='44' dur='0.8s' begin='0.4s' fill='freeze'/><animate attributeName='y' from='100' to='56' dur='0.8s' begin='0.4s' fill='freeze'/></rect>" +
		"<rect x='148' y='100' width='26' height='0' rx='3' fill='#0f9d58'><animate id='last' attributeName='height' from='0' to='78' dur='0.8s' begin='0.6s' fill='freeze'/><animate attributeName='y' from='100' to='22' dur='0.8s' begin='0.6s' fill='freeze'/></rect>" +
		'</g>' +
		"<g font-family='Inter, sans-serif' font-size='9' fill='#64748b' text-anchor='middle'><text x='41' y='112'>Q1</text><text x='81' y='112'>Q2</text><text x='121' y='112'>Q3</text><text x='161' y='112'>Q4</text></g>" +
		"<text x='161' y='16' font-family='Inter, sans-serif' font-size='10' font-weight='600' fill='#0f9d58' text-anchor='middle' opacity='0'>+77%<set attributeName='opacity' to='1' begin='last.end'/></text>" +
		'</svg>';

	const plane =
		"<svg viewBox='0 0 240 120'>" +
		"<path id='flight' d='M14 100 C60 20 120 120 168 52 S226 18 232 30' fill='none' stroke='#94a3b8' stroke-width='1.5' stroke-dasharray='5 5'>" +
		"<animate attributeName='stroke-dashoffset' from='0' to='-20' dur='1s' repeatCount='indefinite'/></path>" +
		"<polygon points='-9,-6 10,0 -9,6 -5,0' fill='#1877f2'>" +
		"<animateMotion dur='5s' repeatCount='indefinite' rotate='auto'><mpath href='#flight'/></animateMotion></polygon>" +
		"<circle cx='14' cy='100' r='3' fill='#64748b'/><circle cx='232' cy='30' r='3' fill='#64748b'/>" +
		'</svg>';

	const heart =
		"<svg viewBox='0 0 240 180'>" +
		"<path d='M120 166 C64 126 28 96 28 62 C28 36 48 20 72 20 C92 20 108 30 120 46 C132 30 148 20 168 20 C192 20 212 36 212 62 C212 96 176 126 120 166 Z' fill='#e5484d'>" +
		"<animate attributeName='opacity' values='1;0.82;1' dur='1s' repeatCount='indefinite'/></path>" +
		"<path id='aorta' d='M112 44 C108 14 150 4 164 26' fill='none' stroke='#b42318' stroke-width='10' stroke-linecap='round'/>" +
		"<ellipse id='right-atrium' cx='78' cy='62' rx='26' ry='18' fill='#f4a3a6'/>" +
		"<ellipse cx='162' cy='62' rx='26' ry='18' fill='#f4a3a6'/>" +
		"<ellipse cx='98' cy='108' rx='24' ry='28' fill='#c9363b'/>" +
		"<ellipse id='left-ventricle' cx='144' cy='108' rx='26' ry='30' fill='#a3262b'/>" +
		"<line x1='120' y1='80' x2='120' y2='146' stroke='#7a1d21' stroke-width='3' stroke-linecap='round'/>" +
		'</svg>';
	const heartNotes = [
		{ id: 'aorta', label: 'Aorta', note: 'The largest artery. It carries oxygen-rich blood from the left ventricle out to the body.', target: 'aorta' },
		{ id: 'left-ventricle', label: 'Left ventricle', note: 'The strongest chamber, with the thickest wall: it pumps blood to the whole body.', target: 'left-ventricle' },
		{ id: 'right-atrium', label: 'Right atrium', note: 'Takes in blood coming back from the body, low on oxygen, and passes it down to the right ventricle.', target: 'right-atrium' },
		{ id: 'apex', label: 'Apex', note: 'The lower tip of the heart, pointing down and to the left. This note sits on a viewBox point, not an svg id.', at: [120, 156] as [number, number] }
	];
	let lastNote = $state('');

	const partial = sunrise.slice(0, 400);
</script>

<svelte:head><title>Ripple · Illustration</title></svelte:head>

<div class="showcase">
	<header class="showcase-header">
		<h1>Illustration</h1>
		<p>
			Model-written animated SVG, rebuilt from an allowlist before it reaches the page. Ids are prefixed per card, so the
			three drawings below never collide. Animated art gets a pause button; with reduced motion on, it starts paused.
		</p>
	</header>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Sun rising over two hills</h2>
		<div class="pane">
			<Illustration title="Sun rising over two hills" caption="A gradient sky, a rotating ray ring, the sun easing up." svg={sunrise} max_height={260} />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Bars growing in a tiny chart</h2>
		<div class="pane">
			<Illustration title="Quarterly signups growing, Q4 up 77%" caption="Staggered begin times; the label waits for the last bar (begin='last.end')." svg={bars} max_height={220} />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Paper plane on a dashed path</h2>
		<div class="pane">
			<Illustration title="Paper plane flying along a dashed route" svg={plane} max_height={200} />
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Heart with notes</h2>
		<p class="section-caption">
			Four numbered pins over the art: tap or tab to one and its note opens while its part glows. Esc closes it. On a
			narrow card the note opens as a sheet under the art; the list below mirrors the pins.
		</p>
		<div class="pane">
			<Illustration
				title="A simplified human heart"
				caption="Not to scale. Chambers drawn as the viewer sees them."
				svg={heart}
				annotations={heartNotes}
				max_height={300}
				onselect={(d) => (lastNote = d.id)}
			/>
			<p class="section-caption">on_select: {lastNote || 'nothing opened yet'}</p>
		</div>
	</section>

	<section class="showcase-section">
		<h2 class="showcase-section-title">Streaming partial</h2>
		<p class="section-caption">The first 400 characters of the sunrise: not yet well-formed, so a quiet placeholder holds the space.</p>
		<div class="pane">
			<Illustration title="Sun rising (still streaming)" svg={partial} max_height={160} />
		</div>
	</section>
</div>

<style>
	.showcase {
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
		color: var(--foreground);
	}
	.showcase-header h1 {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0 0 0.25rem;
	}
	.showcase-header p,
	.section-caption {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		margin: 0 0 1rem;
	}
	.showcase-section {
		margin-bottom: 2.5rem;
	}
	.showcase-section-title {
		font-size: 1.15rem;
		font-weight: 600;
		margin: 0 0 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border);
	}
	.pane {
		padding: 1rem;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--muted) 35%, var(--background));
	}
</style>
