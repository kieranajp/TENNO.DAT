<script lang="ts">
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getMasteryItems, getItemDetails, toggleWishlist, type MasteryItem, type ItemDetails } from '$lib/api';
	import { CATEGORY_ORDER } from '$lib/categories';
	import ItemModal from '$lib/components/ItemModal.svelte';
	import ItemCard from '$lib/components/ItemCard.svelte';

	let items: MasteryItem[] = $state([]);
	let loading = $state(true);
	let selectedItem: ItemDetails | null = $state(null);
	let loadingItem = $state(false);

	let category = $state('');
	let filter: 'all' | 'mastered' | 'unmastered' = $state('all');
	let search = $state('');
	let showPrime = $state(true);
	let showWishlistedOnly = $state(false);
	let sortBy: 'name' | 'rank' | 'type' = $state('name');

	function sortItems(itemList: MasteryItem[]): MasteryItem[] {
		return [...itemList].sort((a, b) => {
			// Wishlisted items always first
			if (a.wishlisted && !b.wishlisted) return -1;
			if (!a.wishlisted && b.wishlisted) return 1;

			if (sortBy === 'rank') {
				// Sort by rank descending — highest progress first
				const aRank = a.rank ?? -1;
				const bRank = b.rank ?? -1;
				if (aRank !== bRank) return bRank - aRank;
				return a.name.localeCompare(b.name);
			}

			if (sortBy === 'type') {
				const aIndex = CATEGORY_ORDER.indexOf(a.category);
				const bIndex = CATEGORY_ORDER.indexOf(b.category);
				const aOrder = aIndex !== -1 ? aIndex : Infinity;
				const bOrder = bIndex !== -1 ? bIndex : Infinity;
				if (aOrder !== bOrder) return aOrder - bOrder;
				return a.name.localeCompare(b.name);
			}

			// Default: name
			return a.name.localeCompare(b.name);
		});
	}

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
		sortItems(
			items.filter((item) => {
				if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
				if (!showPrime && item.isPrime) return false;
				if (showWishlistedOnly && !item.wishlisted) return false;
				return true;
			})
		)
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

	async function handleWishlistToggle(event: MouseEvent, item: MasteryItem) {
		event.stopPropagation(); // Don't open modal
		const newState = await toggleWishlist(item.id);
		// Update local state
		items = items.map((i) => (i.id === item.id ? { ...i, wishlisted: newState } : i));
	}

	function handleModalWishlistToggle(itemId: number, newState: boolean) {
		items = items.map((i) => (i.id === itemId ? { ...i, wishlisted: newState } : i));
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
					if (category && sortBy === 'type') sortBy = 'name';
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

			<label class="checkbox-retro checkbox-wishlist">
				<input type="checkbox" bind:checked={showWishlistedOnly} />
				<span class="checkmark checkmark-star"></span>
				WISHLISTED
			</label>

			<select class="sort-select input-retro" bind:value={sortBy}>
				<option value="name">SORT: NAME</option>
				<option value="rank">SORT: RANK</option>
				{#if !category}
					<option value="type">SORT: TYPE</option>
				{/if}
			</select>
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
		{#each filteredItems as item (item.id)}
			<div animate:flip={{ duration: 300 }}>
				<ItemCard
					{item}
					onclick={() => openItemModal(item.id)}
					onWishlistToggle={(e) => handleWishlistToggle(e, item)}
				/>
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
<ItemModal item={selectedItem} onClose={closeItemModal} onWishlistToggle={handleModalWishlistToggle} />

{#if loadingItem}
	<div class="loading-overlay">
		<div class="spinner"></div>
	</div>
{/if}

<style lang="sass">
	.category-select
		padding: 0.25rem 0.5rem
		min-width: 160px

	.sort-select
		padding: 0.25rem 0.5rem
		min-width: 130px

	.checkbox-retro
		display: flex
		align-items: center
		gap: 0.5rem
		font-family: $font-family-monospace
		font-size: $font-size-sm
		cursor: pointer
		user-select: none
		text-transform: uppercase

		input
			display: none

		.checkmark
			width: 18px
			height: 18px
			border: $border-width solid $kim-border
			background: white
			display: flex
			align-items: center
			justify-content: center

			&::after
				content: ''
				display: none
				width: 10px
				height: 10px
				background: $kim-accent

		input:checked + .checkmark::after
			display: block

		&:hover .checkmark
			border-color: $kim-accent

		&.checkbox-wishlist
			.checkmark-star
				border-color: $wishlist

				&::after
					background: $wishlist

			&:hover .checkmark-star
				border-color: $wishlist

	.search-retro
		flex: 1
		min-width: 200px
		max-width: 300px

	.results-header
		display: flex
		justify-content: space-between
		align-items: center
		margin-bottom: 1rem
		font-family: $font-family-monospace
		font-size: $font-size-sm

	.results-count
		color: $kim-border

	.results-filter
		color: $kim-accent

	.items-grid
		display: grid
		grid-template-columns: repeat(2, 1fr)
		gap: 0.75rem

		@media (min-width: 768px)
			grid-template-columns: repeat(3, 1fr)

		@media (min-width: 1024px)
			grid-template-columns: repeat(4, 1fr)

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

	.loading-overlay
		position: fixed
		inset: 0
		background: rgba(0, 0, 0, 0.5)
		display: flex
		align-items: center
		justify-content: center
		z-index: $zindex-noise
</style>
