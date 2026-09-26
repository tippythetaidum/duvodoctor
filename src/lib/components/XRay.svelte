<script lang="ts">
	import { tick } from 'svelte';
	import type { Analysis } from '$lib/types';
	import type { Evidence, MatchResult } from '$lib/match/engine';
	import { KIND_LABEL } from '$lib/labels';

	let {
		analysis,
		result,
		jump = null
	}: {
		analysis: Analysis;
		result: MatchResult;
		jump?: { evidence: Evidence[]; token: number } | null;
	} = $props();

	const ROW = 24;
	const OVERSCAN = 20;

	type Row =
		| { type: 'line'; n: number; text: string; level: string | null; evidence: boolean; knock: boolean }
		| { type: 'fold'; key: string; label: string; from: number; to: number; count: number };

	const PRIORITY: Record<string, number> = {
		client: 0,
		terminal: 0,
		crash: 1,
		studio: 2,
		app: 2,
		unknown: 3,
		'event-viewer': 3,
		launcher: 4,
		'launcher-update': 5,
		state: 6,
		settings: 7
	};
	const readable = $derived(
		analysis.files
			.map((f, i) => ({ f, i }))
			.filter(({ f }) => !f.binary && !f.empty && f.lines.length > 0)
			.sort((a, b) => (PRIORITY[a.f.kind] ?? 9) - (PRIORITY[b.f.kind] ?? 9) || a.i - b.i)
	);
	const firstEvidenceFile = $derived(result.flat[0]?.evidence[0]?.file);
	let active = $state(-1);
	$effect.pre(() => {
		if (!readable.some((r) => r.i === active)) {
			active = readable.find((r) => r.i === firstEvidenceFile)?.i ?? readable[0]?.i ?? -1;
		}
	});
	let expanded = $state(new Set<string>());
	let showAll = $state(false);
	let scrollTop = $state(0);
	let viewport = $state<HTMLDivElement | null>(null);
	let viewportHeight = $state(480);
	let focusLine = $state<number | null>(null);
	let wrap = $state(false);

	const current = $derived(readable.find((r) => r.i === active) ?? readable[0]);

	const noiseByLine = $derived.by(() => {
		const map = new Map<number, { id: string; label: string }>();
		if (!current) return map;
		for (const n of result.noise) {
			for (const e of n.evidence) {
				if (e.file === current.i) map.set(e.line, { id: n.sig.id, label: n.sig.fold?.label ?? n.sig.title });
			}
		}
		return map;
	});

	const evidenceLines = $derived.by(() => {
		const set = new Set<number>();
		if (!current) return set;
		for (const d of result.flat) for (const e of d.evidence) if (e.file === current.i) set.add(e.line);
		return set;
	});

	const rows = $derived.by(() => {
		const out: Row[] = [];
		if (!current) return out;
		const lines = current.f.lines;
		let i = 0;
		let afterEvidence = false;
		while (i < lines.length) {
			const l = lines[i];
			const noise = noiseByLine.get(l.n);
			if (noise && !showAll) {
				let j = i;
				while (j + 1 < lines.length && noiseByLine.get(lines[j + 1].n)?.id === noise.id) j++;
				const key = `${current.i}:${l.n}`;
				if (expanded.has(key)) {
					for (let k = i; k <= j; k++) {
						out.push({ type: 'line', n: lines[k].n, text: lines[k].text, level: lines[k].level, evidence: false, knock: false });
					}
				} else {
					out.push({ type: 'fold', key, label: noise.label, from: l.n, to: lines[j].n, count: j - i + 1 });
				}
				afterEvidence = false;
				i = j + 1;
				continue;
			}
			const evidence = evidenceLines.has(l.n);
			const knock: boolean = !evidence && afterEvidence && l.level === 'ERROR';
			afterEvidence = evidence || knock;
			out.push({ type: 'line', n: l.n, text: l.text, level: l.level, evidence, knock });
			i++;
		}
		return out;
	});

	const hasKnock = $derived(rows.some((r) => r.type === 'line' && r.knock));

	const stats = $derived.by(() => {
		if (!current) return null;
		const errors = current.f.lines.filter((l) => l.level === 'ERROR').length;
		return { lines: current.f.lines.length, errors, folded: noiseByLine.size };
	});

	const start = $derived(wrap ? 0 : Math.max(0, Math.floor(scrollTop / ROW) - OVERSCAN));
	const end = $derived(
		wrap ? rows.length : Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / ROW) + OVERSCAN)
	);
	const visible = $derived(rows.slice(start, end));

	function toggle(key: string) {
		const next = new Set(expanded);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		expanded = next;
	}

	async function goTo(file: number, line: number) {
		active = file;
		await tick();
		const idx = rows.findIndex((r) => (r.type === 'line' ? r.n === line : line >= r.from && line <= r.to));
		if (idx === -1) return;
		const row = rows[idx];
		if (row.type === 'fold') {
			toggle(row.key);
			await tick();
		}
		const target = rows.findIndex((r) => r.type === 'line' && r.n === line);
		focusLine = line;
		if (viewport && !wrap) viewport.scrollTop = Math.max(0, target * ROW - viewportHeight / 3);
		await tick();
		viewport?.querySelector<HTMLElement>(`[data-n="${line}"]`)?.focus();
	}

	$effect(() => {
		if (jump && jump.evidence.length) {
			const first = jump.evidence[0];
			void jump.token;
			goTo(first.file, first.line);
		}
	});

	$effect(() => {
		if (!viewport) return;
		const ro = new ResizeObserver(() => (viewportHeight = viewport?.clientHeight ?? 480));
		ro.observe(viewport);
		return () => ro.disconnect();
	});
</script>

{#if readable.length}
	<section class="xray card" aria-labelledby="xray-heading">
		<div class="bar card-head">
			<div>
				<h2 id="xray-heading">Log X-ray</h2>
				<p class="card-sub">Your log, with errors marked and the lines behind each diagnosis highlighted.</p>
			</div>
			<div class="controls">
				<label><input type="checkbox" bind:checked={showAll} /> Show folded lines</label>
				<label><input type="checkbox" bind:checked={wrap} /> Wrap long lines</label>
			</div>
		</div>
		{#if readable.length > 1}
			<div class="tabs" role="group" aria-label="Files">
				{#each readable as r}
					<button type="button" class="tab" aria-pressed={current?.i === r.i} onclick={() => (active = r.i)}>
						{r.f.name}
						<span class="kind">{KIND_LABEL[r.f.kind]}</span>
					</button>
				{/each}
			</div>
		{/if}
		{#if stats}
			<p class="stats">
				{stats.lines.toLocaleString('en-GB')} lines,
				{stats.errors} {stats.errors === 1 ? 'error' : 'errors'}{stats.folded
					? `, ${stats.folded.toLocaleString('en-GB')} harmless lines folded`
					: ''}.
				{#if current?.f.truncated}<strong>Only the first 25 MB was read.</strong>{/if}
			</p>
		{/if}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (keyboard users need to focus scrollable areas to scroll them) -->
		<div
			class="viewport"
			class:wrap
			bind:this={viewport}
			onscroll={(e) => (scrollTop = e.currentTarget.scrollTop)}
			tabindex="0"
			role="region"
			aria-label="Log lines for {current?.f.name}"
		>
			<div class="spacer" style:height={wrap ? 'auto' : `${rows.length * ROW}px`}>
				<div class="window" style:transform={wrap ? 'none' : `translateY(${start * ROW}px)`}>
					{#each visible as row (row.type === 'line' ? `l${row.n}` : row.key)}
						{#if row.type === 'fold'}
							<button type="button" class="row fold" onclick={() => toggle(row.key)}>
								<span class="gutter">{row.from}</span>
								<span class="text">▸ {row.count.toLocaleString('en-GB')} × {row.label}, folded. Show them.</span>
							</button>
						{:else}
							<div
								class="row"
								class:error={row.level === 'ERROR' && !row.knock}
								class:warning={row.level === 'WARNING'}
								class:evidence={row.evidence}
								class:knock={row.knock}
								class:focused={focusLine === row.n}
								data-n={row.n}
								tabindex="-1"
							>
								<span class="gutter">{row.n}</span><span class="text">{row.text}</span>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		</div>
		<p class="legend">
			<span class="swatch ev"></span> lines behind a diagnosis
			{#if hasKnock}<span class="swatch kn"></span> errors that follow on from it{/if}
			<span class="swatch er"></span> {hasKnock ? 'other errors' : 'errors'}
		</p>
	</section>
{/if}

<style>
	.xray {
		margin-top: 1.5rem;
		overflow: hidden;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem 1rem;
		font-size: 0.9rem;
	}
	.controls label {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 36px;
		cursor: pointer;
	}
	.controls input {
		width: 1.05rem;
		height: 1.05rem;
		accent-color: var(--primary);
	}
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		padding: 0.7rem 1.1rem 0;
	}
	.tab {
		min-height: 38px;
		padding: 0.2rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--muted);
		color: var(--fg);
		cursor: pointer;
		font-weight: 600;
		font-size: 0.88rem;
	}
	.tab:hover {
		background: var(--hover);
	}
	.tab[aria-pressed='true'] {
		background: var(--fg);
		color: var(--bg);
		border-color: var(--fg);
	}
	.kind {
		font-weight: 400;
		opacity: 0.8;
		margin-left: 0.3rem;
	}
	.stats {
		font-size: 0.88rem;
		color: var(--muted-fg);
		margin: 0;
		padding: 0.6rem 1.1rem;
	}
	.viewport {
		height: min(65vh, 34rem);
		overflow: auto;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
		background: var(--bg);
		font-family: var(--mono);
		font-size: 0.8rem;
		overscroll-behavior: contain;
	}
	.viewport.wrap {
		height: auto;
		max-height: min(80vh, 48rem);
	}
	.spacer {
		position: relative;
		min-width: max-content;
	}
	.wrap .spacer {
		min-width: 0;
	}
	.window {
		will-change: transform;
	}
	.row {
		display: flex;
		height: 24px;
		line-height: 24px;
		white-space: pre;
		width: 100%;
		padding: 0;
		margin: 0;
		border: 0;
		background: none;
		color: var(--fg);
		text-align: left;
		font: inherit;
	}
	.wrap .row {
		height: auto;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.gutter {
		flex: none;
		width: 4.2rem;
		padding-right: 0.6rem;
		margin-right: 0.7rem;
		text-align: right;
		color: var(--muted-fg);
		user-select: none;
		border-right: 1px solid var(--border);
		position: sticky;
		left: 0;
		background-color: var(--bg);
	}
	.text {
		padding-right: 1rem;
	}
	.row.warning .text {
		color: var(--warning-fg);
	}
	.row.error,
	.row.error .gutter {
		background-color: var(--danger-bg);
	}
	.row.error .text,
	.row.error .gutter {
		color: var(--danger-fg);
	}
	.row.evidence,
	.row.evidence .gutter {
		background-color: var(--mark-bg);
	}
	.row.evidence .text {
		color: var(--fg);
	}
	.row.evidence .gutter {
		color: var(--fg);
		box-shadow: inset 3px 0 0 var(--mark-line);
	}
	.row.knock .text {
		color: var(--muted-fg);
	}
	.row.knock .gutter {
		box-shadow: inset 3px 0 0 var(--border-strong);
	}
	.row.focused {
		outline: 2px solid var(--fg);
		outline-offset: -2px;
	}
	.fold {
		cursor: pointer;
		color: var(--muted-fg);
		background: var(--muted);
	}
	.fold .gutter {
		background-color: var(--muted);
	}
	.fold:hover .text {
		color: var(--fg);
		text-decoration: underline;
	}
	.legend {
		font-size: 0.85rem;
		color: var(--muted-fg);
		margin: 0;
		padding: 0.6rem 1.1rem 0.8rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem 0.6rem;
	}
	.swatch {
		display: inline-block;
		width: 1rem;
		height: 0.8rem;
		border-radius: 3px;
	}
	.swatch.ev {
		background: var(--mark-bg);
		box-shadow: inset 3px 0 0 var(--mark-line);
	}
	.swatch.er,
	.swatch.kn {
		background: var(--danger-bg);
		margin-left: 0.6rem;
	}
	.swatch.kn {
		background: var(--bg);
		box-shadow: inset 3px 0 0 var(--border-strong);
		outline: 1px solid var(--border);
	}
</style>
