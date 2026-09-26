<script lang="ts">
	import type { Catalog } from '$lib/match/catalog';
	import type { Diagnosis } from '$lib/match/engine';
	import { symptomChoices } from '$lib/match/symptoms';
	import DiagnosisCard from './DiagnosisCard.svelte';

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
	{#if diagnosis}
		<div class="answer">
			<DiagnosisCard d={diagnosis} build={null} />
		</div>
	{/if}
</section>

<style>
	.picker {
		margin-top: 2rem;
	}
	h2 {
		font-size: var(--step-1);
	}
	select {
		width: 100%;
		max-width: 40rem;
		min-height: 44px;
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--ink-soft);
		border-radius: var(--radius);
		background: var(--card);
		color: var(--ink);
	}
	.answer {
		margin-top: 1rem;
	}
</style>
