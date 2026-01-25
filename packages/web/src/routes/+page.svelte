<script lang="ts">
	import { onMount } from 'svelte';
	import { getMasterySummary, syncProfile, getImageUrl, type MasterySummary } from '$lib/api';
	import { sortByCategory } from '$lib/categories';

	let summary: MasterySummary | null = $state(null);
	let sortedCategories = $derived(summary ? sortByCategory(summary.categories) : []);
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
	{#if summary.loadout}
		<div class="card mb-4">
			<div class="card-body">
				<h5 class="card-title mb-3">Current Loadout</h5>
				<div class="d-flex flex-wrap gap-4 align-items-start">
					{#each [
						{ label: 'Warframe', item: summary.loadout.warframe },
						{ label: 'Primary', item: summary.loadout.primary },
						{ label: 'Secondary', item: summary.loadout.secondary },
						{ label: 'Melee', item: summary.loadout.melee }
					] as slot}
						<div class="loadout-slot text-center">
							{#if slot.item}
								{@const imgUrl = getImageUrl(slot.item.imageName)}
								{#if imgUrl}
									<img src={imgUrl} alt={slot.item.name} class="loadout-image mb-2" />
								{:else}
									<div class="loadout-placeholder mb-2"></div>
								{/if}
								<div class="fw-medium">{slot.item.name}</div>
							{:else}
								<div class="loadout-placeholder mb-2"></div>
								<div class="text-muted">No {slot.label}</div>
							{/if}
							<small class="text-muted">{slot.label}</small>
						</div>
					{/each}
					{#if summary.loadout.focusSchool}
						<div class="loadout-slot text-center">
							<div class="focus-badge mb-2">{summary.loadout.focusSchool.charAt(0)}</div>
							<div class="fw-medium">{summary.loadout.focusSchool}</div>
							<small class="text-muted">Focus School</small>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

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
		{#each sortedCategories as cat}
			<div class="col-md-6 col-lg-4">
				<a href="/mastery?category={encodeURIComponent(cat.category)}" class="text-decoration-none">
					<div class="card h-100 category-card">
						<div class="card-body">
							<h6 class="card-title">{cat.category}</h6>
							<div class="progress mb-2">
								<div class="progress-bar" style="width: {percent(cat.mastered, cat.total)}%"></div>
							</div>
							<small class="text-muted">{cat.mastered} / {cat.total} ({percent(cat.mastered, cat.total)}%)</small>
						</div>
					</div>
				</a>
			</div>
		{/each}
	</div>
{:else if !error}
	<div class="text-center py-5">
		<div class="spinner-border"></div>
		<p class="mt-3">Loading...</p>
	</div>
{/if}

<style>
	.category-card {
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}
	.category-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.loadout-slot {
		min-width: 100px;
	}

	.loadout-image {
		width: 80px;
		height: 80px;
		object-fit: contain;
		border-radius: 8px;
		background: var(--bs-secondary-bg);
		padding: 4px;
	}

	.loadout-placeholder {
		width: 80px;
		height: 80px;
		border-radius: 8px;
		background: var(--bs-secondary-bg);
		border: 2px dashed var(--bs-border-color);
	}

	.focus-badge {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: linear-gradient(135deg, #6366f1, #8b5cf6);
		color: white;
		font-size: 2rem;
		font-weight: bold;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
