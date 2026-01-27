<script lang="ts">
	import { getSettings, type PlayerSettings } from '$lib/api';
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
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={handleOverlayClick}>
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
							<span class="info-value">{settings.displayName.replace(/[^\x20-\x7E]/g, '').trim()}</span>
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
							<span class="info-value">{settings.platform.toUpperCase()}</span>
						</div>
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
		max-width: 360px

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
