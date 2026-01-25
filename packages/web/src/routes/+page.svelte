<script lang="ts">
	import { onMount } from 'svelte';
	import { getMasterySummary, syncProfile, getImageUrl, getFocusSchoolInfo, type MasterySummary } from '$lib/api';
	import { sortByCategory } from '$lib/categories';

	let summary: MasterySummary | null = $state(null);
	let sortedCategories = $derived(summary ? sortByCategory(summary.categories) : []);
	let focusInfo = $derived(getFocusSchoolInfo(summary?.loadout?.focusSchool ?? null));
	let syncing = $state(false);
	let error: string | null = $state(null);

	// Category icons and subtitles
	const categoryMeta: Record<string, { icon: string; subtitle: string }> = {
		Warframes: { icon: 'accessibility_new', subtitle: 'BIOLOGICAL SUITS' },
		Primary: { icon: 'gps_fixed', subtitle: 'RIFLES, BOWS, SHOTGUNS' },
		Secondary: { icon: 'filter_tilt_shift', subtitle: 'PISTOLS, THROWN' },
		Melee: { icon: 'colorize', subtitle: 'SWORDS, POLEARMS' },
		Pets: { icon: 'pets', subtitle: 'KUBROWS, KAVATS' },
		Sentinels: { icon: 'smart_toy', subtitle: 'FLOATING COMPANIONS' },
		SentinelWeapons: { icon: 'precision_manufacturing', subtitle: 'SENTINEL ARMS' },
		Archwing: { icon: 'flight', subtitle: 'SPACE WINGS' },
		ArchGun: { icon: 'rocket_launch', subtitle: 'HEAVY WEAPONS' },
		ArchMelee: { icon: 'bolt', subtitle: 'ARCH BLADES' }
	};

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
						<div class="operator-avatar" style={focusInfo ? `border-color: ${focusInfo.color}` : ''}>
							{#if focusInfo}
								<img
									src={getImageUrl(focusInfo.imageName)}
									alt="{focusInfo.name} Focus"
									class="focus-lens-icon"
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
							<div class="loadout-item">
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
										<div class="loadout-status">
											<span class="status-dot"></span>
											MASTERED
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

<style lang="sass">
	.error-panel
		background: #fef2f2
		border: 2px solid #C0392B
		padding: 0.75rem 1rem
		display: flex
		align-items: center
		gap: 0.5rem
		color: #C0392B
		font-family: 'Share Tech Mono', monospace
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
		background: #1a1a2e
		border: 3px solid #6b7280
		display: flex
		align-items: center
		justify-content: center
		margin-bottom: 0.75rem

		.material-icons
			font-size: 3rem
			color: #6b7280

		.focus-lens-icon
			width: 72px
			height: 72px
			object-fit: contain

	.mastery-rank
		font-size: 1.5rem
		font-family: 'Share Tech Mono', monospace
		color: #5D6D65

		.rank-title
			display: block
			font-size: 0.875rem
			color: #C0392B
			text-transform: uppercase
			margin-top: 0.25rem

	.xp-section
		margin-bottom: 1rem

	.xp-label
		display: flex
		justify-content: space-between
		font-family: 'Share Tech Mono', monospace
		font-size: 0.875rem
		margin-bottom: 0.25rem

	.xp-subtext
		font-family: 'Share Tech Mono', monospace
		font-size: 0.75rem
		color: #6b7280
		margin-top: 0.25rem
		text-align: right

	.sync-btn
		width: 100%
		padding: 0.75rem
		display: flex
		align-items: center
		justify-content: center
		gap: 0.5rem
		font-size: 1.1rem

		&:disabled
			opacity: 0.7
			cursor: not-allowed

	.last-sync
		margin-top: 0.75rem
		font-size: 0.75rem
		color: #6b7280
		text-align: center
		font-family: 'Share Tech Mono', monospace

	// Loadout
	.loadout-body
		padding: 0.5rem
		display: flex
		flex-direction: column
		gap: 0.5rem

	.loadout-chevron
		color: #9ca3af
		transition: color 0.15s

	.loadout-item:hover .loadout-chevron
		color: #C0392B

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
		font-family: 'Share Tech Mono', monospace
		text-transform: uppercase
		color: #6b7280

	.spinner
		width: 24px
		height: 24px
		border: 3px solid #d1d5db
		border-top-color: #5D6D65
		border-radius: 50%
		animation: spin 1s linear infinite

	@keyframes spin
		to
			transform: rotate(360deg)
</style>
