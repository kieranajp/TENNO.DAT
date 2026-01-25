<script lang="ts">
	import '../styles/_styles.sass';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getSettings } from '$lib/api';

	let { children }: { children: Snippet } = $props();

	let currentTime = $state('');
	let username = $state('TENNO');

	$effect(() => {
		const updateClock = () => {
			const now = new Date();
			currentTime = now.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				second: '2-digit',
				hour12: true
			});
		};
		updateClock();
		const interval = setInterval(updateClock, 1000);
		return () => clearInterval(interval);
	});

	onMount(async () => {
		try {
			const settings = await getSettings();
			if (settings?.displayName) {
				// Strip non-printable characters (platform icons etc)
				username = settings.displayName.replace(/[^\x20-\x7E]/g, '').trim();
			}
		} catch {
			// Keep default "TENNO"
		}
	});

	const navItems = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/mastery', label: 'Mastery' },
		{ href: '/starchart', label: 'Star Chart' },
		{ href: '/settings', label: 'Settings' }
	];
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap"
		rel="stylesheet"
	/>
	<link
		href="https://fonts.googleapis.com/icon?family=Material+Icons"
		rel="stylesheet"
	/>
</svelte:head>

<!-- CRT Effects -->
<div class="crt-overlay"></div>
<div class="noise-overlay"></div>

<div class="app-container">
	<!-- Header Bar -->
	<header class="header-bar">
		<div class="header-logo">
			<span class="material-icons">computer</span>
			<span>KIM OS v19.99 // <span class="logo-accent">TENNO.DAT</span></span>
		</div>
		<div class="header-controls">
			<div class="user-badge d-none d-md-block">USER: {username.toUpperCase()}</div>
			<div class="d-none d-md-block">{currentTime}</div>
			<a href="/settings" class="header-btn" title="Settings">
				<span class="material-icons">settings</span>
			</a>
		</div>
	</header>

	<!-- Main Window -->
	<main class="window-frame main-window">
		<div class="title-bar">
			<div class="d-flex align-items-center gap-2">
				<div class="title-icon"></div>
				<span class="title-text">
					{#if $page.url.pathname === '/'}
						MASTERY DASHBOARD.EXE
					{:else if $page.url.pathname === '/starchart'}
						STAR CHART.EXE
					{:else if $page.url.pathname === '/mastery'}
						MASTERY DATABASE.EXE
					{:else if $page.url.pathname === '/settings'}
						SYSTEM CONFIG.EXE
					{:else}
						WARFRAME TRACKER
					{/if}
				</span>
			</div>
			<div class="window-controls">
				<button type="button">_</button>
				<button type="button">□</button>
				<button type="button" class="close-btn">X</button>
			</div>
		</div>

		<!-- Navigation Tabs -->
		<nav class="nav-tabs-bar">
			{#each navItems as item}
				<a
					href={item.href}
					class="nav-tab"
					class:active={$page.url.pathname === item.href}
				>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="main-content">
			{@render children()}
		</div>

		<!-- Status Bar -->
		<footer class="status-bar">
			<div class="status-indicator">
				<span class="status-dot"></span>
				<span>SYSTEM: ONLINE</span>
			</div>
			<div class="status-info">MEM: 64KB OK</div>
		</footer>
	</main>
</div>

<style lang="sass">
	.app-container
		min-height: 100vh
		padding: 1rem
		max-width: 1400px
		margin: 0 auto
		display: flex
		flex-direction: column
		gap: 1rem

		@media (min-width: 768px)
			padding: 2rem

	.main-window
		flex: 1
		display: flex
		flex-direction: column
		overflow: hidden

	.title-icon
		width: 16px
		height: 16px
		background: #C0392B
		border: 1px solid black

	.nav-tabs-bar
		display: flex
		background: #d1d5db
		border-bottom: 2px solid #4a5a54
		padding: 0 0.5rem
		gap: 0.25rem
		padding-top: 0.25rem

	.nav-tab
		padding: 0.25rem 1rem
		background: #e5e7eb
		border: 1px solid #9ca3af
		border-bottom: none
		text-decoration: none
		color: #374151
		font-family: 'Share Tech Mono', monospace
		font-size: 0.875rem
		text-transform: uppercase
		margin-bottom: -2px
		transition: all 0.1s

		&:hover
			background: #f5f5f5

		&.active
			background: #E0E5DF
			border-color: #4a5a54
			border-bottom: 2px solid #E0E5DF
			color: black
			font-weight: bold

	.main-content
		flex: 1
		padding: 1.5rem
		overflow-y: auto
		background: #E0E5DF
</style>
