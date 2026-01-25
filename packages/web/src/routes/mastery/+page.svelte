<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getMasteryItems, getImageUrl, type MasteryItem } from '$lib/api';
	import { CATEGORY_ORDER } from '$lib/categories';

	let items: MasteryItem[] = $state([]);
	let loading = $state(true);

	let category = $state('');
	let filter: 'all' | 'mastered' | 'unmastered' = $state('all');
	let search = $state('');

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
		items.filter((item) => !search || item.name.toLowerCase().includes(search.toLowerCase()))
	);
</script>

<h1 class="mb-4">Mastery Checklist</h1>

<div class="row g-3 mb-4">
	<div class="col-md-4">
		<select class="form-select" bind:value={category} onchange={() => { updateUrl(); loadItems(); }}>
			<option value="">All Categories</option>
			{#each CATEGORY_ORDER as cat}
				<option value={cat}>{cat}</option>
			{/each}
		</select>
	</div>
	<div class="col-md-4">
		<select class="form-select" bind:value={filter} onchange={loadItems}>
			<option value="all">All Items</option>
			<option value="mastered">Mastered Only</option>
			<option value="unmastered">Unmastered Only</option>
		</select>
	</div>
	<div class="col-md-4">
		<input type="search" class="form-control" placeholder="Search..." bind:value={search} />
	</div>
</div>

{#if loading}
	<div class="text-center py-5">
		<div class="spinner-border"></div>
	</div>
{:else}
	<p class="text-muted mb-3">{filteredItems.length} items</p>

	<div class="row g-3">
		{#each filteredItems as item}
			<div class="col-6 col-md-4 col-lg-3">
				<div class="card h-100" class:mastered={item.isMastered}>
					<div class="card-body d-flex align-items-center gap-3">
						{#if getImageUrl(item.imageName)}
							<img
								src={getImageUrl(item.imageName)}
								alt={item.name}
								class="item-image"
								loading="lazy"
							/>
						{:else}
							<div class="item-image placeholder">No img</div>
						{/if}
						<div class="flex-grow-1" style="min-width: 0">
							<h6 class="card-title mb-1 text-truncate" title={item.name}>{item.name}</h6>
							<div class="d-flex gap-2 align-items-center flex-wrap">
								<span class="badge bg-secondary">{item.category}</span>
								{#if item.isPrime}
									<span class="badge bg-warning text-dark">Prime</span>
								{/if}
							</div>
						</div>
						{#if item.isMastered}
							<span class="mastery-check" title="Mastered">&#10003;</span>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
