<svelte:head>
	<title>Privacy Policy - TENNO.DAT</title>
</svelte:head>

{@render children()}

<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>
