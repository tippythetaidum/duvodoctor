<script lang="ts">
	import type { Diagnosis, Evidence } from '$lib/match/engine';
	import { BLAME, formatDate, sourceSite } from '$lib/labels';
	import Stamp from './Stamp.svelte';
	import Self from './DiagnosisCard.svelte';

	let {
		d,
		build,
		depth = 0,
		selected = null,
		onshow
	}: {
		d: Diagnosis;
		build: number | null;
		depth?: number;
		selected?: string | null;
		onshow?: (id: string, evidence: Evidence[]) => void;
	} = $props();

	const sig = $derived(d.sig);
	const note = $derived(sig.status.staff_note);
	const blameTone = $derived(
		sig.blame === 'luduvo' ? 'red' : sig.blame === 'network' ? 'blue' : sig.blame === 'hardware' ? 'amber' : ''
	);
</script>

<article class="card slip" class:child={depth > 0} class:selected={selected === sig.id} aria-labelledby="dx-{sig.id}">
	<div class="top">
		<div class="meta">
			<span class="blame {blameTone}">{BLAME[sig.blame]}</span>
			<span class="confidence">{d.confidence === 'exact' ? 'Definite match' : 'Possible match'}</span>
			{#if sig.unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}
		</div>
		<Stamp {sig} />
	</div>

	<h3 id="dx-{sig.id}">{sig.headline}</h3>

	{#if d.confidence === 'partial' && d.hint}
		<p class="hint">{d.hint}</p>
	{:else if d.confidence === 'exact' && d.evidence.length}
		<p class="why muted">Your log has the lines that define this issue.</p>
	{/if}

	<section aria-label="What to do now">
		<h4>What to do now</h4>
		<ol class="steps">
			{#if d.needsUpdate}
				<li>
					<strong>Update Luduvo.</strong> You're on build {build} and this was fixed in build {sig.status.fixed_in}.
				</li>
			{/if}
			{#each sig.steps as step}
				<li>
					{step.text}
					{#if step.link}<a href={step.link.url}>{step.link.label}</a>{/if}
					{#if step.unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}
				</li>
			{/each}
		</ol>
	</section>

	{#if sig.dont.length}
		<section aria-label="Don't bother with">
			<h4>Don't bother with</h4>
			<ul class="dont">
				{#each sig.dont as item}<li>{item}</li>{/each}
			</ul>
		</section>
	{/if}

	{#if sig.cause}
		<details class="cause">
			<summary>Why this happens</summary>
			<p>
				{sig.cause.text}
				{#if sig.cause.unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}
			</p>
		</details>
	{/if}

	{#if note}
		<blockquote class="staff">
			<p>“{note.quote}”</p>
			<footer>
				<strong>{note.handle}</strong>, Luduvo staff · <a href={note.url}>{formatDate(note.date)}</a>
				{#if note.unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}
				{#if note.context}<br /><span class="muted">{note.context}</span>{/if}
			</footer>
		</blockquote>
	{/if}

	<div class="slip-foot">
		<div class="actions">
			{#if d.evidence.length && onshow}
				<button type="button" class="button quiet" onclick={() => onshow?.(sig.id, d.evidence)}>
					Show the {d.evidence.length === 1 ? 'line' : `${Math.min(d.evidence.length, 200)} lines`} in your log
				</button>
			{/if}
			<a class="more" href="/issues/{sig.id}">Full issue page →</a>
		</div>
		<details>
			<summary>Sources and credits</summary>
			<ul class="sources">
				{#each sig.sources as s}
					<li><a href={s.url}>{s.label}</a> <span class="ref">{sourceSite(s.url)}</span></li>
				{/each}
			</ul>
			{#if sig.credits.length}
				<p class="credits">
					Thanks to
					{#each sig.credits as c, i}
						<a href={c.url}>{c.handle}</a> ({c.for}){i < sig.credits.length - 1 ? ', ' : '.'}
					{/each}
				</p>
			{/if}
		</details>
	</div>
</article>

{#if d.children.length}
	<div class="chain" role="group" aria-label="What this then caused">
		<p class="chain-label">This then caused</p>
		{#each d.children as child (child.sig.id)}
			<Self d={child} {build} depth={depth + 1} {selected} {onshow} />
		{/each}
	</div>
{/if}

<style>
	.slip {
		padding: 1rem 1.15rem 0.8rem;
		margin-bottom: 0.9rem;
	}
	.slip.selected {
		border-color: var(--mark-line);
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 0.7rem;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 0.6rem;
		align-items: center;
	}
	.blame {
		font-size: 0.88rem;
		font-weight: 700;
	}
	.blame.red {
		color: var(--danger-fg);
	}
	.blame.amber {
		color: var(--warning-fg);
	}
	.blame.blue {
		color: var(--info-fg);
	}
	.confidence {
		font-size: 0.85rem;
		color: var(--muted-fg);
	}
	h3 {
		font-size: 1.15rem;
		max-width: 56ch;
	}
	h4 {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--muted-fg);
		margin: 0.9rem 0 0.35rem;
	}
	.hint {
		background: var(--warning-bg);
		color: var(--fg);
		border-radius: var(--radius-sm);
		padding: 0.5rem 0.75rem;
	}
	.cause p {
		margin: 0.2rem 0 0.4rem;
	}
	.steps,
	.dont {
		padding-left: 1.3rem;
	}
	li {
		margin-bottom: 0.3rem;
	}
	.dont li::marker {
		content: '× ';
		color: var(--danger-fg);
		font-weight: 700;
	}
	.staff {
		margin: 1rem 0 0.4rem;
		padding: 0.65rem 0.85rem;
		background: var(--muted);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}
	.staff p {
		margin: 0 0 0.3rem;
	}
	.staff footer {
		font-size: 0.88rem;
		color: var(--muted-fg);
	}
	.staff footer strong {
		color: var(--fg);
	}
	.slip-foot {
		border-top: 1px solid var(--border);
		margin-top: 0.9rem;
		padding-top: 0.7rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem 1rem;
		align-items: center;
	}
	.more {
		font-size: 0.92rem;
		font-weight: 600;
	}
	details {
		margin-top: 0.4rem;
		font-size: 0.9rem;
	}
	summary {
		cursor: pointer;
		min-height: 36px;
		display: flex;
		align-items: center;
		color: var(--muted-fg);
		font-weight: 600;
	}
	.ref {
		font-family: var(--mono);
		font-size: 0.75rem;
		color: var(--muted-fg);
	}
	.chain {
		margin: -0.2rem 0 1rem 1.1rem;
		padding-left: 0.9rem;
		border-left: 2px solid var(--border-strong);
	}
	.chain-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--muted-fg);
		margin: 0 0 0.4rem;
	}
	@media (max-width: 480px) {
		.slip {
			padding: 0.85rem 0.9rem 0.7rem;
		}
		.top {
			flex-wrap: wrap;
		}
		.chain {
			margin-left: 0.3rem;
			padding-left: 0.6rem;
		}
	}
</style>
