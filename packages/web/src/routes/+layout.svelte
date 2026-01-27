<script lang="ts">
	import '../styles/_styles.sass';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getSettings } from '$lib/api';

	let { children }: { children: Snippet } = $props();

	let currentTime = $state('');
	let username = $state('TENNO');
	let isMinimized = $state(false);
	let showTechrot = $state(false);
	let isGlitching = $state(false);

	function handleMinimize() {
		isMinimized = !isMinimized;
	}

	function handleClose() {
		showTechrot = true;
		setTimeout(() => {
			showTechrot = false;
		}, 1500);
	}

	function handleMaximize() {
		isGlitching = true;
		setTimeout(() => {
			isGlitching = false;
		}, 500);
	}

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

<!-- Techrot Virus Easter Egg -->
{#if showTechrot}
	<div class="techrot-overlay">
		<img src="/techrot.webp" />
		<div class="techrot-text">TECHROT DETECTED</div>
	</div>
{/if}

<div class="app-container" class:glitching={isGlitching}>
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
	<main class="window-frame main-window" class:minimized={isMinimized}>
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
				<button type="button" onclick={handleMinimize} title="Minimize">_</button>
				<button type="button" onclick={handleMaximize} title="Maximize">□</button>
				<button type="button" class="close-btn" onclick={handleClose} title="Close">X</button>
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
		width: $icon-size-sm
		height: $icon-size-sm
		background: $kim-accent
		border: 1px solid black

	.nav-tabs-bar
		display: flex
		background: $gray-300
		border-bottom: $border-width solid $kim-border-dark
		padding: 0 0.5rem
		gap: 0.25rem
		padding-top: 0.25rem

	.nav-tab
		padding: 0.25rem 1rem
		background: $gray-200
		border: 1px solid $gray-400
		border-bottom: none
		text-decoration: none
		color: $gray-700
		font-family: $font-family-monospace
		font-size: $font-size-sm
		text-transform: uppercase
		margin-bottom: -$border-width
		transition: all $transition-fast

		&:hover
			background: $gray-100

		&.active
			background: $kim-terminal-light
			border-color: $kim-border-dark
			border-bottom: $border-width solid $kim-terminal-light
			color: black
			font-weight: bold

	.main-content
		flex: 1
		padding: 1.5rem
		overflow-y: auto
		overflow-x: hidden
		background: $kim-terminal-light
		min-width: 0

	// Easter egg: Minimize to title bar
	.main-window.minimized
		flex: 0
		.nav-tabs-bar,
		.main-content,
		.status-bar
			display: none

	// Easter egg: CRT glitch effect
	.app-container.glitching
		animation: glitch 0.5s steps(2) forwards

	@keyframes glitch
		0%
			filter: hue-rotate(0deg) saturate(1)
			transform: translate(0)
		10%
			filter: hue-rotate(90deg) saturate(2)
			transform: translate(-2px, 1px)
		20%
			filter: hue-rotate(180deg) saturate(0.5)
			transform: translate(2px, -1px)
		30%
			filter: hue-rotate(270deg) saturate(3)
			transform: translate(-1px, 2px)
		40%
			filter: hue-rotate(45deg) saturate(1.5)
			transform: translate(1px, -2px)
		50%
			clip-path: inset(20% 0 30% 0)
			filter: hue-rotate(135deg) saturate(2)
		60%
			clip-path: inset(50% 0 10% 0)
			filter: hue-rotate(225deg) saturate(0.8)
		70%
			clip-path: inset(10% 0 60% 0)
			filter: hue-rotate(315deg) saturate(1.2)
		80%
			clip-path: none
			filter: hue-rotate(180deg) saturate(1)
			transform: translate(0)
		100%
			filter: hue-rotate(0deg) saturate(1)
			transform: translate(0)
			clip-path: none

	// Easter egg: Techrot virus overlay (CRT green aesthetic)
	:global(.techrot-overlay)
		position: fixed
		inset: 0
		background: rgba(0, 20, 0, 0.95)
		z-index: 10000
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		animation: techrot-flash 0.15s steps(2) infinite

		img
			width: 200px
			height: 200px
			filter: drop-shadow(0 0 20px #00ff00) drop-shadow(0 0 40px #00ff00) brightness(1.2) sepia(1) hue-rotate(70deg) saturate(3)
			animation: techrot-pulse 0.3s ease-in-out infinite alternate

		.techrot-text
			margin-top: 2rem
			font-family: monospace
			font-size: 2rem
			color: #00ff00
			text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00
			animation: techrot-text-flicker 0.1s steps(2) infinite

	@keyframes techrot-flash
		0%
			background: rgba(0, 20, 0, 0.95)
		50%
			background: rgba(0, 40, 0, 0.9)

	@keyframes techrot-pulse
		from
			transform: scale(1)
		to
			transform: scale(1.1)

	@keyframes techrot-text-flicker
		0%
			opacity: 1
		50%
			opacity: 0.7
</style>
