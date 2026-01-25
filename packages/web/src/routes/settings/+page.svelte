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

<h1 class="mb-4">Settings</h1>

<div class="card" style="max-width: 500px">
	<div class="card-body">
		<h5 class="card-title">Account Settings</h5>

		<div class="mb-3">
			<label class="form-label" for="playerId">Account ID</label>
			<input
				type="text"
				class="form-control"
				id="playerId"
				bind:value={playerId}
				placeholder="Your Warframe Account ID"
			/>
			<div class="form-text">
				Find this in your EE.log file or use the Tenno Tracker browser extension.
			</div>
		</div>

		<div class="mb-3">
			<label class="form-label" for="platform">Platform</label>
			<select class="form-select" id="platform" bind:value={platform}>
				<option value="pc">PC</option>
				<option value="ps">PlayStation</option>
				<option value="xbox">Xbox</option>
				<option value="switch">Nintendo Switch</option>
			</select>
		</div>

		<button class="btn btn-primary" onclick={handleSave} disabled={saving || !playerId}>
			{#if saving}
				<span class="spinner-border spinner-border-sm me-2"></span>
			{/if}
			Save Settings
		</button>

		{#if saved}
			<span class="text-success ms-3">Saved!</span>
		{/if}
	</div>
</div>

{#if settings?.lastSyncAt}
	<div class="card mt-4" style="max-width: 500px">
		<div class="card-body">
			<h5 class="card-title">Sync History</h5>
			<p class="mb-0">
				Last sync: {new Date(settings.lastSyncAt).toLocaleString()}
			</p>
		</div>
	</div>
{/if}
