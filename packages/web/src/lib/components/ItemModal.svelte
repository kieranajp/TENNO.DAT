<script lang="ts">
	import { getImageUrl, formatBuildTime, type ItemDetails } from '$lib/api';

	let {
		item,
		onClose
	}: {
		item: ItemDetails | null;
		onClose: () => void;
	} = $props();

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

	function formatEquipTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) {
			return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
		}
		return `${minutes}m`;
	}

	function formatAccuracy(hits: number | null, fired: number | null): string | null {
		if (hits === null || fired === null || fired === 0) return null;
		return `${((hits / fired) * 100).toFixed(1)}%`;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if item}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={handleOverlayClick}>
		<div class="modal-content kim-panel">
			<div class="panel-header">
				<h3>{item.name}</h3>
				<button class="close-btn" onclick={onClose}>
					<span class="material-icons">close</span>
				</button>
			</div>

			<div class="panel-body">
				<!-- Item Preview -->
				<div class="item-preview">
					{#if getImageUrl(item.imageName)}
						<img src={getImageUrl(item.imageName)} alt={item.name} class="preview-img" />
					{:else}
						<div class="preview-placeholder">
							<span class="material-icons">help_outline</span>
						</div>
					{/if}
					<div class="item-badges">
						<span class="badge badge-category">{item.category}</span>
						{#if item.isPrime}
							<span class="badge badge-prime">PRIME</span>
						{/if}
						{#if item.vaulted}
							<span class="badge badge-vaulted">VAULTED</span>
						{/if}
						{#if item.maxRank > 30}
							<span class="badge badge-rank40">RANK {item.maxRank}</span>
						{/if}
					</div>
				</div>

				<!-- Market Info -->
				{#if item.marketCost}
					<div class="acquisition-section">
						<h4>
							<span class="material-icons">storefront</span>
							MARKET
						</h4>
						<div class="info-row">
							<span class="info-label">Price</span>
							<span class="info-value platinum">{item.marketCost} Platinum</span>
						</div>
					</div>
				{/if}

				<!-- Foundry Info -->
				{#if item.buildPrice || item.buildTime}
					<div class="acquisition-section">
						<h4>
							<span class="material-icons">precision_manufacturing</span>
							FOUNDRY
						</h4>
						{#if item.buildPrice}
							<div class="info-row">
								<span class="info-label">Build Cost</span>
								<span class="info-value">{item.buildPrice.toLocaleString()} Credits</span>
							</div>
						{/if}
						{#if item.buildTime}
							<div class="info-row">
								<span class="info-label">Build Time</span>
								<span class="info-value">{formatBuildTime(item.buildTime)}</span>
							</div>
						{/if}
						{#if item.bpCost}
							<div class="info-row">
								<span class="info-label">Blueprint</span>
								<span class="info-value">{item.bpCost.toLocaleString()} Credits</span>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Component Drops -->
				{#if item.acquisitionData?.components && item.acquisitionData.components.length > 0}
					<div class="acquisition-section">
						<h4>
							<span class="material-icons">layers</span>
							COMPONENT DROPS
						</h4>
						{#each item.acquisitionData.components as comp}
							{#if comp.drops && comp.drops.length > 0}
								<div class="component-group">
									<div class="component-name">{comp.name}{#if comp.itemCount > 1} x{comp.itemCount}{/if}</div>
									<div class="drop-list">
										{#each comp.drops.slice(0, 3) as drop}
											<div class="drop-item">
												<span class="drop-location">{drop.location}</span>
												<span class="drop-chance">{(drop.chance * 100).toFixed(1)}%</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/each}
					</div>
				{/if}

				<!-- Direct Drops -->
				{#if item.acquisitionData?.drops && item.acquisitionData.drops.length > 0}
					<div class="acquisition-section">
						<h4>
							<span class="material-icons">place</span>
							DROP LOCATIONS
						</h4>
						<div class="drop-list">
							{#each item.acquisitionData.drops.slice(0, 5) as drop}
								<div class="drop-item">
									<span class="drop-location">{drop.location}</span>
									<span class="drop-chance">{(drop.chance * 100).toFixed(1)}%</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Crafting Resources -->
				{#if item.acquisitionData?.resources && item.acquisitionData.resources.length > 0}
					<div class="acquisition-section">
						<h4>
							<span class="material-icons">inventory_2</span>
							CRAFTING RESOURCES
						</h4>
						<div class="resource-list">
							{#each item.acquisitionData.resources as resource}
								<div class="resource-item">
									<span class="resource-name">{resource.name}</span>
									<span class="resource-quantity">x{resource.quantity.toLocaleString()}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Requirements -->
				{#if item.masteryReq > 0}
					<div class="acquisition-section">
						<h4>
							<span class="material-icons">military_tech</span>
							REQUIREMENTS
						</h4>
						<div class="info-row">
							<span class="info-label">Mastery Rank</span>
							<span class="info-value">MR {item.masteryReq}</span>
						</div>
					</div>
				{/if}

				<!-- Personal Stats -->
				{#if item.personalStats && item.personalStats.kills > 0}
					<div class="acquisition-section">
						<h4>
							<span class="material-icons">analytics</span>
							PERSONAL STATS
						</h4>

						{#if item.personalStats.fired !== null && item.personalStats.hits !== null}
							{@const accuracy = formatAccuracy(item.personalStats.hits, item.personalStats.fired)}
							{#if accuracy}
								<div class="info-row">
									<span class="info-label">Accuracy</span>
									<span class="info-value"
										>{accuracy} ({item.personalStats.hits.toLocaleString()} / {item.personalStats.fired.toLocaleString()})</span
									>
								</div>
							{/if}
						{/if}

						<div class="info-row">
							<span class="info-label">Kills</span>
							<span class="info-value">{item.personalStats.kills.toLocaleString()}</span>
						</div>

						{#if item.personalStats.headshots > 0}
							{@const headshotPct = (
								(item.personalStats.headshots / item.personalStats.kills) *
								100
							).toFixed(1)}
							<div class="info-row">
								<span class="info-label">Headshots</span>
								<span class="info-value"
									>{item.personalStats.headshots.toLocaleString()} ({headshotPct}%)</span
								>
							</div>
						{/if}

						{#if item.personalStats.equipTime > 0}
							<div class="info-row">
								<span class="info-label">Time Equipped</span>
								<span class="info-value">{formatEquipTime(item.personalStats.equipTime)}</span>
							</div>
						{/if}

						{#if item.personalStats.assists > 0}
							<div class="info-row">
								<span class="info-label">Assists</span>
								<span class="info-value">{item.personalStats.assists.toLocaleString()}</span>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style lang="sass">
	.modal-overlay
		position: fixed
		inset: 0
		background: rgba(0, 0, 0, 0.7)
		display: flex
		align-items: center
		justify-content: center
		z-index: 1000
		padding: 1rem

	.modal-content
		width: 100%
		max-width: 480px
		max-height: 85vh
		overflow-y: auto

	.panel-header
		display: flex
		justify-content: space-between
		align-items: center

		h3
			flex: 1
			margin: 0
			white-space: nowrap
			overflow: hidden
			text-overflow: ellipsis

	.close-btn
		background: transparent
		border: none
		cursor: pointer
		padding: 0.25rem
		color: $kim-border

		&:hover
			color: $kim-accent

	.item-preview
		display: flex
		flex-direction: column
		align-items: center
		padding: 1rem
		background: $gray-800
		border: 2px solid $kim-border
		margin-bottom: 1rem

	.preview-img
		width: 128px
		height: 128px
		object-fit: contain
		image-rendering: pixelated

	.preview-placeholder
		width: 128px
		height: 128px
		display: flex
		align-items: center
		justify-content: center
		background: $gray-700
		color: $gray-400

		.material-icons
			font-size: 3rem

	.item-badges
		display: flex
		flex-wrap: wrap
		gap: 0.5rem
		margin-top: 0.75rem
		justify-content: center

	.badge
		font-size: 0.7rem
		padding: 0.125rem 0.5rem
		font-family: 'Share Tech Mono', monospace
		text-transform: uppercase

	.badge-category
		background: $gray-700
		color: white
		border: 1px solid $gray-500

	.badge-prime
		background: $warning-bg-soft
		color: $warning-text
		border: 1px solid $warning

	.badge-vaulted
		background: $pink-bg
		color: $pink-text
		border: 1px solid $pink-border

	.badge-rank40
		background: $purple-bg
		color: $purple-text
		border: 1px solid $purple-border

	.acquisition-section
		margin-bottom: 1rem
		padding-bottom: 1rem
		border-bottom: 1px dashed $gray-300

		&:last-child
			border-bottom: none
			margin-bottom: 0

		h4
			display: flex
			align-items: center
			gap: 0.5rem
			font-size: 0.875rem
			font-family: 'Share Tech Mono', monospace
			color: $kim-accent
			margin: 0 0 0.75rem 0
			text-transform: uppercase

			.material-icons
				font-size: 1.1rem

	.info-row
		display: flex
		justify-content: space-between
		align-items: center
		padding: 0.25rem 0
		font-size: 0.875rem

	.info-label
		color: $gray-500

	.info-value
		font-family: 'Share Tech Mono', monospace

		&.platinum
			color: $info

	.component-group
		margin-bottom: 0.75rem

		&:last-child
			margin-bottom: 0

	.component-name
		font-family: 'Share Tech Mono', monospace
		font-size: 0.875rem
		color: $kim-border
		margin-bottom: 0.25rem
		text-transform: uppercase

	.drop-list
		display: flex
		flex-direction: column
		gap: 0.25rem

	.drop-item
		display: flex
		justify-content: space-between
		align-items: center
		font-size: 0.8rem
		padding: 0.25rem 0.5rem
		background: $gray-150

	.drop-location
		color: $gray-700

	.drop-chance
		font-family: 'Share Tech Mono', monospace
		color: $success

	.resource-list
		display: flex
		flex-direction: column
		gap: 0.25rem

	.resource-item
		display: flex
		justify-content: space-between
		align-items: center
		font-size: 0.875rem
		padding: 0.25rem 0.5rem
		background: $gray-150

	.resource-name
		color: $gray-700

	.resource-quantity
		font-family: 'Share Tech Mono', monospace
		color: $info
</style>
