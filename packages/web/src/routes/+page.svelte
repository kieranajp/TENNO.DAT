<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import type { AuthUser } from '$lib/api';
	import SupportFooter from '$lib/components/SupportFooter.svelte';

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
		<!-- Hero: Win95 Setup Wizard -->
		<div class="wizard window-frame">
			<div class="title-bar">
				<div class="d-flex align-items-center gap-2">
					<span class="material-icons title-bar-icon">computer</span>
					<span class="title-text">TENNO.DAT Setup</span>
				</div>
				<div class="window-controls">
					<button type="button" disabled>_</button>
					<button type="button" disabled>□</button>
					<button type="button" class="close-btn" disabled>X</button>
				</div>
			</div>
			<div class="wizard-body">
				<div class="wizard-sidebar">
					<div class="sidebar-text">
						<span>T</span><span>E</span><span>N</span><span>N</span><span>O</span><span>.</span><span>D</span><span>A</span><span>T</span>
					</div>
				</div>
				<div class="wizard-main">
					<h1 class="wizard-title">Welcome to TENNO.DAT</h1>
					<p class="wizard-tagline">MASTERY TRACKING SYSTEM. ON-LYNE.</p>

					<p class="wizard-description">
						This program will help you track your Warframe mastery rank progress, prime parts collection, and star chart completion.
					</p>

					<div class="wizard-checklist">
						<div class="checklist-item">
							<span class="material-icons check">check_box</span>
							<span>Mastery progress across every item</span>
						</div>
						<div class="checklist-item">
							<span class="material-icons check">check_box</span>
							<span>Prime part ownership tracking</span>
						</div>
						<div class="checklist-item">
							<span class="material-icons check">check_box</span>
							<span>Star chart completion (Normal + Steel Path)</span>
						</div>
					</div>

					<p class="wizard-continue">
						Click the button below to continue.
					</p>
				</div>
			</div>
			<div class="wizard-footer">
				<div class="wizard-footer-left">
				</div>
				<div class="wizard-footer-buttons">
					{#if authChecked && authUser}
						<a href="/dashboard" class="btn-retro wizard-btn wizard-btn-primary">
							Go to Dashboard
							<span class="material-icons">arrow_forward</span>
						</a>
					{:else}
						<a href="/login" class="btn-retro wizard-btn wizard-btn-primary">
							Log in with Steam
							<span class="material-icons">arrow_forward</span>
						</a>
					{/if}
				</div>
			</div>
		</div>

		<!-- Feature Panels -->
		<section class="features">
			<div class="feature-card window-frame">
				<div class="title-bar">
					<div class="d-flex align-items-center gap-2">
						<span class="material-icons title-bar-icon">military_tech</span>
						<span class="title-text">MASTERY_DATABASE.EXE</span>
					</div>
				</div>
				<div class="feature-body">
					<div class="feature-screenshot">
						<img src="/screenshots/mastery.webp" alt="Mastery database showing ranked items" />
					</div>
					<p>Every weapon, frame, and companion. See what you've ranked and what's left.</p>
				</div>
			</div>

			<div class="feature-card window-frame">
				<div class="title-bar">
					<div class="d-flex align-items-center gap-2">
						<span class="material-icons title-bar-icon">diamond</span>
						<span class="title-text">PRIME_TRACKER.EXE</span>
					</div>
				</div>
				<div class="feature-body">
					<div class="feature-screenshot">
						<img src="/screenshots/primes.webp" alt="Prime parts tracker with component checklist" />
					</div>
					<p>Track which prime parts you own and which you still need to farm.</p>
				</div>
			</div>

			<div class="feature-card window-frame">
				<div class="title-bar">
					<div class="d-flex align-items-center gap-2">
						<span class="material-icons title-bar-icon">public</span>
						<span class="title-text">STAR_CHART.EXE</span>
					</div>
				</div>
				<div class="feature-body">
					<div class="feature-screenshot">
						<img src="/screenshots/starchart.webp" alt="Star chart node completion view" />
					</div>
					<p>Normal and Steel Path completion, node by node.</p>
				</div>
			</div>
		</section>

		<!-- How it Works -->
		<section class="how-it-works window-frame">
			<div class="title-bar">
				<div class="d-flex align-items-center gap-2">
					<span class="material-icons title-bar-icon">description</span>
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

		<SupportFooter />
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
		max-width: 780px
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

	// Title bar icon (replaces red squares)
	.title-bar-icon
		font-size: 14px
		color: black

	// ========================
	// Setup Wizard Hero
	// ========================
	.wizard-body
		display: flex
		min-height: 280px

	.wizard-sidebar
		width: 160px
		flex-shrink: 0
		background: linear-gradient(180deg, $kim-bg-dark 0%, darken($kim-title, 15%) 40%, $kim-title 100%)
		display: flex
		align-items: flex-end
		padding: 1.5rem 0.75rem
		position: relative
		overflow: hidden

		// Follie background art
		&::before
			content: ''
			position: absolute
			inset: 0
			background: url('/follie.webp') center center / cover no-repeat
			opacity: 0.3
			pointer-events: none

		// Darken bottom for text legibility
		&::after
			content: ''
			position: absolute
			inset: 0
			background: linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0%, transparent 60%)
			pointer-events: none

	.sidebar-text
		display: flex
		flex-direction: column
		font-family: $font-family-monospace
		font-size: 1.75rem
		font-weight: bold
		letter-spacing: 0.15em
		line-height: 1.1
		position: relative
		z-index: 1

		span
			color: rgba(255, 255, 255, 0.85)
			text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3)

	.wizard-main
		flex: 1
		padding: 1.5rem
		background: $kim-terminal-light
		display: flex
		flex-direction: column

	.wizard-title
		font-family: $font-family-monospace
		font-size: 1.4rem
		letter-spacing: $letter-spacing-wide
		color: $kim-border-dark
		margin: 0 0 0.25rem

	.wizard-tagline
		font-family: $font-family-monospace
		font-size: $font-size-sm
		color: $kim-accent
		text-transform: uppercase
		letter-spacing: $letter-spacing-wide
		margin: 0 0 1rem

	.wizard-description
		font-family: $font-family-monospace
		font-size: $font-size-sm
		color: $gray-700
		margin: 0 0 1rem
		line-height: 1.6

	.wizard-checklist
		display: flex
		flex-direction: column
		gap: 0.4rem
		margin-bottom: 1rem

	.checklist-item
		display: flex
		align-items: center
		gap: 0.5rem
		font-family: $font-family-monospace
		font-size: $font-size-sm
		color: $gray-700

		.check
			font-size: 1.1rem
			color: $kim-border

	.wizard-continue
		font-family: $font-family-monospace
		font-size: $font-size-xs
		color: $gray-500
		margin: auto 0 0

	.wizard-footer
		display: flex
		align-items: center
		justify-content: space-between
		padding: 0.5rem 0.75rem
		border-top: $border-width solid $kim-border-dark
		background: $gray-200

	.wizard-footer-buttons
		display: flex
		gap: 0.5rem

	.wizard-btn
		display: inline-flex
		align-items: center
		gap: 0.4rem
		padding: 0.4rem 1rem
		font-size: $font-size-sm
		text-decoration: none
		color: white

		.material-icons
			font-size: 0.9rem

	.wizard-btn-primary
		background: $kim-border-dark

		&:hover
			background: $kim-accent

	// Mobile: hide sidebar
	@media (max-width: 639px)
		.wizard-sidebar
			display: none

	// ========================
	// Feature Cards
	// ========================
	.features
		display: grid
		grid-template-columns: 1fr
		gap: 1rem

		@media (min-width: 640px)
			grid-template-columns: repeat(3, 1fr)

	.feature-card
		display: flex
		flex-direction: column

	.feature-body
		background: $kim-terminal-light
		padding: 0.75rem
		flex: 1
		display: flex
		flex-direction: column

		p
			font-family: $font-family-monospace
			font-size: $font-size-sm
			color: $gray-700
			margin: 0.5rem 0 0
			line-height: 1.5

	.feature-screenshot
		background: $gray-200
		border: 1px solid $gray-300
		aspect-ratio: 4 / 3
		overflow: hidden
		display: flex
		align-items: center
		justify-content: center
		position: relative

		img
			width: 100%
			height: 100%
			object-fit: cover
			image-rendering: auto

		// CRT scanlines
		&::before
			content: ''
			position: absolute
			inset: 0
			background: repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 0, 0, 0.08) 2px, rgba(0, 0, 0, 0.08) 3px)
			pointer-events: none
			z-index: 1

		// Vignette
		&::after
			content: ''
			position: absolute
			inset: 0
			background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.25) 100%)
			pointer-events: none
			z-index: 2

	// ========================
	// How it Works
	// ========================
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

	// ========================
	// Privacy
	// ========================
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
