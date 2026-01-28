<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Settings page has been replaced by a dialog - redirect to dashboard
	onMount(() => {
		goto('/');
	});
</script>

<div class="redirect-message">
	<span class="material-icons spinning">sync</span>
	<span>REDIRECTING...</span>
</div>

<style lang="sass">
	.redirect-message
		display: flex
		align-items: center
		justify-content: center
		gap: 0.75rem
		padding: 2rem
		font-family: $font-family-monospace
		color: $gray-500
		text-transform: uppercase

		.spinning
			animation: spin 1s linear infinite

	@keyframes spin
		from
			transform: rotate(0deg)
		to
			transform: rotate(360deg)
</style>
