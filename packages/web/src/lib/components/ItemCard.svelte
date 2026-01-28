<script lang="ts">
	import { getImageUrl, type MasteryItem } from '$lib/api';

	let {
		item,
		onclick,
		onWishlistToggle
	}: {
		item: MasteryItem;
		onclick?: () => void;
		onWishlistToggle?: (event: MouseEvent) => void;
	} = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="item-card"
	class:mastered={item.masteryState === 'mastered_30'}
	class:mastered-full={item.masteryState === 'mastered_40'}
	{onclick}
>
	<div class="item-image-container">
		{#if getImageUrl(item.imageName)}
			<img src={getImageUrl(item.imageName)} alt={item.name} class="item-img" loading="lazy" />
		{:else}
			<div class="item-img-placeholder">
				<span class="material-icons">help_outline</span>
			</div>
		{/if}
		<button
			class="wishlist-btn"
			class:active={item.wishlisted}
			onclick={onWishlistToggle}
			title={item.wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
		>
			<span class="material-icons">{item.wishlisted ? 'star' : 'star_border'}</span>
		</button>
	</div>
	<div class="item-details">
		<div class="item-name" title={item.name}>{item.name}</div>
		<div class="item-meta">
			<span class="item-category">{item.category}</span>
			{#if item.isPrime}
				<span class="item-prime">PRIME</span>
			{/if}
		</div>
	</div>
	<div class="item-rank-display">
		{#if item.masteryState === 'mastered_40'}
			<div class="item-mastered item-mastered-full">
				<span class="material-icons">check_circle</span>
			</div>
		{:else if item.masteryState === 'mastered_30'}
			{#if item.maxRank > 30}
				<span class="rank-progress">{item.rank ?? 0}/{item.maxRank}</span>
			{/if}
			<div class="item-mastered">
				<span class="material-icons">check</span>
			</div>
		{:else if (item.rank ?? 0) > 0}
			<span class="rank-progress rank-incomplete">{item.rank}/{item.maxRank}</span>
		{/if}
	</div>
</div>

<style lang="sass">
	.item-card
		background: white
		border: $border-width solid $kim-border
		display: flex
		align-items: center
		gap: 0.75rem
		padding: 0.5rem
		transition: all $transition-base
		cursor: pointer
		min-width: 0
		overflow: hidden

		&:hover
			border-color: $kim-accent
			background: $danger-bg

		&.mastered
			opacity: 0.6

			&:hover
				opacity: 1

		&.mastered-full
			opacity: 0.7
			border-color: $warning
			background: $warning-bg

			&:hover
				opacity: 1

	.item-image-container
		flex-shrink: 0
		position: relative

	.item-img
		width: $icon-size-lg
		height: $icon-size-lg
		object-fit: contain
		background: $gray-200
		border: 1px solid $gray-400
		image-rendering: pixelated

	.item-img-placeholder
		width: $icon-size-lg
		height: $icon-size-lg
		background: $gray-200
		border: 1px solid $gray-400
		display: flex
		align-items: center
		justify-content: center
		color: $gray-400

	.wishlist-btn
		position: absolute
		top: -4px
		left: -4px
		background: white
		border: 1px solid $gray-300
		border-radius: 2px
		cursor: pointer
		padding: 0
		color: $gray-400
		transition: all $transition-base
		width: 18px
		height: 18px
		display: flex
		align-items: center
		justify-content: center

		&:hover
			color: $wishlist
			border-color: $wishlist

		&.active
			color: $wishlist
			border-color: $wishlist

		.material-icons
			font-size: 14px

	.item-details
		flex: 1
		min-width: 0

	.item-name
		font-family: $font-family-monospace
		font-size: $font-size-sm
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis
		text-transform: uppercase

	.item-meta
		display: flex
		gap: 0.5rem
		align-items: center
		margin-top: 0.25rem

	.item-category
		font-size: $font-size-xxs
		color: $gray-500
		text-transform: uppercase

	.item-prime
		font-size: 0.65rem
		background: $warning-bg-soft
		color: $warning-text
		padding: 0 0.25rem
		border: 1px solid $warning

	.item-rank-display
		display: flex
		align-items: center
		gap: 0.25rem
		flex-shrink: 0

	.rank-progress
		font-family: $font-family-monospace
		font-size: $font-size-xxs
		color: $gray-500
		white-space: nowrap

		&.rank-incomplete
			color: $kim-accent
			font-weight: 500

	.item-mastered
		flex-shrink: 0
		width: 24px
		height: 24px
		background: $success
		color: white
		display: flex
		align-items: center
		justify-content: center

		.material-icons
			font-size: 1rem

		&.item-mastered-full
			background: $warning

			.material-icons
				font-size: $font-size-base
</style>
