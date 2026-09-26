<script lang="ts">
	import req from '$data/requirements.json';
	import catalog from '$data/signatures.json';
	import { formatDate } from '$lib/labels';
</script>

<svelte:head>
	<title>What Luduvo needs to run (unofficial) | Duvo Doctor</title>
	<meta name="description" content="Luduvo's real hardware requirements, worked out from the engine's own error messages. Unofficial." />
</svelte:head>

<h1>What Luduvo actually needs</h1>
<p class="lede">
	Luduvo hasn't published hardware requirements. This is <strong>unofficial</strong>, worked out from the engine's own
	error messages and staff replies. Every line links to where it came from.
</p>

{#each req.groups as g}
	<section class="sheet group" aria-labelledby="req-{g.title}">
		<h2 id="req-{g.title}">{g.title}</h2>
		<ul>
			{#each g.items as item}
				<li>
					{item.text}
					{#if 'unconfirmed' in item && item.unconfirmed}<span class="unconfirmed">unconfirmed</span>{/if}
					<span class="sources">
						{#each item.sources as s, i}<a href={s.url}>{s.label}</a>{i < item.sources.length - 1 ? ', ' : ''}{/each}
					</span>
				</li>
			{/each}
		</ul>
	</section>
{/each}

<section class="sheet group" aria-labelledby="req-features">
	<h2 id="req-features">Vulkan features the engine asks for</h2>
	<p>On top of Vulkan 1.3 itself. If your driver lacks any of these, Luduvo skips that graphics card.</p>
	<ul class="features">
		{#each req.vulkan_features.features as f}<li><code>{f}</code></li>{/each}
	</ul>
	<p class="sources">Source: <a href={req.vulkan_features.source.url}>{req.vulkan_features.source.label}</a></p>
</section>

<p class="checked">Last checked {formatDate(req.last_checked)}, against build {catalog.build}.</p>

<style>
	.lede {
		font-size: 1.2rem;
		line-height: 1.45;
	}
	.group {
		padding: 1rem 1.3rem 0.4rem;
		margin-top: 1.2rem;
		max-width: 52rem;
	}
	h2 {
		font-size: 1.2rem;
	}
	li {
		margin-bottom: 0.6rem;
	}
	.sources {
		display: block;
		font-size: 0.9rem;
		color: var(--muted-fg);
	}
	.features {
		columns: 2 16rem;
		padding-left: 1.1rem;
	}
	.features li {
		margin-bottom: 0.2rem;
		break-inside: avoid;
	}
	.checked {
		margin-top: 1.5rem;
		font-size: 0.9rem;
	}
</style>
