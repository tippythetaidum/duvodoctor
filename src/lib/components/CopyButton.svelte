<script lang="ts">
	let { text, label = 'Copy' }: { text: string; label?: string } = $props();
	let state = $state<'idle' | 'done' | 'failed'>('idle');

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
			state = 'done';
		} catch {
			state = 'failed';
		}
		setTimeout(() => (state = 'idle'), 2500);
	}
</script>

<button type="button" class="copy" onclick={copy} aria-label="{label}: {text}">
	{state === 'done' ? 'Copied' : state === 'failed' ? 'Select and copy it' : label}
</button>

<style>
	.copy {
		min-height: 36px;
		min-width: 5.5rem;
		padding: 0.2rem 0.7rem;
		border: 1px solid var(--ink);
		border-radius: var(--radius);
		background: var(--card);
		color: var(--ink);
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
	}
	.copy:hover {
		background: var(--highlight-soft);
	}
</style>
