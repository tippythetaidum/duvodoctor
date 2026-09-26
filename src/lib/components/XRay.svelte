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
		| { type: 'line'; n: number; text: string; level: string | null; evidence: boolean }
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
		while (i < lines.length) {
			const l = lines[i];
			const noise = noiseByLine.get(l.n);
			if (noise && !showAll) {
				let j = i;
				while (j + 1 < lines.length && noiseByLine.get(lines[j + 1].n)?.id === noise.id) j++;
				const key = `${current.i}:${l.n}`;
				if (expanded.has(key)) {
					for (let k = i; k <= j; k++) {
						out.push({ type: 'line', n: lines[k].n, text: lines[k].text, level: lines[k].level, evidence: false });
					}
				} else {
					out.push({ type: 'fold', key, label: noise.label, from: l.n, to: lines[j].n, count: j - i + 1 });
				}
				i = j + 1;
				continue;
			}
			out.push({ type: 'line', n: l.n, text: l.text, level: l.level, evidence: evidenceLines.has(l.n) });
			i++;
		}
		return out;
	});

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
	<section class="xray sheet" aria-labelledby="xray-heading">
		<div class="bar">
			<h2 id="xray-heading">Log X-ray</h2>
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
								class:error={row.level === 'ERROR'}
								class:warning={row.level === 'WARNING'}
								class:evidence={row.evidence}
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
			<span class="swatch er"></span> errors
		</p>
	</section>
{/if}

<style>
	.xray {
		padding: 1rem 1.2rem 0.8rem;
		margin-top: 1.5rem;
	}
	.bar {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem 1rem;
	}
	h2 {
		font-size: var(--step-1);
		margin: 0;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 1rem;
		font-size: var(--step--1);
	}
	.controls label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 36px;
		cursor: pointer;
	}
	.controls input {
		width: 1.1rem;
		height: 1.1rem;
		accent-color: var(--ink);
	}
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0.6rem 0 0.2rem;
	}
	.tab {
		min-height: 40px;
		padding: 0.25rem 0.7rem;
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--tint);
		color: var(--ink);
		cursor: pointer;
		font-family: var(--mono);
		font-size: 0.85rem;
	}
	.tab[aria-pressed='true'] {
		background: var(--ink);
		color: var(--card);
		border-color: var(--ink);
	}
	.kind {
		font-family: var(--body);
		font-size: 0.75rem;
		opacity: 0.8;
		margin-left: 0.3rem;
	}
	.stats {
		font-size: var(--step--1);
		color: var(--ink-soft);
		margin: 0.4rem 0;
	}
	.viewport {
		height: min(65vh, 34rem);
		overflow: auto;
		border: 1px solid var(--rule);
		background: #fffef9;
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
		color: var(--ink);
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
		text-align: right;
		color: #57533f;
		user-select: none;
		border-right: 1px solid var(--rule);
		margin-right: 0.6rem;
		position: sticky;
		left: 0;
		background: inherit;
		background-color: #fffef9;
	}
	.text {
		padding-right: 1rem;
	}
	.row.warning .text {
		color: #6b4b00;
	}
	.row.error {
		background: var(--error-bg);
	}
	.row.error .gutter {
		background-color: var(--error-bg);
		color: var(--stamp-ink);
		font-weight: 600;
	}
	.row.evidence,
	.row.evidence .gutter {
		background-color: var(--highlight);
	}
	.row.focused {
		outline: 2px solid var(--ink);
		outline-offset: -2px;
	}
	.fold {
		cursor: pointer;
		color: var(--ink-soft);
		font-style: italic;
		background: repeating-linear-gradient(135deg, transparent 0 6px, #f1ecde 6px 12px);
	}
	.fold:hover .text {
		text-decoration: underline;
	}
	.legend {
		font-size: var(--step--1);
		color: var(--ink-soft);
		margin: 0.5rem 0 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem 0.6rem;
	}
	.swatch {
		display: inline-block;
		width: 1rem;
		height: 0.8rem;
		border: 1px solid var(--rule);
	}
	.swatch.ev {
		background: var(--highlight);
	}
	.swatch.er {
		background: var(--error-bg);
		margin-left: 0.6rem;
	}
</style>
