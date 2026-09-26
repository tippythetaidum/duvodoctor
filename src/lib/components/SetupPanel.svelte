<script lang="ts">
	import type { SetupSummary } from '$lib/types';
	import { OS_LABEL } from '$lib/labels';
	import { VENDOR_NAMES } from '$lib/parse/driver';

	let { setup }: { setup: SetupSummary } = $props();

	const backend = $derived(
		setup.backend === 'd3d12' ? 'D3D12' : setup.backend === 'vulkan' ? 'Vulkan' : setup.backend === 'metal' ? 'Metal' : null
	);
	const settingsShown = $derived(
		setup.settings
			? (['graphics_api', 'quality_level', 'fullscreen', 'vsync', 'aa_method'] as const)
					.filter((k) => setup.settings?.[k] !== undefined)
					.map((k) => [k, setup.settings![k]] as const)
			: []
	);
</script>

<section class="sheet chart" aria-labelledby="setup-heading">
	<h2 id="setup-heading">Your setup</h2>
	<p class="note">Read from your logs. Nothing here was sent anywhere.</p>
	<dl>
		<div>
			<dt>Operating system</dt>
			<dd>
				{setup.os ? OS_LABEL[setup.os] : 'Not in the logs'}
				{#if setup.osFrom}<span class="aside">worked out from {setup.osFrom}</span>{/if}
			</dd>
		</div>
		<div>
			<dt>Luduvo build</dt>
			<dd>
				{setup.build ?? 'Not in the logs'}
				{#if setup.sha}<code>{setup.sha}</code>{/if}
			</dd>
		</div>
		<div>
			<dt>Graphics API used</dt>
			<dd>
				{backend ?? 'Not in the logs'}
				{#each setup.fallback as f}<span class="aside">{f}</span>{/each}
			</dd>
		</div>
		<div>
			<dt>Graphics</dt>
			<dd>
				{#if setup.adapters.length}
					<ul class="adapters">
						{#each setup.adapters as a}
							<li class:picked={a === setup.selected} class:skipped={a.skipped}>
								<span class="name">{a.name}</span>
								{#if a === setup.selected}<strong class="tag">selected</strong>{/if}
								<span class="aside">
									{a.api === 'd3d12' ? 'D3D12' : 'Vulkan'}{a.index !== null ? ` adapter ${a.index}` : ''}{a.vendorId
										? `, ${VENDOR_NAMES[a.vendor]} ${a.vendorId}:${a.deviceId}`
										: ''}{a.memoryMb ? `, ${a.memoryMb} MB` : ''}{a.software ? ', software, not a real GPU' : ''}
								</span>
								{#if a.skipped}<span class="aside skip">Skipped: {a.skipped.replace(/\s*\(set LDV_VK_SKIP_BLOCKLIST=1 to override\)/, '')}</span>{/if}
							</li>
						{/each}
					</ul>
				{:else}
					Not in the logs
				{/if}
			</dd>
		</div>
		{#if setup.driver}
			<div>
				<dt>Driver version</dt>
				<dd>
					{setup.driver.decoded ?? 'Not decoded'}
					<span class="aside">raw {setup.driver.raw}, {setup.driver.scheme}</span>
				</dd>
			</div>
		{/if}
		{#if setup.vkLoader}
			<div>
				<dt>Vulkan loader</dt>
				<dd>{setup.vkLoader}{#if setup.vkDevice}<span class="aside">device API {setup.vkDevice}</span>{/if}</dd>
			</div>
		{/if}
		{#if setup.resolution}
			<div>
				<dt>Resolution</dt>
				<dd>{setup.resolution}</dd>
			</div>
		{/if}
		<div>
			<dt>Joined a server</dt>
			<dd>{setup.connected ? 'Yes' : 'No'}</dd>
		</div>
		<div>
			<dt>Ended cleanly</dt>
			<dd>{setup.cleanQuit ? 'Yes, the log ends with Quit.' : 'No'}</dd>
		</div>
		{#if settingsShown.length}
			<div>
				<dt>Settings.cfg</dt>
				<dd>
					{#each settingsShown as [k, v]}<code>{k}={v}</code> {/each}
				</dd>
			</div>
		{/if}
		{#if setup.failCount !== null}
			<div>
				<dt>Launcher fail count</dt>
				<dd>{setup.failCount}</dd>
			</div>
		{/if}
		{#if setup.blocklistOverride}
			<div>
				<dt>Blocklist override</dt>
				<dd class="warn">LDV_VK_SKIP_BLOCKLIST is set</dd>
			</div>
		{/if}
	</dl>
</section>

<style>
	.chart {
		padding: 1rem 1.2rem;
	}
	h2 {
		font-size: var(--step-1);
		margin-bottom: 0.2rem;
	}
	.note {
		font-size: var(--step--1);
		color: var(--ink-soft);
		margin-bottom: 0.6rem;
	}
	dl {
		margin: 0;
	}
	dl > div {
		display: grid;
		grid-template-columns: 9.5rem 1fr;
		gap: 0.2rem 0.8rem;
		padding: 0.45rem 0;
		border-top: 1px solid var(--rule);
	}
	dt {
		font-family: var(--mono);
		font-size: 0.78rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--ink-soft);
		padding-top: 0.15rem;
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	.aside {
		display: block;
		font-size: var(--step--1);
		color: var(--ink-soft);
	}
	.adapters {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.adapters li {
		margin-bottom: 0.4rem;
	}
	.picked .name {
		font-weight: 700;
	}
	.skipped .name {
		text-decoration: line-through;
		text-decoration-color: var(--stamp);
	}
	.tag {
		font-family: var(--mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		color: var(--green);
		margin-left: 0.3rem;
	}
	.skip {
		color: var(--stamp-ink);
	}
	.warn {
		color: var(--stamp-ink);
		font-weight: 700;
	}
	@media (max-width: 480px) {
		dl > div {
			grid-template-columns: 1fr;
		}
	}
</style>
