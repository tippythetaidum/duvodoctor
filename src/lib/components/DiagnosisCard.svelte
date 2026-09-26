<script lang="ts">
	import type { Diagnosis, Evidence } from '$lib/match/engine';
	import { BLAME, formatDate, forumHandle } from '$lib/labels';
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
</script>

<article class="card slip" class:child={depth > 0} class:selected={selected === sig.id} aria-labelledby="dx-{sig.id}">
	<header>
		<div class="meta">
			<span class="blame {sig.blame}">{BLAME[sig.blame]}</span>
			<span class="confidence">
				{d.confidence === 'exact' ? 'Exact match' : 'Partial match'}
			</span>
			{#if sig.unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}
		</div>
		<Stamp {sig} />
	</header>

	<h3 id="dx-{sig.id}">{sig.headline}</h3>

	{#if d.confidence === 'partial' && d.hint}
		<p class="hint">{d.hint}</p>
	{:else if d.confidence === 'exact' && d.evidence.length}
		<p class="why">Your log has the lines that define this issue.</p>
	{/if}

	{#if sig.cause}
		<p class="cause">
			<span class="label">Why</span>
			{sig.cause.text}
			{#if sig.cause.unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}
		</p>
	{/if}

	<section class="rx" aria-label="What to do now">
		<h4><span aria-hidden="true" class="rx-mark">Rx</span> What to do now</h4>
		<ol>
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
		<section class="dont" aria-label="Don't bother with">
			<h4>Don't bother with</h4>
			<ul>
				{#each sig.dont as item}<li>{item}</li>{/each}
			</ul>
		</section>
	{/if}

	{#if note}
		<blockquote class="staff">
			<p>“{note.quote}”</p>
			<footer>
				{note.handle}, Luduvo staff, <a href={note.url}>{formatDate(note.date)}</a>
				{#if note.unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}
				{#if note.context}<br /><span class="context">{note.context}</span>{/if}
			</footer>
		</blockquote>
	{/if}

	<footer class="slip-foot">
		<div class="actions">
			{#if d.evidence.length && onshow}
				<button type="button" class="button quiet" onclick={() => onshow?.(sig.id, d.evidence)}>
					Show the {d.evidence.length === 1 ? 'line' : `${Math.min(d.evidence.length, 200)} lines`} in your log
				</button>
			{/if}
			<a class="more" href="/issues/{sig.id}">Full issue page</a>
		</div>
		<details>
			<summary>Sources and credits</summary>
			<ul class="sources">
				{#each sig.sources as s}
					<li><a href={s.url}>{s.label}</a> <span class="ref">{forumHandle(s.url)}</span></li>
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
	</footer>
</article>

{#if d.children.length}
	<div class="chain" role="group" aria-label="What this then caused">
		<p class="chain-label">This then caused:</p>
		{#each d.children as child (child.sig.id)}
			<Self d={child} {build} depth={depth + 1} {selected} {onshow} />
		{/each}
	</div>
{/if}

<style>
	.slip {
		position: relative;
		padding: 1.1rem 1.25rem 0.9rem 1.6rem;
		margin-bottom: 1rem;
		border-left: 6px solid var(--ink);
	}
	.slip.child {
		border-left-color: var(--rule);
	}
	.slip.selected {
		outline: 3px solid var(--highlight);
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 0.6rem;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 0.6rem;
		align-items: center;
	}
	.blame {
		font-family: var(--mono);
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		padding: 0.1em 0.5em;
		border-radius: 2px;
		background: var(--tint-deep);
		color: var(--ink);
	}
	.blame.luduvo {
		background: #f3dcd9;
		color: var(--stamp-ink);
	}
	.blame.hardware {
		background: #e3e7ef;
	}
	.blame.network {
		background: #e2efe8;
		color: var(--green-ink);
	}
	.confidence {
		font-size: var(--step--1);
		color: var(--ink-soft);
	}
	h3 {
		font-size: var(--step-1);
		max-width: 52ch;
	}
	h4 {
		font-family: var(--body);
		font-size: var(--step--1);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 0.9rem 0 0.3rem;
		color: var(--ink-soft);
	}
	.rx-mark {
		font-family: var(--heading);
		font-size: 1.3rem;
		text-transform: none;
		color: var(--stamp);
		margin-right: 0.2rem;
	}
	.hint {
		background: var(--highlight-soft);
		border-left: 3px solid var(--highlight);
		padding: 0.4rem 0.7rem;
	}
	.why,
	.cause {
		color: var(--ink-soft);
	}
	.cause .label {
		margin-right: 0.4rem;
	}
	ol,
	ul {
		padding-left: 1.3rem;
	}
	li {
		margin-bottom: 0.3rem;
	}
	.dont li::marker {
		content: '× ';
		color: var(--stamp);
		font-weight: 700;
	}
	.staff {
		margin: 1rem 0 0.5rem;
		padding: 0.6rem 0.9rem;
		border: 1px dashed var(--rule);
		background: var(--tint);
	}
	.staff p {
		margin: 0 0 0.3rem;
		font-style: italic;
	}
	.staff footer {
		font-size: var(--step--1);
	}
	.context {
		color: var(--ink-soft);
	}
	.slip-foot {
		border-top: 1px solid var(--rule);
		margin-top: 0.9rem;
		padding-top: 0.6rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem 1rem;
		align-items: center;
	}
	.more {
		font-size: var(--step--1);
	}
	details {
		margin-top: 0.5rem;
		font-size: var(--step--1);
	}
	summary {
		cursor: pointer;
		min-height: 32px;
		display: flex;
		align-items: center;
	}
	.ref {
		font-family: var(--mono);
		font-size: 0.75rem;
		color: var(--ink-soft);
	}
	.chain {
		margin: -0.4rem 0 1rem 1.4rem;
		padding-left: 0.9rem;
		border-left: 2px dotted var(--rule);
	}
	.chain-label {
		font-family: var(--mono);
		font-size: 0.8rem;
		margin: 0 0 0.4rem;
		color: var(--page-ink-soft, var(--ink-soft));
	}
	@media (max-width: 480px) {
		.slip {
			padding: 0.9rem 0.9rem 0.8rem 1.1rem;
		}
		header {
			flex-direction: column-reverse;
			gap: 0.6rem;
		}
		.chain {
			margin-left: 0.4rem;
			padding-left: 0.6rem;
		}
	}
</style>
