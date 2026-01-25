<script lang="ts">
	import { onMount } from 'svelte';
	import { getMasterySummary, syncProfile, type MasterySummary } from '$lib/api';

	let summary: MasterySummary | null = $state(null);
	let syncing = $state(false);
	let error: string | null = $state(null);

	onMount(async () => {
		try {
			summary = await getMasterySummary();
		} catch {
			error = 'Failed to load mastery data. Check settings.';
		}
	});

	async function handleSync() {
		syncing = true;
		error = null;
		try {
			const result = await syncProfile();
			if (!result.success) {
				error = result.error ?? 'Sync failed';
				return;
			}
			summary = await getMasterySummary();
		} catch {
			error = 'Sync failed. Check your Account ID.';
		} finally {
			syncing = false;
		}
	}

	function percent(mastered: number, total: number): number {
		return total > 0 ? Math.round((mastered / total) * 100) : 0;
	}
</script>

<div class="row mb-4">
	<div class="col">
		<h1>Dashboard</h1>
		{#if summary?.displayName}
			<p class="text-muted">Playing as {summary.displayName}</p>
		{/if}
	</div>
	<div class="col-auto">
		<button class="btn btn-primary" onclick={handleSync} disabled={syncing}>
			{#if syncing}
				<span class="spinner-border spinner-border-sm me-2"></span>
			{/if}
			Sync Profile
		</button>
	</div>
</div>

{#if error}
	<div class="alert alert-danger">{error}</div>
{/if}

{#if summary}
	<div class="card mb-4">
		<div class="card-body">
			<h5 class="card-title">Overall Progress</h5>
			<div class="progress mb-2" style="height: 24px">
				<div
					class="progress-bar"
					style="width: {percent(summary.totals.mastered, summary.totals.total)}%"
				>
					{summary.totals.mastered} / {summary.totals.total}
				</div>
			</div>
			<small class="text-muted">
				{percent(summary.totals.mastered, summary.totals.total)}% mastered
				{#if summary.lastSyncAt}
					&middot; Last sync: {new Date(summary.lastSyncAt).toLocaleString()}
				{/if}
			</small>
		</div>
	</div>

	<h5 class="mb-3">By Category</h5>
	<div class="row g-3">
		{#each summary.categories as cat}
			<div class="col-md-6 col-lg-4">
				<div class="card h-100">
					<div class="card-body">
						<h6 class="card-title">{cat.category}</h6>
						<div class="progress mb-2">
							<div class="progress-bar" style="width: {percent(cat.mastered, cat.total)}%"></div>
						</div>
						<small>{cat.mastered} / {cat.total} ({percent(cat.mastered, cat.total)}%)</small>
					</div>
				</div>
			</div>
		{/each}
	</div>
{:else if !error}
	<div class="text-center py-5">
		<div class="spinner-border"></div>
		<p class="mt-3">Loading...</p>
	</div>
{/if}
