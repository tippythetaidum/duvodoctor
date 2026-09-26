<script lang="ts">
	import { BLAME, OS_LABEL, SEVERITY, VENDOR_LABEL, formatDate, forumHandle } from '$lib/labels';
	import Stamp from '$lib/components/Stamp.svelte';
	import type { MatchRule, Pattern } from '$lib/match/catalog';

	let { data } = $props();
	const sig = $derived(data.sig);
	const note = $derived(sig.status.staff_note);

	function patterns(rule: MatchRule | undefined): string[] {
		if (!rule?.files) return [];
		return Object.values(rule.files).flatMap((fr) =>
			[...(fr?.all ?? []), ...(fr?.any ?? [])].map((p: Pattern) => (typeof p === 'string' ? p : p.re))
		);
	}
	const readable = (re: string) =>
		re
			.replace(/\\\\/g, '\\')
			.replace(/\\([[\]().+*?|{}^$])/g, '$1')
			.replace(/\.\*/g, '…')
			.replace(/\\d\+/g, 'N')
			.replace(/\\S\+/g, '…');
	const looksFor = $derived(patterns(sig.match).map(readable));
</script>

<svelte:head>
	<title>{sig.title} | Duvo Doctor</title>
	<meta name="description" content={sig.headline} />
</svelte:head>

<p class="crumb"><a href="/issues">Known issues</a> / {sig.ref === 'noise' ? 'harmless lines' : sig.ref}</p>

<article class="sheet page">
	<header>
		<div>
			<p class="meta">
				<span>{BLAME[sig.blame]}</span>
				<span>{SEVERITY[sig.severity]}</span>
				<span>{sig.platforms.map((p) => OS_LABEL[p]).join(', ')}{sig.vendors ? `, ${sig.vendors.map((v) => VENDOR_LABEL[v]).join(', ')}` : ''}</span>
				{#if sig.unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}
			</p>
			<h1>{sig.title}</h1>
		</div>
		{#if sig.blame !== 'noise'}<Stamp {sig} />{/if}
	</header>

	<p class="headline">{sig.headline}</p>

	<h2>What you see</h2>
	<p>{sig.summary}</p>

	<h2>Who's affected</h2>
	<p>{sig.who}</p>

	{#if sig.cause}
		<h2>Why it happens</h2>
		<p>{sig.cause.text} {#if sig.cause.unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}</p>
	{/if}

	<h2>What to do</h2>
	<ol>
		{#each sig.steps as step}
			<li>
				{step.text}
				{#if step.link}<a href={step.link.url}>{step.link.label}</a>{/if}
				{#if step.unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}
			</li>
		{/each}
	</ol>

	{#if sig.dont.length}
		<h2>Don't bother with</h2>
		<ul class="dont">
			{#each sig.dont as d}<li>{d}</li>{/each}
		</ul>
	{/if}

	<h2>Status</h2>
	<p>
		{#if sig.status.state === 'fixed'}
			Fixed{sig.status.fixed_in ? ` in build ${sig.status.fixed_in}` : ''}. If you still see it, update Luduvo first.
		{:else if sig.status.state === 'workaround'}
			There's a workaround, listed above.
		{:else if sig.status.state === 'open'}
			Still open as of build 44.
		{:else}
			No staff word on this one yet.
		{/if}
	</p>
	{#if note}
		<blockquote class="staff">
			<p>“{note.quote}”</p>
			<footer>
				{note.handle}, Luduvo staff, <a href={note.url}>{formatDate(note.date)}</a>
				{#if note.unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}
				{#if note.context}<br />{note.context}{/if}
			</footer>
		</blockquote>
	{/if}

	{#if data.causedBy.length || data.leadsTo.length}
		<h2>Linked issues</h2>
		<ul>
			{#each data.causedBy as c}<li>Often caused by <a href="/issues/{c.id}">{c.title}</a></li>{/each}
			{#each data.leadsTo as c}<li>Often leads to <a href="/issues/{c.id}">{c.title}</a></li>{/each}
		</ul>
	{/if}

	{#if looksFor.length}
		<h2>How the Doctor spots it</h2>
		<p>It looks for log lines like these (patterns, not exact text):</p>
		<ul class="patterns">
			{#each looksFor as p}<li><code>{p}</code></li>{/each}
		</ul>
	{:else if sig.symptoms?.length}
		<h2>How the Doctor spots it</h2>
		<p>This one doesn't leave a log. Pick it in the "No log? Pick what you saw" list on the <a href="/">Doctor page</a>.</p>
	{/if}

	<h2>Sources</h2>
	<ul>
		{#each sig.sources as s}<li><a href={s.url}>{s.label}</a> <span class="ref">{forumHandle(s.url)}</span></li>{/each}
	</ul>

	{#if sig.credits.length}
		<h2>Credits</h2>
		<ul>
			{#each sig.credits as c}<li><a href={c.url}>{c.handle}</a>, {c.for}</li>{/each}
		</ul>
	{/if}

	<p class="checked">Last checked {formatDate(sig.last_checked)}.</p>
</article>

<style>
	.crumb {
		font-size: 0.9rem;
	}
	.page {
		padding: 1.4rem 1.6rem;
		max-width: 52rem;
	}
	header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: flex-start;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem 0.9rem;
		font-family: var(--mono);
		font-size: 0.8rem;
		color: var(--muted-fg);
		margin-bottom: 0.4rem;
	}
	h1 {
		font-size: 1.4rem;
	}
	h2 {
		font-size: 1.1rem;
		margin-top: 1.4rem;
	}
	.headline {
		font-size: 1.2rem;
		line-height: 1.4;
	}
	.dont li::marker {
		content: '× ';
		color: var(--danger-fg);
		font-weight: 700;
	}
	.staff {
		margin: 0.6rem 0;
		padding: 0.6rem 0.9rem;
		border: 1px solid var(--border);
		background: var(--muted);
		border-radius: var(--radius-sm);
	}
	.staff p {
		font-style: italic;
		margin-bottom: 0.3rem;
	}
	.staff footer {
		font-size: 0.9rem;
	}
	.patterns code {
		font-size: 0.8rem;
	}
	.ref {
		font-family: var(--mono);
		font-size: 0.75rem;
		color: var(--muted-fg);
	}
	.checked {
		margin-top: 1.4rem;
		font-size: 0.9rem;
		color: var(--muted-fg);
	}
	@media (max-width: 560px) {
		.page {
			padding: 1rem;
		}
		header {
			flex-direction: column-reverse;
		}
	}
</style>
