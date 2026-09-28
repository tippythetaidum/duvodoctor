<script lang="ts">
	import catalogJson from '$data/signatures.json';
	import changelog from '$data/changelog.json';
	import type { Catalog, Credit } from '$lib/match/catalog';
	import { formatDate } from '$lib/labels';

	const catalog = catalogJson as unknown as Catalog;
	const community = new Map<string, Credit[]>();
	for (const s of catalog.signatures) {
		for (const c of s.credits) {
			const list = community.get(c.handle) ?? [];
			if (!list.some((x) => x.url === c.url)) list.push(c);
			community.set(c.handle, list);
		}
	}
	const extra: Credit[] = [
		{ handle: 'matt', url: 'https://forum.luduvo.com/t/3852/1', for: 'the Windows debug guide' },
		{ handle: 'matt', url: 'https://forum.luduvo.com/t/2616/154', for: 'showing the IP: line is Luduvo\u2019s server' },
		{ handle: 'matt', url: 'https://forum.luduvo.com/t/4137/3', for: 'warning that Win + R instructions look like a scam to browsers' },
		{ handle: 'Jediweirdo', url: 'https://forum.luduvo.com/t/2649/1', for: 'the bug report layout the report builder uses' }
	];
	for (const c of extra) {
		const list = community.get(c.handle) ?? [];
		if (!list.some((x) => x.url === c.url && x.for === c.for)) list.push(c);
		community.set(c.handle, list);
	}
	const people = [...community.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

	const staff = new Map<string, { url: string; date: string }[]>();
	for (const s of catalog.signatures) {
		const n = s.status.staff_note;
		if (!n) continue;
		const list = staff.get(n.handle) ?? [];
		if (!list.some((x) => x.url === n.url)) list.push({ url: n.url, date: n.date });
		staff.set(n.handle, list);
	}
</script>

<svelte:head>
	<title>About Duvo Doctor</title>
	<meta name="description" content="Why Duvo Doctor exists, how it keeps your logs private, and who it builds on." />
</svelte:head>

<div class="about">
	<section class="note sheet" aria-labelledby="why">
		<h1 id="why">Why this exists</h1>
		<p>
			I kept seeing the same few errors in the bug threads. Someone posts a screenshot of the popup, staff ask for
			client.log, and a week later someone else posts the same thing. The biggest thread,
			<a href="https://forum.luduvo.com/t/2616">"I cant play luduvo because of this bug"</a>, passed 190 posts.
		</p>
		<p>
			The four most common failures <a href="/issues">have no fix on your end yet</a>. People were reinstalling drivers and
			deleting folders for nothing. So I made this: drop your log in, and it tells you what's wrong, whose problem it is, and what's worth
			trying. If there's nothing you can do yet, it says so.
		</p>
		<p>
			It has nothing to do with trading or the Luduvo API. It doesn't log in, doesn't talk to Luduvo's servers, and doesn't
			know who you are.
		</p>
		<p class="sign">-Tippy</p>
		<img class="avatar" src="/tippy.png" width="96" height="96" alt="Tippy, drawn with round glasses and an ice cream cone" />
	</section>

	<section aria-labelledby="privacy" id="privacy-section">
		<h2 id="privacy">How your logs stay private</h2>
		<ul>
			<li>Your logs are read by code running in this browser tab. Nothing is uploaded, ever.</li>
			<li>
				The page's security policy sets <code>connect-src 'none'</code>. That tells your browser to block every network
				request the page tries to make. You can check: open your browser's developer tools, go to the Network tab, and
				drop a log. Nothing new appears.
			</li>
			<li>Fonts are served from this site. There are no analytics, no cookies, no ads and no third-party scripts.</li>
			<li>
				Before you copy or download a bug report, usernames in file paths, install ids, tokens, email addresses and
				launch links are replaced, and the preview shows exactly what was taken out.
			</li>
			<li>
				The <code>IP:</code> line in client.log is Luduvo's server, not your connection, so it stays unless you tick the box.
				<a href="https://forum.luduvo.com/t/2616/154">matt explained this on the forum</a>.
			</li>
			<li>The code is public, so anyone can check all of this: <a href="https://github.com/tippythetaidum/duvodoctor">github.com/tippythetaidum/duvodoctor</a>.</li>
		</ul>
	</section>

	<section aria-labelledby="unconfirmed-h">
		<h2 id="unconfirmed-h">What "unconfirmed" means</h2>
		<p>
			Some advice here came from players rather than staff, and nobody has confirmed it works. Those bits carry an
			<span class="unconfirmed">unconfirmed</span> label. Try them if you like, but don't expect miracles.
		</p>
	</section>

	<section aria-labelledby="credits">
		<h2 id="credits">Credits</h2>
		<p>Most of what the Doctor knows was worked out by players on the forum. Thank you.</p>
		<ul class="credits">
			{#each people as [handle, list]}
				<li>
					<strong>{handle}</strong>:
					{#each list as c, i}<a href={c.url}>{c.for}</a>{i < list.length - 1 ? '; ' : ''}{/each}
				</li>
			{/each}
		</ul>
		<p>Staff replies quoted here:</p>
		<ul class="credits">
			{#each [...staff.entries()] as [handle, list]}
				<li>
					<strong>{handle}</strong>:
					{#each list as n, i}<a href={n.url}>{formatDate(n.date)}</a>{i < list.length - 1 ? ', ' : ''}{/each}
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="contribute" id="contribute-section">
		<h2 id="contribute">Seen an error it doesn't know?</h2>
		<p>
			Use the report builder on the Doctor page, then either post it in the forum's Bug Reports section or open an issue on
			<a href="https://github.com/tippythetaidum/duvodoctor/issues">GitHub</a> with the redacted excerpt. Each known issue
			is one entry in a data file, so adding one takes a few minutes and no code. The
			<a href="https://github.com/tippythetaidum/duvodoctor/blob/main/CONTRIBUTING.md">contributing guide</a> explains how.
		</p>
	</section>

	<section aria-labelledby="changelog">
		<h2 id="changelog">Changelog</h2>
		{#each changelog as entry}
			<article class="entry">
				<h3><time datetime={entry.date}>{formatDate(entry.date)}</time>: {entry.title}</h3>
				<ul>
					{#each entry.notes as n}<li>{n}</li>{/each}
				</ul>
			</article>
		{/each}
	</section>
</div>

<style>
	.about {
		max-width: 52rem;
	}
	.note {
		position: relative;
		padding: 1.4rem 1.6rem 1rem;
		margin-bottom: 2rem;
	}
	.sign {
		font-family: var(--font);
		font-size: 1.4rem;
		margin-bottom: 0;
	}
	.avatar {
		position: absolute;
		right: 1.2rem;
		bottom: 1rem;
		border-radius: 50%;
		border: 2px solid var(--border-strong);
		background: #ffffff;
	}
	section + section {
		margin-top: 2rem;
	}
	h2 {
		font-size: 1.2rem;
	}
	li {
		margin-bottom: 0.5rem;
	}
	.credits li {
		margin-bottom: 0.3rem;
	}
	.entry h3 {
		font-size: 1.05rem;
	}
	@media (max-width: 640px) {
		.avatar {
			position: static;
			display: block;
			margin-top: 0.5rem;
		}
	}
</style>
