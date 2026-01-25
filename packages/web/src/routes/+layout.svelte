<script lang="ts">
	import '../styles/_styles.sass';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
	<div class="container">
		<a class="navbar-brand" href="/">Warframe Mastery</a>
		<ul class="navbar-nav">
			<li class="nav-item">
				<a class="nav-link" href="/">Dashboard</a>
			</li>
			<li class="nav-item">
				<a class="nav-link" href="/mastery">Mastery</a>
			</li>
			<li class="nav-item">
				<a class="nav-link" href="/settings">Settings</a>
			</li>
		</ul>
	</div>
</nav>

<main class="container">
	{@render children()}
</main>
