<script lang="ts">
	import { goto } from '$app/navigation';
	import { saveSettings, getCurrentUser } from '$lib/api';
	import { auth } from '$lib/stores/auth';

	let playerId = $state('');
	let platform = $state('pc');
	let saving = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit() {
		if (!playerId.trim()) {
			error = 'Please enter your Warframe Account ID';
			return;
		}

		saving = true;
		error = null;

		try {
			await saveSettings(playerId.trim(), platform);

			// Refresh user data
			const user = await getCurrentUser();
			auth.setUser(user);

			// Navigate to dashboard
			goto('/');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save settings';
		} finally {
			saving = false;
		}
	}
</script>

<div class="onboarding-container">
	<div class="onboarding-backdrop"></div>

	<div class="onboarding-dialog window-frame">
		<div class="title-bar">
			<div class="d-flex align-items-center gap-2">
				<div class="title-icon"></div>
				<span class="title-text">Account Setup</span>
			</div>
			<div class="window-controls">
				<button type="button" disabled>_</button>
				<button type="button" disabled>□</button>
				<button type="button" class="close-btn" disabled>X</button>
			</div>
		</div>

		<div class="onboarding-content">
			<div class="onboarding-header">
				<span class="material-icons">person_add</span>
				<h2>Link Your Warframe Account</h2>
			</div>

			<p class="onboarding-intro">
				To track your mastery progress, we need your Warframe Account ID.
				This is different from your display name.
			</p>

			{#if error}
				<div class="onboarding-error">
					<span class="material-icons">error</span>
					{error}
				</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<div class="form-group">
					<label class="form-label" for="playerId">
						<span class="material-icons">badge</span>
						WARFRAME ACCOUNT ID
					</label>
					<input
						type="text"
						class="input-retro"
						id="playerId"
						bind:value={playerId}
						placeholder="e.g., abc123def456"
						required
					/>
				</div>

				<div class="form-group">
					<label class="form-label" for="platform">
						<span class="material-icons">devices</span>
						PLATFORM
					</label>
					<select class="input-retro" id="platform" bind:value={platform}>
						<option value="pc">PC</option>
						<option value="ps">PLAYSTATION</option>
						<option value="xbox">XBOX</option>
						<option value="switch">NINTENDO SWITCH</option>
					</select>
				</div>

				<button class="btn-retro btn-primary" type="submit" disabled={saving}>
					{#if saving}
						<span class="spinner"></span>
					{:else}
						<span class="material-icons">check</span>
					{/if}
					COMPLETE SETUP
				</button>
			</form>

			<div class="help-section kim-panel">
				<div class="panel-header">
					<h4>How to Find Your Account ID</h4>
				</div>
				<div class="panel-body">
					<p><strong>Method 1: EE.log File</strong></p>
					<ol>
						<li>Open Warframe and log in</li>
						<li>Navigate to <code>%LOCALAPPDATA%\Warframe\EE.log</code></li>
						<li>Search for "accountId" in the file</li>
					</ol>

					<p><strong>Method 2: Browser Extension</strong></p>
					<ol>
						<li>Install the Tenno Tracker browser extension</li>
						<li>Visit your profile on warframe.com</li>
						<li>The extension will display your Account ID</li>
					</ol>
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="sass">
	@import '../../styles/variables'

	.onboarding-container
		min-height: 100vh
		display: flex
		align-items: center
		justify-content: center
		padding: 1rem

	.onboarding-backdrop
		position: fixed
		inset: 0
		background: url('/kim-background.jpeg') center center / cover no-repeat
		z-index: -1

	.onboarding-dialog
		width: 100%
		max-width: 500px

	.title-icon
		width: $icon-size-sm
		height: $icon-size-sm
		background: $kim-accent
		border: 1px solid black

	.onboarding-content
		background: $kim-terminal-light
		padding: 1.5rem

	.onboarding-header
		display: flex
		align-items: center
		gap: 0.75rem
		margin-bottom: 1rem

		.material-icons
			font-size: 2rem
			color: $kim-border

		h2
			margin: 0
			font-family: $font-family-monospace
			text-transform: uppercase
			letter-spacing: $letter-spacing-wide

	.onboarding-intro
		font-family: $font-family-monospace
		font-size: $font-size-sm
		color: $gray-700
		margin-bottom: 1.5rem
		line-height: 1.6

	.onboarding-error
		display: flex
		align-items: center
		gap: 0.5rem
		padding: 0.75rem
		background: $danger-bg
		border: 1px solid $kim-accent
		color: $kim-accent
		font-family: $font-family-monospace
		font-size: $font-size-sm
		margin-bottom: 1rem

		.material-icons
			font-size: 1rem

	.form-group
		margin-bottom: 1.25rem

	.form-label
		display: flex
		align-items: center
		gap: 0.5rem
		font-family: $font-family-monospace
		font-size: $font-size-sm
		margin-bottom: 0.5rem
		color: $gray-700

		.material-icons
			font-size: 1rem
			color: $kim-border

	.input-retro
		width: 100%
		padding: 0.5rem 0.75rem

	.btn-primary
		width: 100%
		display: flex
		align-items: center
		justify-content: center
		gap: 0.5rem
		margin-top: 1.5rem

	.help-section
		margin-top: 1.5rem

		.panel-body
			font-size: $font-size-sm

			p
				margin: 0.5rem 0

			ol
				margin: 0.5rem 0 1rem 1.25rem
				padding: 0

				li
					margin-bottom: 0.25rem

			code
				background: $gray-200
				padding: 0.125rem 0.375rem
				font-family: $font-family-monospace
				font-size: 0.8rem
</style>
