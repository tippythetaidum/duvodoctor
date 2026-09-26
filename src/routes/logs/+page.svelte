<script lang="ts">
	import locations from '$data/locations.json';
	import { formatDate, forumHandle } from '$lib/labels';
	import CopyButton from '$lib/components/CopyButton.svelte';
</script>

<svelte:head>
	<title>Where are my Luduvo logs? | Duvo Doctor</title>
	<meta name="description" content="Where Luduvo keeps client.log, crash.log and Settings.cfg on Windows, and what we know about Linux and macOS." />
</svelte:head>

<h1>Where your logs live</h1>
<p class="lede">
	On Windows it's one folder. On Linux and macOS nobody has pinned it down yet, so this page says what's known and what
	isn't.
</p>

<ul class="facts">
	{#each locations.facts as f}
		<li>
			{f.text}
			{#each f.sources as s}<a class="src" href={s.url}>{forumHandle(s.url)}</a>{/each}
		</li>
	{/each}
</ul>

{#each locations.platforms as p (p.id)}
	<section class="platform" aria-labelledby="os-{p.id}">
		<h2 id="os-{p.id}">
			{p.name}
			{#if !p.confirmed}<span class="unconfirmed">not documented</span>{/if}
		</h2>
		<ol class="places">
			{#each p.places as place}
				<li class="sheet place">
					<h3>
						{place.what}
						{#if 'unconfirmed' in place && place.unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}
					</h3>
					{#if place.path}
						<div class="path">
							<code>{place.path}</code>
							<CopyButton text={place.path} />
						</div>
					{/if}
					<p>{place.how}</p>
					<p class="sources">
						Source:
						{#each place.sources as s, i}<a href={s.url}>{s.label}</a>{i < place.sources.length - 1 ? ', ' : ''}{/each}
					</p>
				</li>
			{/each}
		</ol>
	</section>
{/each}

<p class="credit">
	Thanks to matt, whose <a href="https://forum.luduvo.com/t/3852/1">Windows debug guide</a> this page builds on. Last checked
	{formatDate(locations.last_checked)}.
</p>

<style>
	.lede {
		font-size: 1.2rem;
		line-height: 1.45;
	}
	.facts {
		padding-left: 1.2rem;
	}
	.facts li {
		margin-bottom: 0.4rem;
	}
	.src {
		font-family: var(--mono);
		font-size: 0.78rem;
		margin-left: 0.4rem;
	}
	.platform {
		margin-top: 2rem;
	}
	.places {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.9rem;
		max-width: 52rem;
	}
	.place {
		padding: 0.9rem 1.1rem 0.5rem;
	}
	h3 {
		font-size: 1.08rem;
		font-family: var(--font);
	}
	.path {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.8rem;
		margin-bottom: 0.6rem;
	}
	.path code {
		font-size: 0.95rem;
		padding: 0.3rem 0.55rem;
		background: var(--bg);
		border: 1px solid var(--border-strong);
	}
	.sources {
		font-size: 0.9rem;
		color: var(--muted-fg);
	}
	.credit {
		margin-top: 2rem;
		font-size: 0.9rem;
	}
</style>
