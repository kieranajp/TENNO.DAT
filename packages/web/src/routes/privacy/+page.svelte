<script lang="ts">
	import SupportFooter from '$lib/components/SupportFooter.svelte';
</script>

<div class="privacy-page">
	<div class="privacy-page-backdrop"></div>

	<div class="privacy-content">
		<div class="window-frame">
			<div class="title-bar">
				<div class="d-flex align-items-center gap-2">
					<span class="material-icons title-bar-icon">description</span>
					<span class="title-text">PRIVACY.TXT</span>
				</div>
			</div>

			<div class="policy-body">
				<h1>Privacy Policy</h1>
				<p class="updated">Last updated: 28 March 2026</p>

				<p>
					TENNO.DAT is a personal project built and operated by an individual developer.
					This policy explains what data the site handles and why.
				</p>

				<h2>What we collect</h2>

				<h3>Steam authentication</h3>
				<p>
					We use Steam OpenID to log you in. This gives us your public Steam ID and display name.
					We never see or store your Steam password.
				</p>

				<h3>Warframe profile data</h3>
				<p>
					When you link your Warframe account, we fetch your public profile from the
					Digital Extremes API. This includes mastery progress, equipment, loadouts,
					intrinsics, mission completions, and weapon statistics. This data is stored
					in our database so the site can function.
				</p>

				<h3>Prime parts ownership</h3>
				<p>
					You can manually track which prime parts you own. This is stored against
					your account so it persists between sessions.
				</p>

				<h3>Session cookies</h3>
				<p>
					We set a single session cookie (<code>tenno_session</code>) to keep you logged in.
					Sessions last 24 hours by default, or 30 days if you choose "remember me".
					No tracking cookies are used.
				</p>

				<h3>Analytics</h3>
				<p>
					We use <a href="https://plausible.io" target="_blank" rel="noopener noreferrer">Plausible Analytics</a>,
					a privacy-focused analytics tool. Plausible does not use cookies, does not collect
					personal data, and does not track you across sites. All data is aggregated &mdash;
					we see page view counts and referrer sources, not individual visitors.
				</p>

				<h2>What we don't do</h2>
				<ul>
					<li>We don't sell or share your data with anyone.</li>
					<li>We don't use tracking cookies or fingerprinting.</li>
					<li>We don't serve ads.</li>
					<li>We don't send marketing emails (we don't have your email).</li>
				</ul>

				<h2>Data storage</h2>
				<p>
					Your data is stored in a PostgreSQL database. It's used solely to make the
					site work. There are no third-party data processors beyond Plausible (analytics)
					and the hosting provider.
				</p>

				<h2>Deleting your data</h2>
				<p>
					If you want your data removed, open an issue on
					<a href="https://github.com/kieranajp/TENNO.DAT/issues/new" target="_blank" rel="noopener noreferrer">GitHub</a>
					or get in touch and we'll sort it out.
				</p>

				<h2>Changes</h2>
				<p>
					If this policy changes, the updated version will be posted here. No
					smoke and mirrors.
				</p>
			</div>

			<div class="policy-footer">
				<a href="/" class="btn-retro back-btn">
					<span class="material-icons">arrow_back</span>
					<span>Back to home</span>
				</a>
			</div>
		</div>

		<SupportFooter />
	</div>
</div>

<style lang="sass">
	@import '../../styles/variables'

	.privacy-page
		min-height: 100vh
		display: flex
		align-items: center
		justify-content: center
		padding: 1rem

	.privacy-page-backdrop
		position: fixed
		inset: 0
		background: url('/kim-background.jpeg') center center / cover no-repeat
		z-index: -1

	.privacy-content
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

	.title-bar-icon
		font-size: 14px
		color: black

	.policy-body
		background: $kim-terminal-light
		padding: 1.5rem
		font-family: $font-family-monospace

		@media (min-width: 768px)
			padding: 2rem

		h1
			font-size: 1.4rem
			letter-spacing: $letter-spacing-wide
			color: $kim-border-dark
			margin: 0 0 0.25rem
			text-transform: uppercase

		h2
			font-size: 1rem
			color: $kim-border-dark
			text-transform: uppercase
			letter-spacing: $letter-spacing-wide
			margin: 1.5rem 0 0.5rem
			padding-bottom: 0.25rem
			border-bottom: 1px solid $gray-300

		h3
			font-size: $font-size-sm
			color: $kim-accent
			text-transform: uppercase
			letter-spacing: $letter-spacing-wide
			margin: 1rem 0 0.25rem

		p
			font-size: $font-size-sm
			color: $gray-700
			line-height: 1.7
			margin: 0 0 0.5rem

		.updated
			font-size: $font-size-xs
			color: $gray-500
			margin-bottom: 1rem

		code
			background: $gray-200
			padding: 0.1rem 0.3rem
			font-size: $font-size-xs

		ul
			margin: 0.5rem 0
			padding-left: 1.25rem

			li
				font-size: $font-size-sm
				color: $gray-700
				line-height: 1.7
				margin-bottom: 0.25rem

		a
			color: $kim-accent
			text-decoration: underline

			&:hover
				color: $kim-accent-dark

	.policy-footer
		display: flex
		align-items: center
		padding: 0.5rem 0.75rem
		border-top: $border-width solid $kim-border-dark
		background: $gray-200

	.back-btn
		display: inline-flex
		align-items: center
		gap: 0.4rem
		padding: 0.4rem 1rem
		font-size: $font-size-sm
		text-decoration: none
		color: white

		.material-icons
			font-size: 0.9rem
</style>
