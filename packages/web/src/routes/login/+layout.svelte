<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<title>Login - TENNO.DAT</title>
</svelte:head>

{@render children()}
