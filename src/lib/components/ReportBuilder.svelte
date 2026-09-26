<script lang="ts">
	import type { Analysis } from '$lib/types';
	import type { MatchResult } from '$lib/match/engine';
	import { buildReport, DISCOURSE_MAX_POST } from '$lib/report/forum';
	import { FORUM_CATEGORY } from '$lib/labels';

	let { analysis, result }: { analysis: Analysis; result: MatchResult } = $props();

	let cpu = $state('');
	let description = $state('');
	let steps = $state('');
	let expected = $state('');
	let removeServer = $state(false);
	let copied = $state<'idle' | 'done' | 'failed'>('idle');

	const report = $derived(buildReport(analysis, result, { cpu, description, steps, expected }, { removeServer }));

	const pieces = $derived.by(() => {
		const out: { text: string; removed: string | null }[] = [];
		const raw = report.raw;
		let pos = 0;
		for (const r of report.redacted.redactions) {
			if (r.start > pos) out.push({ text: raw.slice(pos, r.start), removed: null });
			out.push({ text: r.replacement, removed: r.kind });
			pos = r.end;
		}
		if (pos < raw.length) out.push({ text: raw.slice(pos), removed: null });
		return out;
	});

	const removedCounts = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const r of report.redacted.redactions) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
		return [...counts.entries()];
	});

	const KIND_WORDS: Record<string, string> = {
		username: 'username',
		'install-id': 'install id',
		token: 'token',
		email: 'email address',
		'launch-link': 'launch link',
		server: 'server address',
		host: 'computer name'
	};

	async function copy() {
		try {
			await navigator.clipboard.writeText(report.redacted.text);
			copied = 'done';
		} catch {
			copied = 'failed';
		}
		setTimeout(() => (copied = 'idle'), 4000);
	}

	function download() {
		const blob = new Blob([report.redacted.text], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'luduvo-bug-report.txt';
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
</script>

<section class="sheet report" aria-labelledby="report-heading" id="report">
	<h2 id="report-heading">Bug report for the forum</h2>
	<p>
		This follows the layout staff already answer. Your logs don't include your CPU, so type it in. Personal details are
		taken out before anything is copied or downloaded.
	</p>

	<div class="fields">
		<label>
			<span>CPU</span>
			<input type="text" bind:value={cpu} placeholder="For example: Intel Core i5-10210U" autocomplete="off" />
		</label>
		<label class="wide">
			<span>What happened?</span>
			<textarea bind:value={description} rows="3" placeholder="For example: a black screen for two seconds, then the window closes."></textarea>
		</label>
		<label>
			<span>Steps to reproduce</span>
			<textarea bind:value={steps} rows="3" placeholder={'1. Open the Luduvo website\n2. Press Join on any game'}></textarea>
		</label>
		<label>
			<span>What should have happened?</span>
			<textarea bind:value={expected} rows="3" placeholder="The game opens and I spawn in."></textarea>
		</label>
	</div>

	<label class="toggle">
		<input type="checkbox" bind:checked={removeServer} />
		<span>
			Also remove Luduvo's server address (the <code>IP:</code> and <code>connected to</code> lines). It's Luduvo's server,
			not yours, so staff find it useful.
		</span>
	</label>

	<h3>Preview</h3>
	<p class="removed" aria-live="polite">
		{#if removedCounts.length}
			Removed:
			{#each removedCounts as [kind, n], i}
				{n} × {KIND_WORDS[kind] ?? kind}{i < removedCounts.length - 1 ? ', ' : '.'}
			{/each}
		{:else}
			Nothing personal found to remove.
		{/if}
	</p>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex (keyboard users need to focus scrollable areas to scroll them) -->
	<pre class="preview" tabindex="0" role="region" aria-label="Report preview">{#each pieces as p}{#if p.removed}<mark title="removed {KIND_WORDS[p.removed] ?? p.removed}">{p.text}</mark>{:else}{p.text}{/if}{/each}</pre>

	{#if report.tooLong}
		<p class="warn">
			This is {report.length.toLocaleString('en-GB')} characters. The forum usually stops at {DISCOURSE_MAX_POST.toLocaleString(
				'en-GB'
			)}. Download the .txt and attach it instead of pasting.
		</p>
	{/if}

	<div class="actions">
		<button type="button" class="button" onclick={copy}>Copy for the forum</button>
		<button type="button" class="button quiet" onclick={download}>Download .txt</button>
		<span class="status" role="status">
			{copied === 'done' ? 'Copied. Paste it into a new topic.' : copied === 'failed' ? "Your browser blocked copying. Use Download instead." : ''}
		</span>
	</div>
	<p class="where">
		Post it in <a href={FORUM_CATEGORY[report.category]}>Bug Reports → {report.category} Bugs</a>. New forum accounts can't
		post links, but pasting this is fine.
	</p>
</section>

<style>
	.report {
		padding: 1.1rem 1.25rem;
		margin-top: 1.5rem;
	}
	h2 {
		font-size: var(--step-1);
	}
	h3 {
		font-size: 1.05rem;
		margin-top: 1rem;
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.8rem 1rem;
		margin-bottom: 0.8rem;
	}
	.fields .wide {
		grid-column: 1 / -1;
	}
	label span {
		display: block;
		font-weight: 700;
		margin-bottom: 0.2rem;
	}
	input[type='text'],
	textarea {
		width: 100%;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--ink-soft);
		border-radius: var(--radius);
		background: #fffef9;
		line-height: 1.4;
	}
	.toggle {
		display: flex;
		gap: 0.6rem;
		align-items: flex-start;
		max-width: var(--measure);
		cursor: pointer;
	}
	.toggle input {
		width: 1.15rem;
		height: 1.15rem;
		margin-top: 0.2rem;
		flex: none;
		accent-color: var(--ink);
	}
	.removed {
		font-size: var(--step--1);
		color: var(--ink-soft);
	}
	.preview {
		max-height: 24rem;
		overflow: auto;
		padding: 0.8rem;
		border: 1px solid var(--rule);
		background: #fffef9;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font-size: 0.78rem;
		line-height: 1.45;
		margin: 0 0 0.8rem;
	}
	mark {
		background: var(--highlight);
		color: var(--ink);
		padding: 0 0.1em;
		border-bottom: 2px solid var(--stamp);
	}
	.warn {
		color: var(--stamp-ink);
		font-weight: 700;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		align-items: center;
	}
	.status {
		font-size: var(--step--1);
	}
	.where {
		margin-top: 0.8rem;
		font-size: var(--step--1);
	}
</style>
