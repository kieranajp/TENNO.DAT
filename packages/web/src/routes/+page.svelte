<script lang="ts">
	import { onMount } from 'svelte';
	import { getMasterySummary, syncProfile, getImageUrl, getMasteryRankIconUrl, getItemDetails, type MasterySummary, type ItemDetails } from '$lib/api';
	import { sortByCategory } from '$lib/categories';
	import { CATEGORIES } from '@warframe-tracker/shared';
	import ItemModal from '$lib/components/ItemModal.svelte';

	let summary: MasterySummary | null = $state(null);
	let sortedCategories = $derived(summary ? sortByCategory(summary.categories) : []);
	let syncing = $state(false);
	let error: string | null = $state(null);
	let selectedItem: ItemDetails | null = $state(null);
	let loadingItem = $state(false);

	// Build category metadata from shared config
	const categoryMeta: Record<string, { icon: string; subtitle: string }> = Object.fromEntries(
		Object.entries(CATEGORIES).map(([key, config]) => [
			key,
			{ icon: config.icon, subtitle: config.subtitle }
		])
	);

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

	async function openItemModal(itemId: number) {
		loadingItem = true;
		try {
			selectedItem = await getItemDetails(itemId);
		} catch (e) {
			console.error('Failed to load item details:', e);
		} finally {
			loadingItem = false;
		}
	}

	function closeItemModal() {
		selectedItem = null;
	}
</script>

{#if error}
	<div class="error-panel mb-3">
		<span class="material-icons">error</span>
		{error}
	</div>
{/if}

{#if summary}
	<div class="dashboard-grid">
		<!-- Left Column: Operator Status & Loadout -->
		<div class="left-column">
			<!-- Operator Status Panel -->
			<div class="kim-panel">
				<div class="panel-header">
					<h3>Operator Status</h3>
				</div>
				<div class="panel-body">
					<div class="operator-info">
						<div class="operator-avatar">
							{#if summary.masteryRank}
								<img
									src={getMasteryRankIconUrl(summary.masteryRank.rank)}
									alt="Mastery Rank {summary.masteryRank.rank}"
									class="mastery-rank-icon"
								/>
							{:else}
								<span class="material-icons">person</span>
							{/if}
						</div>
						<div class="mastery-rank">
							MR {summary.masteryRank?.rank ?? '??'}
							{#if summary.displayName}
								<span class="rank-title">{summary.displayName.replace(/[^\x20-\x7E]/g, '').trim()}</span>
							{/if}
						</div>
					</div>

					{#if summary.masteryRank}
						<div class="xp-section">
							<div class="xp-label">
								<span>MR {summary.masteryRank.rank} → {summary.masteryRank.rank + 1}</span>
								<span>{summary.masteryRank.totalXP.toLocaleString()} / {summary.masteryRank.nextThreshold.toLocaleString()}</span>
							</div>
							<div class="progress-retro progress-accent">
								<div
									class="progress-bar"
									style="width: {summary.masteryRank.progress.toFixed(1)}%"
								></div>
							</div>
							<div class="xp-subtext">
								{(summary.masteryRank.nextThreshold - summary.masteryRank.totalXP).toLocaleString()} XP to next rank
							</div>
						</div>
					{/if}

					<div class="xp-section">
						<div class="xp-label">
							<span>ITEMS MASTERED</span>
							<span>{summary.totals.mastered.toLocaleString()} / {summary.totals.total.toLocaleString()}</span>
						</div>
						<div class="progress-retro progress-accent">
							<div
								class="progress-bar"
								style="width: {percent(summary.totals.mastered, summary.totals.total)}%"
							></div>
						</div>
					</div>

					<button class="btn-retro sync-btn" onclick={handleSync} disabled={syncing}>
						{#if syncing}
							<span class="spinner"></span>
						{:else}
							<span class="material-icons">sync</span>
						{/if}
						Sync Profile
					</button>

					{#if summary.lastSyncAt}
						<div class="last-sync">
							Last sync: {new Date(summary.lastSyncAt).toLocaleString()}
						</div>
					{/if}
				</div>
			</div>

			<!-- Current Loadout Panel -->
			{#if summary.loadout}
				<div class="kim-panel">
					<div class="panel-header">
						<h3>Current Loadout</h3>
					</div>
					<div class="panel-body loadout-body">
						{#each [
							{ label: 'Warframe', item: summary.loadout.warframe },
							{ label: 'Primary', item: summary.loadout.primary },
							{ label: 'Secondary', item: summary.loadout.secondary },
							{ label: 'Melee', item: summary.loadout.melee }
						] as slot}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div class="loadout-item" class:clickable={slot.item} onclick={() => slot.item && openItemModal(slot.item.id)}>
								<div class="loadout-image">
									{#if slot.item}
										{@const imgUrl = getImageUrl(slot.item.imageName)}
										{#if imgUrl}
											<img src={imgUrl} alt={slot.item.name} />
										{:else}
											<span class="material-icons">help_outline</span>
										{/if}
									{:else}
										<span class="material-icons">remove</span>
									{/if}
								</div>
								<div class="loadout-info">
									<div class="loadout-type">{slot.label}</div>
									<div class="loadout-name">
										{slot.item?.name ?? 'NONE EQUIPPED'}
									</div>
									{#if slot.item}
										<div class="loadout-status" class:mastered={slot.item.masteryState !== 'unmastered'} class:mastered-full={slot.item.masteryState === 'mastered_40'}>
											{#if slot.item.masteryState === 'mastered_40'}
												<span class="status-dot status-gold"></span>
												<span class="rank-display">{slot.item.rank}/{slot.item.maxRank}</span>
											{:else if slot.item.masteryState === 'mastered_30'}
												<span class="status-dot"></span>
												{#if slot.item.maxRank > 30}
													<span class="rank-display">{slot.item.rank}/{slot.item.maxRank}</span>
												{:else}
													MASTERED
												{/if}
											{:else}
												<span class="status-dot status-incomplete"></span>
												<span class="rank-display rank-incomplete">{slot.item.rank ?? 0}/{slot.item.maxRank}</span>
											{/if}
										</div>
									{/if}
								</div>
								<span class="material-icons loadout-chevron">chevron_right</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Right Column: Category Cards -->
		<div class="right-column">
			<div class="categories-grid">
				{#each sortedCategories as cat}
					{@const meta = categoryMeta[cat.category] ?? { icon: 'category', subtitle: 'ITEMS' }}
					{@const pct = percent(cat.mastered, cat.total)}
					<a href="/mastery?category={encodeURIComponent(cat.category)}" class="category-card">
						<div class="category-header">
							<div class="category-info">
								<span class="material-icons category-icon">{meta.icon}</span>
								<div>
									<div class="category-title">{cat.category}</div>
									<div class="category-subtitle">{meta.subtitle}</div>
								</div>
							</div>
							<span class="category-percent">{pct}%</span>
						</div>
						<div class="progress-retro">
							<div class="progress-bar" style="width: {pct}%"></div>
						</div>
						<div class="category-stats">
							<span>{cat.mastered} / {cat.total} MASTERED</span>
							<span>{cat.total - cat.mastered} REMAINING</span>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</div>
{:else if !error}
	<div class="loading-state">
		<div class="spinner"></div>
		<p>LOADING DATABASE...</p>
	</div>
{/if}

<!-- Item Detail Modal -->
<ItemModal item={selectedItem} onClose={closeItemModal} />

{#if loadingItem}
	<div class="loading-overlay">
		<div class="spinner"></div>
	</div>
{/if}

<style lang="sass">
	.error-panel
		background: $danger-bg
		border: $border-width solid $kim-accent
		padding: 0.75rem 1rem
		display: flex
		align-items: center
		gap: 0.5rem
		color: $kim-accent
		font-family: $font-family-monospace
		text-transform: uppercase

	.dashboard-grid
		display: grid
		grid-template-columns: 1fr
		gap: 1.5rem

		@media (min-width: 1024px)
			grid-template-columns: 320px 1fr

	.left-column
		display: flex
		flex-direction: column
		gap: 1.5rem

	.right-column
		min-width: 0

	// Operator Status
	.operator-info
		display: flex
		flex-direction: column
		align-items: center
		margin-bottom: 1rem

	.operator-avatar
		width: 96px
		height: 96px
		background: $gray-800
		border: 3px solid $gray-500
		display: flex
		align-items: center
		justify-content: center
		margin-bottom: 0.75rem

		.material-icons
			font-size: $font-size-xxl
			color: $gray-500

		.mastery-rank-icon
			width: 80px
			height: 80px
			object-fit: contain

	.mastery-rank
		font-size: $font-size-lg
		font-family: $font-family-monospace
		color: $kim-border

		.rank-title
			display: block
			font-size: $font-size-sm
			color: $kim-accent
			text-transform: uppercase
			margin-top: 0.25rem

	.xp-section
		margin-bottom: 1rem

	.xp-label
		display: flex
		justify-content: space-between
		font-family: $font-family-monospace
		font-size: $font-size-sm
		margin-bottom: 0.25rem

	.xp-subtext
		font-family: $font-family-monospace
		font-size: $font-size-xs
		color: $gray-500
		margin-top: 0.25rem
		text-align: right

	.sync-btn
		width: 100%
		padding: 0.75rem
		display: flex
		align-items: center
		justify-content: center
		gap: 0.5rem
		font-size: $font-size-base

		&:disabled
			opacity: 0.7
			cursor: not-allowed

	.last-sync
		margin-top: 0.75rem
		font-size: $font-size-xs
		color: $gray-500
		text-align: center
		font-family: $font-family-monospace

	// Loadout
	.loadout-body
		padding: 0.5rem
		display: flex
		flex-direction: column
		gap: 0.5rem

	.loadout-item.clickable
		cursor: pointer

	.loadout-chevron
		color: $gray-400
		transition: color $transition-base

	.loadout-item.clickable:hover .loadout-chevron
		color: $kim-accent

	// Categories Grid
	.categories-grid
		display: grid
		grid-template-columns: 1fr
		gap: 1rem

		@media (min-width: 640px)
			grid-template-columns: repeat(2, 1fr)

	.category-card
		text-decoration: none
		color: inherit
		display: block

	.category-header
		display: flex
		justify-content: space-between
		align-items: flex-start
		margin-bottom: 0.5rem

	.category-info
		display: flex
		align-items: center
		gap: 0.5rem

	.category-stats
		display: flex
		justify-content: space-between
		margin-top: 0.5rem

	// Loading State
	.loading-state
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		padding: 4rem
		font-family: $font-family-monospace
		text-transform: uppercase
		color: $gray-500

	.spinner
		width: 24px
		height: 24px
		border: 3px solid $gray-300
		border-top-color: $kim-border
		border-radius: 50%
		animation: spin 1s linear infinite

	.loading-overlay
		position: fixed
		inset: 0
		background: rgba(0, 0, 0, 0.5)
		display: flex
		align-items: center
		justify-content: center
		z-index: $zindex-noise
</style>
