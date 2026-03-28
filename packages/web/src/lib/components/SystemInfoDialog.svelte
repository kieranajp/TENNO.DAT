<script lang="ts">
	import { getSettings, sanitiseDisplayName, type PlayerSettings } from '$lib/api';
	import { handleKeydown, handleOverlayClick } from '$lib/modal';
	import { Platform } from '@warframe-tracker/shared';
	import { auth } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	let {
		onClose
	}: {
		onClose: () => void;
	} = $props();

	let settings: PlayerSettings | null = $state(null);
	let loading = $state(true);
	let steamDisplayName = $state<string | null>(null);
	let steamAvatarUrl = $state<string | null>(null);

	onMount(async () => {
		const unsubscribe = auth.subscribe((state) => {
			steamDisplayName = state.user?.steamDisplayName ?? null;
			steamAvatarUrl = state.user?.steamAvatarUrl ?? null;
		});

		settings = await getSettings();
		loading = false;

		return unsubscribe;
	});
</script>

<svelte:window onkeydown={(e) => handleKeydown(e, onClose)} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={(e) => handleOverlayClick(e, onClose)}>
	<div class="modal-content kim-panel">
		<div class="panel-header">
			<h3>System Information</h3>
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
				<!-- User Info -->
				<div class="user-section">
					{#if steamAvatarUrl}
						<img src={steamAvatarUrl} alt="Avatar" class="user-avatar" />
					{:else}
						<div class="user-avatar-placeholder">
							<span class="material-icons">person</span>
						</div>
					{/if}
					<div class="user-name">{steamDisplayName ?? 'TENNO'}</div>
				</div>

				<div class="info-grid">
					<div class="info-row">
						<span class="info-label">STATUS</span>
						<span class="info-value">
							{#if settings?.playerId}
								<span class="status-online">CONFIGURED</span>
							{:else}
								<span class="status-offline">NOT CONFIGURED</span>
							{/if}
						</span>
					</div>

					{#if settings?.displayName}
						<div class="info-row">
							<span class="info-label">WARFRAME NAME</span>
							<span class="info-value">{sanitiseDisplayName(settings.displayName)}</span>
						</div>
					{/if}

					{#if settings?.lastSyncAt}
						<div class="info-row">
							<span class="info-label">LAST SYNC</span>
							<span class="info-value">{new Date(settings.lastSyncAt).toLocaleString()}</span>
						</div>
					{/if}

					{#if settings?.platform}
						<div class="info-row">
							<span class="info-label">PLATFORM</span>
							<span class="info-value">{(Platform.fromId(settings.platform)?.displayName ?? settings.platform).toUpperCase()}</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang="sass">
	.modal-content
		max-width: 360px

	.user-section
		display: flex
		flex-direction: column
		align-items: center
		padding: 1rem
		margin-bottom: 1rem
		background: $gray-100
		border: 1px solid $gray-300

	.user-avatar
		width: 64px
		height: 64px
		border-radius: 4px
		border: 2px solid $kim-border

	.user-avatar-placeholder
		width: 64px
		height: 64px
		display: flex
		align-items: center
		justify-content: center
		background: $gray-300
		border: 2px solid $kim-border
		border-radius: 4px

		.material-icons
			font-size: 2rem
			color: $gray-500

	.user-name
		margin-top: 0.75rem
		font-family: $font-family-monospace
		font-size: $font-size-lg
		font-weight: bold
		text-transform: uppercase

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
		font-family: $font-family-monospace
		font-size: $font-size-xs
		color: $gray-500
		text-transform: uppercase

	.info-value
		font-family: $font-family-monospace
		font-size: $font-size-sm

	.status-online
		color: $success

	.status-offline
		color: $kim-accent
</style>
