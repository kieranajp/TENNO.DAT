<script lang="ts">
	import { onMount } from 'svelte';
	import { getPrimes, getItemDetails, getImageUrl, toggleComponentOwned, type PrimeItem, type ItemDetails } from '$lib/api';
	import { CATEGORY_ORDER } from '$lib/categories';
	import ItemModal from '$lib/components/ItemModal.svelte';

	let primes: PrimeItem[] = $state([]);
	let loading = $state(true);
	let selectedItem: ItemDetails | null = $state(null);
	let loadingItem = $state(false);
	let togglingComponent = $state<number | null>(null);

	let category = $state('');
	let hideVaulted = $state(false);
	let hideComplete = $state(false);
	let search = $state('');
	let sortBy: 'name' | 'progress' | 'type' = $state('progress');

	function sortPrimes(list: PrimeItem[]): PrimeItem[] {
		return [...list].sort((a, b) => {
			// Complete primes always sink to the bottom
			if (a.complete !== b.complete) return a.complete ? 1 : -1;

			if (sortBy === 'progress') {
				const aProgress = a.ownedCount / a.totalCount;
				const bProgress = b.ownedCount / b.totalCount;
				if (aProgress !== bProgress) return bProgress - aProgress;
				return a.name.localeCompare(b.name);
			}
			if (sortBy === 'type') {
				const aIdx = CATEGORY_ORDER.indexOf(a.category);
				const bIdx = CATEGORY_ORDER.indexOf(b.category);
				const aOrder = aIdx !== -1 ? aIdx : Infinity;
				const bOrder = bIdx !== -1 ? bIdx : Infinity;
				if (aOrder !== bOrder) return aOrder - bOrder;
				return a.name.localeCompare(b.name);
			}
			return a.name.localeCompare(b.name);
		});
	}

	async function loadPrimes() {
		loading = true;
		try {
			primes = await getPrimes({
				category: category || undefined,
				vaulted: hideVaulted ? false : undefined,
				complete: hideComplete ? false : undefined,
			});
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadPrimes();
	});

	let filteredPrimes = $derived(
		sortPrimes(
			primes.filter((p) => {
				if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
				return true;
			})
		)
	);

	async function handleComponentToggle(prime: PrimeItem, componentId: number) {
		if (togglingComponent) return;
		togglingComponent = componentId;
		try {
			const newCount = await toggleComponentOwned(componentId);
			primes = primes.map((p) => {
				if (p.id !== prime.id) return p;
				const components = p.components.map((c) =>
					c.id === componentId ? { ...c, ownedCount: newCount } : c
				);
				const ownedCount = components.reduce((sum, c) => sum + c.ownedCount, 0);
				const totalCount = components.reduce((sum, c) => sum + c.itemCount, 0);
				return { ...p, components, ownedCount, totalCount, complete: ownedCount === totalCount };
			});
		} finally {
			togglingComponent = null;
		}
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

<!-- Filters -->
<div class="filter-bar kim-panel mb-4">
	<div class="filter-bar-content">
		<div class="filter-section">
			<select
				class="category-select input-retro"
				bind:value={category}
				onchange={() => {
					if (category && sortBy === 'type') sortBy = 'name';
					loadPrimes();
				}}
			>
				<option value="">ALL CATEGORIES</option>
				{#each CATEGORY_ORDER as cat}
					<option value={cat}>{cat.toUpperCase()}</option>
				{/each}
			</select>

			<label class="checkbox-retro">
				<input type="checkbox" bind:checked={hideVaulted} onchange={() => loadPrimes()} />
				<span class="checkmark"></span>
				HIDE VAULTED
			</label>

			<label class="checkbox-retro">
				<input type="checkbox" bind:checked={hideComplete} onchange={() => loadPrimes()} />
				<span class="checkmark"></span>
				HIDE COMPLETE
			</label>

			<select class="sort-select input-retro" bind:value={sortBy}>
				<option value="progress">SORT: PROGRESS</option>
				<option value="name">SORT: NAME</option>
				{#if !category}
					<option value="type">SORT: TYPE</option>
				{/if}
			</select>
		</div>

		<div class="search-retro">
			<span class="material-icons search-icon">search</span>
			<input type="text" placeholder="SEARCH PRIMES..." bind:value={search} />
		</div>
	</div>
</div>

{#if loading}
	<div class="loading-state">
		<div class="spinner"></div>
		<p>SCANNING VOID RELICS...</p>
	</div>
{:else}
	<div class="results-header">
		<span class="results-count">{filteredPrimes.length} PRIMES FOUND</span>
	</div>

	{#if filteredPrimes.length > 0}
		<div class="primes-list">
			{#each filteredPrimes as prime (prime.id)}
				{@render primeCard(prime)}
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<span class="material-icons">search_off</span>
			<p>{search ? 'NO PRIMES MATCH YOUR SEARCH' : 'NO PRIMES FOUND'}</p>
		</div>
	{/if}
{/if}

<ItemModal item={selectedItem} onClose={closeItemModal} />

{#if loadingItem}
	<div class="loading-overlay">
		<div class="spinner"></div>
	</div>
{/if}

{#snippet primeCard(prime: PrimeItem)}
	<div class="prime-card" class:vaulted={prime.vaulted} class:complete={prime.complete}>
		<div class="prime-header">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="prime-info" onclick={() => openItemModal(prime.id)}>
				{#if getImageUrl(prime.imageName)}
					<img src={getImageUrl(prime.imageName)} alt={prime.name} class="prime-img" />
				{:else}
					<div class="prime-img-placeholder">
						<span class="material-icons">help_outline</span>
					</div>
				{/if}
				<div class="prime-meta">
					<div class="prime-name">{prime.name}</div>
					<div class="prime-category">{prime.category}</div>
				</div>
			</div>
			<div class="prime-progress">
				{#if prime.complete}
					<span class="complete-badge">COMPLETE</span>
				{:else}
					<div class="progress-bar">
						<div class="progress-fill" style="width: {(prime.ownedCount / prime.totalCount) * 100}%"></div>
					</div>
				{/if}
				<span class="progress-text">{prime.ownedCount}/{prime.totalCount}</span>
			</div>
		</div>
		<div class="prime-components">
			{#each prime.components as comp}
				<div class="comp-row" class:owned={comp.ownedCount >= comp.itemCount}>
					<button
						class="comp-checkbox"
						class:checked={comp.ownedCount >= comp.itemCount}
						class:partial={comp.ownedCount > 0 && comp.ownedCount < comp.itemCount}
						disabled={togglingComponent === comp.id}
						onclick={() => handleComponentToggle(prime, comp.id)}
					>
						<span class="material-icons">
							{#if comp.ownedCount >= comp.itemCount}
								check_box
							{:else if comp.ownedCount > 0}
								indeterminate_check_box
							{:else}
								check_box_outline_blank
							{/if}
						</span>
					</button>
					<span class="comp-name">
						{comp.name}
						{#if comp.itemCount > 1}
							<span class="item-count">{comp.ownedCount}/{comp.itemCount}</span>
						{/if}
						{#if comp.ducats}
							<span class="ducats">{comp.ducats}d</span>
						{/if}
					</span>
				</div>
			{/each}
		</div>
	</div>
{/snippet}

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

	.primes-list
		display: grid
		grid-template-columns: 1fr
		gap: 0.75rem
		margin-bottom: 1rem

		@media (min-width: 768px)
			grid-template-columns: repeat(2, 1fr)

		@media (min-width: 1200px)
			grid-template-columns: repeat(3, 1fr)

	.prime-card
		border: $border-width solid $kim-border
		background: white

		&.vaulted
			opacity: 0.7
			border-color: $gray-300

		&.complete
			border-color: rgba($success, 0.3)

	.prime-header
		display: flex
		align-items: center
		justify-content: space-between
		padding: 0.5rem 0.75rem
		border-bottom: 1px dashed $gray-300

	.prime-info
		display: flex
		align-items: center
		gap: 0.75rem
		cursor: pointer

		&:hover .prime-name
			color: $kim-accent

	.prime-img
		width: $icon-size-md
		height: $icon-size-md
		object-fit: contain
		image-rendering: pixelated

	.prime-img-placeholder
		width: $icon-size-md
		height: $icon-size-md
		background: $gray-200
		display: flex
		align-items: center
		justify-content: center
		color: $gray-400

	.prime-meta
		display: flex
		flex-direction: column

	.prime-name
		font-family: $font-family-monospace
		font-size: $font-size-sm
		text-transform: uppercase
		transition: color $transition-base

	.prime-category
		font-size: $font-size-xxs
		color: $gray-500
		text-transform: uppercase

	.prime-progress
		display: flex
		align-items: center
		gap: 0.5rem
		flex-shrink: 0

	.progress-bar
		width: 60px
		height: 6px
		background: $gray-200
		border: 1px solid $gray-300

	.progress-fill
		height: 100%
		background: $kim-accent
		transition: width $transition-base

	.progress-text
		font-family: $font-family-monospace
		font-size: $font-size-xxs
		color: $gray-500
		white-space: nowrap

	.complete-badge
		font-family: $font-family-monospace
		font-size: $font-size-xxs
		color: $success
		text-transform: uppercase

	.prime-components
		padding: 0.375rem 0.75rem

	.comp-row
		display: flex
		align-items: center
		gap: 0.375rem
		padding: 0.25rem 0
		border-bottom: 1px solid $gray-100

		&:last-child
			border-bottom: none

		&.owned
			opacity: 0.5

			.comp-name
				text-decoration: line-through

	.comp-checkbox
		background: transparent
		border: none
		cursor: pointer
		padding: 0
		color: $gray-400
		transition: color $transition-base
		flex-shrink: 0

		&:hover
			color: $kim-accent

		&.partial
			color: $warning

		&.checked
			color: $success

		&:disabled
			opacity: 0.5
			cursor: not-allowed

		.material-icons
			font-size: 1.25rem

	.comp-name
		font-family: $font-family-monospace
		font-size: $font-size-sm
		text-transform: uppercase
		white-space: nowrap
		flex-shrink: 0

	.item-count
		font-size: $font-size-xxs
		color: $kim-accent
		margin-left: 0.25rem

	.ducats
		font-size: $font-size-xxs
		color: $warning
		margin-left: 0.25rem

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
