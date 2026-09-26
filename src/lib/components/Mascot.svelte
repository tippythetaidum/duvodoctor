<script lang="ts">
	let { mood = 'calm', size = 140 }: { mood?: 'calm' | 'pleased' | 'puzzled'; size?: number } =
		$props();
</script>

<svg
	class="mascot"
	width={size}
	height={size * 1.25}
	viewBox="0 0 160 200"
	role="img"
	aria-label={mood === 'pleased'
		? 'A blocky doctor giving a thumbs up'
		: mood === 'puzzled'
			? 'A blocky doctor scratching their head'
			: 'A blocky doctor holding a clipboard'}
>
	<!-- legs and body -->
	<rect x="56" y="150" width="20" height="40" rx="3" fill="#39465f" stroke="#1d2a44" stroke-width="3" />
	<rect x="84" y="150" width="20" height="40" rx="3" fill="#39465f" stroke="#1d2a44" stroke-width="3" />
	<rect x="44" y="92" width="72" height="64" rx="5" fill="#fffdf7" stroke="#1d2a44" stroke-width="3" />
	<path d="M80 92v64" stroke="#d9d3c3" stroke-width="2" />
	<rect x="90" y="104" width="14" height="10" rx="1.5" fill="none" stroke="#1d2a44" stroke-width="2" />
	<!-- stethoscope -->
	<path
		d="M64 92c0 22 8 30 16 30s16-8 16-30"
		fill="none"
		stroke="#1d2a44"
		stroke-width="3"
		stroke-linecap="round"
	/>
	<circle cx="80" cy="128" r="5" fill="#c8372d" stroke="#1d2a44" stroke-width="2.5" />
	<!-- arms -->
	{#if mood === 'pleased'}
		<rect x="116" y="70" width="18" height="42" rx="4" fill="#e9b98e" stroke="#1d2a44" stroke-width="3" />
		<rect x="118" y="58" width="9" height="16" rx="3" fill="#e9b98e" stroke="#1d2a44" stroke-width="3" />
	{:else if mood === 'puzzled'}
		<rect x="116" y="44" width="18" height="52" rx="4" fill="#e9b98e" stroke="#1d2a44" stroke-width="3" transform="rotate(-18 125 70)" />
	{:else}
		<rect x="116" y="96" width="18" height="46" rx="4" fill="#e9b98e" stroke="#1d2a44" stroke-width="3" />
	{/if}
	<rect x="26" y="96" width="18" height="46" rx="4" fill="#e9b98e" stroke="#1d2a44" stroke-width="3" />
	<!-- clipboard -->
	<g transform="rotate(-8 30 130)">
		<rect x="8" y="112" width="34" height="44" rx="3" fill="#c9a46a" stroke="#1d2a44" stroke-width="3" />
		<rect x="13" y="118" width="24" height="33" fill="#fffdf7" />
		<rect x="18" y="108" width="14" height="7" rx="2" fill="#1d2a44" />
		<path d="M17 126h16M17 133h12M17 140h14" stroke="#1d2a44" stroke-width="2" stroke-linecap="round" />
	</g>
	<!-- head -->
	<rect x="46" y="24" width="68" height="64" rx="8" fill="#e9b98e" stroke="#1d2a44" stroke-width="3" />
	<!-- head mirror band and mirror -->
	<path d="M46 40h68" stroke="#1d2a44" stroke-width="5" />
	<circle cx="80" cy="36" r="11" fill="#dfe6ee" stroke="#1d2a44" stroke-width="3" />
	<circle cx="80" cy="36" r="3" fill="#1d2a44" />
	<!-- face -->
	{#if mood === 'puzzled'}
		<rect x="62" y="56" width="8" height="8" rx="1.5" fill="#1d2a44" />
		<rect x="90" y="54" width="8" height="10" rx="1.5" fill="#1d2a44" />
		<path d="M68 76c6-3 16-3 24 1" fill="none" stroke="#1d2a44" stroke-width="3" stroke-linecap="round" />
	{:else}
		<rect x="62" y="54" width="8" height="10" rx="1.5" fill="#1d2a44" />
		<rect x="90" y="54" width="8" height="10" rx="1.5" fill="#1d2a44" />
		<path
			d={mood === 'pleased' ? 'M66 72c6 8 22 8 28 0' : 'M68 74c6 4 18 4 24 0'}
			fill="none"
			stroke="#1d2a44"
			stroke-width="3"
			stroke-linecap="round"
		/>
	{/if}
</svg>

<style>
	.mascot {
		display: block;
		flex: none;
	}
</style>
