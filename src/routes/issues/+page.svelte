<script lang="ts">
	import catalogJson from '$data/signatures.json';
	import type { Catalog, Signature } from '$lib/match/catalog';
	import { BLAME, OS_LABEL, SEVERITY, VENDOR_LABEL, formatDate } from '$lib/labels';
	import Stamp from '$lib/components/Stamp.svelte';
	import Notice from '$lib/components/Notice.svelte';

	const catalog = catalogJson as unknown as Catalog;
	const issues = catalog.signatures.filter((s) => s.blame !== 'noise');
	const noise = catalog.signatures.filter((s) => s.blame === 'noise');

	let os = $state('any');
	let vendor = $state('any');
	let status = $state('any');

	const matches = (s: Signature) =>
		(os === 'any' || s.platforms.includes('all') || s.platforms.includes(os as never)) &&
		(vendor === 'any' || !s.vendors || s.vendors.includes(vendor as never)) &&
		(status === 'any' || s.status.state === status);

	const shown = $derived(issues.filter(matches));
	const whoShort = (s: Signature) => {
		const where = s.platforms.includes('all') ? 'Any system' : s.platforms.map((p) => OS_LABEL[p]).join(', ');
		return s.vendors ? `${where} with ${s.vendors.map((v) => VENDOR_LABEL[v]).join(' or ')} graphics` : where;
	};
	const order = ['blocks-launch', 'blocks-join', 'crash-in-game', 'studio', 'info'] as const;
	const grouped = $derived(order.map((sev) => ({ sev, list: shown.filter((s) => s.severity === sev) })).filter((g) => g.list.length));
</script>

<svelte:head>
	<title>Known Luduvo issues | Duvo Doctor</title>
	<meta name="description" content="Every known reason Luduvo won't start or join, who it affects, whether there's a fix, and what staff last said." />
</svelte:head>

<Notice />

<h1>Known issues</h1>
<p class="lede">
	Every known reason Luduvo won't start, join or stay open, built from forum reports and staff replies. Last checked
	{formatDate(catalog.updated)}, against build {catalog.build}.
</p>
<p>
	Anything marked <span class="unconfirmed">unconfirmed</span> came from a player and nobody has confirmed it works yet.
	The log checker on the <a href="/">home page</a> uses exactly this list.
</p>

<form class="filters sheet" aria-label="Filter issues" onsubmit={(e) => e.preventDefault()}>
	<label>
		<span>Operating system</span>
		<select bind:value={os}>
			<option value="any">Any</option>
			<option value="windows">Windows</option>
			<option value="linux">Linux</option>
			<option value="macos">macOS</option>
		</select>
	</label>
	<label>
		<span>Graphics</span>
		<select bind:value={vendor}>
			<option value="any">Any</option>
			<option value="nvidia">NVIDIA</option>
			<option value="amd">AMD</option>
			<option value="intel">Intel</option>
		</select>
	</label>
	<label>
		<span>Status</span>
		<select bind:value={status}>
			<option value="any">Any</option>
			<option value="open">Not fixed yet</option>
			<option value="workaround">Has a workaround</option>
			<option value="fixed">Fixed</option>
			<option value="unknown">No word yet</option>
		</select>
	</label>
	<p class="count" aria-live="polite">{shown.length} of {issues.length} issues</p>
</form>

{#each grouped as g (g.sev)}
	<section class="group" aria-labelledby="sev-{g.sev}">
		<h2 id="sev-{g.sev}">{SEVERITY[g.sev]}</h2>
		<ul class="board">
			{#each g.list as s (s.id)}
				<li class="card issue">
					<div class="top">
						<span class="blame">{BLAME[s.blame]}</span>
						<Stamp sig={s} small />
					</div>
					<h3><a href="/issues/{s.id}">{s.title}</a></h3>
					<p class="said">“{s.summary}”</p>
					<dl>
						<dt>Who gets it</dt>
						<dd>{whoShort(s)}</dd>
						<dt>What to try</dt>
						<dd>
							{s.steps[0].text}
							{#if s.steps[0].unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}
						</dd>
						{#if s.status.staff_note}
							<dt>Staff</dt>
							<dd>
								“{s.status.staff_note.quote}” <a href={s.status.staff_note.url}>{s.status.staff_note.handle}, {formatDate(s.status.staff_note.date)}</a>
								{#if s.status.staff_note.unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}
							</dd>
						{/if}
					</dl>
					<p class="foot">
						<a href="/issues/{s.id}">Full details</a> · Last checked {formatDate(s.last_checked)}.
					</p>
				</li>
			{/each}
		</ul>
	</section>
{:else}
	<p>No issues match those filters.</p>
{/each}

<section class="group" aria-labelledby="noise">
	<h2 id="noise">Harmless lines the log checker hides</h2>
	<ul class="plain">
		{#each noise as s}
			<li><a href="/issues/{s.id}">{s.title}</a>: {s.headline}</li>
		{/each}
	</ul>
</section>

<style>
	.lede {
		font-size: 1.2rem;
		line-height: 1.45;
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem 1.2rem;
		align-items: end;
		padding: 0.9rem 1.1rem;
		margin: 1.5rem 0;
	}
	.filters label span {
		display: block;
		font-weight: 700;
		font-size: 0.9rem;
	}
	select {
		min-height: 44px;
		min-width: 10rem;
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--muted-fg);
		border-radius: var(--radius);
		background: var(--input);
		color: var(--fg);
	}
	.count {
		margin: 0 0 0.6rem auto;
		font-size: 0.9rem;
	}
	.group {
		margin-top: 2rem;
	}
	.board {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 21rem), 1fr));
		gap: 1rem;
		list-style: none;
		padding: 0;
		margin: 0;
		max-width: none;
	}
	.issue {
		padding: 0.9rem 1.1rem 0.7rem;
		display: flex;
		flex-direction: column;
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}
	.blame {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--muted-fg);
	}
	h3 {
		font-size: 1.15rem;
		margin: 0.6rem 0 0.3rem;
	}
	.said {
		font-style: italic;
		color: var(--muted-fg);
	}
	dl {
		margin: 0 0 0.6rem;
		font-size: 0.95rem;
	}
	dt {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--muted-fg);
		padding-top: 0.4rem;
	}
	dd {
		margin: 0.05rem 0 0;
	}
	.foot {
		margin-top: auto;
		font-size: 0.8rem;
		color: var(--muted-fg);
		border-top: 1px solid var(--border);
		padding-top: 0.4rem;
		margin-bottom: 0;
	}
	.plain li {
		margin-bottom: 0.4rem;
	}
</style>
