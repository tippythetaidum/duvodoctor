<script lang="ts">
	import '$lib/styles/global.css';
	import { page } from '$app/state';
	import catalog from '$data/signatures.json';
	import { formatDate } from '$lib/labels';

	let { children } = $props();

	const nav = [
		{ href: '/', label: 'Doctor' },
		{ href: '/issues', label: 'Known issues' },
		{ href: '/logs', label: 'Find your logs' },
		{ href: '/requirements', label: 'Requirements' },
		{ href: '/about', label: 'About' }
	];

	const isCurrent = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<a class="skip-link" href="#main">Skip to content</a>

<header class="site-head">
	<div class="wrap head-inner">
		<a class="brand" href="/">
			<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
				<rect x="5" y="4" width="22" height="26" rx="3" fill="#fffdf7" stroke="currentColor" stroke-width="2.5" />
				<rect x="11" y="1.5" width="10" height="6" rx="1.5" fill="currentColor" />
				<path d="M10 14h12M10 19h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
				<path d="M17.5 24.5l2.5 2.5 5-6" fill="none" stroke="#c8372d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			<span>Duvo Doctor</span>
		</a>
		<nav aria-label="Main">
			<ul>
				{#each nav as item}
					<li>
						<a href={item.href} aria-current={isCurrent(item.href) ? 'page' : undefined}>{item.label}</a>
					</li>
				{/each}
			</ul>
		</nav>
	</div>
</header>

<main id="main" class="wrap" tabindex="-1">
	{@render children()}
</main>

<footer class="site-foot">
	<div class="wrap">
		<p class="disclaimer">Unofficial fan tool. Not affiliated with or endorsed by Luduvo Corporation.</p>
		<p>
			Made by Tippy. Known issues last checked {formatDate(catalog.updated)}.
			<a href="/about#privacy">Your logs never leave your browser.</a>
			<a href="https://github.com/tippythetaidum/duvodoctor">Source code</a>
		</p>
	</div>
</footer>

<style>
	.site-head {
		border-bottom: 2px solid var(--page-ink, var(--ink));
		background: var(--paper);
	}
	.head-inner {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem 1.5rem;
		padding-block: 0.7rem;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--heading);
		font-weight: 700;
		font-size: 1.45rem;
		color: var(--page-ink, var(--ink));
		text-decoration: none;
		min-height: 44px;
	}
	nav ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0 1.1rem;
		list-style: none;
		margin: 0;
		padding: 0;
		max-width: none;
	}
	nav a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--page-ink, var(--ink));
		text-decoration: none;
		font-weight: 700;
		border-bottom: 3px solid transparent;
	}
	nav a:hover {
		border-bottom-color: var(--rule);
	}
	nav a[aria-current='page'] {
		border-bottom-color: var(--stamp);
	}
	main {
		flex: 1;
		padding-block: 1.8rem 3rem;
		outline: none;
		overflow-wrap: break-word;
	}
	.site-foot {
		border-top: 2px solid var(--page-ink, var(--ink));
		padding-block: 1.2rem 1.6rem;
		font-size: var(--step--1);
		color: var(--page-ink-soft, var(--ink-soft));
	}
	.site-foot p {
		margin: 0 0 0.4rem;
	}
	.disclaimer {
		font-weight: 700;
		color: var(--page-ink, var(--ink));
	}
	.site-foot a {
		margin-right: 0.8rem;
	}
	@media (max-width: 560px) {
		nav ul {
			gap: 0 0.9rem;
			font-size: 0.95rem;
		}
	}
</style>
