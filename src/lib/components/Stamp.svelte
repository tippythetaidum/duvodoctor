<script lang="ts">
	import type { Signature } from '$lib/match/catalog';
	import { stampText } from '$lib/labels';

	let { sig, small = false }: { sig: Signature; small?: boolean } = $props();
	const tone = $derived(
		sig.status.state === 'fixed' ? 'green' : sig.status.state === 'open' ? 'red' : 'ink'
	);
</script>

<span class="stamp {tone}" class:small>{stampText(sig)}</span>

<style>
	.stamp {
		display: inline-block;
		font-family: var(--heading);
		font-weight: 700;
		font-size: 1rem;
		line-height: 1;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		padding: 0.35em 0.55em 0.3em;
		border: 3px double currentColor;
		border-radius: 4px;
		transform: rotate(-4deg);
		white-space: nowrap;
	}
	.small {
		font-size: 0.78rem;
		border-width: 2px;
		border-style: solid;
		transform: rotate(-2deg);
	}
	.red {
		color: var(--stamp-ink);
	}
	.green {
		color: var(--green-ink);
	}
	.ink {
		color: var(--ink-soft);
	}
</style>
