<script lang="ts">
	import GitHubIcon from './icons/GitHubIcon.svelte';
</script>

<div class="support-links">
	<a href="https://ko-fi.com/kieranajp" target="_blank" rel="noopener noreferrer" class="btn-retro support-btn">
		<span class="material-icons">local_cafe</span>
		<span>Buy me a forma</span>
	</a>
	<a href="https://github.com/kieranajp/TENNO.DAT" target="_blank" rel="noopener noreferrer" class="btn-retro support-btn">
		<GitHubIcon class="github-icon" />
		<span>Source</span>
	</a>
	<a href="https://github.com/kieranajp/TENNO.DAT/issues/new" target="_blank" rel="noopener noreferrer" class="btn-retro support-btn">
		<span class="material-icons">bug_report</span>
		<span>Report a bug</span>
	</a>
	<a href="/privacy" class="btn-retro support-btn">
		<span class="material-icons">lock</span>
		<span>Privacy</span>
	</a>
</div>

<style lang="sass">
	@import '../../styles/variables'

	.support-links
		display: flex
		justify-content: center
		gap: 0.75rem
		flex-wrap: wrap

	.support-btn
		display: inline-flex
		align-items: center
		gap: 0.4rem
		padding: 0.4rem 1rem
		font-size: $font-size-sm
		text-decoration: none
		color: white

		.material-icons
			font-size: 0.9rem

		:global(.github-icon)
			width: 14px
			height: 14px
</style>
