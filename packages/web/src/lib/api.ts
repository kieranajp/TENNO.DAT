const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Three-state mastery for rank 40 items
export type MasteryState = 'unmastered' | 'mastered_30' | 'mastered_40';

// Focus school mapping with lens icons
export const FOCUS_SCHOOLS: Record<string, { name: string; color: string; imageName: string }> = {
	Madurai: { name: 'Madurai', color: '#ff6b35', imageName: 'madurai-lens-e675bac31e.png' },
	Vazarin: { name: 'Vazarin', color: '#4ecdc4', imageName: 'vazarin-lens-ae790776d3.png' },
	Naramon: { name: 'Naramon', color: '#f7dc6f', imageName: 'naramon-lens-7be3563b7d.png' },
	Zenurik: { name: 'Zenurik', color: '#5dade2', imageName: 'zenurik-lens-0f0eb9c38b.png' },
	Unairu: { name: 'Unairu', color: '#a569bd', imageName: 'unairu-lens-f251e69759.png' }
};

export function getFocusSchoolInfo(school: string | null): { name: string; color: string; imageName: string } | null {
	if (!school) return null;
	return FOCUS_SCHOOLS[school] ?? null;
}

export interface LoadoutItem {
	id: number;
	name: string;
	imageName: string | null;
	category: string;
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
	isMastered: boolean | null;
	masteryState: MasteryState;
}

// Item details with acquisition data
export interface ItemAcquisitionData {
	drops: Array<{
		location: string;
		chance: number;
		rarity: string;
	}>;
	components: Array<{
		name: string;
		drops: Array<{
			location: string;
			chance: number;
		}>;
	}>;
	introduced?: {
		name: string | null;
		date: string | null;
	} | null;
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
	const res = await fetch(`${API_BASE}/mastery/summary`);
	if (!res.ok) {
		throw new Error('Failed to fetch mastery summary');
	}
	return res.json();
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

	const res = await fetch(`${API_BASE}/mastery/items?${searchParams}`);
	if (!res.ok) {
		throw new Error('Failed to fetch mastery items');
	}
	return res.json();
}

export async function getSettings(): Promise<PlayerSettings | null> {
	const res = await fetch(`${API_BASE}/sync/settings`);
	if (!res.ok) {
		return null;
	}
	return res.json();
}

export async function saveSettings(playerId: string, platform: string): Promise<void> {
	const res = await fetch(`${API_BASE}/sync/settings`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ playerId, platform })
	});
	if (!res.ok) {
		throw new Error('Failed to save settings');
	}
}

export async function syncProfile(): Promise<SyncResult> {
	const res = await fetch(`${API_BASE}/sync/profile`, { method: 'POST' });
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
	const res = await fetch(`${API_BASE}/items/${id}`);
	if (!res.ok) {
		throw new Error('Failed to fetch item details');
	}
	return res.json();
}

// Star Chart types
export interface NodeWithCompletion {
	id: number;
	nodeKey: string;
	name: string;
	planet: string;
	nodeType: 'mission' | 'junction' | 'railjack';
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
	const res = await fetch(`${API_BASE}/starchart/nodes?steelPath=${steelPath}`);
	if (!res.ok) {
		throw new Error('Failed to fetch star chart nodes');
	}
	return res.json();
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
