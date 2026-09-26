<script lang="ts">
	import type { Catalog } from '$lib/match/catalog';
	import type { Diagnosis } from '$lib/match/engine';
	import { symptomChoices } from '$lib/match/symptoms';
	import DiagnosisCard from './DiagnosisCard.svelte';
	import Mascot from './Mascot.svelte';

	let { catalog }: { catalog: Catalog } = $props();

	const choices = $derived(symptomChoices(catalog));
	let picked = $state('');
	const choice = $derived(choices.find((c) => c.text === picked) ?? null);
	const diagnosis = $derived<Diagnosis | null>(
		choice
			? {
					sig: choice.sig,
					confidence: 'partial',
					evidence: [],
					children: [],
					needsUpdate: false,
					hint: 'This is based on what you picked, not on a log, so treat it as a best guess.'
				}
			: null
	);
</script>

<section class="picker" aria-labelledby="picker-heading">
	<div class="ask">
		<Mascot size={72} />
		<div class="ask-body">
			<h2 id="picker-heading">No log? Pick what you saw</h2>
			<p>Some problems happen before Luduvo writes anything. Pick the message or symptom closest to yours.</p>
			<label>
				<span class="visually-hidden">What did you see?</span>
				<select bind:value={picked}>
					<option value="">Choose what you saw…</option>
					{#each choices as c}
						<option value={c.text}>{c.text}</option>
					{/each}
				</select>
			</label>
		</div>
	</div>
	{#if diagnosis}
		<div class="answer">
			<DiagnosisCard d={diagnosis} build={null} />
		</div>
	{/if}
</section>

<style>
	.picker {
		margin-top: 2.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}
	.ask {
		display: flex;
		gap: 1.2rem;
		align-items: flex-start;
	}
	.ask-body {
		flex: 1;
		min-width: 0;
	}
	h2 {
		font-size: 1.2rem;
	}
	@media (max-width: 480px) {
		.ask {
			flex-direction: column;
			gap: 0.4rem;
		}
	}
	select {
		width: 100%;
		max-width: 40rem;
		min-height: 44px;
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--muted-fg);
		border-radius: var(--radius);
		background: var(--card);
		color: var(--fg);
	}
	.answer {
		margin-top: 1rem;
	}
</style>
