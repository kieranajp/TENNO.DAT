<script lang="ts">
	import { getSettings, saveSettings, deleteAccount, type PlayerSettings } from '$lib/api';
	import { handleKeydown, handleOverlayClick } from '$lib/modal';
	import { auth } from '$lib/stores/auth';
	import { Platform } from '@warframe-tracker/shared';
	import { goto } from '$app/navigation';
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
	let confirming = $state(false);
	let deleting = $state(false);

	onMount(async () => {
		settings = await getSettings();
		if (settings) {
			playerId = settings.playerId;
			platform = settings.platform;
		}
		loading = false;
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

	async function handleDelete() {
		deleting = true;
		try {
			await deleteAccount();
			auth.clear();
			onClose();
			goto('/login');
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:window onkeydown={(e) => handleKeydown(e, onClose)} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={(e) => handleOverlayClick(e, onClose)}>
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
						Find this in your EE.log file or use the <a href="https://chromewebstore.google.com/detail/tenno-tracker-gid-fetcher/omjafgfifenecjcpfnjhihfbnekoldin" target="_blank" rel="noopener noreferrer">Tenno Tracker browser extension</a>.
					</div>
				</div>

				<div class="form-group">
					<label class="form-label" for="platform">
						<span class="material-icons">devices</span>
						PLATFORM
					</label>
					<select class="input-retro" id="platform" bind:value={platform}>
						{#each Platform.all() as p}
							<option value={p.id}>{p.displayName.toUpperCase()}</option>
						{/each}
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

				<hr class="danger-divider" />

				<div class="danger-zone">
					<label class="form-label danger-label">
						<span class="material-icons">warning</span>
						DANGER ZONE
					</label>

					{#if !confirming}
						<button class="btn-danger" onclick={() => (confirming = true)} disabled={deleting}>
							<span class="material-icons">delete_forever</span>
							DELETE ACCOUNT
						</button>
					{:else}
						<p class="danger-warning">This is permanent. All your data will be deleted.</p>
						<div class="danger-actions">
							<button class="btn-danger" onclick={handleDelete} disabled={deleting}>
								{#if deleting}
									<span class="spinner"></span>
								{:else}
									<span class="material-icons">delete_forever</span>
								{/if}
								CONFIRM DELETE
							</button>
							<button class="btn-retro" onclick={() => (confirming = false)} disabled={deleting}>
								CANCEL
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang="sass">
	.modal-content
		max-width: 400px

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

	.danger-divider
		border: none
		border-top: 1px solid $kim-border
		margin: 1.5rem 0

	.danger-zone
		margin-top: 0

	.danger-label
		color: $danger

		.material-icons
			color: $danger

	.btn-danger
		display: flex
		align-items: center
		gap: 0.5rem
		padding: 0.5rem 1rem
		background: $danger
		color: white
		border: 1px solid $kim-accent-dark
		font-family: $font-family-monospace
		font-size: $font-size-sm
		text-transform: uppercase
		cursor: pointer
		letter-spacing: $letter-spacing-wide

		&:hover:not(:disabled)
			background: $kim-accent-dark

		&:disabled
			opacity: 0.6
			cursor: not-allowed

	.danger-warning
		font-family: $font-family-monospace
		font-size: $font-size-sm
		color: $danger
		margin-bottom: 0.75rem

	.danger-actions
		display: flex
		align-items: center
		gap: 0.75rem
</style>
