<script lang="ts">
	import '$lib/styles/global.css';
	import { page } from '$app/state';
	import catalog from '$data/signatures.json';
	import luduvo from '$data/luduvo.json';
	import { formatDate } from '$lib/labels';

	let { children } = $props();

	const groups = [
		{ label: null, items: [{ href: '/', label: 'Check my logs', short: 'Check logs' }] },
		{
			label: 'Help',
			items: [
				{ href: '/logs', label: 'Find your logs', short: 'Find logs' },
				{ href: '/issues', label: 'Known issues', short: 'Issues' },
				{ href: '/requirements', label: 'What your PC needs', short: 'PC needs' }
			]
		},
		{ label: 'Site', items: [{ href: '/about', label: 'About', short: 'About' }] }
	];

	const isCurrent = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<svelte:head>
	{#if page.status === 200 && page.url.pathname !== '/404'}
		<link rel="canonical" href="https://duvodoctor.com{page.url.pathname}" />
		<meta property="og:url" content="https://duvodoctor.com{page.url.pathname}" />
	{/if}
	<meta name="theme-color" content="#d20a2e" />
	<meta property="og:site_name" content="Duvo Doctor" />
	<meta property="og:type" content="website" />
	<meta property="og:image" content="https://duvodoctor.com/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Duvo Doctor. Luduvo won't start? Drop your log file here." />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<a class="skip-link" href="#main">Skip to content</a>

<div class="shell">
	<header class="sidebar">
		<div class="brand-row">
			<a class="brand" href="/">
				<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
					<rect x="4" y="6" width="24" height="23" rx="6" fill="#d9d9d9" />
					<path d="M4 12h24" stroke="#d20a2e" stroke-width="2.6" />
					<rect x="4" y="6" width="24" height="23" rx="6" fill="none" stroke="#121212" stroke-width="1.8" />
					<circle cx="16" cy="11" r="4.6" fill="#d7dde4" stroke="#121212" stroke-width="1.6" />
					<circle cx="16" cy="11" r="1.4" fill="#121212" />
					<ellipse cx="11.8" cy="19" rx="1.4" ry="2" fill="#121212" />
					<ellipse cx="20.2" cy="19" rx="1.4" ry="2" fill="#121212" />
					<path d="M12 23.3q4 2.8 8 0" fill="none" stroke="#121212" stroke-width="1.7" stroke-linecap="round" />
				</svg>
				<span>Duvo Doctor</span>
			</a>
		</div>
		<nav aria-label="Main">
			{#each groups as g}
				{#if g.label}<p class="group-label">{g.label}</p>{/if}
				<ul>
					{#each g.items as item}
						<li>
							<a href={item.href} aria-current={isCurrent(item.href) ? 'page' : undefined}
								><span class="long">{item.label}</span><span class="short">{item.short}</span></a
							>
						</li>
					{/each}
				</ul>
			{/each}
		</nav>
		<a class="version" href="/about#changelog">
			<span class="version-top"><strong>Latest Luduvo build: {luduvo.latest_build}</strong></span>
			<span class="version-note" class:behind={luduvo.latest_build > catalog.build}>
				{catalog.signatures.filter((s) => s.blame !== 'noise').length} known issues, checked against build {catalog.build}
				on {formatDate(catalog.updated)}
			</span>
			<span class="version-link">View changelog →</span>
		</a>
	</header>

	<div class="content">
		<main id="main" tabindex="-1">
			{@render children()}
		</main>

		<footer class="site-foot">
			<p class="disclaimer">Unofficial fan tool. Not affiliated with or endorsed by Luduvo Corporation.</p>
			<p>
				Made by Tippy. Known issues last checked {formatDate(catalog.updated)}.
				<a href="/about#privacy">Your logs never leave your browser.</a>
				<a href="https://github.com/tippythetaidum/duvodoctor">Source code</a>
			</p>
		</footer>
	</div>
</div>

<style>
	.shell {
		display: grid;
		grid-template-columns: 1fr;
		min-height: 100vh;
	}
	.sidebar {
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		padding: 0.3rem 0 0;
		display: flex;
		flex-direction: column;
	}
	.brand-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0 1rem;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
		font-size: 1.2rem;
		color: var(--fg);
		text-decoration: none;
		min-height: 44px;
	}
	nav {
		display: flex;
		overflow-x: auto;
		scrollbar-width: none;
		padding: 0 0.5rem;
	}
	nav::-webkit-scrollbar {
		display: none;
	}
	nav ul {
		display: contents;
		list-style: none;
		margin: 0;
		padding: 0;
		max-width: none;
	}
	nav li {
		flex: 1 1 auto;
	}
	.group-label {
		display: none;
	}
	nav a {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0 0.5rem;
		color: var(--fg);
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
		white-space: nowrap;
	}
	nav a:hover {
		background: var(--hover);
	}
	nav a[aria-current='page'] {
		box-shadow: inset 0 -3px 0 var(--primary);
	}
	.long {
		display: none;
	}
	@media (min-width: 640px) {
		.long {
			display: inline;
		}
		.short {
			display: none;
		}
	}
	.version {
		display: none;
	}
	.content {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	main {
		flex: 1;
		width: min(100% - 2rem, 70rem);
		margin-inline: auto;
		padding-block: 1.6rem 3rem;
		outline: none;
		overflow-wrap: break-word;
	}
	.site-foot {
		border-top: 1px solid var(--border);
		padding: 1.1rem 1rem 1.5rem;
		font-size: 0.88rem;
		color: var(--muted-fg);
	}
	.site-foot p {
		width: min(100%, 70rem);
		margin: 0 auto 0.3rem;
		max-width: none;
	}
	.disclaimer {
		font-weight: 600;
		color: var(--fg);
	}
	.site-foot a {
		margin-right: 0.8rem;
	}
	@media (min-width: 960px) {
		.shell {
			grid-template-columns: var(--sidebar) minmax(0, 1fr);
		}
		.sidebar {
			position: sticky;
			top: 0;
			height: 100vh;
			flex-direction: column;
			flex-wrap: nowrap;
			align-items: stretch;
			gap: 0.3rem;
			padding: 0.9rem 0.7rem;
			border-bottom: 0;
			border-right: 1px solid var(--border);
			background: var(--card);
		}
		.brand-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.1rem;
			padding: 0 0.4rem 0.8rem;
		}		nav {
			flex-direction: column;
			align-items: stretch;
			overflow: visible;
			padding: 0;
		}
		nav ul {
			display: flex;
			flex-direction: column;
		}
		nav li {
			flex: none;
		}
		nav a {
			justify-content: flex-start;
			min-height: 40px;
			padding: 0 0.7rem;
			border-radius: var(--radius-sm);
			font-size: 0.95rem;
			white-space: normal;
		}
		nav a[aria-current='page'] {
			background: var(--muted);
			box-shadow: inset 3px 0 0 var(--primary);
		}
		.group-label {
			display: block;
			margin: 0.9rem 0.7rem 0.2rem;
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--muted-fg);
		}
		.version {
			display: flex;
			flex-direction: column;
			gap: 0.15rem;
			margin-top: auto;
			padding: 0.8rem 0.7rem 0.2rem;
			border-top: 1px solid var(--border);
			text-decoration: none;
			color: var(--fg);
			font-size: 0.82rem;
		}
		.version:hover .version-link {
			text-decoration: underline;
		}
		.version-note {
			color: var(--muted-fg);
		}
		.version-note.behind {
			color: var(--warning-fg);
		}
		.version-link {
			font-weight: 600;
		}
	}
</style>
