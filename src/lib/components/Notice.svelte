<script lang="ts">
	import catalogJson from '$data/signatures.json';
	import luduvo from '$data/luduvo.json';
	import type { Catalog } from '$lib/match/catalog';
	import { formatDate } from '$lib/labels';

	const catalog = catalogJson as unknown as Catalog;
	const notice = catalog.notice;
	const behind = luduvo.latest_build > catalog.build;
	const current = !!notice && notice.date >= luduvo.seen;
</script>

{#if behind && !current}
	<aside class="notice card" aria-label="New Luduvo build">
		<p>
			<strong>Build {luduvo.latest_build} is out</strong> (first seen {formatDate(luduvo.seen)}). I haven't checked the known
			issues against it yet, so some advice here may be out of date.
		</p>
	</aside>
{:else if notice}
	<aside class="notice card" aria-label="Latest news">
		<p>
			<strong>{formatDate(notice.date)}:</strong>
			{notice.text}
			{#if notice.link}<a href={notice.link.url}>{notice.link.label}</a>{/if}
		</p>
	</aside>
{/if}

<style>
	.notice {
		border-left: 4px solid var(--primary);
		padding: 0.75rem 1rem;
		margin-bottom: 1.5rem;
	}
	.notice p {
		margin: 0;
		max-width: none;
	}
</style>
