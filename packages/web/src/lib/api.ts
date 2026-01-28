import { FocusSchool, MasteryState, type ItemAcquisitionData } from '@warframe-tracker/shared';

export { FocusSchool, MasteryState, type ItemAcquisitionData };

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// API Error class to distinguish error types
export class ApiError extends Error {
	constructor(
		message: string,
		public status: number
	) {
		super(message);
		this.name = 'ApiError';
	}

	get isUnauthorized(): boolean {
		return this.status === 401;
	}
}

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		throw new ApiError(`API request failed: ${response.status}`, response.status);
	}
	return response.json();
}

// Auth types
export interface AuthUser {
	id: number;
	steamId: string;
	steamDisplayName: string | null;
	steamAvatarUrl: string | null;
	playerId: string | null;
	platform: string;
	onboardingComplete: boolean;
}

// Auth functions
export async function getCurrentUser(): Promise<AuthUser | null> {
	const response = await fetch(`${API_BASE}/auth/me`, {
		credentials: 'include'
	});

	if (!response.ok) {
		return null;
	}

	const data = await response.json();
	return data.user;
}

export async function logout(): Promise<void> {
	await fetch(`${API_BASE}/auth/logout`, {
		method: 'POST',
		credentials: 'include'
	});
}

export interface LoadoutItem {
	id: number;
	name: string;
	imageName: string | null;
	category: string;
	maxRank: number;
	rank: number | null;
	masteryState: MasteryState;
}

export interface Loadout {
	warframe: LoadoutItem | null;
	primary: LoadoutItem | null;
	secondary: LoadoutItem | null;
	melee: LoadoutItem | null;
	focusSchool: string | null;
}

export interface MasteryRankInfo {
	rank: number;
	equipmentXP: number;
	intrinsicsXP: number;
	totalXP: number;
	currentThreshold: number;
	nextThreshold: number;
	progress: number;
}

export interface MasterySummary {
	categories: Array<{
		category: string;
		total: number;
		mastered: number;
	}>;
	totals: { total: number; mastered: number };
	loadout: Loadout | null;
	lastSyncAt: string | null;
	displayName: string | null;
	masteryRank: MasteryRankInfo | null;
}

export interface MasteryItem {
	id: number;
	uniqueName: string;
	name: string;
	category: string;
	isPrime: boolean;
	masteryReq: number;
	maxRank: number;
	imageName: string | null;
	vaulted: boolean | null;
	xp: number | null;
	rank: number | null;
	masteryState: MasteryState;
	wishlisted: boolean;
}

// ItemAcquisitionData is now imported from @warframe-tracker/shared

export interface PersonalStats {
	fired: number | null;
	hits: number | null;
	kills: number;
	headshots: number;
	equipTime: number;
	assists: number;
}

export interface ItemDetails {
	id: number;
	uniqueName: string;
	name: string;
	category: string;
	isPrime: boolean;
	masteryReq: number;
	maxRank: number;
	imageName: string | null;
	vaulted: boolean | null;
	marketCost: number | null;
	bpCost: number | null;
	buildPrice: number | null;
	buildTime: number | null;
	acquisitionData: ItemAcquisitionData | null;
	personalStats: PersonalStats | null;
}

export interface PlayerSettings {
	id: number;
	playerId: string;
	platform: string;
	displayName: string | null;
	lastSyncAt: string | null;
	railjackIntrinsics: number;
	drifterIntrinsics: number;
}

export interface SyncResult {
	success: boolean;
	synced: number;
	mastered: number;
	error?: string;
}

export async function getMasterySummary(): Promise<MasterySummary> {
	const res = await fetch(`${API_BASE}/mastery/summary`, {
		credentials: 'include'
	});
	return handleResponse(res);
}

export async function getMasteryItems(params?: {
	category?: string;
	mastered?: boolean;
	unmastered?: boolean;
}): Promise<MasteryItem[]> {
	const searchParams = new URLSearchParams();
	if (params?.category) searchParams.set('category', params.category);
	if (params?.mastered) searchParams.set('mastered', 'true');
	if (params?.unmastered) searchParams.set('unmastered', 'true');

	const res = await fetch(`${API_BASE}/mastery/items?${searchParams}`, {
		credentials: 'include'
	});
	return handleResponse(res);
}

export async function getSettings(): Promise<PlayerSettings | null> {
	const res = await fetch(`${API_BASE}/sync/settings`, {
		credentials: 'include'
	});
	if (res.status === 404) {
		return null;
	}
	return handleResponse(res);
}

export async function saveSettings(playerId: string, platform: string): Promise<void> {
	const res = await fetch(`${API_BASE}/sync/settings`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ playerId, platform })
	});
	await handleResponse(res);
}

export async function syncProfile(): Promise<SyncResult> {
	const res = await fetch(`${API_BASE}/sync/profile`, {
		method: 'POST',
		credentials: 'include'
	});
	// 401/403 should throw, but other errors are returned in the response body
	if (res.status === 401 || res.status === 403) {
		return handleResponse(res);
	}
	return res.json();
}

export function getImageUrl(imageName: string | null): string | null {
	if (!imageName) return null;
	return `https://cdn.warframestat.us/img/${imageName}`;
}

export function getMasteryRankIconUrl(rank: number): string {
	// Wiki uses IconRank0-IconRank40+ for MR0-L10+
	return `https://wiki.warframe.com/images/IconRank${rank}.png`;
}

export async function getItemDetails(id: number): Promise<ItemDetails> {
	const res = await fetch(`${API_BASE}/items/${id}`, {
		credentials: 'include'
	});
	return handleResponse(res);
}

// Star Chart types
export interface NodeWithCompletion {
	id: number;
	nodeKey: string;
	name: string;
	planet: string;
	nodeType: 'mission' | 'junction' | 'railjack';
	missionType: string | null;
	masteryXp: number;
	completed: boolean;
}

export interface PlanetProgress {
	name: string;
	completed: number;
	total: number;
	xpEarned: number;
	xpTotal: number;
	nodes: NodeWithCompletion[];
}

export interface StarChartProgress {
	planets: PlanetProgress[];
	summary: {
		completedNodes: number;
		totalNodes: number;
		completedXP: number;
		totalXP: number;
	};
}

export async function getStarChartNodes(steelPath: boolean = false): Promise<StarChartProgress> {
	const res = await fetch(`${API_BASE}/starchart/nodes?steelPath=${steelPath}`, {
		credentials: 'include'
	});
	return handleResponse(res);
}

/**
 * Format build time from seconds to human readable format.
 */
export function formatBuildTime(seconds: number | null): string | null {
	if (!seconds) return null;
	const hours = Math.floor(seconds / 3600);
	const days = Math.floor(hours / 24);
	const remainingHours = hours % 24;
	if (days > 0) {
		return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
	}
	const minutes = Math.floor((seconds % 3600) / 60);
	if (hours > 0) {
		return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
	}
	return `${minutes}m`;
}

// Wishlist API functions
export async function getWishlistItemIds(): Promise<number[]> {
	const response = await fetch(`${API_BASE}/wishlist`, {
		credentials: 'include'
	});
	const data = await handleResponse<{ itemIds: number[] }>(response);
	return data.itemIds;
}

export async function toggleWishlist(itemId: number): Promise<boolean> {
	const response = await fetch(`${API_BASE}/wishlist/${itemId}/toggle`, {
		method: 'POST',
		credentials: 'include'
	});
	const data = await handleResponse<{ wishlisted: boolean }>(response);
	return data.wishlisted;
}

export async function isItemWishlisted(itemId: number): Promise<boolean> {
	const response = await fetch(`${API_BASE}/wishlist/${itemId}`, {
		credentials: 'include'
	});
	const data = await handleResponse<{ wishlisted: boolean }>(response);
	return data.wishlisted;
}
