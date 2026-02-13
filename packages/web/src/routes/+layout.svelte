<script lang="ts">
	import '../styles/_styles.sass';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getCurrentUser, logout, ApiError, type AuthUser } from '$lib/api';
	import { auth } from '$lib/stores/auth';
	import SettingsDialog from '$lib/components/SettingsDialog.svelte';
	import SystemInfoDialog from '$lib/components/SystemInfoDialog.svelte';

	let { children }: { children: Snippet } = $props();

	let currentTime = $state('');
	let username = $state('TENNO');
	let isMinimized = $state(false);
	let showEntrati = $state(false);
	let isGlitching = $state(false);
	let showSettingsDialog = $state(false);
	let showSystemInfoDialog = $state(false);

	// Tab scroll arrows
	let tabsBar: HTMLElement | undefined = $state();
	let canScrollLeft = $state(false);
	let canScrollRight = $state(false);

	function updateScrollButtons() {
		if (!tabsBar) return;
		canScrollLeft = tabsBar.scrollLeft > 0;
		canScrollRight = tabsBar.scrollLeft + tabsBar.clientWidth < tabsBar.scrollWidth - 1;
	}

	function scrollTabs(direction: number) {
		tabsBar?.scrollBy({ left: direction * 80, behavior: 'smooth' });
	}

	$effect(() => {
		if (!tabsBar) return;
		updateScrollButtons();
		tabsBar.addEventListener('scroll', updateScrollButtons);
		const ro = new ResizeObserver(updateScrollButtons);
		ro.observe(tabsBar);
		return () => {
			tabsBar!.removeEventListener('scroll', updateScrollButtons);
			ro.disconnect();
		};
	});

	// Auth state from store subscription
	let authUser = $state<AuthUser | null>(null);
	let authChecked = $state(false);

	$effect(() => {
		const unsubscribe = auth.subscribe((state) => {
			authUser = state.user;
			authChecked = state.checked;
			if (state.user?.steamDisplayName) {
				username = state.user.steamDisplayName;
			}
		});
		return unsubscribe;
	});

	function handleMinimize() {
		isMinimized = !isMinimized;
	}

	function handleClose() {
		showEntrati = true;
		setTimeout(() => {
			showEntrati = false;
		}, 1500);
	}

	function handleMaximize() {
		isGlitching = true;
		setTimeout(() => {
			isGlitching = false;
		}, 500);
	}

	async function handleLogout() {
		try {
			await logout();
		} catch (e) {
			// Logout failed but clear local state anyway
			console.error('Logout failed:', e);
		}
		auth.clear();
		goto('/login');
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

	// Handle auth-based redirects reactively
	$effect(() => {
		if (!authChecked) return; // Wait for auth check to complete

		const path = $page.url.pathname;
		const isLoginPage = path.startsWith('/login');
		const isOnboardingPage = path.startsWith('/onboarding');

		if (!authUser) {
			// Not logged in - redirect to login (unless already there)
			if (!isLoginPage) {
				goto('/login');
			}
			return;
		}

		// Logged in but needs onboarding
		if (!authUser.onboardingComplete && !isOnboardingPage) {
			goto('/onboarding');
			return;
		}

		// Logged in and onboarded - redirect away from login/onboarding
		if (authUser.onboardingComplete && (isLoginPage || isOnboardingPage)) {
			goto('/');
		}
	});

	onMount(async () => {
		// Global 401 handler - catch expired sessions during navigation
		const handleUnauthorized = (event: PromiseRejectionEvent) => {
			if (event.reason instanceof ApiError && event.reason.isUnauthorized) {
				event.preventDefault();
				auth.clear();
				goto('/login');
			}
		};

		window.addEventListener('unhandledrejection', handleUnauthorized);

		try {
			const user = await getCurrentUser();
			auth.setUser(user);
		} catch (e) {
			console.error('Failed to check authentication:', e);
			auth.setUser(null);
		}

		return () => {
			window.removeEventListener('unhandledrejection', handleUnauthorized);
		};
	});

	const navItems = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/mastery', label: 'Mastery' },
		{ href: '/primes', label: 'Primes' },
		{ href: '/starchart', label: 'Star Chart' }
	];

	// Auth pages (login/onboarding) render without the app chrome
	let isAuthPage = $derived(
		$page.url.pathname.startsWith('/login') || $page.url.pathname.startsWith('/onboarding')
	);
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

<!-- Entrati Virus Easter Egg -->
{#if showEntrati}
	<div class="entrati-overlay">
		<img src="/entrati.png" alt="Entrati Eye" />
		<div class="entrati-text">WE END AS WE BEGAN</div>
	</div>
{/if}

{#if isAuthPage}
	<!-- Auth pages (login/onboarding) render without app chrome -->
	{@render children()}
{:else if !authChecked}
	<!-- Show nothing while checking auth - prevents flash of app chrome -->
	<div class="auth-loading">
		<div class="auth-loading-content">
			<span class="material-icons spinning">sync</span>
			<span>AUTHENTICATING...</span>
		</div>
	</div>
{:else if !authUser}
	<!-- Not authenticated - will redirect to login via $effect -->
	<div class="auth-loading">
		<div class="auth-loading-content">
			<span class="material-icons">lock</span>
			<span>REDIRECTING...</span>
		</div>
	</div>
{:else}
	<div class="app-container" class:glitching={isGlitching}>
		<!-- Header Bar -->
		<header class="header-bar">
			<div class="header-logo">
				<span class="material-icons">computer</span>
				<span>KIM OS v19.99 // <span class="logo-accent">TENNO.DAT</span></span>
			</div>
			<div class="header-controls">
				<button class="user-badge d-none d-md-flex" onclick={() => showSystemInfoDialog = true} title="System Info">
					USER: {username.toUpperCase()}
				</button>
				<div class="d-none d-md-block">{currentTime}</div>
				<a href="https://github.com/kieranajp/TENNO.DAT" target="_blank" rel="noopener noreferrer" class="header-btn" title="GitHub">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
				</a>
				<button class="header-btn" onclick={() => showSettingsDialog = true} title="Settings">
					<span class="material-icons">settings</span>
				</button>
				<button class="header-btn" onclick={handleLogout} title="Logout">
					<span class="material-icons">logout</span>
				</button>
			</div>
		</header>

		<!-- Main Window -->
		<main class="window-frame main-window" class:minimized={isMinimized}>
			<div class="title-bar">
				<div class="d-flex align-items-center gap-2">
					<div class="title-icon"></div>
					<span class="title-text">
						{#if $page.url.pathname === '/'}
							MASTERY_DASHBOARD.EXE
						{:else if $page.url.pathname === '/starchart'}
							STAR_CHART.EXE
						{:else if $page.url.pathname === '/mastery'}
							MASTERY_DATABASE.EXE
						{:else if $page.url.pathname === '/primes'}
							PRIME_TRACKER.EXE
						{:else if $page.url.pathname === '/settings'}
							SYSTEM_CONFIG.EXE
						{:else}
							TENNO.DAT
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
			<div class="nav-tabs-wrapper">
				{#if canScrollLeft}
					<button class="nav-scroll-btn" onclick={() => scrollTabs(-1)} aria-label="Scroll tabs left">
						<span class="material-icons">chevron_left</span>
					</button>
				{/if}
				<nav class="nav-tabs-bar" bind:this={tabsBar}>
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
				{#if canScrollRight}
					<button class="nav-scroll-btn" onclick={() => scrollTabs(1)} aria-label="Scroll tabs right">
						<span class="material-icons">chevron_right</span>
					</button>
				{/if}
			</div>

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

	<!-- Dialogs -->
	{#if showSettingsDialog}
		<SettingsDialog onClose={() => showSettingsDialog = false} />
	{/if}

	{#if showSystemInfoDialog}
		<SystemInfoDialog onClose={() => showSystemInfoDialog = false} />
	{/if}
{/if}

<style lang="sass">
	.auth-loading
		min-height: 100vh
		display: flex
		align-items: center
		justify-content: center
		background: $kim-bg-dark

	.auth-loading-content
		display: flex
		align-items: center
		gap: 0.75rem
		font-family: $font-family-monospace
		font-size: $font-size-lg
		color: $kim-title
		text-transform: uppercase
		letter-spacing: $letter-spacing-wide

		.material-icons
			font-size: 1.3rem

		.spinning
			animation: spin 1s linear infinite

	@keyframes spin
		from
			transform: rotate(0deg)
		to
			transform: rotate(360deg)

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

	.nav-tabs-wrapper
		display: flex
		background: $gray-300
		border-bottom: $border-width solid $kim-border-dark

	.nav-scroll-btn
		display: flex
		align-items: center
		justify-content: center
		background: $gray-200
		border: none
		border-bottom: $border-width solid $kim-border-dark
		margin-bottom: -$border-width
		color: $gray-700
		cursor: pointer
		padding: 0 0.125rem
		flex-shrink: 0
		transition: background $transition-fast

		.material-icons
			font-size: $font-size-base

		&:hover
			background: $gray-100
			color: $kim-accent

	.nav-tabs-bar
		display: flex
		padding: 0 0.5rem
		gap: 0.25rem
		padding-top: 0.25rem
		overflow-x: scroll
		scrollbar-width: none
		flex: 1
		min-width: 0

		&::-webkit-scrollbar
			display: none

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
		white-space: nowrap
		flex-shrink: 0

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
		padding: 0.75rem
		overflow-y: auto
		overflow-x: hidden
		background: $kim-terminal-light
		min-width: 0

		@media (min-width: 768px)
			padding: 1.5rem

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

	// Easter egg: Entrati virus overlay (CRT green aesthetic)
	:global(.entrati-overlay)
		position: fixed
		inset: 0
		background: rgba(0, 20, 0, 0.95)
		z-index: 10000
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		animation: entrati-flash 0.15s steps(2) infinite

		img
			width: 200px
			height: 200px
			filter: drop-shadow(0 0 20px #00ff00) drop-shadow(0 0 40px #00ff00) brightness(1.2) sepia(1) hue-rotate(70deg) saturate(3)
			animation: entrati-pulse 0.3s ease-in-out infinite alternate

		.entrati-text
			margin-top: 2rem
			font-family: monospace
			font-size: 2rem
			color: #00ff00
			text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00
			animation: entrati-text-flicker 0.1s steps(2) infinite

	@keyframes entrati-flash
		0%
			background: rgba(0, 20, 0, 0.95)
		50%
			background: rgba(0, 40, 0, 0.9)

	@keyframes entrati-pulse
		from
			transform: scale(1)
		to
			transform: scale(1.1)

	@keyframes entrati-text-flicker
		0%
			opacity: 1
		50%
			opacity: 0.7
</style>
