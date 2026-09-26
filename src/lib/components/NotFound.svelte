<script lang="ts">
	import Mascot from './Mascot.svelte';
</script>

<section class="lost">
	<Mascot mood="puzzled" size={120} />
	<div>
		<h1>This page isn't here</h1>
		<p>I checked the chart twice. Either the link is wrong, or the rats in the server room got to it.</p>
		<p><a href="/">Back to the Doctor</a> or <a href="/issues">browse known issues</a>.</p>
	</div>
</section>

<style>
	.lost {
		display: flex;
		gap: 1.5rem;
		align-items: center;
		margin-top: 2rem;
	}
	@media (max-width: 560px) {
		.lost {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
