<script lang="ts">
	import type { Signature } from '$lib/match/catalog';
	import { stampText } from '$lib/labels';

	let { sig }: { sig: Signature; small?: boolean } = $props();
	const tone = $derived(
		sig.status.state === 'fixed'
			? 'green'
			: sig.status.state === 'open'
				? 'red'
				: sig.status.state === 'workaround'
					? 'amber'
					: ''
	);
</script>

<span class="badge {tone}"><span class="dot" aria-hidden="true"></span>{stampText(sig)}</span>

<style>
	.dot {
		width: 0.45em;
		height: 0.45em;
		border-radius: 50%;
		background: currentColor;
	}
</style>
