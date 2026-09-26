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
</svelte:head>

<section class="intake" aria-labelledby="intake-heading">
	<div class="intro">
		<h1 id="intake-heading">Luduvo won't start? Drop your client.log here.</h1>
		<p class="lede">
			It never leaves your browser. You'll find out whether it's a Luduvo bug or something on your PC, and what to do
			about it.
		</p>
		<p class="find">Not sure where it is? <a href="/logs">Here's where your logs live</a>.</p>
	</div>

	<div
		class="drop sheet"
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
		<p id="drop-label" class="drop-title">Drop log files here</p>
		<p class="drop-sub">
			client.log, crash.log, launcher.log, app.log, studio.log, state.json or Settings.cfg. Several at once is best.
		</p>
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
			<summary>Or paste the text instead</summary>
			<label for="paste-box" class="visually-hidden">Paste log text</label>
			<textarea
				id="paste-box"
				bind:value={pasteText}
				rows="6"
				spellcheck="false"
				placeholder="Paste client.log, crash.log or terminal output here"
			></textarea>
			<button type="button" class="button quiet" onclick={addPaste} disabled={!pasteText.trim()}>Read pasted text</button>
		</details>
	</div>
	<p class="privacy">
		Nothing is uploaded. This page isn't allowed to make network requests at all, and your browser enforces that.
		<a href="/about#privacy">How that works</a>.
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
					{#each done.result.prompts as p}
						<p class="prompt">{p.text}</p>
					{/each}
				</div>
			</div>

			{#if done.result.verdict === 'healthy'}
				<div class="sheet next">
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
				<div class="sheet next">
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
				<div class="sheet next">
					<p>Nothing in these files matches a known problem, and there are no errors.</p>
				</div>
			{/if}

			{#each done.result.diagnoses as d (d.sig.id)}
				<DiagnosisCard {d} build={done.analysis.setup.build} {selected} onshow={show} />
			{/each}
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
	<section class="empty" aria-label="How it works">
		<Mascot size={110} />
		<ol class="how">
			<li><strong>Find client.log.</strong> On Windows, press <kbd>Win</kbd> + <kbd>R</kbd> and paste <code>%LocalAppData%\Luduvo\</code>.</li>
			<li><strong>Drop it in the box above</strong>, with crash.log if the game closed on you.</li>
			<li><strong>Read what's wrong</strong>, what to do, and what not to bother with.</li>
		</ol>
	</section>
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
			grid-template-columns: 1.1fr 1fr;
		}
		.privacy {
			grid-column: 2;
		}
	}
	h1 {
		max-width: 16ch;
	}
	.lede {
		font-size: var(--step-1);
		line-height: 1.45;
	}
	.drop {
		padding: 1.3rem 1.4rem;
		border: 2px dashed var(--ink-soft);
		text-align: left;
		transform: rotate(0.4deg);
	}
	.drop.dragging {
		border-color: var(--stamp);
		background: var(--highlight-soft);
	}
	.drop-title {
		font-family: var(--heading);
		font-size: var(--step-2);
		margin: 0 0 0.3rem;
	}
	.drop-sub {
		font-size: var(--step--1);
		color: var(--ink-soft);
	}
	.paste {
		margin-top: 1rem;
	}
	.paste summary {
		cursor: pointer;
		min-height: 40px;
		display: flex;
		align-items: center;
		font-weight: 700;
	}
	.paste textarea {
		width: 100%;
		font-family: var(--mono);
		font-size: 0.8rem;
		padding: 0.6rem;
		border: 1px solid var(--ink-soft);
		border-radius: var(--radius);
		background: #fffef9;
		margin: 0.4rem 0 0.6rem;
		line-height: 1.4;
	}
	.privacy {
		font-size: var(--step--1);
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
		color: var(--ink);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		padding: 0.2rem 0.2rem 0.2rem 0.7rem;
	}
	.chip-name {
		font-family: var(--mono);
		font-weight: 600;
		font-size: 0.85rem;
	}
	.chip-meta,
	.chip-warn {
		font-size: 0.8rem;
		color: var(--ink-soft);
	}
	.chip-warn {
		color: var(--stamp-ink);
	}
	.chip-x {
		min-width: 36px;
		min-height: 36px;
		border: 0;
		background: none;
		font-size: 1.3rem;
		cursor: pointer;
		color: var(--ink-soft);
	}
	.linkish {
		background: none;
		border: 0;
		padding: 0;
		min-height: 44px;
		color: var(--link-on-page, var(--link));
		text-decoration: underline;
		cursor: pointer;
	}
	.live .busy,
	.live .error {
		margin-top: 1rem;
	}
	.error {
		color: var(--stamp);
		font-weight: 700;
	}
	.results {
		display: grid;
		gap: 1.5rem;
		margin-top: 1.5rem;
		grid-template-columns: 1fr;
		align-items: start;
	}
	@media (min-width: 1000px) {
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
	}
	.prompt {
		margin: 0.5rem 0 0;
		background: var(--highlight-soft);
		color: var(--ink);
		padding: 0.4rem 0.7rem;
		border-left: 3px solid var(--highlight);
	}
	.next {
		padding: 0.9rem 1.2rem;
		margin-bottom: 1rem;
	}
	.next h3 {
		font-size: 1.05rem;
	}
	.empty {
		display: flex;
		gap: 1.5rem;
		align-items: center;
		margin-top: 2.2rem;
	}
	.how {
		margin: 0;
	}
	.how li {
		margin-bottom: 0.5rem;
	}
	@media (max-width: 560px) {
		.empty {
			flex-direction: column;
			align-items: flex-start;
		}
		.drop {
			transform: none;
		}
	}
</style>
