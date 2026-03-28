<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import type { AuthUser } from '$lib/api';

	let authUser = $state<AuthUser | null>(null);
	let authChecked = $state(false);

	$effect(() => {
		const unsubscribe = auth.subscribe((state) => {
			authUser = state.user;
			authChecked = state.checked;
		});
		return unsubscribe;
	});
</script>

<div class="homepage">
	<div class="homepage-backdrop"></div>

	<div class="homepage-content">
		<!-- Hero -->
		<header class="hero">
			<div class="hero-icon">
				<span class="material-icons">computer</span>
			</div>
			<h1 class="hero-title">TENNO.DAT</h1>
			<p class="hero-tagline">MASTERY TRACKING SYSTEM ONLYNE.</p>
			<p class="hero-description">
				Track your mastery rank progress, prime parts, and star chart completion across every item in Warframe.
			</p>
			<div class="hero-cta">
				{#if authChecked && authUser}
					<a href="/dashboard" class="btn-retro cta-btn">
						<span class="material-icons">arrow_forward</span>
						Go to Dashboard
					</a>
				{:else}
					<a href="/login" class="btn-retro cta-btn">
						<svg class="steam-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 259" fill="currentColor">
							<path d="M127.78 0C60.95 0 5.48 52.02 0 117.5l68.69 28.4c5.84-4 12.87-6.35 20.47-6.35.68 0 1.35.02 2.02.06l30.63-44.4v-.62c0-27.52 22.39-49.93 49.91-49.93 27.53 0 49.93 22.4 49.93 49.93 0 27.53-22.4 49.93-49.93 49.93h-1.16l-43.7 31.21c0 .52.03 1.04.03 1.56 0 20.67-16.8 37.48-37.47 37.48-18.27 0-33.56-13.12-36.87-30.45L3.25 161.9C21.35 215.85 71.65 254.8 131.47 254.8c72.7 0 131.67-58.96 131.67-131.67C263.15 50.83 200.48 0 127.78 0z"/>
							<path d="M80.75 196.78l-15.58-6.45c2.77 5.76 7.35 10.65 13.51 13.54 13.38 6.28 29.32.55 35.6-12.82 3.05-6.5 3.1-13.7.14-20.24-2.96-6.54-8.31-11.34-15.06-13.52-.67-.22-1.34-.4-2.02-.56l16.1 6.67c9.87 4.1 14.55 15.39 10.44 25.25-4.1 9.87-15.38 14.55-25.25 10.44-6.58-2.73-11.27-8.09-13.51-14.31h-.37zM221.6 94.6c0-18.37-14.94-33.3-33.32-33.3-18.38 0-33.31 14.93-33.31 33.3 0 18.38 14.93 33.32 33.31 33.32 18.38 0 33.32-14.94 33.32-33.32zm-58.14-.01c0-13.72 11.14-24.86 24.85-24.86 13.72 0 24.86 11.14 24.86 24.86 0 13.72-11.14 24.86-24.86 24.86-13.71 0-24.85-11.14-24.85-24.86z"/>
						</svg>
						Log in with Steam
					</a>
				{/if}
			</div>
		</header>

		<!-- Feature Panels -->
		<section class="features">
			<div class="feature-card window-frame">
				<div class="title-bar">
					<div class="d-flex align-items-center gap-2">
						<div class="title-icon"></div>
						<span class="title-text">MASTERY_DATABASE.EXE</span>
					</div>
				</div>
				<div class="feature-body">
					<span class="material-icons feature-icon">military_tech</span>
					<p>Every weapon, frame, and companion. See what you've ranked and what's left.</p>
				</div>
			</div>

			<div class="feature-card window-frame">
				<div class="title-bar">
					<div class="d-flex align-items-center gap-2">
						<div class="title-icon"></div>
						<span class="title-text">PRIME_TRACKER.EXE</span>
					</div>
				</div>
				<div class="feature-body">
					<span class="material-icons feature-icon">diamond</span>
					<p>Track which prime parts you own and which you still need to farm.</p>
				</div>
			</div>

			<div class="feature-card window-frame">
				<div class="title-bar">
					<div class="d-flex align-items-center gap-2">
						<div class="title-icon"></div>
						<span class="title-text">STAR_CHART.EXE</span>
					</div>
				</div>
				<div class="feature-body">
					<span class="material-icons feature-icon">public</span>
					<p>Normal and Steel Path completion, node by node.</p>
				</div>
			</div>
		</section>

		<!-- How it Works -->
		<section class="how-it-works window-frame">
			<div class="title-bar">
				<div class="d-flex align-items-center gap-2">
					<div class="title-icon"></div>
					<span class="title-text">SETUP.TXT</span>
				</div>
			</div>
			<div class="steps-body">
				<div class="step">
					<span class="step-number">1</span>
					<span>Log in with Steam</span>
				</div>
				<div class="step-divider">
					<span class="material-icons">chevron_right</span>
				</div>
				<div class="step">
					<span class="step-number">2</span>
					<span>Enter your Warframe account ID</span>
				</div>
				<div class="step-divider">
					<span class="material-icons">chevron_right</span>
				</div>
				<div class="step">
					<span class="step-number">3</span>
					<span>Your profile syncs automatically</span>
				</div>
			</div>
		</section>

		<!-- Privacy -->
		<footer class="privacy-note">
			<span class="material-icons">lock</span>
			<p>No Warframe credentials required. We read your public profile via the DE API. Nothing is stored beyond what you see here.</p>
		</footer>
	</div>
</div>

<style lang="sass">
	@import '../styles/variables'

	.homepage
		min-height: 100vh
		display: flex
		align-items: center
		justify-content: center
		padding: 1rem
		position: relative

	.homepage-backdrop
		position: fixed
		inset: 0
		background: url('/kim-background.jpeg') center center / cover no-repeat
		z-index: -1

	.homepage-content
		width: 100%
		max-width: 720px
		display: flex
		flex-direction: column
		gap: 1.5rem
		animation: page-appear 0.3s ease-out

	@keyframes page-appear
		from
			opacity: 0
			transform: translateY(-10px)
		to
			opacity: 1
			transform: translateY(0)

	// Hero
	.hero
		text-align: center
		background: $kim-terminal-light
		border: $border-width solid $kim-border-dark
		padding: 2rem 1.5rem
		box-shadow: $shadow-sm

	.hero-icon
		width: 64px
		height: 64px
		background: $kim-bg-dark
		border: $border-width solid $kim-border
		display: flex
		align-items: center
		justify-content: center
		margin: 0 auto 1rem

		.material-icons
			font-size: 32px
			color: $kim-title

	.hero-title
		font-family: $font-family-monospace
		font-size: 2rem
		letter-spacing: $letter-spacing-wider
		color: $kim-border-dark
		margin: 0 0 0.25rem

	.hero-tagline
		font-family: $font-family-monospace
		font-size: $font-size-sm
		color: $kim-accent
		text-transform: uppercase
		letter-spacing: $letter-spacing-wide
		margin: 0 0 1rem

	.hero-description
		font-family: $font-family-monospace
		font-size: $font-size-sm
		color: $gray-700
		margin: 0 0 1.5rem
		line-height: 1.6

	.hero-cta
		display: flex
		justify-content: center

	.cta-btn
		display: inline-flex
		align-items: center
		gap: 0.5rem
		padding: 0.75rem 1.5rem
		font-size: 1rem
		text-decoration: none
		color: white

		.steam-icon
			width: 20px
			height: 20px

	// Features
	.features
		display: grid
		grid-template-columns: 1fr
		gap: 1rem

		@media (min-width: 640px)
			grid-template-columns: repeat(3, 1fr)

	.feature-card
		display: flex
		flex-direction: column

	.title-icon
		width: $icon-size-sm
		height: $icon-size-sm
		background: $kim-accent
		border: 1px solid black

	.feature-body
		background: $kim-terminal-light
		padding: 1rem
		flex: 1
		text-align: center

		p
			font-family: $font-family-monospace
			font-size: $font-size-sm
			color: $gray-700
			margin: 0.75rem 0 0
			line-height: 1.5

	.feature-icon
		font-size: 1.5rem
		color: $kim-border

	// How it Works
	.steps-body
		background: $kim-terminal-light
		padding: 1.25rem
		display: flex
		align-items: center
		justify-content: center
		gap: 0.75rem
		flex-wrap: wrap

	.step
		display: flex
		align-items: center
		gap: 0.5rem
		font-family: $font-family-monospace
		font-size: $font-size-sm
		color: $gray-700

	.step-number
		width: 24px
		height: 24px
		background: $kim-border
		color: white
		display: flex
		align-items: center
		justify-content: center
		font-family: $font-family-monospace
		font-size: $font-size-sm
		flex-shrink: 0

	.step-divider
		color: $gray-400
		display: flex
		align-items: center

		.material-icons
			font-size: 1rem

	// Privacy
	.privacy-note
		display: flex
		align-items: flex-start
		gap: 0.5rem
		padding: 0.75rem 1rem
		background: rgba($kim-terminal-light, 0.85)
		border: 1px solid $kim-border
		backdrop-filter: blur(4px)

		.material-icons
			font-size: 1rem
			color: $kim-border
			margin-top: 2px

		p
			font-family: $font-family-monospace
			font-size: $font-size-xs
			color: $gray-500
			margin: 0
			line-height: 1.5
</style>
