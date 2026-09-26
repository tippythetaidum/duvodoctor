<script lang="ts">
	let { mood = 'calm', size = 140 }: { mood?: 'calm' | 'pleased' | 'puzzled'; size?: number } =
		$props();

	const ink = '#121212';
	const skin = '#d9d9d9';
	const coat = '#f6f6f4';
	const scrubs = '#d20a2e';
	const armTurn = $derived(mood === 'pleased' ? 190 : mood === 'puzzled' ? 152 : 0);
</script>

<svg
	class="mascot"
	width={size}
	height={size * 1.25}
	viewBox="0 0 160 200"
	role="img"
	aria-label={mood === 'pleased'
		? 'A blocky doctor with one arm raised'
		: mood === 'puzzled'
			? 'A blocky doctor scratching their head'
			: 'A blocky doctor holding a clipboard'}
>
	<g stroke={ink} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
		<rect x="48" y="134" width="32" height="62" rx="4" fill={scrubs} />
		<rect x="80" y="134" width="32" height="62" rx="4" fill={scrubs} />

		<g transform="rotate({armTurn} 128 68)">
			<rect x="112" y="64" width="32" height="64" rx="4" fill={coat} stroke="none" />
			<rect x="112" y="115" width="32" height="13" rx="3" fill={skin} stroke="none" />
			<path d="M112 115h32" fill="none" />
			<rect x="112" y="64" width="32" height="64" rx="4" fill="none" />
		</g>

		<rect x="16" y="64" width="32" height="64" rx="4" fill={coat} stroke="none" />
		<rect x="16" y="115" width="32" height="13" rx="3" fill={skin} stroke="none" />
		<path d="M16 115h32" fill="none" />
		<rect x="16" y="64" width="32" height="64" rx="4" fill="none" />

		<rect x="48" y="64" width="64" height="80" rx="5" fill={coat} />
		<path d="M70 64l10 20 10-20z" fill={scrubs} />
		<path d="M80 84v60" fill="none" stroke-width="2" />
		<rect x="92" y="94" width="13" height="10" rx="1.5" fill="none" stroke-width="2" />
		<path d="M96 89v7" fill="none" stroke="#1f4fae" stroke-width="3" />
		<path d="M67 66c0 18 6 25 13 25s13-7 13-25" fill="none" stroke-width="3" />
		<circle cx="80" cy="95" r="5" fill="#c9d0d8" />

		<g transform="rotate(-8 18 120)">
			<rect x="2" y="100" width="30" height="40" rx="3" fill="#b98b52" />
			<rect x="6" y="106" width="22" height="30" fill="#ffffff" stroke="none" />
			<rect x="11" y="96" width="12" height="7" rx="2" fill={ink} />
			<path d="M10 114h14M10 120h10M10 126h12" fill="none" stroke-width="1.8" />
		</g>

		<rect x="58" y="26" width="44" height="40" rx="10" fill={skin} stroke="none" />
		<path d="M58 36h44" fill="none" stroke={scrubs} stroke-width="4" stroke-linecap="butt" />
		<rect x="58" y="26" width="44" height="40" rx="10" fill="none" />
		<circle cx="80" cy="34" r="9" fill="#d7dde4" />
		<circle cx="80" cy="34" r="3" fill={ink} stroke="none" />
	</g>

	<g fill={ink} stroke={ink} stroke-width="2.6" stroke-linecap="round">
		{#if mood === 'puzzled'}
			<ellipse cx="72" cy="50" rx="2.6" ry="3.6" stroke="none" />
			<ellipse cx="88" cy="49" rx="2.6" ry="3.8" stroke="none" />
			<path d="M84 43l8-2.5" fill="none" />
			<path d="M73 59q3.5-2.5 7 0t7 0" fill="none" />
		{:else if mood === 'pleased'}
			<ellipse cx="72" cy="49" rx="2.6" ry="3.8" stroke="none" />
			<ellipse cx="88" cy="49" rx="2.6" ry="3.8" stroke="none" />
			<path d="M71 55.5q9 10 18 0z" stroke-linejoin="round" />
		{:else}
			<ellipse cx="72" cy="49" rx="2.6" ry="3.8" stroke="none" />
			<ellipse cx="88" cy="49" rx="2.6" ry="3.8" stroke="none" />
			<path d="M73 57.5q7 4.5 14 0" fill="none" />
		{/if}
	</g>
</svg>

<style>
	.mascot {
		display: block;
		flex: none;
	}
</style>
