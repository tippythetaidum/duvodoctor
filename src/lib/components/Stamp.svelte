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

<span class="badge {tone}">{stampText(sig)}</span>
