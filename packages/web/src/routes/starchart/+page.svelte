<script lang="ts">
	import { onMount } from 'svelte';
	import { getStarChartNodes, type StarChartProgress, type PlanetProgress } from '$lib/api';

	let progress: StarChartProgress | null = $state(null);
	let loading = $state(true);
	let steelPath = $state(false);
	let filter: 'all' | 'incomplete' | 'completed' = $state('all');
	let expandedPlanets = $state<Set<string>>(new Set());

	async function loadData() {
		loading = true;
		try {
			progress = await getStarChartNodes(steelPath);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadData();
	});

	function togglePlanet(planetName: string) {
		const newSet = new Set(expandedPlanets);
		if (newSet.has(planetName)) {
			newSet.delete(planetName);
		} else {
			newSet.add(planetName);
		}
		expandedPlanets = newSet;
	}

	function toggleMode() {
		steelPath = !steelPath;
		loadData();
	}

	let filteredPlanets = $derived(
		progress?.planets.map(planet => ({
			...planet,
			nodes: planet.nodes.filter(node => {
				if (filter === 'incomplete') return !node.completed;
				if (filter === 'completed') return node.completed;
				return true;
			})
		})).filter(planet => planet.nodes.length > 0) ?? []
	);

	function getProgressPercent(planet: PlanetProgress): number {
		return planet.total > 0 ? (planet.completed / planet.total) * 100 : 0;
	}
</script>

<!-- Filter Bar -->
<div class="filter-bar kim-panel mb-4">
	<div class="filter-bar-content">
		<div class="filter-section">
			<div class="filter-tabs">
				<button
					class="filter-tab"
					class:active={filter === 'all'}
					onclick={() => filter = 'all'}
				>
					ALL
				</button>
				<button
					class="filter-tab"
					class:active={filter === 'incomplete'}
					onclick={() => filter = 'incomplete'}
				>
					INCOMPLETE
				</button>
				<button
					class="filter-tab"
					class:active={filter === 'completed'}
					onclick={() => filter = 'completed'}
				>
					COMPLETED
				</button>
			</div>

			<div class="mode-toggle">
				<span class="mode-label" class:active={!steelPath}>Normal</span>
				<button class="toggle-switch" class:active={steelPath} onclick={toggleMode}>
					<span class="toggle-knob"></span>
				</button>
				<span class="mode-label" class:active={steelPath}>Steel Path</span>
			</div>
		</div>

		{#if progress}
			<div class="summary-stats">
				<span class="stat">
					<span class="stat-value">{progress.summary.completedNodes}</span>
					<span class="stat-sep">/</span>
					<span class="stat-total">{progress.summary.totalNodes}</span>
					<span class="stat-label">NODES</span>
				</span>
				<span class="stat">
					<span class="stat-value">{progress.summary.completedXP.toLocaleString()}</span>
					<span class="stat-sep">/</span>
					<span class="stat-total">{progress.summary.totalXP.toLocaleString()}</span>
					<span class="stat-label">XP</span>
				</span>
			</div>
		{/if}
	</div>
</div>

{#if loading}
	<div class="loading-state">
		<div class="spinner"></div>
		<p>SCANNING STAR CHART...</p>
	</div>
{:else if filteredPlanets.length === 0}
	<div class="empty-state">
		<span class="material-icons">explore_off</span>
		<p>NO NODES MATCH YOUR FILTER</p>
	</div>
{:else}
	<div class="planets-list">
		{#each filteredPlanets as planet}
			<div class="planet-card kim-panel">
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="planet-header" onclick={() => togglePlanet(planet.name)}>
					<div class="planet-title">
						<span class="material-icons expand-icon">
							{expandedPlanets.has(planet.name) ? 'expand_more' : 'chevron_right'}
						</span>
						<span class="planet-name">{planet.name.toUpperCase()}</span>
					</div>
					<div class="planet-progress">
						<span class="progress-text">
							{planet.completed}/{planet.total}
						</span>
						<div class="progress-bar">
							<div
								class="progress-fill"
								class:complete={planet.completed === planet.total}
								style="width: {getProgressPercent(planet)}%"
							></div>
						</div>
					</div>
				</div>

				{#if expandedPlanets.has(planet.name)}
					<div class="planet-nodes">
						{#each planet.nodes as node}
							<div class="node-row" class:completed={node.completed}>
								<div class="node-status">
									{#if node.nodeType === 'junction'}
										<span class="material-icons junction-icon">
											{node.completed ? 'star' : 'star_border'}
										</span>
									{:else}
										<span class="material-icons">
											{node.completed ? 'check_box' : 'check_box_outline_blank'}
										</span>
									{/if}
								</div>
								<div class="node-info">
									<span class="node-name">{node.name}</span>
									<span class="node-type">
										{node.nodeType === 'junction' ? 'Junction' :
										 node.nodeType === 'railjack' ? `Railjack ${node.missionType || ''}`.trim() :
										 node.missionType || 'Mission'}
									</span>
								</div>
								<div class="node-xp">
									{node.masteryXp} XP
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style lang="sass">
	// Override shared filter-section gap for this page
	.filter-section
		gap: 1rem

	.mode-toggle
		display: flex
		align-items: center
		gap: 0.5rem
		font-family: $font-family-monospace
		font-size: $font-size-sm

	.mode-label
		color: $gray-500
		transition: color $transition-slow

		&.active
			color: $kim-accent
			font-weight: bold

	.toggle-switch
		width: 48px
		height: 24px
		background: $gray-300
		border: $border-width solid $kim-border
		border-radius: 12px
		position: relative
		cursor: pointer
		transition: all $transition-slow

		&.active
			background: $kim-accent
			border-color: $kim-accent-dark

		.toggle-knob
			position: absolute
			top: 2px
			left: 2px
			width: $icon-size-sm
			height: $icon-size-sm
			background: white
			border-radius: 50%
			transition: transform $transition-slow

		&.active .toggle-knob
			transform: translateX(24px)

	.summary-stats
		display: flex
		gap: 1.5rem

	.stat
		display: flex
		align-items: baseline
		gap: 0.25rem
		font-family: $font-family-monospace

	.stat-value
		color: $kim-accent
		font-weight: bold

	.stat-sep
		color: $gray-400

	.stat-total
		color: $gray-500

	.stat-label
		font-size: $font-size-xs
		color: $gray-400
		margin-left: 0.25rem

	.planets-list
		display: grid
		grid-template-columns: 1fr
		gap: 0.75rem
		align-items: start

		@media (min-width: 992px)
			grid-template-columns: repeat(2, 1fr)

	.planet-card
		overflow: hidden

	.planet-header
		display: flex
		justify-content: space-between
		align-items: center
		padding: 0.75rem 1rem
		cursor: pointer
		background: $gray-150
		border-bottom: 1px solid $gray-300
		transition: background $transition-base

		&:hover
			background: $gray-200

	.planet-title
		display: flex
		align-items: center
		gap: 0.5rem

	.expand-icon
		font-size: 1.25rem
		color: $kim-border

	.planet-name
		font-family: $font-family-monospace
		font-size: 1rem
		font-weight: bold
		color: $gray-700

	.planet-progress
		display: flex
		align-items: center
		gap: 0.75rem

	.progress-text
		font-family: $font-family-monospace
		font-size: $font-size-sm
		color: $kim-border
		min-width: 50px
		text-align: right

	.progress-bar
		width: 100px
		height: 12px
		background: $gray-200
		border: 1px solid $gray-400
		overflow: hidden

		@media (max-width: 640px)
			width: 60px

	.progress-fill
		height: 100%
		background: $kim-border
		transition: width 0.3s

		&.complete
			background: $success

	.planet-nodes
		background: white

	.node-row
		display: flex
		align-items: center
		gap: 0.75rem
		padding: 0.5rem 1rem
		border-bottom: 1px solid $gray-200
		transition: background $transition-base

		&:last-child
			border-bottom: none

		&:hover
			background: $gray-50

		&.completed
			opacity: 0.6

			&:hover
				opacity: 1

	.node-status
		flex-shrink: 0

		.material-icons
			font-size: 1.25rem
			color: $gray-400

		.junction-icon
			color: $warning

	.node-row.completed .node-status .material-icons
		color: $success

	.node-row.completed .node-status .junction-icon
		color: $warning

	.node-info
		flex: 1
		display: flex
		flex-direction: column
		min-width: 0

	.node-name
		font-family: $font-family-monospace
		font-size: $font-size-sm
		text-transform: uppercase
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	.node-type
		font-size: $font-size-xs
		color: $gray-500
		text-transform: capitalize

	.node-xp
		font-family: $font-family-monospace
		font-size: $font-size-xs
		color: $kim-border
		flex-shrink: 0

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
		margin-bottom: 1rem

	.empty-state
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		padding: 4rem
		font-family: $font-family-monospace
		text-transform: uppercase
		color: $gray-500

		.material-icons
			font-size: $font-size-xxl
			margin-bottom: 1rem
			opacity: 0.5
</style>
