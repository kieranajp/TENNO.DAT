<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { API_BASE } from '$lib/api';

	let rememberMe = $state(true);
	let error = $state<string | null>(null);
	let loading = $state(false);

	onMount(() => {
		// Check for error from callback
		const errorParam = $page.url.searchParams.get('error');
		if (errorParam === 'auth_failed') {
			error = 'Authentication failed. Please try again.';
		}
	});

	function handleLogin() {
		loading = true;
		const url = `${API_BASE}/auth/steam?remember=${rememberMe}`;
		window.location.href = url;
	}
</script>

<div class="login-container">
	<div class="login-backdrop"></div>

	<div class="login-dialog window-frame">
		<div class="title-bar">
			<div class="d-flex align-items-center gap-2">
				<div class="title-icon"></div>
				<span class="title-text">Welcome to KIM OS</span>
			</div>
			<div class="window-controls">
				<button type="button" disabled>_</button>
				<button type="button" disabled>□</button>
				<button type="button" class="close-btn" disabled>X</button>
			</div>
		</div>

		<div class="login-content">
			<div class="login-banner">
				<div class="banner-icon">
					<span class="material-icons">computer</span>
				</div>
				<div class="banner-text">
					<h1>TENNO.DAT</h1>
					<p>Warframe Mastery Tracker</p>
				</div>
			</div>

			<div class="login-form">
				<p class="login-instructions">
					Click the button below to sign in with your Steam account.
				</p>

				{#if error}
					<div class="login-error">
						<span class="material-icons">error</span>
						{error}
					</div>
				{/if}

				<button
					class="steam-login-btn"
					onclick={handleLogin}
					disabled={loading}
				>
					{#if loading}
						<span class="spinner"></span>
					{:else}
						<svg class="steam-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 259" fill="currentColor">
							<path d="M127.78 0C60.95 0 5.48 52.02 0 117.5l68.69 28.4c5.84-4 12.87-6.35 20.47-6.35.68 0 1.35.02 2.02.06l30.63-44.4v-.62c0-27.52 22.39-49.93 49.91-49.93 27.53 0 49.93 22.4 49.93 49.93 0 27.53-22.4 49.93-49.93 49.93h-1.16l-43.7 31.21c0 .52.03 1.04.03 1.56 0 20.67-16.8 37.48-37.47 37.48-18.27 0-33.56-13.12-36.87-30.45L3.25 161.9C21.35 215.85 71.65 254.8 131.47 254.8c72.7 0 131.67-58.96 131.67-131.67C263.15 50.83 200.48 0 127.78 0z"/>
							<path d="M80.75 196.78l-15.58-6.45c2.77 5.76 7.35 10.65 13.51 13.54 13.38 6.28 29.32.55 35.6-12.82 3.05-6.5 3.1-13.7.14-20.24-2.96-6.54-8.31-11.34-15.06-13.52-.67-.22-1.34-.4-2.02-.56l16.1 6.67c9.87 4.1 14.55 15.39 10.44 25.25-4.1 9.87-15.38 14.55-25.25 10.44-6.58-2.73-11.27-8.09-13.51-14.31h-.37zM221.6 94.6c0-18.37-14.94-33.3-33.32-33.3-18.38 0-33.31 14.93-33.31 33.3 0 18.38 14.93 33.32 33.31 33.32 18.38 0 33.32-14.94 33.32-33.32zm-58.14-.01c0-13.72 11.14-24.86 24.85-24.86 13.72 0 24.86 11.14 24.86 24.86 0 13.72-11.14 24.86-24.86 24.86-13.71 0-24.85-11.14-24.85-24.86z"/>
						</svg>
					{/if}
					Sign in with Steam
				</button>

				<label class="remember-me">
					<input type="checkbox" bind:checked={rememberMe} />
					<span class="checkmark"></span>
					Remember me for 30 days
				</label>
			</div>

			<div class="login-footer">
				<p>Your Steam account will be used for authentication only.</p>
				<p>No Steam data is stored except your display name.</p>
			</div>
		</div>
	</div>
</div>

<style lang="sass">
	@import '../../styles/variables'

	.login-container
		min-height: 100vh
		display: flex
		align-items: center
		justify-content: center
		padding: 1rem
		position: relative

	.login-backdrop
		position: fixed
		inset: 0
		background: url('/kim-background.jpeg') center center / cover no-repeat
		z-index: -1

	.login-dialog
		width: 100%
		max-width: 400px
		animation: dialog-appear 0.3s ease-out

	@keyframes dialog-appear
		from
			opacity: 0
			transform: scale(0.95) translateY(-10px)
		to
			opacity: 1
			transform: scale(1) translateY(0)

	.title-icon
		width: $icon-size-sm
		height: $icon-size-sm
		background: $kim-accent
		border: 1px solid black

	.login-content
		background: $kim-terminal-light
		padding: 1.5rem

	.login-banner
		display: flex
		align-items: center
		gap: 1rem
		padding-bottom: 1.5rem
		border-bottom: 2px solid $kim-border
		margin-bottom: 1.5rem

		.banner-icon
			width: 64px
			height: 64px
			background: $kim-bg-dark
			border: 2px solid $kim-border
			display: flex
			align-items: center
			justify-content: center

			.material-icons
				font-size: 32px
				color: $kim-title

		.banner-text
			h1
				margin: 0
				font-family: $font-family-monospace
				font-size: 1.5rem
				color: $kim-border-dark
				letter-spacing: $letter-spacing-wider

			p
				margin: 0.25rem 0 0
				font-family: $font-family-monospace
				font-size: $font-size-sm
				color: $gray-500
				text-transform: uppercase

	.login-form
		display: flex
		flex-direction: column
		gap: 1rem

	.login-instructions
		font-family: $font-family-monospace
		font-size: $font-size-sm
		color: $gray-700
		margin: 0
		text-align: center

	.login-error
		display: flex
		align-items: center
		gap: 0.5rem
		padding: 0.75rem
		background: $danger-bg
		border: 1px solid $kim-accent
		color: $kim-accent
		font-family: $font-family-monospace
		font-size: $font-size-sm

		.material-icons
			font-size: 1rem

	.steam-login-btn
		display: flex
		align-items: center
		justify-content: center
		gap: 0.75rem
		width: 100%
		padding: 0.75rem 1rem
		background: #171a21
		color: white
		border: 2px solid black
		border-bottom-width: 4px
		border-right-width: 4px
		font-family: $font-family-monospace
		font-size: 1rem
		text-transform: uppercase
		letter-spacing: $letter-spacing-wide
		cursor: pointer
		transition: all $transition-fast

		&:hover:not(:disabled)
			background: #2a475e

		&:active:not(:disabled)
			border-bottom-width: 2px
			border-right-width: 2px
			transform: translate(2px, 2px)

		&:disabled
			opacity: 0.7
			cursor: wait

		.steam-icon
			width: 24px
			height: 24px

	.remember-me
		display: flex
		align-items: center
		gap: 0.5rem
		font-family: $font-family-monospace
		font-size: $font-size-sm
		color: $gray-700
		cursor: pointer
		user-select: none

		input
			display: none

		.checkmark
			width: 16px
			height: 16px
			border: 2px solid $kim-border
			background: white
			position: relative

		input:checked + .checkmark::after
			content: '✓'
			position: absolute
			top: -2px
			left: 2px
			font-size: 14px
			color: $kim-border-dark

	.login-footer
		margin-top: 1.5rem
		padding-top: 1rem
		border-top: 1px solid $gray-300
		text-align: center

		p
			margin: 0.25rem 0
			font-size: $font-size-xs
			color: $gray-500
</style>
