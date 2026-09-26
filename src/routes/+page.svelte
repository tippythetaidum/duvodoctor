<script lang="ts">
	import catalogJson from '$data/signatures.json';
	import type { Catalog } from '$lib/match/catalog';
	import type { Evidence, MatchResult } from '$lib/match/engine';
	import type { Analysis } from '$lib/types';
	import type { Input } from '$lib/worker/protocol';
	import { onMount } from 'svelte';
	import { analyseInputs, warmUp } from '$lib/worker/client';
	import { KIND_LABEL } from '$lib/labels';
	import DiagnosisCard from '$lib/components/DiagnosisCard.svelte';
	import SetupPanel from '$lib/components/SetupPanel.svelte';
	import XRay from '$lib/components/XRay.svelte';
	import ReportBuilder from '$lib/components/ReportBuilder.svelte';
	import SymptomPicker from '$lib/components/SymptomPicker.svelte';
	import Mascot from '$lib/components/Mascot.svelte';
	import Notice from '$lib/components/Notice.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	const catalog = catalogJson as unknown as Catalog;
	const MAX_ITEMS = 12;

	interface Item {
		id: number;
		input: Input;
		name: string;
		size: number;
	}

	let items = $state<Item[]>([]);
	let nextId = 1;
	let pasteText = $state('');
	let busy = $state(false);
	let error = $state<string | null>(null);
	let done = $state<{ analysis: Analysis; result: MatchResult } | null>(null);
	let jump = $state<{ evidence: Evidence[]; token: number } | null>(null);
	let selected = $state<string | null>(null);
	let dragging = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	let runToken = 0;

	onMount(warmUp);

	async function run() {
		const token = ++runToken;
		selected = null;
		jump = null;
		if (!items.length) {
			done = null;
			busy = false;
			return;
		}
		busy = true;
		error = null;
		const res = await analyseInputs($state.snapshot(items).map((i) => i.input));
		if (token !== runToken) return;
		busy = false;
		if (res.ok) done = { analysis: res.analysis, result: res.result };
		else {
			done = null;
			error = res.error;
		}
	}

	function addFiles(list: FileList | File[] | null) {
		if (!list) return;
		const files = Array.from(list);
		const room = MAX_ITEMS - items.length;
		for (const file of files.slice(0, Math.max(0, room))) {
			items.push({ id: nextId++, input: { type: 'file', file }, name: file.name, size: file.size });
		}
		if (files.length > room) error = `That's more than ${MAX_ITEMS} files. I read the first ${Math.max(0, room)}.`;
		run();
	}

	function addPaste() {
		const text = pasteText;
		if (!text.trim()) return;
		const n = items.filter((i) => i.input.type === 'text').length + 1;
		const name = `pasted text ${n}`;
		items.push({ id: nextId++, input: { type: 'text', name, text }, name, size: text.length });
		pasteText = '';
		run();
	}

	function remove(id: number) {
		items = items.filter((i) => i.id !== id);
		run();
	}

	function clearAll() {
		items = [];
		error = null;
		run();
	}

	function show(id: string, evidence: Evidence[]) {
		selected = id;
		jump = { evidence, token: Date.now() };
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		addFiles(e.dataTransfer?.files ?? null);
	}

	function size(bytes: number) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}

	const anyUnconfirmed = $derived(
		!!done &&
			done.result.flat.some(
				(d) =>
					d.sig.unconfirmed ||
					d.sig.cause?.unconfirmed ||
					d.sig.status.staff_note?.unconfirmed ||
					d.sig.steps.some((s) => s.unconfirmed)
			)
	);

	const verdictText = $derived.by(() => {
		if (!done) return null;
		const n = done.result.flat.length;
		switch (done.result.verdict) {
			case 'problems':
				return n === 1
					? 'I found one known problem.'
					: `I found ${n} known problems. The first one is the root cause.`;
			case 'healthy':
				return "Nothing's wrong in these logs.";
			case 'inconclusive':
				return 'Nothing wrong so far, but the log stops early.';
			case 'unknown':
				return "I don't recognise this one yet.";
			case 'empty':
				return "There's nothing I can read in that.";
		}
	});
</script>

<svelte:head>
	<title>Duvo Doctor: why won't Luduvo start?</title>
	<meta
		name="description"
		content="Drop your Luduvo client.log and find out why the game won't start or join, in plain English. Your log never leaves your browser."
	/>
	<meta property="og:title" content="Duvo Doctor: why won't Luduvo start?" />
	<meta
		property="og:description"
		content="Drop your client.log in and find out if it's a Luduvo bug or your PC, and what to do. Your log never leaves your browser."
	/>
</svelte:head>

<Notice />

<section class="intake" aria-labelledby="intake-heading">
	<div class="intro">
		<h1 id="intake-heading">Luduvo won't start? Drop your log file here.</h1>
		<p class="lede">
			The file is called client.log, and it never leaves your browser. You'll find out whether it's a Luduvo bug or
			something on your PC, and what to do about it.
		</p>
		<div class="find">
			<p><strong>Where is it?</strong> On Windows, press <kbd>Win</kbd> + <kbd>R</kbd>, paste this and press Enter:</p>
			<div class="path">
				<code>%LocalAppData%\Luduvo\</code>
				<CopyButton text={'%LocalAppData%\\Luduvo\\'} />
			</div>
			<p class="find-more">
				It's rewritten every time Luduvo starts, so grab it straight after the game fails.
				<a href="/logs">Help finding it, and Linux or Mac</a>
			</p>
		</div>
	</div>

	<div
		class="drop card"
		class:dragging
		role="group"
		aria-labelledby="drop-label"
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={onDrop}
	>
		<svg class="drop-icon" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
			<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
			<path d="M14 3v5h5M12 17v-6M9.5 13.5 12 11l2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
		<p id="drop-label" class="drop-title">Drop log files here</p>
		<p class="drop-sub">
			<strong>client.log</strong> matters most. Add <strong>crash.log</strong> from the same folder if the game closed on you.
		</p>
		<p class="drop-also">It also reads launcher.log, app.log, studio.log, state.json and Settings.cfg.</p>
		<input
			bind:this={fileInput}
			id="file-input"
			class="visually-hidden"
			tabindex="-1"
			aria-hidden="true"
			type="file"
			multiple
			accept=".log,.txt,.json,.cfg,text/plain,application/json"
			onchange={(e) => {
				addFiles(e.currentTarget.files);
				e.currentTarget.value = '';
			}}
		/>
		<button type="button" class="button" onclick={() => fileInput?.click()}>Choose files</button>

		<details class="paste">
			<summary>Paste the text instead</summary>
			<label for="paste-box" class="paste-label">Open client.log in Notepad, copy everything, and paste it here.</label>
			<textarea
				id="paste-box"
				bind:value={pasteText}
				rows="6"
				spellcheck="false"
				placeholder="Paste client.log, crash.log or terminal output here"
			></textarea>
			<button type="button" class="button quiet" onclick={addPaste} disabled={!pasteText.trim()}>Check this text</button>
		</details>
	</div>
	<p class="privacy">
		Nothing is uploaded. This page isn't allowed to make network requests at all, and your browser enforces that.
		<a href="/about#privacy">How you can check</a>.
	</p>
</section>

{#if items.length}
	<section class="files" aria-label="Files you added">
		<ul>
			{#each items as item, i (item.id)}
				{@const parsed = done?.analysis.files[i]}
				<li class="chip">
					<span class="chip-name">{item.name}</span>
					<span class="chip-meta">
						{size(item.size)}{#if parsed}, {parsed.empty ? 'empty' : parsed.binary ? 'not a text file' : KIND_LABEL[parsed.kind]}{parsed.kindFrom ===
								'content' && !parsed.empty && !parsed.binary
								? ' (from its contents)'
								: ''}{/if}
					</span>
					{#if parsed?.truncated}<span class="chip-warn">only the first 25 MB was read</span>{/if}
					<button type="button" class="chip-x" onclick={() => remove(item.id)} aria-label="Remove {item.name}">×</button>
				</li>
			{/each}
		</ul>
		<button type="button" class="linkish" onclick={clearAll}>Start again</button>
	</section>
{/if}

<div aria-live="polite" class="live">
	{#if busy}<p class="busy">Reading your logs…</p>{/if}
	{#if error}<p class="error">{error}</p>{/if}
</div>

{#if done}
	<section class="results" aria-labelledby="verdict">
		<div class="main-col">
			<div class="verdict">
				{#if done.result.verdict === 'healthy'}<Mascot mood="pleased" size={92} />{/if}
				{#if done.result.verdict === 'unknown'}<Mascot mood="puzzled" size={92} />{/if}
				<div>
					<h2 id="verdict">{verdictText}</h2>
					{#each done.result.nudges as p}
						<p class="nudge">{p.text}</p>
					{/each}
				</div>
			</div>

			{#if done.result.verdict === 'healthy'}
				<div class="card next">
					<h3>If Luduvo still isn't working</h3>
					<ol>
						<li>
							client.log is replaced every time Luduvo starts. Run the game again and grab client.log straight after it
							fails.
						</li>
						<li>If the game closed on you, add crash.log from the same folder.</li>
						<li>If nothing gets written at all, <a href="/logs">check you've got the right folder</a>.</li>
					</ol>
				</div>
			{:else if done.result.verdict === 'unknown'}
				<div class="card next">
					<p>
						Your log has {done.result.unexplainedErrors.length}
						{done.result.unexplainedErrors.length === 1 ? 'error' : 'errors'} that don't match anything I know about yet.
						They're highlighted in the X-ray below.
					</p>
					<p>
						Use the report builder at the bottom to post it on the forum. Staff reply to reports in that layout, and it
						helps get this one added. <a href="/about#contribute">How new issues get added</a>.
					</p>
				</div>
			{:else if done.result.verdict === 'inconclusive'}
				<div class="card next">
					<p>Nothing in these files matches a known problem, and there are no errors.</p>
				</div>
			{/if}

			{#each done.result.diagnoses as d (d.sig.id)}
				<DiagnosisCard {d} build={done.analysis.setup.build} {selected} onshow={show} />
			{/each}
			{#if anyUnconfirmed}
				<p class="legend">
					<span class="unconfirmed">unconfirmed</span> means a player suggested it and nobody has confirmed it works yet.
				</p>
			{/if}
		</div>
		{#if done.result.verdict !== 'empty'}
			<aside class="side-col">
				<SetupPanel setup={done.analysis.setup} />
			</aside>
		{/if}
	</section>

	{#key done}
		<XRay analysis={done.analysis} result={done.result} {jump} />
	{/key}

	{#if done.result.verdict !== 'empty'}
		<ReportBuilder analysis={done.analysis} result={done.result} />
	{/if}
{:else if !items.length}
	<SymptomPicker {catalog} />
{/if}

<style>
	.intake {
		display: grid;
		gap: 1rem 2.5rem;
		grid-template-columns: 1fr;
		align-items: start;
	}
	@media (min-width: 900px) {
		.intake {
			grid-template-columns: 1.05fr 1fr;
		}
		.privacy {
			grid-column: 2;
		}
	}
	h1 {
		max-width: 18ch;
	}
	.lede {
		font-size: 1.15rem;
		color: var(--muted-fg);
	}
	.find {
		border-top: 1px solid var(--border);
		padding-top: 1rem;
	}
	.find p {
		margin-bottom: 0.6rem;
	}
	.find .path {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.8rem;
		margin-bottom: 0.6rem;
	}
	.find .path code {
		font-size: 1rem;
		padding: 0.3rem 0.55rem;
		background: var(--bg);
		border: 1px solid var(--border-strong);
	}
	.find-more {
		font-size: 0.92rem;
		color: var(--muted-fg);
	}
	.drop {
		padding: 1.4rem 1.4rem 1.2rem;
		border: 1px dashed var(--border-strong);
		background: var(--card);
	}
	.drop.dragging {
		border-color: var(--primary);
		background: var(--hover);
	}
	.drop-icon {
		color: var(--muted-fg);
		margin-bottom: 0.4rem;
	}
	.drop-title {
		font-size: 1.3rem;
		font-weight: 700;
		margin: 0 0 0.2rem;
	}
	.drop-sub {
		margin-bottom: 0.3rem;
	}
	.drop-also {
		font-size: 0.88rem;
		color: var(--muted-fg);
	}
	.paste {
		margin-top: 1rem;
		border-top: 1px solid var(--border);
		padding-top: 0.8rem;
	}
	.paste summary {
		display: inline-flex;
		align-items: center;
		gap: 0.45em;
		min-height: 44px;
		padding: 0.4em 1.1em;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--muted);
		font-weight: 600;
		cursor: pointer;
		list-style: none;
	}
	.paste summary::-webkit-details-marker {
		display: none;
	}
	.paste summary::before {
		content: '+';
		font-weight: 700;
	}
	.paste[open] summary::before {
		content: '−';
	}
	.paste summary:hover {
		background: var(--hover);
	}
	.paste-label {
		display: block;
		margin-top: 0.8rem;
		font-size: 0.92rem;
	}
	.paste textarea {
		width: 100%;
		font-family: var(--mono);
		font-size: 0.8rem;
		padding: 0.6rem 0.7rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--input);
		margin: 0.4rem 0 0.6rem;
		line-height: 1.45;
	}
	.paste textarea::placeholder {
		color: var(--muted-fg);
	}
	.privacy {
		font-size: 0.9rem;
		color: var(--muted-fg);
		margin: 0;
	}
	.files {
		margin-top: 1.5rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem 1rem;
	}
	.files ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0;
		max-width: none;
	}
	.chip {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.1rem 0.5rem;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.15rem 0.2rem 0.15rem 0.75rem;
	}
	.chip-name {
		font-family: var(--mono);
		font-size: 0.85rem;
	}
	.chip-meta,
	.chip-warn {
		font-size: 0.82rem;
		color: var(--muted-fg);
	}
	.chip-warn {
		color: var(--danger-fg);
	}
	.chip-x {
		min-width: 36px;
		min-height: 36px;
		border: 0;
		border-radius: var(--radius-sm);
		background: none;
		font-size: 1.25rem;
		cursor: pointer;
		color: var(--muted-fg);
	}
	.chip-x:hover {
		background: var(--hover);
		color: var(--fg);
	}
	.linkish {
		background: none;
		border: 0;
		padding: 0;
		min-height: 44px;
		color: var(--link);
		text-decoration: underline;
		cursor: pointer;
		font-weight: 600;
	}
	.live .busy,
	.live .error {
		margin-top: 1rem;
	}
	.error {
		color: var(--danger-fg);
		font-weight: 600;
	}
	.results {
		display: grid;
		gap: 1.5rem;
		margin-top: 1.5rem;
		grid-template-columns: 1fr;
		align-items: start;
	}
	@media (min-width: 1100px) {
		.results {
			grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
		}
		.side-col {
			position: sticky;
			top: 1rem;
		}
	}
	.verdict {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.verdict h2 {
		margin: 0;
		font-size: 1.5rem;
	}
	.nudge {
		margin: 0.5rem 0 0;
		background: var(--warning-bg);
		padding: 0.5rem 0.8rem;
		border-radius: var(--radius-sm);
	}
	.next {
		padding: 0.9rem 1.15rem 0.4rem;
		margin-bottom: 1rem;
	}
	.legend {
		font-size: 0.9rem;
		color: var(--muted-fg);
	}
	.legend .unconfirmed {
		margin-left: 0;
	}
	.next h3 {
		font-size: 1rem;
	}
</style>
