<script lang="ts">
	import { getSettings, saveSettings, type PlayerSettings } from '$lib/api';
	import { onMount } from 'svelte';

	let {
		onClose
	}: {
		onClose: () => void;
	} = $props();

	let settings: PlayerSettings | null = $state(null);
	let playerId = $state('');
	let platform = $state('pc');
	let saving = $state(false);
	let saved = $state(false);
	let loading = $state(true);

	onMount(async () => {
		settings = await getSettings();
		if (settings) {
			playerId = settings.playerId;
			platform = settings.platform;
		}
		loading = false;
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleOverlayClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

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

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={handleOverlayClick}>
	<div class="modal-content kim-panel">
		<div class="panel-header">
			<h3>Account Configuration</h3>
			<button class="close-btn" onclick={onClose}>
				<span class="material-icons">close</span>
			</button>
		</div>

		<div class="panel-body">
			{#if loading}
				<div class="loading-state">
					<span class="material-icons spinning">sync</span>
					<span>LOADING...</span>
				</div>
			{:else}
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
						SAVE
					</button>

					{#if saved}
						<span class="save-success">
							<span class="material-icons">check_circle</span>
							SAVED!
						</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang="sass">
	.modal-overlay
		position: fixed
		inset: 0
		background: rgba(0, 0, 0, 0.7)
		display: flex
		align-items: center
		justify-content: center
		z-index: $zindex-overlay
		padding: 1rem

	.modal-content
		width: 100%
		max-width: 400px

	.panel-header
		display: flex
		justify-content: space-between
		align-items: center

		h3
			flex: 1
			margin: 0

	.close-btn
		background: transparent
		border: none
		cursor: pointer
		padding: 0.25rem
		color: $kim-border

		&:hover
			color: $kim-accent

	.loading-state
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

	.form-help
		display: flex
		align-items: flex-start
		gap: 0.5rem
		margin-top: 0.5rem
		font-size: $font-size-xs
		color: $gray-500

		.material-icons
			font-size: $font-size-sm
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
		font-family: $font-family-monospace
		font-size: $font-size-sm
		text-transform: uppercase

		.material-icons
			font-size: 1rem
</style>
