<script lang="ts">
	import { onMount } from 'svelte';
	import { getSettings, saveSettings, type PlayerSettings } from '$lib/api';

	let settings: PlayerSettings | null = $state(null);
	let playerId = $state('');
	let platform = $state('pc');
	let saving = $state(false);
	let saved = $state(false);

	onMount(async () => {
		settings = await getSettings();
		if (settings) {
			playerId = settings.playerId;
			platform = settings.platform;
		}
	});

	async function handleSave() {
		saving = true;
		saved = false;
		try {
			await saveSettings(playerId, platform);
			settings = await getSettings();
			saved = true;
			setTimeout(() => (saved = false), 3000);
		} finally {
			saving = false;
		}
	}
</script>

<div class="settings-layout">
	<!-- Account Settings Panel -->
	<div class="kim-panel settings-panel">
		<div class="panel-header">
			<h3>Account Configuration</h3>
		</div>
		<div class="panel-body">
			<div class="form-group">
				<label class="form-label" for="playerId">
					<span class="material-icons">badge</span>
					ACCOUNT ID
				</label>
				<input
					type="text"
					class="input-retro"
					id="playerId"
					bind:value={playerId}
					placeholder="ENTER YOUR WARFRAME ACCOUNT ID"
				/>
				<div class="form-help">
					<span class="material-icons">info</span>
					Find this in your EE.log file or use the Tenno Tracker browser extension.
				</div>
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

			<div class="form-actions">
				<button class="btn-retro" onclick={handleSave} disabled={saving || !playerId}>
					{#if saving}
						<span class="spinner"></span>
					{:else}
						<span class="material-icons">save</span>
					{/if}
					SAVE CONFIGURATION
				</button>

				{#if saved}
					<span class="save-success">
						<span class="material-icons">check_circle</span>
						SAVED!
					</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- System Information Panel -->
	<div class="kim-panel info-panel">
		<div class="panel-header">
			<h3>System Information</h3>
		</div>
		<div class="panel-body">
			<div class="info-grid">
				<div class="info-row">
					<span class="info-label">STATUS</span>
					<span class="info-value">
						{#if settings}
							<span class="status-online">CONFIGURED</span>
						{:else}
							<span class="status-offline">NOT CONFIGURED</span>
						{/if}
					</span>
				</div>

				{#if settings?.displayName}
					<div class="info-row">
						<span class="info-label">DISPLAY NAME</span>
						<span class="info-value">{settings.displayName.replace(/[^\x20-\x7E]/g, '').trim()}</span>
					</div>
				{/if}

				{#if settings?.lastSyncAt}
					<div class="info-row">
						<span class="info-label">LAST SYNC</span>
						<span class="info-value">{new Date(settings.lastSyncAt).toLocaleString()}</span>
					</div>
				{/if}

				<div class="info-row">
					<span class="info-label">PLATFORM</span>
					<span class="info-value">{platform.toUpperCase()}</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Help Panel -->
	<div class="kim-panel help-panel">
		<div class="panel-header">
			<h3>Help: Finding Your Account ID</h3>
		</div>
		<div class="panel-body">
			<div class="help-content">
				<p><strong>Method 1: EE.log File</strong></p>
				<ol>
					<li>Open Warframe and log in</li>
					<li>Navigate to <code>%LOCALAPPDATA%\Warframe\EE.log</code></li>
					<li>Search for "accountId" in the file</li>
				</ol>

				<p><strong>Method 2: Tenno Tracker Extension</strong></p>
				<ol>
					<li>Install the Tenno Tracker browser extension</li>
					<li>Visit your profile on warframe.com</li>
					<li>The extension will display your Account ID</li>
				</ol>

				<p class="help-note">
					<span class="material-icons">warning</span>
					Your profile must be set to PUBLIC for syncing to work.
				</p>
			</div>
		</div>
	</div>
</div>

<style lang="sass">
	.settings-layout
		display: grid
		grid-template-columns: 1fr
		gap: 1.5rem
		max-width: 800px

		@media (min-width: 768px)
			grid-template-columns: 1fr 1fr

	.settings-panel
		@media (min-width: 768px)
			grid-column: 1 / -1

	.form-group
		margin-bottom: 1.25rem

	.form-label
		display: flex
		align-items: center
		gap: 0.5rem
		font-family: 'Share Tech Mono', monospace
		font-size: 0.875rem
		margin-bottom: 0.5rem
		color: $gray-700

		.material-icons
			font-size: 1rem
			color: $kim-border

	.input-retro
		width: 100%
		padding: 0.5rem 0.75rem

	.form-help
		display: flex
		align-items: flex-start
		gap: 0.5rem
		margin-top: 0.5rem
		font-size: 0.75rem
		color: $gray-500

		.material-icons
			font-size: 0.875rem
			flex-shrink: 0
			margin-top: 0.125rem

	.form-actions
		display: flex
		align-items: center
		gap: 1rem
		margin-top: 1.5rem

	.btn-retro
		display: flex
		align-items: center
		gap: 0.5rem
		padding: 0.5rem 1rem

		&:disabled
			opacity: 0.6
			cursor: not-allowed

	.save-success
		display: flex
		align-items: center
		gap: 0.25rem
		color: $success
		font-family: 'Share Tech Mono', monospace
		font-size: 0.875rem
		text-transform: uppercase

		.material-icons
			font-size: 1rem

	.spinner
		width: 16px
		height: 16px
		border: 2px solid rgba(255, 255, 255, 0.3)
		border-top-color: white
		border-radius: 50%
		animation: spin 1s linear infinite

	@keyframes spin
		to
			transform: rotate(360deg)

	// Info Panel
	.info-grid
		display: flex
		flex-direction: column
		gap: 0.75rem

	.info-row
		display: flex
		justify-content: space-between
		align-items: center
		padding: 0.5rem
		background: $gray-100
		border: 1px solid $gray-300

	.info-label
		font-family: 'Share Tech Mono', monospace
		font-size: 0.75rem
		color: $gray-500
		text-transform: uppercase

	.info-value
		font-family: 'Share Tech Mono', monospace
		font-size: 0.875rem

	.status-online
		color: $success

	.status-offline
		color: $kim-accent

	// Help Panel
	.help-content
		font-size: 0.875rem
		line-height: 1.6

		p
			margin-bottom: 0.75rem

		ol
			margin: 0 0 1rem 1.25rem
			padding: 0

		li
			margin-bottom: 0.25rem

		code
			background: $gray-200
			padding: 0.125rem 0.375rem
			font-family: 'Share Tech Mono', monospace
			font-size: 0.8rem

	.help-note
		display: flex
		align-items: flex-start
		gap: 0.5rem
		padding: 0.75rem
		background: $warning-bg-soft
		border: 1px solid $warning
		margin-top: 1rem

		.material-icons
			font-size: 1rem
			color: $warning-text-dark
			flex-shrink: 0
			margin-top: 0.125rem
</style>
