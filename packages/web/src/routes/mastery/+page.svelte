<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getMasteryItems, getItemDetails, getImageUrl, type MasteryItem, type ItemDetails } from '$lib/api';
	import { CATEGORY_ORDER } from '$lib/categories';
	import ItemModal from '$lib/components/ItemModal.svelte';

	let items: MasteryItem[] = $state([]);
	let loading = $state(true);
	let selectedItem: ItemDetails | null = $state(null);
	let loadingItem = $state(false);

	let category = $state('');
	let filter: 'all' | 'mastered' | 'unmastered' = $state('all');
	let search = $state('');
	let showPrime = $state(true);

	async function loadItems() {
		loading = true;
		try {
			items = await getMasteryItems({
				category: category || undefined,
				mastered: filter === 'mastered',
				unmastered: filter === 'unmastered'
			});
		} finally {
			loading = false;
		}
	}

	// Update URL when category changes (for bookmarkability)
	function updateUrl() {
		const url = new URL(window.location.href);
		if (category) {
			url.searchParams.set('category', category);
		} else {
			url.searchParams.delete('category');
		}
		goto(url.toString(), { replaceState: true, noScroll: true });
	}

	onMount(() => {
		// Read initial category from URL
		const urlCategory = $page.url.searchParams.get('category');
		if (urlCategory && CATEGORY_ORDER.includes(urlCategory as any)) {
			category = urlCategory;
		}
		loadItems();
	});

	let filteredItems = $derived(
		items.filter((item) => {
			if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
			if (!showPrime && item.isPrime) return false;
			return true;
		})
	);

	function setFilter(newFilter: 'all' | 'mastered' | 'unmastered') {
		filter = newFilter;
		loadItems();
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

<!-- Filter Bar -->
<div class="filter-bar kim-panel mb-4">
	<div class="filter-bar-content">
		<div class="filter-section">
			<div class="filter-tabs">
				<button
					class="filter-tab"
					class:active={filter === 'all'}
					onclick={() => setFilter('all')}
				>
					ALL
				</button>
				<button
					class="filter-tab"
					class:active={filter === 'unmastered'}
					onclick={() => setFilter('unmastered')}
				>
					INCOMPLETE
				</button>
				<button
					class="filter-tab"
					class:active={filter === 'mastered'}
					onclick={() => setFilter('mastered')}
				>
					MASTERED
				</button>
			</div>

			<select
				class="category-select input-retro"
				bind:value={category}
				onchange={() => {
					updateUrl();
					loadItems();
				}}
			>
				<option value="">ALL CATEGORIES</option>
				{#each CATEGORY_ORDER as cat}
					<option value={cat}>{cat.toUpperCase()}</option>
				{/each}
			</select>

			<label class="checkbox-retro">
				<input type="checkbox" bind:checked={showPrime} />
				<span class="checkmark"></span>
				SHOW PRIME
			</label>
		</div>

		<div class="search-retro">
			<span class="material-icons search-icon">search</span>
			<input type="text" placeholder="SEARCH DATABASE..." bind:value={search} />
		</div>
	</div>
</div>

{#if loading}
	<div class="loading-state">
		<div class="spinner"></div>
		<p>QUERYING DATABASE...</p>
	</div>
{:else}
	<div class="results-header">
		<span class="results-count">{filteredItems.length} RECORDS FOUND</span>
		{#if category}
			<span class="results-filter">FILTER: {category.toUpperCase()}</span>
		{/if}
	</div>

	<div class="items-grid">
		{#each filteredItems as item}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="item-card"
				class:mastered={item.masteryState === 'mastered_30'}
				class:mastered-full={item.masteryState === 'mastered_40'}
				onclick={() => openItemModal(item.id)}
			>
				<div class="item-image-container">
					{#if getImageUrl(item.imageName)}
						<img
							src={getImageUrl(item.imageName)}
							alt={item.name}
							class="item-img"
							loading="lazy"
						/>
					{:else}
						<div class="item-img-placeholder">
							<span class="material-icons">help_outline</span>
						</div>
					{/if}
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
		{/each}
	</div>

	{#if filteredItems.length === 0}
		<div class="empty-state">
			<span class="material-icons">search_off</span>
			<p>NO RECORDS MATCH YOUR QUERY</p>
		</div>
	{/if}
{/if}

<!-- Item Detail Modal -->
<ItemModal item={selectedItem} onClose={closeItemModal} />

{#if loadingItem}
	<div class="loading-overlay">
		<div class="spinner"></div>
	</div>
{/if}

<style lang="sass">
	.filter-bar
		padding: 0

	.filter-bar-content
		padding: 0.75rem
		display: flex
		flex-wrap: wrap
		gap: 0.75rem
		align-items: center
		justify-content: space-between

	.filter-section
		display: flex
		flex-wrap: wrap
		gap: 0.75rem
		align-items: center

	.category-select
		padding: 0.25rem 0.5rem
		min-width: 160px

	.checkbox-retro
		display: flex
		align-items: center
		gap: 0.5rem
		font-family: 'Share Tech Mono', monospace
		font-size: 0.875rem
		cursor: pointer
		user-select: none
		text-transform: uppercase

		input
			display: none

		.checkmark
			width: 18px
			height: 18px
			border: 2px solid #5D6D65
			background: white
			display: flex
			align-items: center
			justify-content: center

			&::after
				content: ''
				display: none
				width: 10px
				height: 10px
				background: #C0392B

		input:checked + .checkmark::after
			display: block

		&:hover .checkmark
			border-color: #C0392B

	.search-retro
		flex: 1
		min-width: 200px
		max-width: 300px

	.results-header
		display: flex
		justify-content: space-between
		align-items: center
		margin-bottom: 1rem
		font-family: 'Share Tech Mono', monospace
		font-size: 0.875rem

	.results-count
		color: #5D6D65

	.results-filter
		color: #C0392B

	.items-grid
		display: grid
		grid-template-columns: repeat(2, 1fr)
		gap: 0.75rem

		@media (min-width: 768px)
			grid-template-columns: repeat(3, 1fr)

		@media (min-width: 1024px)
			grid-template-columns: repeat(4, 1fr)

	.item-card
		background: white
		border: 2px solid #5D6D65
		display: flex
		align-items: center
		gap: 0.75rem
		padding: 0.5rem
		transition: all 0.15s
		cursor: pointer

		&:hover
			border-color: #C0392B
			background: #fef2f2

		&.mastered
			opacity: 0.6

			&:hover
				opacity: 1

		&.mastered-full
			opacity: 0.7
			border-color: #f59e0b
			background: #fffbeb

			&:hover
				opacity: 1

	.item-image-container
		flex-shrink: 0

	.item-img
		width: 48px
		height: 48px
		object-fit: contain
		background: #e5e7eb
		border: 1px solid #9ca3af
		image-rendering: pixelated

	.item-img-placeholder
		width: 48px
		height: 48px
		background: #e5e7eb
		border: 1px solid #9ca3af
		display: flex
		align-items: center
		justify-content: center
		color: #9ca3af

	.item-details
		flex: 1
		min-width: 0

	.item-name
		font-family: 'Share Tech Mono', monospace
		font-size: 0.875rem
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
		font-size: 0.7rem
		color: #6b7280
		text-transform: uppercase

	.item-prime
		font-size: 0.65rem
		background: #fef3c7
		color: #92400e
		padding: 0 0.25rem
		border: 1px solid #f59e0b

	.item-rank-display
		display: flex
		align-items: center
		gap: 0.25rem
		flex-shrink: 0

	.rank-progress
		font-family: 'Share Tech Mono', monospace
		font-size: 0.7rem
		color: #6b7280
		white-space: nowrap

		&.rank-incomplete
			color: #C0392B
			font-weight: 500

	.item-mastered
		flex-shrink: 0
		width: 24px
		height: 24px
		background: #22c55e
		color: white
		display: flex
		align-items: center
		justify-content: center

		.material-icons
			font-size: 1rem

		&.item-mastered-full
			background: #f59e0b

			.material-icons
				font-size: 1.1rem

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
		margin-bottom: 1rem

	@keyframes spin
		to
			transform: rotate(360deg)

	.empty-state
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		padding: 4rem
		font-family: 'Share Tech Mono', monospace
		text-transform: uppercase
		color: #6b7280

		.material-icons
			font-size: 3rem
			margin-bottom: 1rem
			opacity: 0.5

	.loading-overlay
		position: fixed
		inset: 0
		background: rgba(0, 0, 0, 0.5)
		display: flex
		align-items: center
		justify-content: center
		z-index: 999
</style>
